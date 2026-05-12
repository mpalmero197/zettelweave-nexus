// run-scheduled-triggers — invoked by pg_cron every minute. Finds ALICE
// schedules that are due, executes the named tool for each, and bumps
// last_run_at / next_run_at.
//
// Cron parsing here is intentionally minimal: we support common 5-field
// expressions (e.g. "0 8 * * 1-5") with `*`, `*/N`, `A,B,C`, and `A-B`
// fields for minute/hour/day-of-month/month/day-of-week. ALICE itself is
// instructed to use simple expressions; anything exotic falls back to a
// daily run at midnight UTC.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseField(field: string, min: number, max: number): number[] {
  if (field === "*") {
    const out: number[] = [];
    for (let i = min; i <= max; i++) out.push(i);
    return out;
  }
  const out = new Set<number>();
  for (const part of field.split(",")) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    let base = part, step = 1;
    if (stepMatch) { base = stepMatch[1]; step = parseInt(stepMatch[2], 10) || 1; }
    let lo = min, hi = max;
    if (base !== "*") {
      const range = base.split("-");
      lo = parseInt(range[0], 10);
      hi = range.length > 1 ? parseInt(range[1], 10) : lo;
    }
    for (let i = lo; i <= hi; i += step) {
      if (i >= min && i <= max) out.add(i);
    }
  }
  return [...out].sort((a, b) => a - b);
}

function nextRunAfter(cron: string, after: Date): Date {
  // 5 fields: minute hour day-of-month month day-of-week (0-6, 0=Sun)
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    // fallback: tomorrow midnight UTC
    const fallback = new Date(after);
    fallback.setUTCHours(24, 0, 0, 0);
    return fallback;
  }
  let mins: number[], hrs: number[], doms: number[], mons: number[], dows: number[];
  try {
    mins = parseField(parts[0], 0, 59);
    hrs  = parseField(parts[1], 0, 23);
    doms = parseField(parts[2], 1, 31);
    mons = parseField(parts[3], 1, 12);
    dows = parseField(parts[4], 0, 6);
  } catch {
    const fallback = new Date(after);
    fallback.setUTCHours(24, 0, 0, 0);
    return fallback;
  }
  const start = new Date(after.getTime() + 60_000);
  start.setUTCSeconds(0, 0);
  // Search up to 366 days ahead.
  const limit = new Date(start.getTime() + 366 * 24 * 3600 * 1000);
  const cur = new Date(start);
  while (cur <= limit) {
    if (
      mons.includes(cur.getUTCMonth() + 1) &&
      (doms.includes(cur.getUTCDate()) || dows.includes(cur.getUTCDay())) &&
      hrs.includes(cur.getUTCHours()) &&
      mins.includes(cur.getUTCMinutes())
    ) {
      return new Date(cur);
    }
    cur.setUTCMinutes(cur.getUTCMinutes() + 1);
  }
  return limit;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  // Pull due triggers (next_run_at null = never run, treat as due).
  const { data: due, error } = await supabase
    .from("alice_scheduled_triggers")
    .select("*")
    .eq("enabled", true)
    .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`)
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  for (const t of due || []) {
    let outcome: any = { id: t.id, ok: false };
    try {
      const ran = await runTriggerAction(supabase, t);
      outcome = { id: t.id, ok: true, ...ran };
    } catch (e: any) {
      outcome = { id: t.id, ok: false, error: e?.message || String(e) };
    }
    const nextRun = nextRunAfter(t.cron_expression, now).toISOString();
    await supabase
      .from("alice_scheduled_triggers")
      .update({ last_run_at: now.toISOString(), next_run_at: nextRun })
      .eq("id", t.id);
    results.push(outcome);
  }

  return new Response(JSON.stringify({ ran: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

/**
 * Execute the action attached to a scheduled trigger. We support a small
 * set of "safe" tools server-side. For anything else we drop a notification
 * into the user's in-app inbox so they see the schedule fired.
 */
async function runTriggerAction(supabase: any, t: any) {
  const tool = String(t.tool_name);
  const params = t.tool_params || {};
  const userId = t.user_id;

  switch (tool) {
    case "create_task": {
      const { data, error } = await supabase.from("project_tasks").insert({
        user_id: userId,
        name: String(params.title || params.name || t.description || "Scheduled task"),
        status: "todo",
        priority: params.priority || "medium",
        due_date: params.due_date || new Date().toISOString().slice(0, 10),
        notes: params.notes || `Created by ALICE schedule "${t.description || t.id}"`,
      }).select("id").single();
      if (error) throw new Error(error.message);
      return { tool, created_id: data.id };
    }
    case "create_reminder":
    case "in_app_notification": {
      const { error } = await supabase.from("in_app_notifications").insert({
        user_id: userId,
        title: String(params.title || t.description || "ALICE reminder"),
        body: String(params.body || params.message || ""),
        item_type: "alice_schedule",
        item_id: `alice_schedule:${t.id}`,
        is_read: false,
      });
      if (error) throw new Error(error.message);
      return { tool };
    }
    case "web_search":
    case "deep_search":
    case "search_knowledge": {
      // Defer to ALICE on next chat: just notify the user the scheduled
      // search is ready so they can tap into Alice and get the results.
      const { error } = await supabase.from("in_app_notifications").insert({
        user_id: userId,
        title: `🔎 Scheduled ${tool.replace("_", " ")}`,
        body: `ALICE is ready to run "${params.query || t.description || ""}" — open chat to see results.`,
        item_type: "alice_schedule",
        item_id: `alice_schedule:${t.id}`,
        is_read: false,
      });
      if (error) throw new Error(error.message);
      return { tool, deferred: true };
    }
    default: {
      // Unknown / advanced tool — just notify so the user is aware.
      const { error } = await supabase.from("in_app_notifications").insert({
        user_id: userId,
        title: `⏰ ALICE schedule fired`,
        body: `Tool "${tool}" — ${t.description || JSON.stringify(params).slice(0, 200)}`,
        item_type: "alice_schedule",
        item_id: `alice_schedule:${t.id}`,
        is_read: false,
      });
      if (error) throw new Error(error.message);
      return { tool, deferred: true };
    }
  }
}
