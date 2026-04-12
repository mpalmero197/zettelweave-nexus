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
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Gather platform metrics
    const [
      { count: userCount },
      { count: cardCount },
      { count: noteCount },
      { count: docCount },
      { count: mindMapCount },
      { data: topFeatureRequests },
      { data: recentErrors },
      { count: insightCount },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("zettel_cards").select("*", { count: "exact", head: true }),
      supabase.from("notes").select("*", { count: "exact", head: true }),
      supabase.from("catalyst_documents").select("*", { count: "exact", head: true }),
      supabase.from("mind_maps").select("*", { count: "exact", head: true }),
      supabase
        .from("feature_requests")
        .select("title, description, votes, status")
        .order("votes", { ascending: false })
        .limit(10),
      supabase
        .from("error_reports")
        .select("error_type, error_message, occurrence_count, severity, status")
        .order("last_seen_at", { ascending: false })
        .limit(5),
      supabase
        .from("platform_insights")
        .select("*", { count: "exact", head: true })
        .eq("status", "new"),
    ]);

    // Skip if too many unreviewed insights already
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
      topFeatureRequests: topFeatureRequests ?? [],
      recentErrors: recentErrors ?? [],
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

    const systemPrompt = `You are a senior product strategist and SEO consultant analyzing Pendragon, an AI-powered "Thinking Second Brain" platform. Your job is to compare it against Notion, Obsidian, and OneNote, and generate actionable improvement insights.

## Pendragon's Current Features
${pendragonFeatures.map((f) => `- ${f}`).join("\n")}

## Platform Metrics
- Total users: ${platformData.users}
- Zettel cards created: ${platformData.zettelCards}
- Notes created: ${platformData.notes}
- Catalyst documents: ${platformData.catalystDocs}
- Mind maps: ${platformData.mindMaps}

## Top Feature Requests (by votes)
${JSON.stringify(platformData.topFeatureRequests, null, 2)}

## Recent Errors
${JSON.stringify(platformData.recentErrors, null, 2)}

## SEO Configuration
- Has sitemap.xml with 9 URLs
- Has robots.txt allowing all crawlers
- Has llms.txt and llms-full.txt for AI crawlers
- Has JSON-LD structured data (SoftwareApplication, FAQPage)
- Domain: pendragonx.com

## Competitor Feature Sets (for reference)
**Notion**: Databases, wikis, projects, AI assistant, team workspaces, API, templates marketplace, Notion Calendar, connected databases, formulas, relations, rollups, synced blocks, embeds, web clipper
**Obsidian**: Local-first markdown, graph view, community plugins (1000+), Canvas, Sync, Publish, backlinks, templates, daily notes, Dataview plugin, YAML frontmatter
**OneNote**: Freeform canvas, handwriting/ink, Office 365 integration, Copilot AI, sections/pages hierarchy, audio recording with linked notes, math equations, stickers, shared notebooks

Generate exactly 6 insights. Each must be specific and actionable. Avoid generic advice.`;

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
            content:
              "Analyze the platform and generate 6 improvement insights. Return them as a JSON array using the generate_insights tool.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_insights",
              description: "Generate platform improvement insights",
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
                          enum: ["seo", "feature_gap", "ux", "performance", "competitive", "growth"],
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
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiResult));
      return new Response(JSON.stringify({ error: "No structured response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { insights } = JSON.parse(toolCall.function.arguments);

    if (!Array.isArray(insights) || insights.length === 0) {
      return new Response(JSON.stringify({ error: "Empty insights array" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate: skip insights with similar titles from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentInsights } = await supabase
      .from("platform_insights")
      .select("title")
      .gte("created_at", sevenDaysAgo);

    const existingTitles = new Set((recentInsights ?? []).map((i: any) => i.title.toLowerCase()));

    const newInsights = insights
      .filter((i: any) => !existingTitles.has(i.title.toLowerCase()))
      .slice(0, 8)
      .map((i: any) => ({
        category: i.category,
        title: i.title,
        description: i.description,
        priority: i.priority,
        competitor_reference: i.competitor_reference || null,
        status: "new",
        metadata: {},
      }));

    if (newInsights.length > 0) {
      const { error: insertError } = await supabase.from("platform_insights").insert(newInsights);
      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to save insights" }), {
          status: 500,
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
