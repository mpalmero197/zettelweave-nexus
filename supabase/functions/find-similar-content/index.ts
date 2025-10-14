import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid token');
    }

    const { contentId, contentType, similarityThreshold = 0.85, maxResults = 5 } = await req.json();
    
    if (!contentId || !contentType) {
      throw new Error('Missing required fields: contentId, contentType');
    }

    console.log(`Finding similar content for ${contentType} ${contentId}`);

    let result;
    if (contentType === 'zettel_card') {
      result = await supabase.rpc('find_similar_zettel_cards', {
        target_id: contentId,
        similarity_threshold: similarityThreshold,
        max_results: maxResults
      });
    } else if (contentType === 'note') {
      result = await supabase.rpc('find_similar_notes', {
        target_id: contentId,
        similarity_threshold: similarityThreshold,
        max_results: maxResults
      });
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    if (result.error) {
      console.error('Database error:', result.error);
      throw result.error;
    }

    console.log(`Found ${result.data?.length || 0} similar items`);

    return new Response(
      JSON.stringify({ similar: result.data || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in find-similar-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});