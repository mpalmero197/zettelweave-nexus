import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractVideoId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  // Already an ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1, 12);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const m = u.pathname.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // ignore
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function normalizeYouTubeDescription(value: unknown): string {
  if (typeof value !== 'string') return '';
  const cleaned = decodeEntities(value)
    .replace(/\\u0026/g, '&')
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .trim();

  // YouTube sometimes serves its generic homepage description from consent,
  // bot-check, or shell pages. Never pass that to ALICE as video context.
  const generic = 'Enjoy the videos and music you love, upload original content, and share it all with friends, family, and the world on YouTube.';
  if (!cleaned || cleaned === generic || cleaned.includes('upload original content, and share it all with friends, family, and the world on YouTube')) {
    return '';
  }
  return cleaned;
}

function extractBalancedJson(html: string, marker: string): unknown | null {
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;
  const start = html.indexOf('{', markerIdx);
  if (start === -1) return null;

  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
        }
      }
    }
  }
  return null;
}

function parseTranscriptXml(xml: string): Array<{ start: number; dur: number; text: string }> {
  const segments: Array<{ start: number; dur: number; text: string }> = [];
  const re = /<text[^>]*start="([^"]+)"[^>]*dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const start = parseFloat(m[1]);
    const dur = parseFloat(m[2]);
    const text = decodeEntities(m[3].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (text) segments.push({ start, dur, text });
  }
  return segments;
}

async function getOEmbed(videoId: string): Promise<{ title: string; channel: string }> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { headers: { 'Accept': 'application/json' } },
    );
    if (!res.ok) return { title: '', channel: '' };
    const data = await res.json();
    return {
      title: typeof data?.title === 'string' ? decodeEntities(data.title) : '',
      channel: typeof data?.author_name === 'string' ? decodeEntities(data.author_name) : '',
    };
  } catch {
    return { title: '', channel: '' };
  }
}

/** Parse "[m:ss] text" / "m:ss text" transcript renderings into segments. */
function parseTimestampedText(text: string): Array<{ start: number; dur: number; text: string }> {
  const out: Array<{ start: number; dur: number; text: string }> = [];
  const re = /\[?\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b\]?\s*([^\n]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const c = m[3] ? parseInt(m[3], 10) : null;
    const start = c === null ? a * 60 + b : a * 3600 + b * 60 + c;
    const line = (m[4] || '').replace(/\s+/g, ' ').trim();
    if (!line || line.length < 2) continue;
    // Skip lines that are just another timestamp or navigational chrome
    if (/^(transcript|copy|download|share|english|auto-generated)$/i.test(line)) continue;
    out.push({ start, dur: 0, text: line });
  }
  // Fill durations from the next start and drop out-of-order noise
  const sorted = out.filter((s, i) => i === 0 || s.start >= out[i - 1].start);
  for (let i = 0; i < sorted.length; i++) {
    const next = sorted[i + 1];
    sorted[i].dur = next ? Math.max(1, next.start - sorted[i].start) : 5;
  }
  return sorted;
}

/**
 * Firecrawl-backed transcript scrape. YouTube blocks caption endpoints from
 * datacenter IPs, so we render a public transcript page through Firecrawl
 * (residential egress) and parse the timestamps back into segments.
 */
async function fetchViaFirecrawl(videoId: string): Promise<Array<{ start: number; dur: number; text: string }>> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.warn('youtube-transcript: FIRECRAWL_API_KEY missing, skipping scrape fallback');
    return [];
  }

  const targets = [
    `https://youtubetotranscript.com/transcript?v=${videoId}`,
    `https://notegpt.io/youtube-transcript-generator?video_id=${videoId}`,
  ];

  for (const target of targets) {
    try {
      const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: target,
          formats: ['markdown'],
          onlyMainContent: true,
          waitFor: 1200,
          proxy: 'auto',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.warn(`firecrawl scrape failed [${res.status}] ${target}`, JSON.stringify(data)?.slice(0, 200));
        continue;
      }
      const markdown: string = data?.markdown ?? data?.data?.markdown ?? '';
      console.log(`firecrawl ${target} -> ${markdown.length} chars of markdown`);
      if (Deno.env.get('DEBUG_SCRAPE') === '1') console.log('SAMPLE::' + markdown.slice(0, 2500));
      if (!markdown) continue;
      const segments = parseTimestampedText(markdown);
      console.log(`firecrawl ${target} -> ${segments.length} parsed segments`);
      if (segments.length >= 8) {
        console.log(`youtube-transcript: scraped ${segments.length} segments from ${target}`);
        return segments;
      }
    } catch (e) {
      console.warn(`firecrawl scrape threw for ${target}`, e);
    }
  }
  return [];
}

/** Direct timedtext call, both json3 and legacy XML, manual + auto captions. */
async function fetchViaTimedText(videoId: string): Promise<Array<{ start: number; dur: number; text: string }>> {
  const urls = [
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=json3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' } });
      if (!res.ok) continue;
      const body = await res.text();
      if (!body.trim()) continue;
      if (u.includes('json3')) {
        const json = JSON.parse(body);
        const segs = (json?.events || [])
          .filter((e: any) => Array.isArray(e.segs))
          .map((e: any) => ({
            start: (e.tStartMs ?? 0) / 1000,
            dur: (e.dDurationMs ?? 0) / 1000,
            text: e.segs.map((s: any) => s.utf8 ?? '').join('').replace(/\s+/g, ' ').trim(),
          }))
          .filter((s: any) => s.text);
        if (segs.length) return segs;
      } else {
        const segs = parseTranscriptXml(body);
        if (segs.length) return segs;
      }
    } catch {
      // try next
    }
  }
  return [];
}


function transcriptUnavailableResponse(
  videoId: string,
  title = '',
  channel = '',
  reason = 'Transcript unavailable',
  description = '',
) {
  return new Response(JSON.stringify({
    videoId,
    title: title || 'YouTube video',
    channel,
    description,
    hasTranscript: false,
    segments: [],
    fullText: description || '',
    warning: reason,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// Fallback: use YouTube's Innertube player endpoint. We try several clients
// because Google rotates which ones require a PoToken. WEB reliably returns
// title + description (though usually no captionTracks); ANDROID / IOS /
// TVHTML5 sometimes return captionTracks. We merge whatever each returns.
async function fetchViaInnertube(videoId: string): Promise<{ title: string; channel: string; description: string; tracks: any[] }> {
  const clients: Array<{ name: string; body: any; headers: Record<string, string> }> = [
    {
      name: 'WEB',
      body: { context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'en', gl: 'US' } }, videoId },
      headers: { 'Origin': 'https://www.youtube.com', 'User-Agent': 'Mozilla/5.0' },
    },
    {
      name: 'IOS',
      body: { context: { client: { clientName: 'IOS', clientVersion: '19.09.3', deviceMake: 'Apple', deviceModel: 'iPhone14,3', hl: 'en', gl: 'US' } }, videoId },
      headers: { 'User-Agent': 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)', 'X-YouTube-Client-Name': '5', 'X-YouTube-Client-Version': '19.09.3' },
    },
    {
      name: 'TVHTML5',
      body: { context: { client: { clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0', hl: 'en', gl: 'US' } }, videoId },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    },
  ];

  let title = '', channel = '', description = '', tracks: any[] = [];

  for (const c of clients) {
    try {
      const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...c.headers },
        body: JSON.stringify(c.body),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const vd = data?.videoDetails || {};
      if (!title && vd.title) title = decodeEntities(vd.title);
      if (!channel && vd.author) channel = decodeEntities(vd.author);
      const innerDescription = normalizeYouTubeDescription(vd.shortDescription);
      if (!description && innerDescription) description = innerDescription;
      const t = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      if (!tracks.length && t.length) tracks = t;
      if (title && description && tracks.length) break;
    } catch (e) {
      console.warn(`innertube ${c.name} failed`, e);
    }
  }
  return { title, channel, description, tracks };
}

function extractDescriptionFromInnertubeNext(data: unknown): string {
  const payload = JSON.stringify(data);
  const patterns = [
    /"attributedDescription"\s*:\s*\{"content"\s*:\s*"((?:\\.|[^"\\])*)"/,
    /"description"\s*:\s*\{"simpleText"\s*:\s*"((?:\\.|[^"\\])*)"/,
  ];

  for (const pattern of patterns) {
    const match = payload.match(pattern);
    if (!match) continue;
    try {
      const description = normalizeYouTubeDescription(JSON.parse(`"${match[1]}"`));
      if (description) return description;
    } catch {
      const description = normalizeYouTubeDescription(match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'));
      if (description) return description;
    }
  }
  return '';
}

async function fetchViaInnertubeNext(videoId: string): Promise<string> {
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/next?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.youtube.com',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'en', gl: 'US' } },
        videoId,
      }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return extractDescriptionFromInnertubeNext(data);
  } catch (e) {
    console.warn('innertube next failed', e);
    return '';
  }
}


async function fetchTranscriptFromTrack(track: any): Promise<Array<{ start: number; dur: number; text: string }>> {
  if (!track?.baseUrl) return [];
  const baseUrl: string = String(track.baseUrl).replace(/\\u0026/g, '&');
  try {
    const xmlRes = await fetch(baseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
    });
    if (!xmlRes.ok) return [];
    const xml = await xmlRes.text();
    return parseTranscriptXml(xml);
  } catch {
    return [];
  }
}

type CacheRow = {
  video_id: string;
  title: string;
  channel: string;
  description: string;
  segments: Array<{ start: number; dur: number; text: string }>;
  has_transcript: boolean;
  transcript_source: string;
  fetched_at: string;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const NEGATIVE_CACHE_MINUTES = 45;

async function readCache(videoId: string): Promise<CacheRow | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/youtube_transcripts?video_id=eq.${encodeURIComponent(videoId)}&select=*`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row: CacheRow | undefined = Array.isArray(rows) ? rows[0] : undefined;
    if (!row) return null;
    if (!row.has_transcript) {
      const ageMin = (Date.now() - new Date(row.fetched_at).getTime()) / 60000;
      if (ageMin > NEGATIVE_CACHE_MINUTES) return null; // retry a failed fetch later
    }
    return row;
  } catch (e) {
    console.warn('transcript cache read failed', e);
    return null;
  }
}

async function writeCache(row: Omit<CacheRow, 'fetched_at'>): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/youtube_transcripts?on_conflict=video_id`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ ...row, fetched_at: new Date().toISOString() }),
    });
  } catch (e) {
    console.warn('transcript cache write failed', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url, videoId: rawId, refresh } = await req.json();
    const videoId = extractVideoId(rawId || url || '');
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Invalid YouTube URL or video ID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!refresh) {
      const cached = await readCache(videoId);
      if (cached) {
        const segs = Array.isArray(cached.segments) ? cached.segments : [];
        return new Response(JSON.stringify({
          videoId,
          title: cached.title,
          channel: cached.channel,
          description: cached.description,
          hasTranscript: cached.has_transcript && segs.length > 0,
          segments: segs,
          fullText: segs.length ? segs.map(s => s.text).join(' ') : cached.description,
          transcriptSource: 'cache',
          originalSource: cached.transcript_source,
          ...(cached.has_transcript ? {} : { warning: 'No captions available for this video' }),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }


    const ytHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+000; SOCS=CAISNQgDEitib3FfaWRlbnRfcm9udGVuZHVpc2VydmVyXzIwMjMwODA4LjA3X3AwGgJlbiACGgYIgLC_pwY',
    };

    let title = '';
    let channel = '';
    let description = '';
    let tracks: any[] = [];

    // 1) Try scraping the watch page (rich metadata + captionTracks)
    try {
      let watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, { headers: ytHeaders, redirect: 'follow' });
      let html = watchRes.ok ? await watchRes.text() : '';
      if (html && !html.includes('captionTracks') && (html.includes('consent.youtube.com') || html.includes('/sorry/'))) {
        watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en&persist_hl=1`, { headers: ytHeaders });
        if (watchRes.ok) html = await watchRes.text();
      }
      if (html) {
        const playerResponse = extractBalancedJson(html, 'ytInitialPlayerResponse') as any;
        const playerDetails = playerResponse?.videoDetails || {};
        if (!title && playerDetails.title) title = decodeEntities(playerDetails.title);
        if (!channel && playerDetails.author) channel = decodeEntities(playerDetails.author);
        const playerDescription = normalizeYouTubeDescription(playerDetails.shortDescription);
        if (!description && playerDescription) description = playerDescription;

        const tm = html.match(/<meta name="title" content="([^"]+)"/);
        if (tm) title = decodeEntities(tm[1]);
        else {
          const t2 = html.match(/<title>([^<]+)<\/title>/);
          if (t2) title = decodeEntities(t2[1]).replace(/\s*-\s*YouTube$/, '');
        }
        const cm = html.match(/"ownerChannelName":"([^"]+)"/);
        if (cm) channel = decodeEntities(cm[1]);

        // Description: prefer shortDescription JSON blob (multiline, unescaped),
        // fall back to og:description / meta description tags.
        const sd = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
        if (sd) {
          try {
            description = normalizeYouTubeDescription(JSON.parse(`"${sd[1]}"`)) || description;
          } catch {
            description = normalizeYouTubeDescription(sd[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')) || description;
          }
        }
        if (!description) {
          const og = html.match(/<meta property="og:description" content="([^"]+)"/);
          if (og) description = normalizeYouTubeDescription(og[1]);
        }
        if (!description) {
          const md = html.match(/<meta name="description" content="([^"]+)"/);
          if (md) description = normalizeYouTubeDescription(md[1]);
        }

        const key = '"captionTracks":';
        const idx = html.indexOf(key);
        if (idx !== -1) {
          const startArr = html.indexOf('[', idx);
          if (startArr !== -1) {
            let depth = 0, end = -1, inStr = false, esc = false;
            for (let i = startArr; i < html.length; i++) {
              const ch = html[i];
              if (inStr) {
                if (esc) esc = false;
                else if (ch === '\\') esc = true;
                else if (ch === '"') inStr = false;
              } else {
                if (ch === '"') inStr = true;
                else if (ch === '[') depth++;
                else if (ch === ']') { depth--; if (depth === 0) { end = i; break; } }
              }
            }
            if (end !== -1) {
              const raw = html.slice(startArr, end + 1).replace(/\\u0026/g, '&');
              try { tracks = JSON.parse(raw); } catch { tracks = []; }
            }
          }
        }
      } else {
        console.warn(`youtube-transcript: watch HTML unavailable (${watchRes.status}) for ${videoId}, falling back to Innertube`);
      }
    } catch (e) {
      console.warn('watch page scrape failed', e);
    }

    // 2) Fallback to Innertube if we couldn't find captionTracks or description
    if (!tracks.length || !description) {
      const inner = await fetchViaInnertube(videoId);
      if (!title) title = inner.title;
      if (!channel) channel = inner.channel;
      if (!description) description = inner.description;
      if (!tracks.length) tracks = inner.tracks;
    }

    // 3) If the watch/player endpoints were blocked or returned generic shell
    // metadata, use the Innertube watch-next endpoint. It usually carries the
    // full expandable YouTube description even when captions are absent.
    if (!description) {
      description = await fetchViaInnertubeNext(videoId);
    }

    // 4) Metadata last-resort: oEmbed gives title + channel
    if (!title || !channel) {
      const oe = await getOEmbed(videoId);
      if (!title) title = oe.title;
      if (!channel) channel = oe.channel;
    }

    // 5) Transcript acquisition chain
    let segments: Array<{ start: number; dur: number; text: string }> = [];
    let transcriptSource = 'none';

    if (tracks.length) {
      const track = tracks.find((t: any) => (t.languageCode || '').startsWith('en')) || tracks[0];
      segments = await fetchTranscriptFromTrack(track);
      if (segments.length) transcriptSource = 'caption_track';
    }

    if (!segments.length) {
      segments = await fetchViaTimedText(videoId);
      if (segments.length) transcriptSource = 'timedtext';
    }

    if (!segments.length) {
      segments = await fetchViaFirecrawl(videoId);
      if (segments.length) transcriptSource = 'scrape';
    }

    await writeCache({
      video_id: videoId,
      title: title || 'YouTube video',
      channel,
      description,
      segments,
      has_transcript: segments.length > 0,
      transcript_source: transcriptSource,
    });

    if (!segments.length) {
      return transcriptUnavailableResponse(videoId, title, channel, 'No captions available for this video', description);
    }

    const fullText = segments.map(s => s.text).join(' ');

    return new Response(JSON.stringify({
      videoId, title, channel, description, hasTranscript: true, segments, fullText, transcriptSource,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('youtube-transcript error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
