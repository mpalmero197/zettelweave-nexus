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
    const { subject } = await req.json();
    if (!subject || typeof subject !== "string" || subject.trim().length < 2) {
      return new Response(JSON.stringify({ error: "A subject is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("Missing LOVABLE_API_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating mind map for:", subject.trim());

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a mind map expert with deep knowledge across all subjects. Given a subject, create a comprehensive, well-researched mind map structure covering all major aspects. Rules:
- The root node is the main subject
- Create 4-8 main branches (major topics)
- Each branch should have 2-5 sub-items with specific, useful details
- Maximum depth is 3 levels (root -> branch -> sub-item)
- Keep node text concise (2-6 words max)
- Add a relevant emoji to each node for visual clarity
- Total nodes should not exceed 50
- Include real, accurate information — not generic placeholders
- Make the structure logical and easy to understand`,
          },
          {
            role: "user",
            content: `Create a detailed, well-researched mind map about: "${subject.trim()}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_mind_map",
              description: "Create a structured mind map with researched content",
              parameters: {
                type: "object",
                properties: {
                  root: {
                    type: "object",
                    properties: {
                      text: { type: "string", description: "Root node text (the main subject)" },
                      emoji: { type: "string", description: "Emoji for the root node" },
                    },
                    required: ["text", "emoji"],
                  },
                  branches: {
                    type: "array",
                    description: "Main branches of the mind map (4-8 items)",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "Branch topic (2-6 words)" },
                        emoji: { type: "string", description: "Relevant emoji" },
                        children: {
                          type: "array",
                          description: "Sub-items under this branch (2-5 items)",
                          items: {
                            type: "object",
                            properties: {
                              text: { type: "string", description: "Sub-item text (2-6 words)" },
                              emoji: { type: "string", description: "Relevant emoji" },
                            },
                            required: ["text", "emoji"],
                          },
                        },
                      },
                      required: ["text", "emoji", "children"],
                    },
                  },
                },
                required: ["root", "branches"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_mind_map" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error("AI Gateway error:", status);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_mind_map") {
      console.error("Unexpected AI response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Failed to structure mind map" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let mindMapData;
    try {
      mindMapData = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool call arguments:", e);
      return new Response(JSON.stringify({ error: "Failed to parse mind map structure" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Mind map generated:", mindMapData.root.text, "with", mindMapData.branches?.length, "branches");

    return new Response(JSON.stringify(mindMapData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-mindmap error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
