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

    const contentParts: string[] = [];

    if (cards?.length) {
      for (const card of cards.slice(0, 50)) {
        const snippet = (card.content || "").slice(0, 400);
        contentParts.push(`[Card] "${card.title}": ${snippet}`);
      }
    }

    if (notes?.length) {
      for (const note of notes.slice(0, 30)) {
        const snippet = (note.content || "").slice(0, 400);
        contentParts.push(`[Note] "${note.title}": ${snippet}`);
      }
    }

    if (contentParts.length === 0) {
      return new Response(
        JSON.stringify({ gaps: [], message: "No content to analyze" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userContent = contentParts.join("\n\n");

    const systemPrompt = `You are a knowledge gap analyst and educator. Given a user's notes and cards on various subjects, identify specific knowledge gaps — topics that are mentioned or implied but not deeply covered, assumptions without evidence, or related concepts that are missing.

For each gap you MUST provide SUBSTANTIVE educational content, not just labels. Each gap should teach the user something and explain exactly what they're missing.

For each gap, provide:
- topic: A clear, specific topic name
- description: A 1-2 sentence summary of why this is a gap
- detailed_explanation: A 3-5 paragraph educational explanation of the topic itself — what it is, why it matters, key concepts, and how it connects to what the user already knows. This should be genuinely informative, like a mini-article. Include specific facts, frameworks, or principles.
- what_you_know: A summary of what the user's existing content covers about this topic (based on their cards/notes). Be specific about what they got right or touched on.
- what_you_need_to_learn: A concrete list of specific sub-topics, concepts, or skills they need to study to fill this gap. Be actionable and specific.
- severity: "high" (fundamental missing knowledge that undermines understanding), "medium" (incomplete understanding that limits depth), or "low" (supplementary knowledge that would enrich understanding)
- sourceMaterials: An array identifying EXACTLY which of the user's cards or notes relate to this gap. Each must have "title" (exact title from user's content) and "type" ("card" or "note").
- resources: Specific free learning resources:
  - videos: 1-2 specific YouTube video search queries
  - books: 1-2 real, well-known book titles with authors
  - courses: 1 Class Central or free course search term
  - articles: 1 Wikipedia article title
  - quotes: 1 relevant quote from a notable figure (include attribution)

Identify 5-12 gaps. Focus on actionable, specific gaps. The detailed_explanation should be genuinely educational — imagine you're writing a brief encyclopedia entry for someone who needs to understand this topic.`;

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
              content: `Analyze the following knowledge base and identify knowledge gaps with detailed educational content:\n\n${userContent}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_knowledge_gaps",
                description:
                  "Report identified knowledge gaps with detailed educational content and learning resources",
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
                          detailed_explanation: { type: "string" },
                          what_you_know: { type: "string" },
                          what_you_need_to_learn: { type: "string" },
                          severity: {
                            type: "string",
                            enum: ["high", "medium", "low"],
                          },
                          sourceMaterials: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                title: { type: "string" },
                                type: { type: "string", enum: ["card", "note"] },
                              },
                              required: ["title", "type"],
                              additionalProperties: false,
                            },
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
                          "detailed_explanation",
                          "what_you_know",
                          "what_you_need_to_learn",
                          "severity",
                          "sourceMaterials",
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
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
