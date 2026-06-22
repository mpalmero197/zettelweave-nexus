// ALICE proactive calendar/task watcher.
// Runs every 5 minutes (via pg_cron). For every user with
// `alice_auto_reminders_enabled` true, scans the next ~25 hours of
// calendar_events and project_tasks and queues `reminders` rows at the
// user's preferred lead times. The existing send-reminders cron then
// fires push notifications (delivered even when the user is logged out).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HORIZON_HOURS = 26;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Users with auto-reminders enabled
    const { data: profs, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, alice_reminder_offsets, daily_briefing_timezone")
      .eq("alice_auto_reminders_enabled", true);
    if (profErr) throw profErr;

    let queued = 0;
    const now = Date.now();
    const horizon = now + HORIZON_HOURS * 3600_000;

    for (const p of profs || []) {
      const offsets: number[] = (p.alice_reminder_offsets?.length
        ? p.alice_reminder_offsets
        : [1440, 60, 15]) as number[];
      const tz = p.daily_briefing_timezone || "UTC";

      // ---- Calendar events (event_date + event_time, naive in user tz) ----
      const { data: events } = await supabase
        .from("calendar_events")
        .select("id,title,event_date,event_time,is_all_day,status")
        .eq("user_id", p.user_id)
        .neq("status", "cancelled")
        .gte("event_date", new Date(now - 86400_000).toISOString().slice(0, 10))
        .lte("event_date", new Date(horizon).toISOString().slice(0, 10));

      for (const ev of events || []) {
        const at = resolveLocal(ev.event_date, ev.event_time || (ev.is_all_day ? "09:00" : "09:00"), tz);
        if (!at) continue;
        for (const off of offsets) {
          const remindAt = at - off * 60_000;
          if (remindAt < now - 30_000 || remindAt > horizon) continue;
          queued += await queue(supabase, p.user_id, "calendar_event", ev.id, ev.title || "Event", off, remindAt);
        }
      }

      // ---- Tasks due today/tomorrow ----
      const today = new Date(now).toISOString().slice(0, 10);
      const tomorrow = new Date(now + 86400_000).toISOString().slice(0, 10);
      const { data: tasks } = await supabase
        .from("project_tasks")
        .select("id,name,due_date,status")
        .eq("user_id", p.user_id)
        .neq("status", "done")
        .in("due_date", [today, tomorrow]);

      for (const t of tasks || []) {
        // For tasks: morning-of (9am local) + 1h before end-of-day deadline
        const morning = resolveLocal(t.due_date, "09:00", tz);
        if (morning && morning >= now - 30_000 && morning <= horizon) {
          queued += await queue(supabase, p.user_id, "project_task", t.id, t.name || "Task", 0, morning);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, queued }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("alice-calendar-watch error:", e);
    return new Response(JSON.stringify({ error: e?.message || "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function queue(
  supabase: any, userId: string, itemType: string, itemId: string,
  title: string, offset: number, remindAtMs: number,
): Promise<number> {
  const { error } = await supabase.from("reminders").insert({
    user_id: userId,
    item_type: itemType,
    item_id: String(itemId),
    item_title: title.slice(0, 200),
    offset_minutes: offset,
    remind_at: new Date(remindAtMs).toISOString(),
    is_sent: false,
  });
  if (error) {
    // 23505 = unique violation = already queued, expected & ok
    if ((error as any).code === "23505") return 0;
    console.warn("reminder insert failed", error.message);
    return 0;
  }
  return 1;
}

// Treat date+time as wall-clock in `tz`. Compute the absolute UTC ms.
function resolveLocal(date: string, time: string, tz: string): number | null {
  try {
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = (time || "09:00").split(":").map(Number);
    if (!y || !m || !d) return null;
    // Build UTC guess, then correct by the tz offset at that instant.
    const utcGuess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
    const tzOffsetMin = getTzOffsetMinutes(tz, new Date(utcGuess));
    return utcGuess - tzOffsetMin * 60_000;
  } catch { return null; }
}

function getTzOffsetMinutes(tz: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = Object.fromEntries(dtf.formatToParts(at).filter(p => p.type !== "literal").map(p => [p.type, p.value]));
    const asUTC = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second),
    );
    return (asUTC - at.getTime()) / 60_000;
  } catch { return 0; }
}
