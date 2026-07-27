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

// Fallback: use YouTube's Innertube (mobile web client) player endpoint,
// which is far less aggressively rate-limited than the watch HTML page.
async function fetchViaInnertube(videoId: string): Promise<{ title: string; channel: string; tracks: any[] }> {
  try {
    const body = {
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '19.09.37',
          androidSdkVersion: 30,
          hl: 'en',
          gl: 'US',
          userAgent: 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
        },
      },
      videoId,
    };
    const res = await fetch(
      'https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
          'X-YouTube-Client-Name': '3',
          'X-YouTube-Client-Version': '19.09.37',
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) return { title: '', channel: '', tracks: [] };
    const data = await res.json();
    const title = data?.videoDetails?.title || '';
    const channel = data?.videoDetails?.author || '';
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    return { title, channel, tracks };
  } catch (e) {
    console.warn('innertube fallback failed', e);
    return { title: '', channel: '', tracks: [] };
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
        const tm = html.match(/<meta name="title" content="([^"]+)"/);
        if (tm) title = decodeEntities(tm[1]);
        else {
          const t2 = html.match(/<title>([^<]+)<\/title>/);
          if (t2) title = decodeEntities(t2[1]).replace(/\s*-\s*YouTube$/, '');
        }
        const cm = html.match(/"ownerChannelName":"([^"]+)"/);
        if (cm) channel = decodeEntities(cm[1]);

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

    // 2) Fallback to Innertube if we couldn't find captionTracks
    if (!tracks.length) {
      const inner = await fetchViaInnertube(videoId);
      if (!title) title = inner.title;
      if (!channel) channel = inner.channel;
      tracks = inner.tracks;
    }

    // 3) Last-resort: oEmbed for at least a title
    if (!title) title = await getOEmbedTitle(videoId);

    if (!tracks.length) {
      return transcriptUnavailableResponse(videoId, title, channel, 'No captions available for this video');
    }

    // Prefer English, else first
    const track = tracks.find((t: any) => (t.languageCode || '').startsWith('en')) || tracks[0];
    const segments = await fetchTranscriptFromTrack(track);
    if (!segments.length) {
      return transcriptUnavailableResponse(videoId, title, channel, 'Transcript could not be downloaded');
    }
    const fullText = segments.map(s => s.text).join(' ');

    return new Response(JSON.stringify({
      videoId, title, channel, hasTranscript: true, segments, fullText,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('youtube-transcript error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
