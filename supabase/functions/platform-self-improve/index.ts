import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Gather platform metrics + full feature requests + full error reports
    const [
      { count: userCount },
      { count: cardCount },
      { count: noteCount },
      { count: docCount },
      { count: mindMapCount },
      { data: allFeatureRequests },
      { data: allErrorReports },
      { count: insightCount },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("zettel_cards").select("*", { count: "exact", head: true }),
      supabase.from("notes").select("*", { count: "exact", head: true }),
      supabase.from("catalyst_documents").select("*", { count: "exact", head: true }),
      supabase.from("mind_maps").select("*", { count: "exact", head: true }),
      supabase
        .from("feature_requests")
        .select("title, description, votes, status, created_at")
        .order("votes", { ascending: false })
        .limit(100),
      supabase
        .from("error_reports")
        .select("error_type, error_message, occurrence_count, severity, status, filename, stack_trace, last_seen_at, error_signature")
        .order("last_seen_at", { ascending: false })
        .limit(50),
      supabase
        .from("platform_insights")
        .select("*", { count: "exact", head: true })
        .eq("status", "new"),
    ]);

    if ((insightCount ?? 0) >= 30) {
      return new Response(JSON.stringify({ skipped: true, reason: "Too many unreviewed insights" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platformData = {
      users: userCount ?? 0,
      zettelCards: cardCount ?? 0,
      notes: noteCount ?? 0,
      catalystDocs: docCount ?? 0,
      mindMaps: mindMapCount ?? 0,
      featureRequests: allFeatureRequests ?? [],
      errorReports: allErrorReports ?? [],
    };

    const pendragonFeatures = [
      "Zettelkasten card system with AI auto-linking",
      "3D knowledge graph visualization",
      "Catalyst long-form writing studio with chapters",
      "AI-powered web search with image/video/shopping results",
      "Mind map creation and library",
      "Bullet journal with rapid logging",
      "Focus mode with Pomodoro timer and ambient sounds",
      "Push notifications and PWA support",
      "End-to-end encryption for cards/notes",
      "AI agents that run in background (daily reports, knowledge gap analysis)",
      "File manager with cloud storage",
      "Habit tracker",
      "Calendar integration",
      "Task manager",
      "Friends system with real-time chat",
      "Spaces (custom databases with object types and relations)",
      "Recording studio for audio/video/screen",
      "Resume optimizer",
      "Study guide and mock exam generator",
      "Chrome extension for web clipping",
      "llms.txt for AI crawlers (AEO)",
      "Sitemap, robots.txt, JSON-LD structured data",
    ];

    const systemPrompt = `You are a senior product strategist, SEO consultant, and bug triage specialist analyzing Pendragon, an AI-powered "Thinking Second Brain" platform. Your job is threefold:

1. **Bug Triage**: Analyze error reports by severity × occurrence count, identify patterns (same component breaking repeatedly), and flag critical bugs that degrade user experience.

2. **Feature Request Evaluation**: For each feature request, evaluate:
   - **Alignment**: Does it fit Pendragon's identity as a "Thinking Second Brain"? Does it enhance knowledge capture, organization, or retrieval?
   - **Utility score** (1-10): Would it benefit many users or just a niche few? Factor in vote count.
   - **Competitive edge**: Does it close a gap with Notion/Obsidian/OneNote or create a unique differentiator?
   - **Complexity vs. value**: Is the effort justified by the impact?
   - **Risk**: Could it dilute the product's focus or add bloat?
   Only recommend requests that genuinely enhance the Pendragon experience. Explicitly reject low-utility or off-brand requests with reasoning.

3. **Strategic Insights**: Compare against competitors and suggest SEO/growth/UX improvements.

## Pendragon's Current Features
${pendragonFeatures.map((f) => `- ${f}`).join("\n")}

## Platform Metrics
- Total users: ${platformData.users}
- Zettel cards: ${platformData.zettelCards}
- Notes: ${platformData.notes}
- Catalyst documents: ${platformData.catalystDocs}
- Mind maps: ${platformData.mindMaps}

## All Feature Requests (${platformData.featureRequests.length} total)
${JSON.stringify(platformData.featureRequests, null, 2)}

## Error Reports (${platformData.errorReports.length} open)
${JSON.stringify(platformData.errorReports, null, 2)}

## SEO Configuration
- Has sitemap.xml, robots.txt, llms.txt, llms-full.txt, JSON-LD structured data
- Domain: pendragonx.com

## Competitor Feature Sets
**Notion**: Databases, wikis, projects, AI assistant, team workspaces, API, templates marketplace, connected databases, formulas, relations, rollups, synced blocks, web clipper
**Obsidian**: Local-first markdown, graph view, community plugins (1000+), Canvas, Sync, Publish, backlinks, templates, daily notes, Dataview plugin, YAML frontmatter
**OneNote**: Freeform canvas, handwriting/ink, Office 365 integration, Copilot AI, sections/pages hierarchy, audio recording with linked notes, math equations, shared notebooks

Generate exactly 8 insights. Include a mix of:
- 2-3 bug_triage insights for the most critical errors
- 3-4 feature_evaluation insights evaluating the top feature requests (include utility_score and recommendation)
- 1-2 strategic insights (seo, competitive, growth, ux, performance)

For feature evaluations, ONLY surface requests you recommend implementing (utility_score >= 7). For requests with utility_score < 7, still include them but mark recommendation as "defer" or "reject" with reasoning.`;

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
          {
            role: "user",
            content: "Analyze the platform bugs, feature requests, and competitive positioning. Generate 8 insights using the generate_insights tool.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_insights",
              description: "Generate platform improvement insights including bug triage and feature evaluations",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["seo", "feature_gap", "ux", "performance", "competitive", "growth", "bug_triage", "feature_evaluation"],
                        },
                        title: { type: "string", description: "Short actionable title (max 80 chars)" },
                        description: {
                          type: "string",
                          description: "Detailed explanation with specific steps (2-4 sentences)",
                        },
                        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        competitor_reference: {
                          type: "string",
                          enum: ["notion", "obsidian", "onenote"],
                          description: "Which competitor this insight relates to, if any",
                        },
                        source_reference: {
                          type: "string",
                          description: "The original feature request title or error signature this insight references",
                        },
                        utility_score: {
                          type: "integer",
                          description: "Utility score 1-10 for feature evaluations. 10 = essential, 1 = unnecessary",
                        },
                        recommendation: {
                          type: "string",
                          enum: ["implement", "defer", "reject"],
                          description: "Recommendation for feature evaluations",
                        },
                      },
                      required: ["category", "title", "description", "priority"],
                    },
                  },
                },
                required: ["insights"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_insights" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error", status: response.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiResult));
      return new Response(JSON.stringify({ error: "No structured response from AI" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { insights } = JSON.parse(toolCall.function.arguments);

    if (!Array.isArray(insights) || insights.length === 0) {
      return new Response(JSON.stringify({ error: "Empty insights array" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate against last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentInsights } = await supabase
      .from("platform_insights")
      .select("title")
      .gte("created_at", sevenDaysAgo);

    const existingTitles = new Set((recentInsights ?? []).map((i: any) => i.title.toLowerCase()));

    const newInsights = insights
      .filter((i: any) => !existingTitles.has(i.title.toLowerCase()))
      .slice(0, 10)
      .map((i: any) => ({
        category: i.category,
        title: i.title,
        description: i.description,
        priority: i.priority,
        competitor_reference: i.competitor_reference || null,
        source_reference: i.source_reference || null,
        utility_score: i.utility_score || null,
        recommendation: i.recommendation || null,
        status: "new",
        metadata: {},
      }));

    if (newInsights.length > 0) {
      const { error: insertError } = await supabase.from("platform_insights").insert(newInsights);
      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to save insights" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: insights.length,
        inserted: newInsights.length,
        skipped_duplicates: insights.length - newInsights.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("platform-self-improve error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
