import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('youtube-transcript: missing Authorization header');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        console.warn('youtube-transcript: auth failed', authErr?.message);
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (authEx) {
      console.error('youtube-transcript: auth exception', authEx);
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+000; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODA4LjA3X3AwGgJlbiACGgYIgLC_pwY',
    };

    let watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, { headers: ytHeaders, redirect: 'follow' });
    if (!watchRes.ok) {
      return new Response(JSON.stringify({ error: `YouTube fetch failed: ${watchRes.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let html = await watchRes.text();

    // If we hit a consent interstitial, retry with hl=en and stronger cookie
    if (!html.includes('captionTracks') && (html.includes('consent.youtube.com') || html.includes('/sorry/'))) {
      watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en&persist_hl=1`, { headers: ytHeaders });
      if (watchRes.ok) html = await watchRes.text();
    }

    // Title
    let title = '';
    const tm = html.match(/<meta name="title" content="([^"]+)"/);
    if (tm) title = decodeEntities(tm[1]);
    else {
      const t2 = html.match(/<title>([^<]+)<\/title>/);
      if (t2) title = decodeEntities(t2[1]).replace(/\s*-\s*YouTube$/, '');
    }

    // Channel
    let channel = '';
    const cm = html.match(/"ownerChannelName":"([^"]+)"/);
    if (cm) channel = decodeEntities(cm[1]);

    // Extract captionTracks with bracket-aware scan (handles nested arrays/objects)
    let tracks: any[] = [];
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
    if (!tracks.length) {
      return new Response(JSON.stringify({
        videoId, title, channel, hasTranscript: false, segments: [], fullText: '',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!tracks.length) {
      return new Response(JSON.stringify({
        videoId, title, channel, hasTranscript: false, segments: [], fullText: '',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Prefer English, else first
    const track = tracks.find(t => (t.languageCode || '').startsWith('en')) || tracks[0];
    const baseUrl: string = track.baseUrl.replace(/\\u0026/g, '&');

    const xmlRes = await fetch(baseUrl);
    if (!xmlRes.ok) {
      return new Response(JSON.stringify({
        videoId, title, channel, hasTranscript: false, segments: [], fullText: '',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const xml = await xmlRes.text();
    const segments = parseTranscriptXml(xml);
    const fullText = segments.map(s => s.text).join(' ');

    return new Response(JSON.stringify({
      videoId, title, channel, hasTranscript: segments.length > 0, segments, fullText,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('youtube-transcript error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
