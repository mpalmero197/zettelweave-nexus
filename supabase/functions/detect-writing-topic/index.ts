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
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 80) {
      return new Response(JSON.stringify({ topic: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmed = text.slice(-2000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You analyze a writer's draft and identify the single specific topic, person, place, event, concept or question they are exploring. Return a short noun phrase (3–8 words) suitable for a web search. If the text is too generic, fragmented, a to-do list, a personal journal entry, or has no clear research-worthy subject, return null.",
          },
          { role: "user", content: `Draft excerpt:\n"""\n${trimmed}\n"""` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_topic",
              description: "Report the detected research topic.",
              parameters: {
                type: "object",
                properties: {
                  topic: {
                    type: ["string", "null"],
                    description: "Concise topic phrase, or null if none detected.",
                  },
                  confidence: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                  },
                },
                required: ["topic", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_topic" } },
      }),
    });

    if (response.status === 429 || response.status === 402) {
      return new Response(JSON.stringify({ topic: null, throttled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const t = await response.text();
      console.error("Topic detect AI error:", response.status, t);
      return new Response(JSON.stringify({ topic: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let topic: string | null = null;
    let confidence = "low";
    try {
      const parsed = JSON.parse(call?.function?.arguments || "{}");
      topic = parsed.topic ?? null;
      confidence = parsed.confidence ?? "low";
    } catch {}

    if (topic && (confidence === "low" || topic.length < 3)) topic = null;

    return new Response(JSON.stringify({ topic, confidence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-writing-topic error:", e);
    return new Response(JSON.stringify({ topic: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
