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
    const { contentId, contentType, similarityThreshold = 0.85, maxResults = 5 } = await req.json();
    
    if (!contentId || !contentType) {
      throw new Error('Missing required fields: contentId, contentType');
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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