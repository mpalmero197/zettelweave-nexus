import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query) throw new Error("query is required");

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
            content: `You are a course search engine that replicates the exact results a user would find on Class Central (classcentral.com). You have deep knowledge of Class Central's course catalog.

CRITICAL RULES:
1. Only return courses that ACTUALLY EXIST on Class Central. Do not invent or fabricate courses.
2. For the "url" field, use the real Class Central course page URL format: "https://www.classcentral.com/course/{platform}-{course-slug}" (e.g. "https://www.classcentral.com/course/coursera-machine-learning", "https://www.classcentral.com/course/edx-introduction-to-computer-science"). These are the actual URL slugs used by Class Central.
3. Match the results a user would see if they went to classcentral.com and typed the same search query. Include the same courses in roughly the same order of relevance.
4. Include real provider names (Coursera, edX, Udacity, FutureLearn, Swayam, Khan Academy, etc.) and real university/organization names.
5. Include accurate metadata: real ratings, real learner counts, real difficulty levels, and real durations as listed on Class Central.
6. If you are not confident a course exists on Class Central with that exact slug, use the format "https://www.classcentral.com/search?q={url-encoded-course-title}" as a fallback so the link still works.

Use the provide_courses tool to return structured results.`,
          },
          {
            role: "user",
            content: `Search Class Central for: ${query}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_courses",
              description: "Return structured course results matching Class Central's catalog",
              parameters: {
                type: "object",
                properties: {
                  courses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Exact course title as shown on Class Central" },
                        provider: { type: "string", description: "Platform name (Coursera, edX, Udacity, FutureLearn, Khan Academy, Swayam, etc.)" },
                        university: { type: "string", description: "University or organization offering it" },
                        url: { type: "string", description: "Real Class Central course page URL (https://www.classcentral.com/course/{platform}-{slug})" },
                        description: { type: "string", description: "2-3 sentence course description as shown on Class Central" },
                        difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced", "Mixed"] },
                        duration: { type: "string", description: "Duration as shown on Class Central, e.g. '6 weeks', '3 months', 'Self-paced'" },
                        is_free: { type: "boolean" },
                        rating: { type: "number", description: "Rating out of 5 as shown on Class Central" },
                        syllabus: {
                          type: "array",
                          items: { type: "string" },
                          description: "Key topics covered, 4-6 items",
                        },
                        learner_count: { type: "string", description: "Learner/review count as shown on Class Central, e.g. '4.2M learners'" },
                      },
                      required: ["title", "provider", "url", "description", "difficulty", "duration", "is_free", "syllabus"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["courses"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_courses" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const courses = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(courses), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-courses error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
