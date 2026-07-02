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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cards = [], excludeTitles = [], count = 9 } = await req.json();

    if (!Array.isArray(cards)) {
      return new Response(JSON.stringify({ error: "cards must be an array" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Compact the user's real card content into a grounding digest
    const digest = cards
      .slice(0, 40)
      .map((c: any, i: number) =>
        `${i + 1}. [${c.category || "000"}] "${(c.title || "").slice(0, 120)}" — ${(c.content || c.description || "").replace(/\s+/g, " ").slice(0, 240)} (tags: ${(c.tags || []).slice(0, 6).join(", ") || "none"})`
      )
      .join("\n");

    const exclusions = (excludeTitles as string[]).slice(0, 80);
    const n = Math.min(Math.max(Number(count) || 9, 3), 18);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content: `You are a Zettelkasten thinking partner. Given a user's REAL note cards, suggest NEW cards that genuinely extend, deepen, challenge, or bridge THEIR specific ideas. Rules:
- Every suggestion MUST be traceable to specific cards in the digest (name them in "reasoning").
- Never suggest generic filler ("Epistemological Foundations", "Ethical Implications", etc.) unless the user's cards are literally about that.
- Mix suggestion types: deepen an existing idea, connect two of their cards, a counter-argument to one of their claims, a practical application, an adjacent field worth exploring.
- "category" must be a 3-digit Dewey class (000-900) matching the topic.
- "content" is a 2-4 sentence starter the user can build on, written about THEIR topic, not boilerplate.
- Do NOT repeat any excluded titles or near-duplicates of them.`,
          },
          {
            role: "user",
            content: `MY CARDS:\n${digest || "(no cards yet — suggest starter cards for building a personal knowledge system)"}\n\nALREADY SUGGESTED (do not repeat or rephrase): ${exclusions.join("; ") || "none"}\n\nGenerate ${n} new card suggestions.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_cards",
              description: "Return new card suggestions grounded in the user's actual notes",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string", description: "One-line summary" },
                        content: { type: "string", description: "2-4 sentence starter text" },
                        category: { type: "string", description: "3-digit Dewey class like 100, 320, 004" },
                        tags: { type: "array", items: { type: "string" } },
                        reasoning: { type: "string", description: "Which of the user's cards inspired this and how" },
                      },
                      required: ["title", "description", "content", "category", "tags", "reasoning"],
                    },
                  },
                },
                required: ["suggestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_cards" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required. Please add credits to your workspace." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        suggestions = JSON.parse(toolCall.function.arguments).suggestions || [];
      } catch (e) {
        console.error("Failed to parse suggestions:", e);
      }
    }

    // Sanitize
    const excludeSet = new Set(exclusions.map((t) => t.toLowerCase().trim()));
    suggestions = suggestions
      .filter((s) => s?.title && !excludeSet.has(String(s.title).toLowerCase().trim()))
      .slice(0, n)
      .map((s, i) => ({
        id: `rec-${Date.now()}-${i}`,
        title: String(s.title).slice(0, 160),
        description: String(s.description || "").slice(0, 300),
        content: String(s.content || "").slice(0, 1200),
        category: /^\d{3}$/.test(String(s.category)) ? String(s.category) : "000",
        tags: Array.isArray(s.tags) ? s.tags.slice(0, 6).map((t: any) => String(t)) : [],
        reasoning: String(s.reasoning || "").slice(0, 300),
      }));

    console.log(`recommend-cards: ${suggestions.length} suggestions for user ${user.id} (from ${cards.length} cards, ${exclusions.length} exclusions)`);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("recommend-cards error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
