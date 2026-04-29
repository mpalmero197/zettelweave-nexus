import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-triggered-by, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Technique {
  signature: string;
  title: string;
  description: string;
  source_url?: string;
  category: "meta_tags" | "jsonld" | "llms_txt" | "sitemap" | "faq" | "robots" | "code_change" | "other";
  classification: "safe_data" | "code_change" | "skip";
  confidence: number;
  payload?: Record<string, unknown>;
  reasoning: string;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    // Settings + bail if disabled
    const { data: settings } = await supabase.from("seo_engine_settings").select("*").eq("id", 1).single();
    const triggeredBy = req.headers.get("x-triggered-by") ?? "cron";
    if (settings?.enabled === false && triggeredBy !== "manual") {
      return json({ skipped: true, reason: "engine disabled" });
    }

    const cats = (settings?.categories ?? {}) as Record<string, boolean>;
    // Auto-apply mode: no review queue, no per-run caps. User opted out of reviewing changes.
    const maxAuto = Number.MAX_SAFE_INTEGER;
    const maxQueued = 0;

    // Start run
    const { data: run } = await supabase
      .from("seo_improvement_runs")
      .insert({ triggered_by: triggeredBy })
      .select()
      .single();
    const runId = run!.id;

    // 1) Research via Lovable AI with Google Search grounding
    const researchRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an SEO and AEO (Answer Engine Optimization) research analyst. Use Google Search to find concrete, actionable techniques published recently (prefer the last 30 days) that a website can implement to improve ranking in Google/Bing and citation in LLMs (ChatGPT, Perplexity, Gemini, Claude). Focus on concrete additions: schema.org types, llms.txt patterns, meta tag conventions, FAQ structures. Skip vague advice. Always cite source URLs.",
          },
          {
            role: "user",
            content:
              "Search the web and list 6-10 newly recommended SEO/AEO techniques from the last 30 days. For each, give: a 1-line title, a 2-3 sentence actionable description, and the source URL. Format as a numbered list.",
          },
        ],
        tools: [{ type: "google_search" }],
        max_tokens: 2000,
      }),
    });

    if (!researchRes.ok) {
      const t = await researchRes.text();
      const friendly =
        researchRes.status === 429
          ? "Lovable AI rate limit hit; try again shortly."
          : researchRes.status === 402
          ? "Lovable AI credits exhausted; add credits in Workspace → Usage."
          : `Lovable AI research failed (${researchRes.status})`;
      await supabase
        .from("seo_improvement_runs")
        .update({ status: "failed", error: `${friendly}: ${t.slice(0, 500)}`, finished_at: new Date().toISOString() })
        .eq("id", runId);
      return json({ error: friendly, status: researchRes.status, detail: t.slice(0, 500) }, researchRes.status === 402 ? 402 : 502);
    }

    const researchData = await researchRes.json();
    const research = researchData.choices?.[0]?.message?.content ?? "";
    // Extract citations from grounding metadata if available
    const grounding = researchData.choices?.[0]?.message?.grounding_metadata
      ?? researchData.choices?.[0]?.grounding_metadata;
    const citations: string[] = (() => {
      const fromChunks = grounding?.grounding_chunks?.map((c: any) => c?.web?.uri).filter(Boolean) ?? [];
      const fromSupports = grounding?.search_entry_point?.rendered_content ? [] : [];
      const urlMatches = research.match(/https?:\/\/[^\s)\]]+/g) ?? [];
      return Array.from(new Set([...fromChunks, ...fromSupports, ...urlMatches])).slice(0, 30);
    })();

    // 2) Classify with Lovable AI
    const classifyRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You classify SEO/AEO techniques into actionable changes for a React SPA called PendragonX (writer-focused second-brain at pendragonx.com).

For each technique, decide:
- classification: "safe_data" if it can be applied by writing rows to a database (meta tags, JSON-LD blobs, llms.txt content, FAQ entries, sitemap entries). "code_change" if it requires editing React component code or routing. "skip" if vague, off-brand, or already standard.
- category: meta_tags | jsonld | llms_txt | sitemap | faq | robots | code_change | other
- confidence: 0.0-1.0. Anything < 0.8 should be "skip" or "code_change".
- payload: for safe_data, include the exact data to write. Examples:
  * meta_tags: { route_pattern: "/", field: "description", value: "..." }
  * jsonld: { route_pattern: "/", schema_type: "WebApplication", schema_json: {...} }
  * faq: [{ route_pattern: "/", question: "...", answer: "..." }]
  * llms_txt: { llms_txt: "...", llms_full_txt: "..." } (full replacement)
- signature: a stable hash-friendly slug like "schema-faq-page-2024" so we never apply the same technique twice.

Be conservative. When in doubt, mark as "code_change" so a human reviews it. Never disable existing SEO. Never modify pricing or auth pages.`,
          },
          { role: "user", content: `Research output:\n\n${research}\n\nCitations: ${citations.join(", ")}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_techniques",
              parameters: {
                type: "object",
                properties: {
                  techniques: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        signature: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        source_url: { type: "string" },
                        category: { type: "string", enum: ["meta_tags","jsonld","llms_txt","sitemap","faq","robots","code_change","other"] },
                        classification: { type: "string", enum: ["safe_data","code_change","skip"] },
                        confidence: { type: "number" },
                        payload: { type: "object", additionalProperties: true },
                        reasoning: { type: "string" },
                      },
                      required: ["signature","title","description","category","classification","confidence","reasoning"],
                    },
                  },
                },
                required: ["techniques"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_techniques" } },
      }),
    });

    if (!classifyRes.ok) {
      const t = await classifyRes.text();
      await supabase
        .from("seo_improvement_runs")
        .update({ status: "failed", error: `classify ${classifyRes.status}: ${t}`, finished_at: new Date().toISOString() })
        .eq("id", runId);
      return json({ error: "classify failed", status: classifyRes.status });
    }

    const classifyJson = await classifyRes.json();
    const args = classifyJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const techniques: Technique[] = args ? JSON.parse(args).techniques ?? [] : [];

    // 3) Dedup against existing signatures
    const sigs = techniques.map((t) => t.signature || slugify(t.title));
    const { data: existing } = await supabase
      .from("seo_applied_techniques")
      .select("technique_signature")
      .in("technique_signature", sigs);
    const existingSet = new Set((existing ?? []).map((r: any) => r.technique_signature));
    const fresh = techniques.filter((t) => !existingSet.has(t.signature || slugify(t.title)));

    let appliedCount = 0;
    let queuedCount = 0;
    let skippedCount = 0;

    // 4) Process each technique
    for (const tech of fresh) {
      const sig = tech.signature || slugify(tech.title);

      // Insert technique record
      const { data: techRow } = await supabase
        .from("seo_applied_techniques")
        .insert({
          technique_signature: sig,
          title: tech.title,
          description: tech.description,
          source_url: tech.source_url ?? null,
          category: tech.category,
          action_type: tech.classification,
          classification: tech.classification,
          confidence: tech.confidence,
          run_id: runId,
        })
        .select()
        .single();

      if (!techRow) continue;
      const techId = techRow.id;

      // SKIP only if model says skip; ignore confidence gate (user opted to auto-apply everything)
      if (tech.classification === "skip") {
        skippedCount++;
        continue;
      }

      // CODE_CHANGE → silently log (no review queue). User opted out of reviewing.
      if (tech.classification === "code_change") {
        await supabase.from("seo_change_log").insert({
          applied_technique_id: techId,
          table_name: "code_change_noted",
          row_id: null,
          before_data: null,
          after_data: { title: tech.title, description: tech.description, source_url: tech.source_url, reasoning: tech.reasoning },
        });
        skippedCount++;
        continue;
      }

      // SAFE_DATA → check category enabled, apply, log change
      if (appliedCount >= maxAuto) {
        skippedCount++;
        continue;
      }
      const catKey = tech.category;
      if (cats[catKey] === false) {
        skippedCount++;
        continue;
      }

      const payload = tech.payload ?? {};
      let applied = false;

      try {
        if (catKey === "meta_tags" && payload.route_pattern && payload.field && payload.value) {
          const { data: row } = await supabase
            .from("seo_overrides")
            .insert({
              route_pattern: String(payload.route_pattern),
              field: String(payload.field),
              value: String(payload.value),
              source_technique_id: techId,
            })
            .select()
            .single();
          await supabase.from("seo_change_log").insert({
            applied_technique_id: techId, table_name: "seo_overrides", row_id: row?.id, before_data: null, after_data: row,
          });
          applied = true;
        } else if (catKey === "jsonld" && payload.route_pattern && payload.schema_type && payload.schema_json) {
          const { data: row } = await supabase
            .from("seo_jsonld")
            .insert({
              route_pattern: String(payload.route_pattern),
              schema_type: String(payload.schema_type),
              schema_json: payload.schema_json,
              source_technique_id: techId,
            })
            .select()
            .single();
          await supabase.from("seo_change_log").insert({
            applied_technique_id: techId, table_name: "seo_jsonld", row_id: row?.id, before_data: null, after_data: row,
          });
          applied = true;
        } else if (catKey === "faq" && Array.isArray(payload)) {
          for (const f of payload as any[]) {
            if (!f.route_pattern || !f.question || !f.answer) continue;
            const { data: row } = await supabase
              .from("seo_faq_entries")
              .insert({
                route_pattern: String(f.route_pattern),
                question: String(f.question),
                answer: String(f.answer),
                source_technique_id: techId,
              })
              .select()
              .single();
            await supabase.from("seo_change_log").insert({
              applied_technique_id: techId, table_name: "seo_faq_entries", row_id: row?.id, before_data: null, after_data: row,
            });
          }
          applied = true;
        } else if (catKey === "llms_txt" && (payload.llms_txt || payload.llms_full_txt)) {
          const { data: before } = await supabase.from("seo_llms_content").select("*").eq("id", 1).single();
          const update: Record<string, unknown> = { updated_at: new Date().toISOString(), source_technique_id: techId };
          if (payload.llms_txt) update.llms_txt = String(payload.llms_txt);
          if (payload.llms_full_txt) update.llms_full_txt = String(payload.llms_full_txt);
          const { data: after } = await supabase.from("seo_llms_content").update(update).eq("id", 1).select().single();
          await supabase.from("seo_change_log").insert({
            applied_technique_id: techId, table_name: "seo_llms_content", row_id: null, before_data: before, after_data: after,
          });
          applied = true;
        }
      } catch (e) {
        console.error("apply failed for", sig, e);
      }

      if (applied) appliedCount++;
      else skippedCount++;
    }

    await supabase
      .from("seo_improvement_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "success",
        techniques_found: techniques.length,
        applied_count: appliedCount,
        queued_count: queuedCount,
        skipped_count: skippedCount,
        raw_research: { research, citations },
      })
      .eq("id", runId);

    await supabase
      .from("seo_engine_settings")
      .update({ last_run_at: new Date().toISOString(), next_scheduled_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString() })
      .eq("id", 1);

    return json({
      success: true,
      run_id: runId,
      techniques_found: techniques.length,
      applied: appliedCount,
      queued: queuedCount,
      skipped: skippedCount,
    });
  } catch (e) {
    console.error("seo-aeo-self-improve fatal", e);
    return json({ error: e instanceof Error ? e.message : "unknown" });
  }
});
