import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic } = await req.json();
    if (!topic) throw new Error("topic is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `You are a learning path architect. Given a topic, create a comprehensive hierarchical topic map that shows what someone needs to learn, in what order, with resources for each node. Think like learn-anything.xyz — create interconnected learning paths with prerequisites flowing into advanced topics. Use the provide_topic_map tool.`,
          },
          {
            role: "user",
            content: `Create a comprehensive learning topic map for: ${topic}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_topic_map",
              description: "Return a hierarchical topic map",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Main topic title" },
                  description: { type: "string", description: "Brief overview of the learning path" },
                  estimated_total_time: { type: "string", description: "e.g. '3-6 months'" },
                  nodes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string", description: "1-2 sentence explanation" },
                        difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
                        estimated_time: { type: "string", description: "e.g. '2 weeks'" },
                        prerequisites: {
                          type: "array",
                          items: { type: "string" },
                          description: "IDs of prerequisite nodes",
                        },
                        resources: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              url: { type: "string" },
                              type: { type: "string", enum: ["course", "article", "video", "book", "tool", "practice"] },
                              is_free: { type: "boolean" },
                            },
                            required: ["title", "url", "type", "is_free"],
                            additionalProperties: false,
                          },
                        },
                        children: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              title: { type: "string" },
                              description: { type: "string" },
                              difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
                              estimated_time: { type: "string" },
                              resources: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    title: { type: "string" },
                                    url: { type: "string" },
                                    type: { type: "string", enum: ["course", "article", "video", "book", "tool", "practice"] },
                                    is_free: { type: "boolean" },
                                  },
                                  required: ["title", "url", "type", "is_free"],
                                  additionalProperties: false,
                                },
                              },
                            },
                            required: ["id", "title", "description", "difficulty", "resources"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["id", "title", "description", "difficulty", "resources", "children"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "description", "estimated_total_time", "nodes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_topic_map" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const topicMap = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(topicMap), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-topic-map error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
