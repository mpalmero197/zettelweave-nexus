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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      throw new Error("Query is required");
    }

    console.log("Classifying intent for:", query);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an intent classification system. Analyze the user's search query and classify it into ONE of these intents:

1. "internal_search" - User is looking for their own notes, cards, or personal data
   - Examples: "my note about fishing", "find my project notes", "ideas I wrote last week"
   
2. "web_search" - User wants current information about the world, facts, news, or general knowledge
   - Examples: "what is the weather today", "who won the game", "latest news on AI", "how to bake a cake"
   
3. "image_generation" - User wants to CREATE a new image (not find one)
   - Examples: "generate an image of a red cat", "create a picture of mountains", "imagine a futuristic city"
   
4. "multimedia_search" - User wants to FIND existing videos or images
   - Examples: "find a video on react hooks", "show me pictures of the Eiffel tower", "search for coding tutorials"

Return ONLY a JSON object with the intent and a brief reason.`
          },
          {
            role: 'user',
            content: `Classify this query: "${query}"`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_intent",
              description: "Classify the user's search intent",
              parameters: {
                type: "object",
                properties: {
                  intent: {
                    type: "string",
                    enum: ["internal_search", "web_search", "image_generation", "multimedia_search"],
                    description: "The classified intent type"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score between 0 and 1"
                  },
                  reason: {
                    type: "string",
                    description: "Brief explanation of why this intent was chosen"
                  }
                },
                required: ["intent", "confidence", "reason"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_intent" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      // Default to internal search if classification fails
      return new Response(
        JSON.stringify({ 
          intent: "internal_search",
          confidence: 0.5,
          reason: "Classification failed, defaulting to internal search"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Intent classified:", result);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Intent classification error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        intent: "internal_search", // Fallback
        confidence: 0.5,
        reason: "Error occurred, defaulting to internal search"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
