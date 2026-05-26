// ALICE — proactive notifier.
// Runs every couple of minutes. Scans calendar_events, project_tasks, and
// habits for things the user needs to be nudged about, and inserts BOTH:
//   1. an in_app_notifications row (drives the bell + realtime toast), and
//   2. a reminders row marked is_sent=true so send-reminders pushes a
//      web-push notification on the next tick.
//
// Dedup is enforced by a deterministic item_id key per notification so
// we never spam the user with the same nudge twice.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendPushNotification, urlBase64ToUint8Array, VAPID_PUBLIC_KEY_B64 } from "../_shared/webpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function ensureNotification(
  admin: any,
  userId: string,
  itemType: string,
  itemId: string,
  title: string,
  body: string,
): Promise<boolean> {
  // Dedup: skip if already inserted for this exact item_id.
  const { data: existing } = await admin
    .from("in_app_notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();
  if (existing) return false;
  await admin.from("in_app_notifications").insert({
    user_id: userId,
    title,
    body,
    item_type: itemType,
    item_id: itemId,
    is_read: false,
  });
  return true;
}

async function pushToUser(
  admin: any,
  userId: string,
  title: string,
  body: string,
  url: string,
  tag: string,
  vapidPrivate: Uint8Array,
  vapidPublic: Uint8Array,
) {
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs || !subs.length) return 0;
  let n = 0;
  for (const s of subs) {
    try {
      const r = await sendPushNotification(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        { title, body, url, tag },
        vapidPrivate,
        vapidPublic,
      );
      if (r.gone) await admin.from("push_subscriptions").delete().eq("id", s.id);
      else if (r.success) n++;
    } catch (_e) { /* ignore */ }
  }
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const vapidPrivateB64 = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  let vapidPrivate: Uint8Array | null = null;
  let vapidPublic: Uint8Array | null = null;
  try {
    if (vapidPrivateB64) {
      vapidPrivate = urlBase64ToUint8Array(vapidPrivateB64);
      vapidPublic = urlBase64ToUint8Array(VAPID_PUBLIC_KEY_B64);
    }
  } catch (_e) { /* push disabled */ }

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400_000).toISOString().slice(0, 10);
  let createdNotifications = 0;
  let pushed = 0;

  // ─── 1. CALENDAR EVENTS — fire reminder_minutes before event_time ───
  const { data: events } = await admin
    .from("calendar_events")
    .select("id, user_id, title, event_date, event_time, reminder_minutes, location")
    .gte("event_date", todayIso)
    .lte("event_date", tomorrow)
    .neq("status", "cancelled");
  for (const ev of events || []) {
    const offset = Math.max(0, Number(ev.reminder_minutes ?? 10));
    const timeStr = ev.event_time || "09:00:00";
    const eventDt = new Date(`${ev.event_date}T${timeStr}Z`);
    if (Number.isNaN(eventDt.getTime())) continue;
    const fireAt = new Date(eventDt.getTime() - offset * 60_000);
    // Fire only within a 15 min look-back window after the trigger time.
    if (now.getTime() < fireAt.getTime()) continue;
    if (now.getTime() - fireAt.getTime() > 15 * 60_000) continue;
    const minsAway = Math.max(0, Math.round((eventDt.getTime() - now.getTime()) / 60_000));
    const itemId = `event:${ev.id}:T-${offset}`;
    const title = `📅 ${ev.title || "Upcoming event"}`;
    const body = minsAway > 0
      ? `Starts in ${minsAway} min${minsAway === 1 ? "" : "s"}${ev.location ? ` · ${ev.location}` : ""}`
      : `Starting now${ev.location ? ` · ${ev.location}` : ""}`;
    const wasNew = await ensureNotification(admin, ev.user_id, "calendar_event", itemId, title, body);
    if (wasNew) {
      createdNotifications++;
      if (vapidPrivate && vapidPublic) {
        pushed += await pushToUser(admin, ev.user_id, title, body, "/app/calendar", itemId, vapidPrivate, vapidPublic);
      }
    }
  }

  // ─── 2. PROJECT TASKS — single morning nudge for tasks due today ───
  // Fires when local-ish hour is >= 8 AM in any sensible time zone window.
  // We send once per task per day; dedup handles repeats.
  const utcHour = now.getUTCHours();
  // Cover 06:00 → 11:00 local across most US/EU zones.
  if (utcHour >= 11 && utcHour <= 18) {
    const { data: tasks } = await admin
      .from("project_tasks")
      .select("id, user_id, name, due_date, priority, status")
      .eq("due_date", todayIso)
      .neq("status", "done");
    for (const t of tasks || []) {
      const itemId = `project_task:${t.id}:due-${todayIso}`;
      const pri = (t.priority || "medium").toUpperCase();
      const title = `✅ Due today: ${t.name}`;
      const body = `Task priority: ${pri}. Tap to open.`;
      const wasNew = await ensureNotification(admin, t.user_id, "project_task", itemId, title, body);
      if (wasNew) {
        createdNotifications++;
        if (vapidPrivate && vapidPublic) {
          pushed += await pushToUser(admin, t.user_id, title, body, "/app/projects", itemId, vapidPrivate, vapidPublic);
        }
      }
    }

    // ─── 3. OVERDUE PROJECT TASKS — one nudge per task per day ───
    const { data: overdue } = await admin
      .from("project_tasks")
      .select("id, user_id, name, due_date, priority, status")
      .lt("due_date", todayIso)
      .neq("status", "done")
      .limit(200);
    for (const t of overdue || []) {
      const itemId = `project_task_overdue:${t.id}:${todayIso}`;
      const daysOver = Math.max(1, Math.round((new Date(todayIso).getTime() - new Date(t.due_date).getTime()) / 86400_000));
      const title = `⚠️ Overdue: ${t.name}`;
      const body = `${daysOver} day${daysOver === 1 ? "" : "s"} past due. Tap to reschedule or complete.`;
      const wasNew = await ensureNotification(admin, t.user_id, "project_task", itemId, title, body);
      if (wasNew) {
        createdNotifications++;
        if (vapidPrivate && vapidPublic) {
          pushed += await pushToUser(admin, t.user_id, title, body, "/app/projects", itemId, vapidPrivate, vapidPublic);
        }
      }
    }

    // ─── 4. HABITS — nudge once per active habit per day if not completed ───
    const { data: habits } = await admin
      .from("habits")
      .select("id, user_id, title, frequency")
      .eq("is_archived", false);
    for (const h of habits || []) {
      // Skip habits the user already completed today.
      const { data: done } = await admin
        .from("habit_completions")
        .select("id")
        .eq("habit_id", h.id)
        .eq("user_id", h.user_id)
        .eq("completed_on", todayIso)
        .maybeSingle();
      if (done) continue;
      const itemId = `habit:${h.id}:${todayIso}`;
      const title = `🌱 Habit: ${h.title}`;
      const body = `Not logged yet today. Tap to mark it done.`;
      const wasNew = await ensureNotification(admin, h.user_id, "habit", itemId, title, body);
      if (wasNew) {
        createdNotifications++;
        if (vapidPrivate && vapidPublic) {
          pushed += await pushToUser(admin, h.user_id, title, body, "/app/habits", itemId, vapidPrivate, vapidPublic);
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, notifications: createdNotifications, pushed }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
