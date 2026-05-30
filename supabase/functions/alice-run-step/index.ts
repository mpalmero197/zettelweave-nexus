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

const SYSTEM = `You are ALICE running an autonomous background task. Each turn you receive the goal, prior steps you've already taken, and any results. Respond with a SINGLE compact JSON object — no prose, no markdown fences — of the shape:

{ "thought": string, "action": "continue" | "done", "step": string, "result"?: string }

- "thought": brief reasoning (1-2 sentences).
- "step": the concrete action you would take this turn (e.g. "draft outline", "search notes for X", "summarize findings"). Be specific.
- "result": when action="done", the final deliverable / answer for the user. Otherwise the artifact produced by this step.
- Choose action="done" as soon as the goal is genuinely satisfied. Do not pad. If the goal is impossible or unclear after a couple of steps, choose action="done" and explain in "result".

Constraints: you do NOT have tools in this loop yet — you are reasoning and drafting only. Keep each step's output under 1500 chars.`;

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

        const stepRecord = {
          n: run.step_count + 1,
          at: new Date().toISOString(),
          thought: parsed.thought || null,
          step: parsed.step || "(unspecified)",
          result: parsed.result || null,
        };
        const newSteps = [...prevSteps, stepRecord];
        const isDone = parsed.action === "done" || newSteps.length >= run.max_steps;

        await svc.from("alice_runs").update({
          steps: newSteps,
          step_count: newSteps.length,
          status: isDone ? "completed" : "running",
          result: isDone ? (parsed.result || stepRecord.result || run.result) : run.result,
          finished_at: isDone ? new Date().toISOString() : null,
          next_run_at: isDone ? new Date().toISOString() : new Date(Date.now() + 30_000).toISOString(),
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
