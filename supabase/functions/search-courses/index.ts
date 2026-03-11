import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function scrapeClassCentral(query: string, apiKey: string): Promise<string | null> {
  try {
    const searchUrl = `https://www.classcentral.com/search?q=${encodeURIComponent(query)}`;
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.data?.markdown || data.markdown || null;
  } catch (e) {
    console.error("Firecrawl fetch failed:", e);
    return null;
  }
}

async function structureWithLLM(markdown: string, query: string, llmKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${llmKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are a data extraction assistant. You will receive scraped markdown from a Class Central search results page. Extract the course listings into structured JSON.

RULES:
1. Only extract courses that actually appear in the provided markdown. Do NOT invent courses.
2. For each course URL, use the format: https://www.classcentral.com/search?q=<url-encoded exact course title>
   This ensures the link always works and shows the correct course on Class Central.
3. Extract as much metadata as visible: title, provider/platform, university, description, difficulty, duration, rating, learner count, whether it's free.
4. For syllabus, extract key topics if visible, otherwise provide 3-4 likely topics based on the title.
5. Return 5-10 courses maximum.

Use the provide_courses tool to return results.`,
        },
        {
          role: "user",
          content: `Here is the scraped Class Central search results page for "${query}":\n\n${markdown}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "provide_courses",
            description: "Return structured course results extracted from the scraped data",
            parameters: {
              type: "object",
              properties: {
                courses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      provider: { type: "string" },
                      university: { type: "string" },
                      url: { type: "string" },
                      description: { type: "string" },
                      difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced", "Mixed"] },
                      duration: { type: "string" },
                      is_free: { type: "boolean" },
                      rating: { type: "number" },
                      syllabus: { type: "array", items: { type: "string" } },
                      learner_count: { type: "string" },
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
    console.error("LLM error:", status, text);
    throw new Error(`LLM error: ${status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in LLM response");
  return JSON.parse(toolCall.function.arguments);
}

async function fallbackLLMOnly(query: string, llmKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${llmKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are a course search engine. Return courses that are likely found on Class Central for the given query.

CRITICAL: For every course URL, use this format: https://www.classcentral.com/search?q=<url-encoded exact course title>
Do NOT guess URL slugs. Only use search-based URLs.

Use the provide_courses tool.`,
        },
        { role: "user", content: `Search for courses about: ${query}` },
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
                      title: { type: "string" },
                      provider: { type: "string" },
                      university: { type: "string" },
                      url: { type: "string" },
                      description: { type: "string" },
                      difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced", "Mixed"] },
                      duration: { type: "string" },
                      is_free: { type: "boolean" },
                      rating: { type: "number" },
                      syllabus: { type: "array", items: { type: "string" } },
                      learner_count: { type: "string" },
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

  if (!response.ok) throw new Error(`Fallback LLM error: ${response.status}`);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in fallback response");
  return JSON.parse(toolCall.function.arguments);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query) throw new Error("query is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    let courses;

    if (FIRECRAWL_API_KEY) {
      console.log("Scraping Class Central for:", query);
      const markdown = await scrapeClassCentral(query, FIRECRAWL_API_KEY);

      if (markdown) {
        console.log("Got markdown, structuring with LLM...");
        courses = await structureWithLLM(markdown, query, LOVABLE_API_KEY);
      } else {
        console.log("Firecrawl failed, using LLM fallback");
        courses = await fallbackLLMOnly(query, LOVABLE_API_KEY);
      }
    } else {
      console.log("No Firecrawl key, using LLM fallback");
      courses = await fallbackLLMOnly(query, LOVABLE_API_KEY);
    }

    return new Response(JSON.stringify(courses), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-courses error:", e);

    if (e.message?.includes("429")) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (e.message?.includes("402")) {
      return new Response(JSON.stringify({ error: "Payment required." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
