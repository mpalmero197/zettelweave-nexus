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
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
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

    const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BakuScribeBot/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!watchRes.ok) {
      return new Response(JSON.stringify({ error: `YouTube fetch failed: ${watchRes.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const html = await watchRes.text();

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

    // Extract captionTracks
    const captionsMatch = html.match(/"captionTracks":(\[[^\]]+\])/);
    if (!captionsMatch) {
      return new Response(JSON.stringify({
        videoId, title, channel, hasTranscript: false, segments: [], fullText: '',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let tracks: any[] = [];
    try {
      tracks = JSON.parse(captionsMatch[1].replace(/\\u0026/g, '&'));
    } catch {
      tracks = [];
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
