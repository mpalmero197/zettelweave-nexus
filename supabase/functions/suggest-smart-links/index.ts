import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { cardId, allCards } = await req.json();

    if (!cardId || !allCards || !Array.isArray(allCards)) {
      return new Response(
        JSON.stringify({ error: "cardId and allCards array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentCard = allCards.find((c: any) => c.id === cardId);
    if (!currentCard) {
      return new Response(JSON.stringify({ error: "Card not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const otherCards = allCards.filter((c: any) => c.id !== cardId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert knowledge management assistant analyzing a Zettelkasten card system.
Your task is to suggest meaningful connections between cards based on:
1. Conceptual relationships (cause-effect, compare-contrast, hierarchy)
2. Shared themes or topics
3. Complementary information
4. Knowledge gaps that could be filled by linking cards

Analyze the current card and suggest up to 5 cards that should be linked, with clear reasoning.`;

    const userPrompt = `Current Card:
Title: ${currentCard.title}
Content: ${currentCard.content}
Tags: ${(currentCard.tags || []).join(", ")}
Category: ${currentCard.category || "None"}

Other Available Cards:
${otherCards.slice(0, 50).map((c: any, i: number) => 
  `${i + 1}. [${c.cardNumber || "N/A"}] ${c.title}
   Content: ${c.content.substring(0, 200)}${c.content.length > 200 ? "..." : ""}
   Tags: ${(c.tags || []).join(", ")}`
).join("\n\n")}

Suggest up to 5 cards to link with the current card. Return a JSON array of suggested links.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_links",
              description: "Suggest meaningful links between Zettelkasten cards",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cardId: { type: "string", description: "ID of the card to link" },
                        cardTitle: { type: "string", description: "Title of the suggested card" },
                        relationshipType: { 
                          type: "string", 
                          enum: ["related", "builds-on", "contrasts", "example", "supports"],
                          description: "Type of relationship"
                        },
                        reasoning: { type: "string", description: "Why this link makes sense" },
                        strength: { 
                          type: "number", 
                          description: "Confidence score 0-1",
                          minimum: 0,
                          maximum: 1
                        },
                      },
                      required: ["cardId", "cardTitle", "relationshipType", "reasoning", "strength"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_links" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const suggestions = JSON.parse(toolCall.function.arguments).suggestions || [];

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in suggest-smart-links:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
