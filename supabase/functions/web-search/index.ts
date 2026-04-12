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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Search request", {
      queryLength: query.length,
      hasContext: includeContext,
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    // Use Gemini via Lovable AI Gateway for web search
    console.log("Running Gemini web search for:", query.length, "chars");
    const searchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a comprehensive web search assistant. Answer the user's query with accurate, up-to-date information as if you have access to the internet. 
Provide detailed, well-structured responses using markdown formatting with headers, bullet points, and emphasis.
Include facts, statistics, expert perspectives, and multiple viewpoints where relevant.

At the end of your response, always include ALL of these sections:

## Images
List 4-8 direct image URLs (ending in .jpg, .png, .webp, or from image hosting services) that are relevant to the query. Use real, plausible image URLs from sites like Wikipedia Commons, Unsplash, Pexels, or relevant official sites. One URL per line.

## Videos
List 3-5 relevant video URLs from YouTube, Vimeo, TED, Khan Academy, or other video platforms. Include the full URL. One URL per line, formatted as:
- [Video Title](URL)

## Shopping
If the query relates to a product, tool, book, or purchasable item, list 3-5 shopping links from Amazon, eBay, or relevant retailers. One per line, formatted as:
- [Product Name - $Price](URL)
If the query is not shopping-related, write "No shopping results for this query."

## Sources
List 3-5 plausible authoritative source URLs (formatted as plain URLs, one per line).

## Related Questions
List 3-5 follow-up questions the user might want to explore.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    console.log("Gemini search response status:", searchResponse.status);

    if (!searchResponse.ok) {
      if (searchResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (searchResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await searchResponse.text();
      console.error("Gemini API error:", searchResponse.status, errorText);
      throw new Error(`Search API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const fullResult = searchData.choices?.[0]?.message?.content || "No results found.";

    // Parse structured sections from the response
    const extractSection = (header: string) => {
      const regex = new RegExp(`## ${header}\\n([\\s\\S]*?)(?=\\n## |$)`);
      return fullResult.match(regex)?.[1] || '';
    };

    const extractUrls = (section: string): string[] => {
      const urls: string[] = [];
      const lines = section.split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        const urlMatch = line.match(/https?:\/\/[^\s)>\]]+/);
        if (urlMatch) urls.push(urlMatch[0]);
      }
      return urls;
    };

    const extractLabeledLinks = (section: string): { title: string; url: string }[] => {
      const links: { title: string; url: string }[] = [];
      const lines = section.split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        const mdLink = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
        if (mdLink) {
          links.push({ title: mdLink[1], url: mdLink[2] });
        } else {
          const urlMatch = line.match(/https?:\/\/[^\s)>\]]+/);
          if (urlMatch) links.push({ title: '', url: urlMatch[0] });
        }
      }
      return links;
    };

    const citations = extractUrls(extractSection('Sources'));
    const imageUrls = extractUrls(extractSection('Images'));
    const videoLinks = extractLabeledLinks(extractSection('Videos'));
    const shoppingLinks = extractLabeledLinks(extractSection('Shopping'));

    const relatedQuestions: string[] = [];
    const relatedSection = extractSection('Related Questions');
    if (relatedSection) {
      const lines = relatedSection.split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        const clean = line.replace(/^[\d\.\-\*\s]+/, '').trim();
        if (clean) relatedQuestions.push(clean);
      }
    }

    // Strip structured sections from the main result for cleaner display
    const result = fullResult
      .replace(/## Images[\s\S]*?(?=\n## |$)/, '')
      .replace(/## Videos[\s\S]*?(?=\n## |$)/, '')
      .replace(/## Shopping[\s\S]*?(?=\n## |$)/, '')
      .replace(/## Sources[\s\S]*?(?=\n## |$)/, '')
      .replace(/## Related Questions[\s\S]*$/, '')
      .trim();

    // Categorise citation URLs for news
    const newsLinks = citations.filter((url: string) =>
      url.includes('news') || url.includes('bbc.com') || url.includes('cnn.com') || url.includes('reuters.com')
    );

    console.log(`Results - Images: ${imageUrls.length}, Videos: ${videoLinks.length}, Shopping: ${shoppingLinks.length}, Citations: ${citations.length}, Related: ${relatedQuestions.length}`);

    // Generate contextual insights if requested
    let contextualData = null;
    if (includeContext) {
      console.log('Generating contextual insights...');
      try {
        const contextResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
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
                          title: { type: 'string' },
                          description: { type: 'string' },
                          relevance: { type: 'string' }
                        },
                        required: ['title', 'description', 'relevance']
                      }
                    },
                    definitions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          term: { type: 'string' },
                          definition: { type: 'string' }
                        },
                        required: ['term', 'definition']
                      }
                    },
                    counterArguments: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          perspective: { type: 'string' },
                          summary: { type: 'string' }
                        },
                        required: ['perspective', 'summary']
                      }
                    },
                    followUpQuestions: {
                      type: 'array',
                      items: { type: 'string' }
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
          console.error('Context generation failed:', contextResponse.status);
        }
      } catch (contextError) {
        console.error('Error generating contextual insights:', contextError);
      }
    }

    return new Response(
      JSON.stringify({
        result,
        query,
        images: imageUrls,
        videos: videoLinks.map(v => v.url),
        videoDetails: videoLinks,
        shopping: shoppingLinks.map(s => s.url),
        shoppingDetails: shoppingLinks,
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
