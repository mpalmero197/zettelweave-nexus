// alice-agent-step — Decides the next single action for an in-flight agent run.
// The extension calls this with a compact DOM snapshot; we return ONE action.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Snapshot = {
  url: string;
  title: string;
  visible_text: string;
  interactive: Array<{
    idx: number; tag: string; role?: string; type?: string;
    name: string; selector: string; sensitive?: boolean;
  }>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { run_id, snapshot } = await req.json() as { run_id: string; snapshot: Snapshot };
    if (!run_id || !snapshot) return new Response(JSON.stringify({ error: "Missing run_id or snapshot" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: run, error: runErr } = await client
      .from("alice_agent_runs")
      .select("*")
      .eq("id", run_id)
      .single();
    if (runErr || !run) return new Response(JSON.stringify({ error: "Run not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (run.status !== "running") return new Response(JSON.stringify({ action: { action: "stop", reasoning: `Run is ${run.status}` } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (run.step_count >= run.max_steps) {
      await client.from("alice_agent_runs").update({ status: "failed", error: "Hit max step limit" }).eq("id", run_id);
      return new Response(JSON.stringify({ action: { action: "stop", reasoning: "Max steps reached" } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Detect sensitive fields
    const hasPassword = snapshot.interactive.some(i => i.type === "password" || i.sensitive);

    const recentHistory = Array.isArray(run.history) ? run.history.slice(-8) : [];
    const interactiveList = snapshot.interactive.slice(0, 80)
      .map(i => `#${i.idx} <${i.tag}${i.type ? ` type="${i.type}"` : ""}${i.role ? ` role="${i.role}"` : ""}> "${i.name.slice(0, 80)}"${i.sensitive ? " [SENSITIVE]" : ""}`)
      .join("\n");

    const sys = `You are ALICE, an autonomous browser agent. Choose ONE next action toward the goal.

Output ONLY JSON: { "action": "click"|"fill"|"fill_otp"|"scroll"|"navigate"|"wait"|"pause_for_user"|"done"|"stop", "target_idx": <int or null>, "value": <string or null>, "url": <string or null>, "reasoning": "<one sentence>", "sensitive": <bool> }

Rules:
- NEVER fill a [SENSITIVE] field or password field. Use "pause_for_user" with a clear reason.
- For OAuth "Allow"/"Authorize"/"Continue" consent buttons after the user has logged in: click them.
- For login pages (email + password): "pause_for_user" with reason "Please log in".
- If a one-time code / 2FA / OTP / verification code input is focused or visible (label mentions OTP, code, 2FA, verify), use "fill_otp" with the target_idx of that input. The browser will pull the live code from the user's encrypted vault. Do NOT use "fill" for OTP fields.
- "navigate" requires url. "fill"/"click"/"fill_otp" require target_idx from the interactive list above.
- "done" means the goal is achieved. "stop" means it's impossible.
- Prefer minimal steps. Don't repeat the last action if it didn't change the page.`;

    const usr = `GOAL: ${run.goal}
PLAN: ${JSON.stringify(run.plan?.steps || [])}
STEP: ${run.step_count + 1} of ${run.max_steps}

CURRENT PAGE: ${snapshot.title}
URL: ${snapshot.url}

VISIBLE TEXT (truncated):
${snapshot.visible_text.slice(0, 2500)}

INTERACTIVE ELEMENTS:
${interactiveList}

RECENT HISTORY:
${recentHistory.map((h: any) => `- ${h.action}${h.target_idx != null ? ` #${h.target_idx}` : ""} ${h.value ? `"${String(h.value).slice(0, 40)}"` : ""} → ${h.outcome || "ok"}`).join("\n") || "(none)"}

${hasPassword ? "⚠ A password field is present on this page." : ""}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: `AI ${r.status}: ${t.slice(0, 200)}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const d = await r.json();
    let action: any = {};
    try { action = JSON.parse(d.choices?.[0]?.message?.content || "{}"); } catch { action = { action: "stop", reasoning: "Parse error" }; }

    // Resolve target_idx → selector
    let selector: string | null = null;
    if (action.target_idx != null) {
      const el = snapshot.interactive.find(i => i.idx === action.target_idx);
      selector = el?.selector || null;
      if (el?.sensitive && action.action === "fill") {
        action = { action: "pause_for_user", reasoning: "Refusing to fill sensitive field", sensitive: true };
      }
    }

    // Update run
    const updates: any = { step_count: run.step_count + 1, current_url: snapshot.url };
    const historyEntry = {
      step: run.step_count + 1,
      url: snapshot.url,
      action: action.action,
      target_idx: action.target_idx ?? null,
      value: action.action === "fill" && action.sensitive ? "[redacted]" : (action.value || null),
      reasoning: action.reasoning,
      at: new Date().toISOString(),
    };
    updates.history = [...(Array.isArray(run.history) ? run.history : []), historyEntry];

    if (action.action === "done") updates.status = "succeeded";
    else if (action.action === "stop") { updates.status = "failed"; updates.error = action.reasoning || "Stopped"; }
    else if (action.action === "pause_for_user") { updates.status = "paused_for_user"; updates.paused_reason = action.reasoning || "Needs your input"; }

    await client.from("alice_agent_runs").update(updates).eq("id", run_id);

    return new Response(JSON.stringify({ action: { ...action, selector } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("alice-agent-step", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
