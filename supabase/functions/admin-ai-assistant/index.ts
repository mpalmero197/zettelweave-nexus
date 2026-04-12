import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

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
    // Auth check — admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mode, messages, errorContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather platform context
    let platformContext = "";

    const [
      { data: tables },
      { data: recentErrors },
      { data: topFeatureRequests },
      { data: recentInsights },
      { count: cardCount },
      { count: noteCount },
      { count: docCount },
    ] = await Promise.all([
      supabase.rpc("get_all_users"),
      supabase
        .from("error_reports")
        .select("error_type, error_message, filename, line_number, occurrence_count, severity, status")
        .order("last_seen_at", { ascending: false })
        .limit(10),
      supabase
        .from("feature_requests")
        .select("title, votes, status")
        .order("votes", { ascending: false })
        .limit(5),
      supabase
        .from("platform_insights")
        .select("category, title, description, priority, competitor_reference, status")
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("zettel_cards").select("*", { count: "exact", head: true }),
      supabase.from("notes").select("*", { count: "exact", head: true }),
      supabase.from("catalyst_documents").select("*", { count: "exact", head: true }),
    ]);

    const tableCount = tables?.length ?? 0;

    platformContext = `
## Platform Context
- Total users: ${tableCount}
- Zettel cards: ${cardCount ?? 0}, Notes: ${noteCount ?? 0}, Catalyst docs: ${docCount ?? 0}
- Recent errors (last 10): ${JSON.stringify(recentErrors || [], null, 2)}

## Top Feature Requests (by votes)
${JSON.stringify(topFeatureRequests || [], null, 2)}

## Recent AI-Generated Platform Insights (unreviewed)
${JSON.stringify(recentInsights || [], null, 2)}

## SEO Configuration
- Domain: pendragonx.com
- Has sitemap.xml, robots.txt, llms.txt, llms-full.txt for AI crawlers
- JSON-LD structured data: SoftwareApplication, FAQPage, DefinedTermSet, Speakable
- Target keywords: "AI second brain", "3D knowledge graph", "thinking second brain"

## Competitive Landscape
- **Notion**: Databases, wikis, projects, AI, team workspaces, API, templates marketplace, Calendar, formulas, relations, rollups, synced blocks, web clipper
- **Obsidian**: Local-first markdown, graph view, 1000+ plugins, Canvas, Sync, Publish, backlinks, templates, daily notes, Dataview
- **OneNote**: Freeform canvas, handwriting/ink, Office 365 integration, Copilot AI, audio recording with linked notes, math equations

## Pendragon Differentiators
AI auto-linking, 3D knowledge graph, Zettelkasten system, AI agents (daily reports, knowledge gaps), Catalyst writing studio, encrypted cards, Spaces (custom databases), friends/chat, recording studio

## Database Tables Available
agents, agent_findings, agent_runs, attachments, calendar_events, catalyst_documents, 
catalyst_chapters, catalyst_citations, catalyst_comments, catalyst_collaborators, 
catalyst_snapshots, catalyst_writing_goals, chat_messages, collaboration_sessions, 
cookie_consent_analytics, dashboard_layouts, documents, domain_restrictions, error_reports, 
feature_requests, feature_request_votes, files, friend_requests, friendships, import_history, 
in_app_notifications, knowledge_gaps, mind_maps, notebooks, notes, profiles, platform_insights,
security_audit_log, subscriptions, tasks, user_roles, zettel_cards, 
cache_predictions, object_types, object_sets, space_objects, spaces, relation_definitions, 
object_relation_values

## Tech Stack
React 18, Vite 5, Tailwind CSS v3, TypeScript 5, Supabase (auth, RLS, edge functions, storage)
`;

    let systemPrompt = "";

    if (mode === "diagnose") {
      systemPrompt = `You are an expert debugging assistant for a React/TypeScript/Supabase web application.

You are given an error report from the production application. Your job is to:
1. Explain the ROOT CAUSE in plain language
2. Determine if this is a CODE issue (needs developer fix) or DATA issue (can be fixed via SQL)
3. Provide a specific, actionable FIX with code snippets
4. Rate the severity: critical, high, medium, low
5. If it's a data issue, provide the exact SQL to fix it

${platformContext}

Error to diagnose:
${JSON.stringify(errorContext, null, 2)}

Format your response as markdown with clear sections: ## Root Cause, ## Fix Type, ## Solution, ## Severity`;

    } else {
      // General admin chat
      systemPrompt = `You are an AI assistant for the admin of a knowledge management platform called Pendragon.

You help with:
- Diagnosing and fixing errors
- Suggesting database optimizations (indexes, queries)
- Reviewing security (RLS policies, auth flows)
- Proposing new features based on user feedback
- Analyzing platform health and usage patterns
- Drafting edge function code improvements
- Writing SQL queries for data fixes

Always provide actionable, specific recommendations with code snippets when applicable.
When suggesting code changes, provide complete, ready-to-use code blocks.
When suggesting SQL, make sure it's safe and uses proper WHERE clauses.

${platformContext}`;
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("admin-ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
