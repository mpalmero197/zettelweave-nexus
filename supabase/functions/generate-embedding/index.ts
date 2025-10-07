import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { contentId, contentType, text } = await req.json();
    
    if (!contentId || !contentType || !text) {
      throw new Error('Missing required fields: contentId, contentType, text');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating embedding for ${contentType} ${contentId}`);

    // Generate embedding using Lovable AI
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('Embedding API error:', embeddingResponse.status, errorText);
      throw new Error(`Failed to generate embedding: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // Store embedding in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tableName = contentType === 'zettel_card' ? 'zettel_cards' : 'notes';
    
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ content_embedding: embedding })
      .eq('id', contentId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log(`Successfully generated and stored embedding for ${contentType} ${contentId}`);

    return new Response(
      JSON.stringify({ success: true, embedding }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-embedding function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});