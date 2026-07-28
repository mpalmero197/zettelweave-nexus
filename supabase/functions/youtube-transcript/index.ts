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

async function getOEmbedTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { headers: { 'Accept': 'application/json' } },
    );
    if (!res.ok) return '';
    const data = await res.json();
    return typeof data?.title === 'string' ? decodeEntities(data.title) : '';
  } catch {
    return '';
  }
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url, videoId: rawId } = await req.json();
    const videoId = extractVideoId(rawId || url || '');
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Invalid YouTube URL or video ID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // 4) Last-resort: oEmbed for at least a title
    if (!title) title = await getOEmbedTitle(videoId);

    if (!tracks.length) {
      return transcriptUnavailableResponse(videoId, title, channel, 'No captions available for this video', description);
    }

    // Prefer English, else first
    const track = tracks.find((t: any) => (t.languageCode || '').startsWith('en')) || tracks[0];
    const segments = await fetchTranscriptFromTrack(track);
    if (!segments.length) {
      return transcriptUnavailableResponse(videoId, title, channel, 'Transcript could not be downloaded', description);
    }
    const fullText = segments.map(s => s.text).join(' ');

    return new Response(JSON.stringify({
      videoId, title, channel, description, hasTranscript: true, segments, fullText,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('youtube-transcript error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
