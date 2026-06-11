import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VideoResult {
  title: string;
  url: string;
  thumbnail: string;
  provider: string;
  channel: string;
  description: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractDailymotionId(url: string): string | null {
  const m = url.match(/dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/) ||
            url.match(/dai\.ly\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

function extractArchiveId(url: string): string | null {
  const m = url.match(/archive\.org\/(?:details|embed)\/([^\/?#]+)/);
  return m ? m[1] : null;
}

function detectProvider(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('vimeo.com')) return 'Vimeo';
  if (url.includes('dailymotion.com') || url.includes('dai.ly')) return 'Dailymotion';
  if (url.includes('odysee.com') || url.includes('lbry.tv')) return 'Odysee';
  if (url.includes('archive.org')) return 'Internet Archive';
  if (url.includes('peertube') || url.includes('framatube.org')) return 'PeerTube';
  if (url.includes('ted.com')) return 'TED';
  if (url.includes('khanacademy.org')) return 'Khan Academy';
  return 'Web';
}

function buildThumbnail(url: string): string {
  const ytId = extractYouTubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
  const dmId = extractDailymotionId(url);
  if (dmId) return `https://www.dailymotion.com/thumbnail/video/${dmId}`;
  const arId = extractArchiveId(url);
  if (arId) return `https://archive.org/services/img/${arId}`;
  return '';
}

function extractChannel(url: string, title: string): string {
  if (url.includes('khanacademy.org')) return 'Khan Academy';
  if (url.includes('ted.com')) return 'TED';
  if (url.includes('archive.org')) return 'Internet Archive';
  if (url.includes('odysee.com') || url.includes('lbry.tv')) return 'Odysee';
  if (url.includes('dailymotion.com') || url.includes('dai.ly')) return 'Dailymotion';
  if (url.includes('vimeo.com')) return 'Vimeo';
  const dash = title.lastIndexOf(' - ');
  if (dash > 0 && dash < title.length - 3) return title.substring(dash + 3).trim();
  const pipe = title.lastIndexOf(' | ');
  if (pipe > 0 && pipe < title.length - 3) return title.substring(pipe + 3).trim();
  return detectProvider(url);
}

function cleanTitle(title: string): string {
  const dash = title.lastIndexOf(' - ');
  if (dash > title.length * 0.4) return title.substring(0, dash).trim();
  const pipe = title.lastIndexOf(' | ');
  if (pipe > title.length * 0.4) return title.substring(0, pipe).trim();
  return title;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query } = await req.json();

    if (!query?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQuery = `(site:youtube.com OR site:vimeo.com OR site:dailymotion.com OR site:odysee.com OR site:archive.org/details OR site:ted.com OR site:khanacademy.org) "${query.trim()}"`;

    console.log('Searching videos:', searchQuery);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 24,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse results into video objects
    const results: VideoResult[] = (data.data || [])
      .filter((r: any) => r.url && r.title)
      .map((r: any) => ({
        title: cleanTitle(r.title || ''),
        url: r.url,
        thumbnail: buildThumbnail(r.url),
        provider: detectProvider(r.url),
        channel: extractChannel(r.url, r.title || ''),
        description: r.description || '',
      }));

    console.log(`Found ${results.length} video results`);

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching videos:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to search' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
