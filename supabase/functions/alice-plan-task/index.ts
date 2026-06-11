// alice-plan-task — Build a step-by-step plan for an autonomous browser task.
// Uses Lovable AI Gateway (gemini-3-flash) and optionally Perplexity for live
// docs lookup. Returns { plan, run_id } so the chat UI can render Approve/Cancel.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function research(goal: string): Promise<string> {
  const key = Deno.env.get("PERPLEXITY_API_KEY");
  if (!key) return "";
  try {
    const r = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "You research how to perform a task on a website. Return concise, factual steps with URLs. Max 300 words." },
          { role: "user", content: `Find the latest official instructions for: ${goal}. Include the exact URL of the settings page or starting point.` },
        ],
        max_tokens: 600,
      }),
    });
    if (!r.ok) return "";
    const d = await r.json();
    return d.choices?.[0]?.message?.content || "";
  } catch { return ""; }
}

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

    const { goal, currentUrl, currentTitle } = await req.json();
    if (!goal || typeof goal !== "string") {
      return new Response(JSON.stringify({ error: "Missing goal" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const research_notes = await research(goal);

    const sys = `You are ALICE, an autonomous browser agent. Given a USER GOAL, produce a short, human-readable action plan (3-8 steps) the user will review before you execute it in their browser.

Rules:
- Each step is one short English sentence describing a navigation, click, type, scroll, or wait.
- If a starting URL is needed and not provided, the FIRST step is "Open <https URL>".
- For OAuth: include "I'll stop and let you log in / approve consent" where appropriate. Never include typing passwords.
- Use research notes if provided for accurate page paths.
- Output ONLY a JSON object: { "title": "<short>", "starting_url": "<https url or null>", "steps": ["...", "..."] }`;

    const usr = `USER GOAL: ${goal}
${currentUrl ? `Current tab URL: ${currentUrl}\nCurrent tab title: ${currentTitle || ""}` : "No tab open yet."}
${research_notes ? `\nRESEARCH NOTES:\n${research_notes}` : ""}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: `AI ${r.status}: ${t.slice(0, 200)}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const d = await r.json();
    const raw = d.choices?.[0]?.message?.content || "{}";
    let plan: any = {};
    try { plan = JSON.parse(raw); } catch { plan = { title: goal, starting_url: currentUrl || null, steps: [raw] }; }
    plan.steps = Array.isArray(plan.steps) ? plan.steps.slice(0, 12) : [];

    // Persist run as awaiting_approval
    const { data: run, error: insErr } = await client
      .from("alice_agent_runs")
      .insert({
        user_id: user.id,
        goal,
        plan,
        status: "awaiting_approval",
        current_url: plan.starting_url || currentUrl || null,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, run_id: run.id, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("alice-plan-task", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
