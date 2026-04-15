import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(ok: boolean, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const isPing = await req.clone().json().then((b: any) => !!b?.ping).catch(() => false);
  if (isPing) {
    return respond(true, { pong: true });
  }

  try {
    const { cardId, allCards } = await req.json();

    if (!cardId || !allCards || !Array.isArray(allCards)) {
      return respond(false, { error: "cardId and allCards array are required", suggestions: [] });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respond(false, { error: "No authorization header", suggestions: [] });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return respond(false, { error: "Unauthorized", suggestions: [] });
    }

    const currentCard = allCards.find((c: any) => c.id === cardId);
    if (!currentCard) {
      return respond(false, { error: "Card not found", suggestions: [] });
    }

    const otherCards = allCards.filter((c: any) => c.id !== cardId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return respond(false, { error: "AI service not configured", suggestions: [] });
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
      return respond(false, { error: "AI service error", suggestions: [] });
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return respond(true, { suggestions: [] });
    }

    const suggestions = JSON.parse(toolCall.function.arguments).suggestions || [];

    return respond(true, { suggestions });

  } catch (error) {
    console.error("Error in suggest-smart-links:", error);
    return respond(false, { error: error instanceof Error ? error.message : "Unknown error", suggestions: [] });
  }
});
