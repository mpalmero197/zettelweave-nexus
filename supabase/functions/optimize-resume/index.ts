import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      resumeText,
      jobDescription,
      customInstructions,
      constraints,
      templateId,
      templateSections,
      templateTone,
      experienceLevel,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build constraint lines
    const constraintLines: string[] = [];
    if (constraints?.enforceOnePage) constraintLines.push("- The output MUST fit on a single page. Be ruthlessly concise.");
    if (constraints?.cleanFormatting) constraintLines.push("- Apply clean, ATS-safe formatting: section headers in ALL CAPS, consistent dash bullet points, no tables/columns/graphics, and proper spacing.");
    if (constraints?.extractAtsKeywords) constraintLines.push("- Extract relevant ATS keywords from the job description. Inject them naturally into the Skills/Core Competencies section AND throughout bullet points where contextually appropriate.");
    if (constraints?.quantifyAchievements) constraintLines.push("- Every bullet point should include quantified metrics where possible (percentages, dollar amounts, team sizes, user counts, timeframes). If the original lacks numbers, infer reasonable estimates based on context.");
    if (constraints?.removePronouns) constraintLines.push("- Remove ALL personal pronouns (I, my, me, we). Start bullets with action verbs directly.");
    if (constraints?.useActionVerbs) constraintLines.push("- Begin every bullet point with a strong, varied action verb (Led, Spearheaded, Architected, Drove, Delivered, Optimized, etc.). Avoid repeating the same verb twice.");

    // Experience level guidance
    const levelGuidance: Record<string, string> = {
      entry: "This is for an entry-level/new graduate. Emphasize education, projects, internships, coursework, and transferable skills. Keep the summary brief and potential-focused.",
      mid: "This is for a mid-level professional (3-7 years). Balance experience with skills. Show career progression and increasing responsibility.",
      senior: "This is for a senior/staff-level professional (8-15 years). Focus on leadership, strategic impact, mentoring, and large-scale achievements. Minimize early-career details.",
      executive: "This is for a C-suite/executive (15+ years). Lead with an executive summary showcasing vision and P&L impact. Emphasize board experience, company-wide transformations, and revenue/growth metrics.",
    };

    // Template guidance
    const sectionGuide = templateSections?.length
      ? `Structure the resume with EXACTLY these sections in order: ${templateSections.join(", ")}. Do NOT add extra sections unless the user's resume content demands it.`
      : "Use standard resume sections.";

    const toneGuide = templateTone
      ? `The overall tone should be ${templateTone}.`
      : "Use a professional, concise tone.";

    const systemPrompt = `You are an elite resume optimization AI specializing in ATS (Applicant Tracking System) compatibility and professional resume writing. You have deep knowledge of how ATS systems parse resumes (Taleo, Greenhouse, Lever, Workday, iCIMS, etc.).

## Template & Structure
- Template: ${templateId || "professional"}
- ${sectionGuide}
- ${toneGuide}

## Experience Level
${levelGuidance[experienceLevel || "mid"]}

## Optimization Rules
${constraintLines.join("\n") || "- No special constraints."}

## ATS Best Practices (always apply)
- Use standard section headers that ATS systems recognize
- Avoid headers/footers, columns, tables, text boxes, or graphics
- Use standard fonts and simple formatting
- Include both acronyms AND full forms for industry terms (e.g., "Search Engine Optimization (SEO)")
- Match exact job title keywords from the posting when truthful
- Place most important keywords in the top third of the resume
- Use standard date formats (Month Year – Month Year)

## Output Format
Return your response as a JSON object with these fields:
1. "optimizedResume": The FULL optimized resume as plain text with clear formatting (headers in ALL CAPS, bullet points with dashes, blank lines between sections).
2. "keywords": A JSON array of the specific ATS keywords you injected (e.g., ["Python", "Project Management", "Agile"]).
3. "atsScore": An integer 0-100 rating the resume's ATS compatibility. Consider: keyword density, formatting cleanliness, section structure, action verb usage, quantified achievements.
4. "suggestions": A JSON array of 3-5 specific improvement suggestions the user could apply manually (e.g., "Add a LinkedIn URL", "Include a certifications section").

Return ONLY the JSON object, no markdown code fences, no commentary.`;

    const userPrompt = `Here is my current resume:

${resumeText}

${jobDescription ? `Target job description:\n${jobDescription}` : "No specific job description provided — optimize for general ATS compatibility and the selected template structure."}

${customInstructions ? `Additional instructions from the user:\n${customInstructions}` : ""}`;

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

    // Try to parse as JSON first (new format)
    let optimizedResume = "";
    let keywords: string[] = [];
    let atsScore: number | null = null;
    let suggestions: string[] = [];

    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      optimizedResume = parsed.optimizedResume || parsed.resume || "";
      keywords = parsed.keywords || [];
      atsScore = typeof parsed.atsScore === "number" ? parsed.atsScore : null;
      suggestions = parsed.suggestions || [];
    } catch {
      // Fallback to old delimiter format
      const sep = "---KEYWORDS---";
      const sepIdx = raw.indexOf(sep);
      if (sepIdx !== -1) {
        optimizedResume = raw.substring(0, sepIdx).trim();
        const kwStr = raw.substring(sepIdx + sep.length).trim();
        try {
          keywords = JSON.parse(kwStr);
        } catch {
          const match = kwStr.match(/\[.*\]/s);
          if (match) {
            try { keywords = JSON.parse(match[0]); } catch { /* ignore */ }
          }
        }
      } else {
        optimizedResume = raw;
      }
    }

    return new Response(JSON.stringify({ optimizedResume, keywords, atsScore, suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("optimize-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
