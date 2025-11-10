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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      throw new Error("Query is required");
    }

    console.log("Web search for:", query);
    
    // Detect language using Lovable AI
    console.log("Detecting language...");
    const languageDetectionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a language detection assistant. Detect the language of the user query and respond with only the language name in English (e.g., "English", "Spanish", "Chinese", "French", etc.). Be concise - only output the language name.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.1,
        max_tokens: 20,
      }),
    });

    let detectedLanguage = "English"; // Default to English
    if (languageDetectionResponse.ok) {
      const languageData = await languageDetectionResponse.json();
      detectedLanguage = languageData.choices?.[0]?.message?.content?.trim() || "English";
      console.log("Detected language:", detectedLanguage);
    } else {
      console.log("Language detection failed, defaulting to English");
    }
    
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
            content: `You are a comprehensive internet search assistant. The detected language for this query is ${detectedLanguage}. Provide your response and search results in ${detectedLanguage}. Include detailed, well-structured information from diverse sources across the web. Include facts, statistics, expert opinions, and multiple perspectives. Use markdown formatting with headers, bullet points, and emphasis for clarity. Be thorough, accurate, and cite-worthy.`
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
