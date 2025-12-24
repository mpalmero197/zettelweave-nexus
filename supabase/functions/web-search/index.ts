import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const isPing = await req.clone().json().then((b: any) => !!b?.ping).catch(() => false);
  if (isPing) {
    return new Response(JSON.stringify({ ok: true, pong: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, includeContext = true } = await req.json();
    
    // Validate input
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (query.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Query must be 500 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (includeContext !== undefined && typeof includeContext !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'includeContext must be a boolean' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Log only metadata, not user content
    console.log("Search request", {
      queryLength: query.length,
      hasContext: includeContext,
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    
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
    
    // Generate contextual understanding if requested
    let contextualData = null;
    if (includeContext && LOVABLE_API_KEY) {
      console.log('Generating contextual insights...');
      try {
        const contextResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                content: `You are a research assistant providing contextual understanding for search queries. Analyze the search query and results to provide:
1. Related concepts and resources to explore
2. Key definitions of important terms
3. Alternative perspectives or counter-arguments
4. Suggested follow-up questions

Be concise, actionable, and insightful.`
              },
              {
                role: 'user',
                content: `Search query: "${query}"\n\nSearch result summary: ${result.substring(0, 1500)}\n\nProvide contextual understanding.`
              }
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'provide_context',
                description: 'Provide contextual understanding for the search',
                parameters: {
                  type: 'object',
                  properties: {
                    relatedResources: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string', description: 'Resource title' },
                          description: { type: 'string', description: 'Brief description' },
                          relevance: { type: 'string', description: 'Why it\'s relevant (High/Medium)' }
                        },
                        required: ['title', 'description', 'relevance']
                      },
                      description: 'Related concepts and resources (3-5 items)'
                    },
                    definitions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          term: { type: 'string', description: 'Key term' },
                          definition: { type: 'string', description: 'Clear definition' }
                        },
                        required: ['term', 'definition']
                      },
                      description: 'Important term definitions (2-4 items)'
                    },
                    counterArguments: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          perspective: { type: 'string', description: 'Alternative viewpoint' },
                          summary: { type: 'string', description: 'Brief explanation' }
                        },
                        required: ['perspective', 'summary']
                      },
                      description: 'Alternative perspectives (2-3 items)'
                    },
                    followUpQuestions: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Suggested follow-up questions (3-5 items)'
                    }
                  },
                  required: ['relatedResources', 'definitions', 'counterArguments', 'followUpQuestions']
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'provide_context' } }
          })
        });

        if (contextResponse.ok) {
          const contextData = await contextResponse.json();
          const toolCall = contextData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            contextualData = JSON.parse(toolCall.function.arguments);
            console.log('Contextual insights generated successfully');
          }
        } else {
          const errorText = await contextResponse.text();
          console.error('Context generation failed:', contextResponse.status, errorText);
        }
      } catch (contextError) {
        console.error('Error generating contextual insights:', contextError);
        // Continue without context if it fails
      }
    }
    
    return new Response(
      JSON.stringify({ 
        result,
        query,
        images,
        videos: videoLinks,
        shopping: shoppingLinks,
        news: newsLinks,
        citations,
        relatedQuestions,
        contextualData
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
