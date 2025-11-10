import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      throw new Error("Query is required");
    }

    console.log("Web search for:", query);
    
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a comprehensive internet search assistant. Always respond in English and search for English-language sources unless the query is clearly in Spanish or Simplified Chinese (Mandarin). Provide detailed, well-structured information from diverse sources across the web. Include facts, statistics, expert opinions, and multiple perspectives. Use markdown formatting with headers, bullet points, and emphasis for clarity. Be thorough, accurate, and cite-worthy.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 5000,
        return_images: true,
        return_related_questions: true,
        search_recency_filter: "year",
        stream: false
      }),
    });

    console.log("Perplexity response status:", perplexityResponse.status);
    
    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error("Perplexity API error:", perplexityResponse.status, errorText);
      throw new Error(`Search API error: ${perplexityResponse.status}`);
    }

    const data = await perplexityResponse.json();
    console.log("Search successful, processing results...");
    
    const result = data.choices?.[0]?.message?.content || "No results found.";
    const images = (data.images || []).filter((img: any) => typeof img === 'string' && img.startsWith('http'));
    const citations = (data.citations || []).filter((url: any) => typeof url === 'string' && url.startsWith('http'));
    const relatedQuestions = data.related_questions || [];
    
    console.log(`Found ${images.length} images, ${citations.length} citations, ${relatedQuestions.length} related questions`);
    
    // Extract video links from citations
    const videoLinks = citations.filter((url: string) => 
      url.includes('youtube.com') || 
      url.includes('youtu.be') || 
      url.includes('vimeo.com') ||
      url.includes('dailymotion.com')
    );

    // Extract shopping/product links
    const shoppingLinks = citations.filter((url: string) =>
      url.includes('amazon.com') ||
      url.includes('ebay.com') ||
      url.includes('shop') ||
      url.includes('store') ||
      url.includes('buy')
    );

    // Extract news links
    const newsLinks = citations.filter((url: string) =>
      url.includes('news') ||
      url.includes('bbc.com') ||
      url.includes('cnn.com') ||
      url.includes('reuters.com') ||
      url.includes('apnews.com')
    );

    console.log(`Results - Images: ${images.length}, Videos: ${videoLinks.length}, Shopping: ${shoppingLinks.length}, News: ${newsLinks.length}`);
    
    return new Response(
      JSON.stringify({ 
        result,
        query,
        images,
        videos: videoLinks,
        shopping: shoppingLinks,
        news: newsLinks,
        citations,
        relatedQuestions
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Web search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
