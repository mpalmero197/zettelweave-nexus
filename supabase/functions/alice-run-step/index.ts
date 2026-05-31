// alice-run-step
// Cron-driven worker that advances pending/running ALICE background runs one
// planner+executor step at a time. Called every minute by run-scheduled-triggers
// (or a dedicated cron). Picks the oldest due run, asks the gateway for the
// next action, records it in `steps`, and marks the run completed when the
// model declares done — or when max_steps is reached.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro"; // planner needs reasoning

const SYSTEM = `You are ALICE running an autonomous background task. Each turn you receive the goal, prior steps, and any tool results. Respond with a SINGLE compact JSON object — no prose, no markdown fences:

{ "thought": string, "action": "continue" | "done", "step": string, "result"?: string, "tool"?: string, "tool_args"?: object }

- "thought": brief reasoning (1-2 sentences).
- "step": the concrete action this turn (e.g. "search web for X", "draft outline", "save findings as card"). Be specific.
- "result": when action="done", the final deliverable for the user. Omit when calling a tool — the tool's output will be recorded as the step's result.
- "tool" + "tool_args": optional. Call ONE tool per step. Available tools:
  • web_search { "query": string }  — fresh web facts via Perplexity.
  • search_my_content { "query": string, "limit"?: number }  — semantic search across the user's notes & cards.
  • recall_episodic { "query": string }  — recall what you (ALICE) did for this user before.
  • create_card { "title": string, "content": string, "tags"?: string[] }  — save a Zettel card the user will see.
  • create_note { "title": string, "content": string, "tags"?: string[] }  — save a note the user will see.
- Choose action="done" as soon as the goal is satisfied. Cite saved card/note ids in "result" when you saved something.
- Do not call create_card or create_note until you have actually gathered enough material. Prefer 1-2 tool calls then write.
- Keep each step's "result" or tool output under 1500 chars.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const svc = createClient(url, serviceKey);

    // How many runs to advance this invocation.
    const BATCH = 3;

    // Claim the oldest due, non-terminal runs.
    const { data: due, error: dueErr } = await svc
      .from("alice_runs")
      .select("*")
      .in("status", ["pending", "running"])
      .lte("next_run_at", new Date().toISOString())
      .order("next_run_at", { ascending: true })
      .limit(BATCH);

    if (dueErr) throw dueErr;
    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ ok: true, advanced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summaries: any[] = [];

    for (const run of due) {
      try {
        // Mark running + push next_run_at out to claim it briefly.
        await svc.from("alice_runs").update({
          status: "running",
          started_at: run.started_at || new Date().toISOString(),
          next_run_at: new Date(Date.now() + 90_000).toISOString(),
        }).eq("id", run.id);

        if (run.step_count >= run.max_steps) {
          await svc.from("alice_runs").update({
            status: "completed",
            finished_at: new Date().toISOString(),
            result: run.result || "Max steps reached before completion.",
          }).eq("id", run.id);
          summaries.push({ id: run.id, terminal: "max_steps" });
          continue;
        }

        const prevSteps = (run.steps as any[]) || [];
        const stepHistory = prevSteps.map((s: any, i: number) =>
          `Step ${i + 1}: ${s.step}\n  -> ${s.result || "(no result)"}`
        ).join("\n");

        const userMsg = [
          `GOAL: ${run.goal}`,
          run.instructions ? `INSTRUCTIONS: ${run.instructions}` : null,
          stepHistory ? `PRIOR STEPS:\n${stepHistory}` : "PRIOR STEPS: (none yet)",
          `Step ${run.step_count + 1} of max ${run.max_steps}. What's next? Reply with the JSON object only.`,
        ].filter(Boolean).join("\n\n");

        const res = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: userMsg },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          await svc.from("alice_runs").update({
            status: "failed",
            error: `gateway ${res.status}: ${errText.slice(0, 500)}`,
            finished_at: new Date().toISOString(),
          }).eq("id", run.id);
          summaries.push({ id: run.id, error: res.status });
          continue;
        }

        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || "{}";
        let parsed: any = {};
        try { parsed = JSON.parse(raw); } catch { parsed = { action: "done", step: "(unparseable model reply)", result: raw }; }

        // If model asked for a tool, execute it server-side and fold the
        // tool's output into this step's result. Tool errors are captured
        // verbatim so the model sees them next turn.
        let toolName: string | null = parsed.tool || null;
        let toolResult: any = null;
        if (toolName) {
          try {
            toolResult = await runTool(toolName, parsed.tool_args || {}, {
              svc, apiKey, userId: run.user_id, runId: run.id, baseUrl: url,
            });
          } catch (te: any) {
            toolResult = { error: te?.message || String(te) };
          }
        }

        const stepRecord = {
          n: run.step_count + 1,
          at: new Date().toISOString(),
          thought: parsed.thought || null,
          step: parsed.step || "(unspecified)",
          tool: toolName,
          tool_args: toolName ? (parsed.tool_args || null) : null,
          tool_result: toolResult,
          result: toolName
            ? (typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult)).slice(0, 1500)
            : (parsed.result || null),
        };
        const newSteps = [...prevSteps, stepRecord];
        // Never auto-finish on a tool call — give ALICE the next turn to react.
        const isDone = !toolName && (parsed.action === "done" || newSteps.length >= run.max_steps);

        await svc.from("alice_runs").update({
          steps: newSteps,
          step_count: newSteps.length,
          status: isDone ? "completed" : "running",
          result: isDone ? (parsed.result || stepRecord.result || run.result) : run.result,
          finished_at: isDone ? new Date().toISOString() : null,
          next_run_at: isDone ? new Date().toISOString() : new Date(Date.now() + (toolName ? 5_000 : 30_000)).toISOString(),
        }).eq("id", run.id);

        // Notify user when a run completes + write episodic memory.
        if (isDone) {
          await svc.from("in_app_notifications").insert({
            user_id: run.user_id,
            title: "ALICE finished a background task",
            body: (parsed.result || run.goal).toString().slice(0, 240),
            item_type: "alice_run",
            item_id: run.id,
            is_read: false,
          });
          try {
            const summary = `Background run — Goal: ${run.goal}\nResult: ${(parsed.result || stepRecord.result || "").toString().slice(0, 400)}`;
            const embRes = await fetch(
              "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
              { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inputs: summary.slice(0, 2000), options: { wait_for_model: true } }) },
            );
            if (embRes.ok) {
              const ed = await embRes.json();
              let vec: number[] | null = null;
              if (Array.isArray(ed) && Array.isArray(ed[0])) {
                const dims = ed[0].length; const out = new Array(dims).fill(0);
                for (const tok of ed) for (let i = 0; i < dims; i++) out[i] += tok[i];
                for (let i = 0; i < dims; i++) out[i] /= ed.length;
                vec = out;
              } else if (Array.isArray(ed) && typeof ed[0] === "number") { vec = ed; }
              if (vec) await svc.from("alice_episodic_memory").insert({
                user_id: run.user_id, summary, source_kind: "run", source_id: run.id, embedding: vec as any,
              });
            }
          } catch (_e) { /* best-effort */ }

          // Phase 5 — Self-critique post-mortem. Ask a cheap model to grade the
          // run and surface a single concrete improvement idea into the same
          // platform_insights queue the rest of the self-improvement engine
          // already feeds from. Failures here are non-fatal.
          try {
            const critiqueRes = await fetch(GATEWAY_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: `You are ALICE's critic. Given a completed background run, output ONE compact JSON object: { "verdict": "good"|"mixed"|"poor", "what_worked": string, "what_failed": string, "missing_capability": string, "improvement": string }. Be terse — each field under 200 chars. "improvement" is a concrete, shippable idea for ALICE (e.g. "add tool X", "tighten planner prompt to do Y"). No prose, no fences.` },
                  { role: "user", content: `GOAL: ${run.goal}\nSTEPS: ${newSteps.length}/${run.max_steps}\nSTEPS_LOG:\n${newSteps.map((s: any) => `- ${s.step} -> ${(s.result || "").slice(0, 200)}`).join("\n")}\nFINAL_RESULT: ${(parsed.result || "").slice(0, 600)}` },
                ],
                response_format: { type: "json_object" },
              }),
            });
            if (critiqueRes.ok) {
              const cd = await critiqueRes.json();
              const critique = JSON.parse(cd.choices?.[0]?.message?.content || "{}");
              if (critique?.improvement) {
                await svc.from("platform_insights").insert({
                  category: "alice_self_improvement",
                  title: `ALICE run ${critique.verdict || "review"}: ${run.goal.slice(0, 80)}`,
                  description: critique.improvement,
                  priority: critique.verdict === "poor" ? "high" : critique.verdict === "mixed" ? "medium" : "low",
                  status: "pending",
                  source_reference: `alice_run:${run.id}`,
                  recommendation: critique.missing_capability || null,
                  metadata: { run_id: run.id, goal: run.goal, critique },
                });
              }
            }
          } catch (_e) { /* best-effort */ }
        }


        summaries.push({ id: run.id, step: stepRecord.n, done: isDone });
      } catch (innerErr: any) {
        await svc.from("alice_runs").update({
          status: "failed",
          error: innerErr?.message || String(innerErr),
          finished_at: new Date().toISOString(),
        }).eq("id", run.id);
        summaries.push({ id: run.id, error: innerErr?.message || "unknown" });
      }
    }

    return new Response(JSON.stringify({ ok: true, advanced: summaries.length, summaries }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("alice-run-step error", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// Tool dispatcher — a focused subset of jarvis-chat's tool catalog so a
// background run can actually DO things, not just draft text. Keep this list
// intentionally small and safe; mutating tools always scope to run.user_id.
// ============================================================================
type ToolCtx = {
  svc: any;
  apiKey: string;
  userId: string;
  runId: string;
  baseUrl: string;
};

async function embed384(text: string): Promise<number[] | null> {
  try {
    const r = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text.slice(0, 2000), options: { wait_for_model: true } }) },
    );
    if (!r.ok) return null;
    const ed = await r.json();
    if (Array.isArray(ed) && Array.isArray(ed[0])) {
      const dims = ed[0].length; const out = new Array(dims).fill(0);
      for (const tok of ed) for (let i = 0; i < dims; i++) out[i] += tok[i];
      for (let i = 0; i < dims; i++) out[i] /= ed.length;
      return out;
    }
    if (Array.isArray(ed) && typeof ed[0] === "number") return ed as number[];
    return null;
  } catch { return null; }
}

async function runTool(name: string, args: any, ctx: ToolCtx): Promise<any> {
  switch (name) {
    case "web_search": {
      const query = String(args?.query || "").trim();
      if (!query) return { error: "query required" };
      const res = await fetch(`${ctx.baseUrl}/functions/v1/web-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) return { error: `web-search ${res.status}` };
      const j = await res.json();
      return { answer: (j.answer || j.summary || "").slice(0, 1200), sources: (j.sources || j.citations || []).slice(0, 5) };
    }
    case "search_my_content": {
      const query = String(args?.query || "").trim();
      const limit = Math.min(Number(args?.limit || 5), 10);
      if (!query) return { error: "query required" };
      const vec = await embed384(query);
      const out: any = { cards: [], notes: [] };
      // Fallback to ILIKE if embedding unavailable.
      if (!vec) {
        const { data: cards } = await ctx.svc.from("zettel_cards")
          .select("id,title,content").eq("user_id", ctx.userId).is("deleted_at", null)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`).limit(limit);
        const { data: notes } = await ctx.svc.from("notes")
          .select("id,title,content").eq("user_id", ctx.userId).is("deleted_at", null)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`).limit(limit);
        out.cards = (cards || []).map((c: any) => ({ id: c.id, title: c.title, snippet: (c.content || "").slice(0, 200) }));
        out.notes = (notes || []).map((n: any) => ({ id: n.id, title: n.title, snippet: (n.content || "").slice(0, 200) }));
        return out;
      }
      // Lightweight: do ILIKE for now even with vec; full RPC pgvector match
      // would need 384-dim columns on cards/notes which they don't have today.
      const { data: cards } = await ctx.svc.from("zettel_cards")
        .select("id,title,content").eq("user_id", ctx.userId).is("deleted_at", null)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`).limit(limit);
      out.cards = (cards || []).map((c: any) => ({ id: c.id, title: c.title, snippet: (c.content || "").slice(0, 200) }));
      return out;
    }
    case "recall_episodic": {
      const query = String(args?.query || "").trim();
      if (!query) return { error: "query required" };
      const vec = await embed384(query);
      if (!vec) return { matches: [] };
      // Service role bypasses RLS; scope manually to this user.
      const { data, error } = await ctx.svc.rpc("match_alice_episodic_for_user", {
        target_user: ctx.userId, query_embedding: vec, match_count: 5, min_similarity: 0.5,
      });
      if (error) return { matches: [], note: error.message };
      return { matches: (data || []).map((m: any) => ({ summary: m.summary, similarity: m.similarity })) };
    }
    case "create_card": {
      const title = String(args?.title || "Untitled").slice(0, 200);
      const content = String(args?.content || "").slice(0, 20000);
      const tags = Array.isArray(args?.tags) ? args.tags.map(String).slice(0, 10) : [];
      const { data, error } = await ctx.svc.from("zettel_cards")
        .insert({ user_id: ctx.userId, title, content, tags, source: "alice_background" })
        .select("id").single();
      if (error) return { error: error.message };
      return { id: data.id, kind: "card", url: `/app/cards?card=${data.id}` };
    }
    case "create_note": {
      const title = String(args?.title || "Untitled").slice(0, 200);
      const content = String(args?.content || "").slice(0, 50000);
      const tags = Array.isArray(args?.tags) ? args.tags.map(String).slice(0, 10) : [];
      const { data, error } = await ctx.svc.from("notes")
        .insert({ user_id: ctx.userId, title, content, tags })
        .select("id").single();
      if (error) return { error: error.message };
      return { id: data.id, kind: "note", url: `/app/notes?note=${data.id}` };
    }
    default:
      return { error: `unknown tool "${name}"` };
  }
}
