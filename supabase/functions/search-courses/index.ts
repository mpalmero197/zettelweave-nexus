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
            content: `You are a course discovery assistant. Given a search query, generate 8 realistic course results that would be found on platforms like edX, Coursera, Class Central, MIT OpenCourseWare, Khan Academy, and Udacity. Each course should be realistic and useful. IMPORTANT: For the url field, construct a Class Central search URL by using "https://www.classcentral.com/search?q=" followed by the URL-encoded course title and provider name (e.g. "https://www.classcentral.com/search?q=Introduction+to+Machine+Learning+Stanford"). This ensures users land on a real Class Central search page with the actual course listing. Use the provide_courses tool to return structured results.`,
          },
          {
            role: "user",
            content: `Find courses about: ${query}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_courses",
              description: "Return structured course results",
              parameters: {
                type: "object",
                properties: {
                  courses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Full course title" },
                        provider: { type: "string", description: "Platform name (edX, Coursera, MIT OCW, Khan Academy, Udacity, Class Central)" },
                        university: { type: "string", description: "University or organization offering it, if applicable" },
                        url: { type: "string", description: "Class Central search URL: https://www.classcentral.com/search?q= followed by URL-encoded course title and provider (e.g. https://www.classcentral.com/search?q=Introduction+to+Machine+Learning+Stanford)." },
                        description: { type: "string", description: "2-3 sentence course description" },
                        difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
                        duration: { type: "string", description: "e.g. '6 weeks', '3 months', 'Self-paced'" },
                        is_free: { type: "boolean" },
                        rating: { type: "number", description: "Rating out of 5, e.g. 4.7" },
                        syllabus: {
                          type: "array",
                          items: { type: "string" },
                          description: "List of 4-6 key topics covered",
                        },
                        learner_count: { type: "string", description: "e.g. '120K learners'" },
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
