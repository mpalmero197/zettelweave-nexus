// ALICE — proactive pulse.
// Runs on a cron (every 4h by default). For each user with proactive
// ALICE enabled, collects a small snapshot of recent activity and asks
// Gemini for ONE useful, non-spammy proactive nudge. Inserts a row into
// `alice_pulses` so the UI can surface a Sparkles-icon dropdown.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM = `You are ALICE, a proactive 24/7 writing & life assistant inside PendragonX.
Given a compact snapshot of the user's last day of activity, decide whether there is ONE genuinely useful proactive nudge worth surfacing right now.

Output STRICT JSON:
{
  "skip": boolean,                          // true if nothing worth saying
  "kind": "reminder" | "insight" | "suggestion" | "celebration",
  "summary": "<= 140 chars, second person, no emojis at start",
  "rationale": "<= 200 chars, why this matters now",
  "suggested_trigger": null | {             // optional: schedule it for later
     "run_at": "ISO 8601 UTC",
     "action": "remind" | "draft" | "summarize",
     "payload": { "title": str, "notes"?: str }
  }
}

Rules:
- Quality > quantity. If unsure, set "skip": true.
- Never invent facts not present in the snapshot.
- Tie to a concrete item (overdue task, stale draft, upcoming event, broken habit streak, fresh idea worth expanding).
- No marketing language. No "I noticed". Be direct and warm.
- No prose outside JSON. No markdown fences.`;

async function callGemini(prompt: string): Promise<any> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { skip: true };
  const r = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) return { skip: true };
  const j = await r.json();
  try { return JSON.parse(j?.choices?.[0]?.message?.content || "{}"); }
  catch { return { skip: true }; }
}

function levelToMinHoursBetween(level: number): number {
  // 1=24h, 2=8h, 3=4h, 4=2h, 5=1h
  const map: Record<number, number> = { 1: 24, 2: 8, 3: 4, 4: 2, 5: 1 };
  return map[Math.max(1, Math.min(5, level || 3))];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Optional: per-user run via {userId} body. Otherwise iterates all opted-in users.
  let targetUserId: string | null = null;
  try {
    if (req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      if (b?.userId) targetUserId = String(b.userId);
    }
  } catch { /* ignore */ }

  const profilesQuery = admin
    .from("profiles")
    .select("user_id, alice_proactive_enabled, alice_proactive_level")
    .eq("alice_proactive_enabled", true);
  if (targetUserId) profilesQuery.eq("user_id", targetUserId);
  const { data: profiles, error: pErr } = await profilesQuery;
  if (pErr) {
    return new Response(JSON.stringify({ error: pErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  for (const p of profiles || []) {
    try {
      const minHrs = levelToMinHoursBetween(p.alice_proactive_level ?? 3);
      const cutoff = new Date(now.getTime() - minHrs * 60 * 60 * 1000).toISOString();

      // Throttle: skip if a pulse was generated for this user recently
      const { data: recent } = await admin
        .from("alice_pulses")
        .select("id, created_at")
        .eq("user_id", p.user_id)
        .gte("created_at", cutoff)
        .limit(1);
      if (recent && recent.length) { results.push({ user: p.user_id, skipped: "throttle" }); continue; }

      // Gather a compact snapshot
      const [cardsR, notesR, tasksR, eventsR, habitsR] = await Promise.all([
        admin.from("zettel_cards").select("title, created_at").eq("user_id", p.user_id).is("deleted_at", null).gte("created_at", since).order("created_at", { ascending: false }).limit(5),
        admin.from("notes").select("title, updated_at").eq("user_id", p.user_id).is("deleted_at", null).gte("updated_at", since).order("updated_at", { ascending: false }).limit(5),
        admin.from("project_tasks").select("name, status, due_date, priority").eq("user_id", p.user_id).neq("status", "done").lte("due_date", tomorrow.slice(0, 10)).limit(10),
        admin.from("calendar_events").select("title, event_date, event_time").eq("user_id", p.user_id).gte("event_date", now.toISOString().slice(0, 10)).lte("event_date", tomorrow.slice(0, 10)).limit(10),
        admin.from("habits").select("id, name").eq("user_id", p.user_id).limit(10),
      ]);

      const snapshot = {
        nowUtc: now.toISOString(),
        recentCards: (cardsR.data || []).map((x: any) => x.title).slice(0, 5),
        recentNotes: (notesR.data || []).map((x: any) => x.title).slice(0, 5),
        openTasksDueSoon: (tasksR.data || []).map((x: any) => ({ name: x.name, due: x.due_date, prio: x.priority })),
        upcomingEvents: (eventsR.data || []).map((x: any) => ({ title: x.title, date: x.event_date, time: x.event_time })),
        habits: (habitsR.data || []).map((x: any) => x.name),
      };

      // If everything is empty, skip
      const empty = snapshot.recentCards.length + snapshot.recentNotes.length + snapshot.openTasksDueSoon.length + snapshot.upcomingEvents.length + snapshot.habits.length === 0;
      if (empty) { results.push({ user: p.user_id, skipped: "empty" }); continue; }

      const ai = await callGemini(JSON.stringify(snapshot));
      if (ai?.skip || !ai?.summary) { results.push({ user: p.user_id, skipped: "ai" }); continue; }

      const kind = String(ai.kind || "suggestion");
      const summary = String(ai.summary).slice(0, 200);
      const payload = { rationale: String(ai.rationale || "").slice(0, 400), suggested_trigger: ai.suggested_trigger ?? null, snapshot };

      const { data: pulse } = await admin.from("alice_pulses").insert({
        user_id: p.user_id, kind, summary, payload, status: "pending",
      }).select("id").single();

      // If model suggested a scheduled trigger, persist it
      if (ai?.suggested_trigger?.run_at) {
        try {
          await admin.from("alice_scheduled_triggers").insert({
            user_id: p.user_id,
            run_at: ai.suggested_trigger.run_at,
            action: ai.suggested_trigger.action || "remind",
            payload: ai.suggested_trigger.payload || { title: summary },
            status: "pending",
          });
        } catch { /* optional */ }
      }

      results.push({ user: p.user_id, pulseId: pulse?.id, kind });
    } catch (e: any) {
      results.push({ user: p.user_id, error: e?.message || "err" });
    }
  }

  return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
