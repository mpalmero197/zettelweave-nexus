import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

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
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ ok: false, error: "Admin access required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather platform telemetry
    const telemetry: Record<string, unknown> = {};

    // Table count
    const { count: tableCount } = await adminClient
      .from("information_schema.tables" as any)
      .select("*", { count: "exact", head: true })
      .eq("table_schema", "public");
    // Fallback: just count known tables
    const knownTables = [
      "zettel_cards", "notes", "notebooks", "profiles", "user_roles",
      "feature_requests", "error_reports", "agents", "agent_runs",
      "catalyst_documents", "mind_maps", "files", "attachments",
      "calendar_events", "documents", "subscriptions", "friendships",
    ];
    telemetry.estimated_tables = tableCount || knownTables.length;

    // Feature requests
    const { data: frData } = await adminClient
      .from("feature_requests")
      .select("status");
    const frStats: Record<string, number> = {};
    (frData || []).forEach((r: any) => {
      frStats[r.status] = (frStats[r.status] || 0) + 1;
    });
    telemetry.feature_requests = frStats;
    telemetry.feature_requests_total = frData?.length || 0;

    // Error reports
    const { data: errData } = await adminClient
      .from("error_reports")
      .select("severity, status, occurrence_count");
    const errStats: Record<string, number> = {};
    (errData || []).forEach((r: any) => {
      errStats[r.severity] = (errStats[r.severity] || 0) + r.occurrence_count;
    });
    telemetry.error_reports = errStats;
    telemetry.error_reports_total = errData?.length || 0;

    // User count
    const { count: userCount } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true });
    telemetry.total_users = userCount || 0;

    // Agent types
    const { data: agentData } = await adminClient
      .from("agents")
      .select("agent_type");
    const agentTypes: Record<string, number> = {};
    (agentData || []).forEach((a: any) => {
      agentTypes[a.agent_type] = (agentTypes[a.agent_type] || 0) + 1;
    });
    telemetry.agent_types = agentTypes;

    // Content counts
    const { count: cardCount } = await adminClient
      .from("zettel_cards")
      .select("*", { count: "exact", head: true });
    const { count: noteCount } = await adminClient
      .from("notes")
      .select("*", { count: "exact", head: true });
    const { count: docCount } = await adminClient
      .from("catalyst_documents")
      .select("*", { count: "exact", head: true });
    const { count: mindMapCount } = await adminClient
      .from("mind_maps")
      .select("*", { count: "exact", head: true });

    telemetry.content_counts = {
      zettel_cards: cardCount || 0,
      notes: noteCount || 0,
      catalyst_documents: docCount || 0,
      mind_maps: mindMapCount || 0,
    };

    // Edge functions list
    telemetry.edge_functions = [
      "ai-assistant-chat", "ai-categorize-card", "ai-edit-card", "ai-reorganize-cards",
      "ai-search", "analyze-cache-patterns", "analyze-knowledge-gaps",
      "catalyst-ai-enhance-content", "catalyst-ai-generate-chapter", "catalyst-ai-generate-citations",
      "check-plagiarism", "check-subscription", "classify-intent", "create-checkout",
      "customer-portal", "daily-report", "dictionary-lookup", "execute-agent",
      "execute-workflows", "export-user-data", "fetch-url-content", "find-similar-content",
      "generate-embedding", "generate-image", "generate-mindmap", "generate-mock-exam",
      "generate-study-guide", "generate-topic-map", "generate-writing-suggestions",
      "optimize-resume", "platform-report", "run-tool-tests", "scratchpad-sync",
      "search-courses", "search-videos", "suggest-smart-links", "transcribe-audio",
      "transcribe-audio-ai", "web-search",
    ];
    telemetry.edge_function_count = telemetry.edge_functions.length;

    // Features list for analysis
    telemetry.features = [
      "Zettelkasten cards with AI categorization",
      "Rich notes with notebooks",
      "Catalyst long-form writing studio",
      "Mind maps (AI-generated & manual)",
      "3D & 2D knowledge graphs",
      "Calendar with events",
      "Task manager & Pomodoro timer",
      "Bullet journal",
      "Habit tracker",
      "File manager with cloud storage",
      "Audio/video/screen recording",
      "AI search & web search",
      "Smart linking & similar content",
      "Plugin hub (20+ plugins)",
      "Friends & chat system",
      "Spaces (Notion-like object database)",
      "Learning hub (books, courses, videos, exams, topic maps)",
      "Focus mode with ambient sounds",
      "Chrome extension",
      "PWA support",
      "Customizable dashboard with widgets",
      "Theme customization",
      "Encryption for notes/cards",
      "Import from Evernote, Google Drive, OneDrive, Obsidian",
      "Export to PDF, DOCX, EPUB, Markdown",
      "Admin console with analytics",
      "Resume optimizer",
      "Content summarizer",
      "Knowledge gap analyzer",
      "Workflow automation (agents)",
      "Real-time collaboration (Catalyst)",
    ];

    // Build AI prompt
    const prompt = `You are a platform architect analyzing a SaaS knowledge management application called "Pendragon" (pendragonx.lovable.app).

Here is the current platform telemetry:
${JSON.stringify(telemetry, null, 2)}

Analyze this platform and provide a comprehensive report with:

1. **Platform Health Overview**: Summarize the current state — user adoption, content creation patterns, error health.
2. **Feature Gaps**: What features are missing that competing apps (Notion, Obsidian, Roam Research, Logseq) have? What would give Pendragon an edge?
3. **Underused Features**: Based on the data, which features seem underutilized and how could they be improved?
4. **UX Improvements**: What user experience improvements would have the highest impact?
5. **Technical Debt**: Any architectural concerns visible from the telemetry (too many edge functions, error patterns, etc.)?
6. **Priority Recommendations**: Rank the top 5 improvements by impact vs effort.

Format your response as markdown with clear sections and bullet points.

Also provide a JSON summary at the very end in a code block tagged \`\`\`json with this structure:
{
  "health_score": number (1-10),
  "gaps": [{"title": string, "priority": "high"|"medium"|"low", "description": string}],
  "recommendations": [{"title": string, "impact": "high"|"medium"|"low", "effort": "high"|"medium"|"low", "description": string}],
  "underused_features": [string],
  "report_date": string
}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "LOVABLE_API_KEY not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior platform architect providing actionable analysis of a SaaS product." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ ok: false, error: "Rate limited — please try again later." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ ok: false, error: "AI credits exhausted — add funds in Settings > Workspace > Usage." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ ok: false, error: "AI analysis failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const reportText = aiResult.choices?.[0]?.message?.content || "No report generated.";

    // Try to extract JSON block
    let reportJson = null;
    const jsonMatch = reportText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        reportJson = JSON.parse(jsonMatch[1]);
      } catch {
        // JSON parsing failed, leave as null
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        text: reportText,
        json: reportJson,
        telemetry,
        generated_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Platform report error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
