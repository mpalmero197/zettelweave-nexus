import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cards, notes } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build content summary from cards and notes
    const contentParts: string[] = [];

    if (cards?.length) {
      for (const card of cards.slice(0, 50)) {
        const snippet = (card.content || "").slice(0, 300);
        contentParts.push(`[Card] ${card.title}: ${snippet}`);
      }
    }

    if (notes?.length) {
      for (const note of notes.slice(0, 30)) {
        const snippet = (note.content || "").slice(0, 300);
        contentParts.push(`[Note] ${note.title}: ${snippet}`);
      }
    }

    if (contentParts.length === 0) {
      return new Response(
        JSON.stringify({ gaps: [], message: "No content to analyze" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userContent = contentParts.join("\n\n");

    const systemPrompt = `You are a knowledge gap analyst. Given a user's notes and cards on various subjects, identify specific knowledge gaps — topics that are mentioned or implied but not deeply covered, assumptions without evidence, or related concepts that are missing.

For each gap, provide:
- A clear topic name
- Why it's a gap (what's missing or shallow)
- Severity: "high" (fundamental missing knowledge), "medium" (incomplete understanding), or "low" (nice-to-know)
- Which of the user's notes/cards relate to this gap
- Specific free learning resources:
  - 1-2 YouTube video search queries
  - 1-2 book titles (real, well-known books)
  - 1 Class Central or free course search term
  - 1 Wikipedia article title
  - 1 relevant quote from a notable figure

Identify 5-12 gaps. Focus on actionable, specific gaps rather than vague suggestions.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Analyze the following knowledge base and identify knowledge gaps:\n\n${userContent}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_knowledge_gaps",
                description:
                  "Report identified knowledge gaps with learning resources",
                parameters: {
                  type: "object",
                  properties: {
                    gaps: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          topic: { type: "string" },
                          description: { type: "string" },
                          severity: {
                            type: "string",
                            enum: ["high", "medium", "low"],
                          },
                          relatedNotes: {
                            type: "array",
                            items: { type: "string" },
                          },
                          resources: {
                            type: "object",
                            properties: {
                              videos: {
                                type: "array",
                                items: { type: "string" },
                              },
                              books: {
                                type: "array",
                                items: { type: "string" },
                              },
                              courses: {
                                type: "array",
                                items: { type: "string" },
                              },
                              articles: {
                                type: "array",
                                items: { type: "string" },
                              },
                              quotes: {
                                type: "array",
                                items: { type: "string" },
                              },
                            },
                            required: [
                              "videos",
                              "books",
                              "courses",
                              "articles",
                              "quotes",
                            ],
                            additionalProperties: false,
                          },
                        },
                        required: [
                          "topic",
                          "description",
                          "severity",
                          "relatedNotes",
                          "resources",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["gaps"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "report_knowledge_gaps" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-knowledge-gaps error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
