import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeText, jobDescription, customInstructions, constraints } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const constraintLines: string[] = [];
    if (constraints?.enforceOnePage) constraintLines.push("- The output MUST fit on a single page. Be ruthlessly concise.");
    if (constraints?.cleanFormatting) constraintLines.push("- Apply clean, professional formatting with clear section headers, consistent bullet points, and proper spacing.");
    if (constraints?.extractAtsKeywords) constraintLines.push("- Extract relevant ATS keywords from the job description and inject them naturally into the Skills section and throughout the resume.");

    const systemPrompt = `You are an expert resume writer and ATS optimization specialist. Your task is to optimize the user's resume for a specific job posting.

Rules:
${constraintLines.join("\n") || "- No special constraints."}

Output requirements:
1. Return the FULL optimized resume as plain text with clear formatting (headers in ALL CAPS, bullet points with dashes).
2. After the resume, on a new line, output "---KEYWORDS---" followed by a JSON array of the ATS keywords you injected (e.g., ["Python", "Project Management", "Agile"]).
3. Do NOT include any other commentary or explanation outside the resume itself.`;

    const userPrompt = `Here is my current resume:

${resumeText}

${jobDescription ? `Target job description:\n${jobDescription}` : "No specific job description provided — optimize for general ATS compatibility."}

${customInstructions ? `Additional instructions:\n${customInstructions}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace (402)." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Parse keywords from delimiter
    let optimizedResume = raw;
    let keywords: string[] = [];
    const sep = "---KEYWORDS---";
    const sepIdx = raw.indexOf(sep);
    if (sepIdx !== -1) {
      optimizedResume = raw.substring(0, sepIdx).trim();
      const kwStr = raw.substring(sepIdx + sep.length).trim();
      try {
        keywords = JSON.parse(kwStr);
      } catch {
        // Try to extract array from the string
        const match = kwStr.match(/\[.*\]/s);
        if (match) {
          try { keywords = JSON.parse(match[0]); } catch { /* ignore */ }
        }
      }
    }

    return new Response(JSON.stringify({ optimizedResume, keywords }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("optimize-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
