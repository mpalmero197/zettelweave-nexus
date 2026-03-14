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
    const { subject, questionCount } = await req.json();

    if (!subject || typeof subject !== "string" || subject.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "A valid subject is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const count = Math.min(Math.max(Number(questionCount) || 50, 5), 150);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert exam creator. You generate high-quality multiple-choice exam questions on any subject the user specifies.

CRITICAL RULES:
1. Every question MUST have exactly 4 answer choices (A, B, C, D) with only ONE correct answer.
2. The correct answer MUST be verifiable from a real, published, authoritative source. You MUST cite that source precisely.
3. Citations MUST include: the exact title of the source document, the specific section/chapter/page/regulation number, the publisher or issuing authority, and ISBN or official document number when applicable.
   Example citation: "Source: 14 CFR Part §107.41 'Operation in certain airspace.' on Page 351 of the 2026 FAR/AIM published by Aviation Supplies & Academics Inc. ISBN 978-1-64425-498-1"
4. Wrong answers (distractors) MUST be plausible. They should use real terminology, real concepts, or real information from the same field — but applied incorrectly or to the wrong context. They must NOT be obviously wrong.
5. Include a brief explanation for why the correct answer is right and why the distractors are wrong.
6. If the subject involves regulations, standards, or official publications, reference specific sections, paragraphs, and page numbers.
7. If the subject involves visual materials (charts, diagrams, etc.), describe them textually and reference the specific publication they come from.
8. Do NOT guess or assume. If you cannot find a verifiable source for a question, do not include that question.
9. Generate exactly ${count} questions.
10. Vary difficulty across the exam — mix easy, medium, and hard questions.`;

    const userPrompt = `Generate a ${count}-question multiple-choice exam on the following subject: "${subject.trim()}"

Each question must have verifiable answers cited from authoritative published sources. Wrong answers must be plausible distractors using real but misapplied information from the same field.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_exam",
                description: `Generate a structured multiple-choice exam with ${count} questions, each with citations.`,
                parameters: {
                  type: "object",
                  properties: {
                    questions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: {
                            type: "string",
                            description: "The question text",
                          },
                          choices: {
                            type: "object",
                            properties: {
                              a: { type: "string" },
                              b: { type: "string" },
                              c: { type: "string" },
                              d: { type: "string" },
                            },
                            required: ["a", "b", "c", "d"],
                            additionalProperties: false,
                          },
                          correctAnswer: {
                            type: "string",
                            enum: ["a", "b", "c", "d"],
                            description: "The letter of the correct answer",
                          },
                          citation: {
                            type: "string",
                            description:
                              "Full citation for the correct answer including source title, section/page, publisher, and ISBN/document number",
                          },
                          explanation: {
                            type: "string",
                            description:
                              "Brief explanation of why the correct answer is right and why distractors are wrong",
                          },
                        },
                        required: [
                          "question",
                          "choices",
                          "correctAnswer",
                          "citation",
                          "explanation",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["questions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "generate_exam" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Failed to generate exam. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_exam") {
      console.error("Unexpected response structure:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Failed to parse exam data. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const examData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(examData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-mock-exam error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
