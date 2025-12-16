import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HuggingFace free embedding model - no API key required (rate limited)
const HUGGINGFACE_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HUGGINGFACE_API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HUGGINGFACE_MODEL}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentId, contentType, text } = await req.json();
    
    if (!contentId || !contentType || !text) {
      throw new Error('Missing required fields: contentId, contentType, text');
    }

    console.log('Generating embedding for text length:', text.length);

    // Truncate text if too long (model has 512 token limit, ~2000 chars safe)
    const truncatedText = text.slice(0, 2000);

    // Use HuggingFace's free inference API
    const embeddingResponse = await fetch(HUGGINGFACE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: truncatedText,
        options: { wait_for_model: true }
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('HuggingFace API error:', embeddingResponse.status, errorText);
      
      // Return 429 for rate limits
      if (embeddingResponse.status === 429 || embeddingResponse.status === 503) {
        return new Response(
          JSON.stringify({ 
            error: 'Embedding service is busy. Please try again later.',
            code: 'rate_limited'
          }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error(`Failed to generate embedding: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    
    // HuggingFace returns array directly for this model
    let embedding = embeddingData;
    
    // If nested array (sometimes happens), flatten it
    if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
      // Mean pooling for sentence embedding
      const numTokens = embedding.length;
      const dimensions = embedding[0].length;
      embedding = new Array(dimensions).fill(0);
      for (let i = 0; i < numTokens; i++) {
        for (let j = 0; j < dimensions; j++) {
          embedding[j] += embedding[i][j] / numTokens;
        }
      }
    }
    
    console.log('Successfully generated embedding with', embedding.length, 'dimensions');

    // Store embedding in database using user's auth token (respects RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const tableName = contentType === 'zettel_card' ? 'zettel_cards' : 'notes';
    
    // RLS automatically enforces user_id match - only owner can update
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ content_embedding: embedding })
      .eq('id', contentId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, dimensions: embedding.length }),
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