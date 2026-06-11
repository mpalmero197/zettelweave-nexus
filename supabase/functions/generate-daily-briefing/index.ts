// Generate per-user daily briefings and send web-push notifications.
// Designed to be invoked hourly by pg_cron. For each user whose local
// briefing hour matches the current UTC hour shifted by their timezone,
// build a briefing row (idempotent per day) and push a notification.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";
import { sendPushNotification, urlBase64ToUint8Array, VAPID_PUBLIC_KEY_B64 } from "../_shared/webpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BriefingItem = {
  kind: "task" | "event" | "card" | "note" | "focus";
  id?: string;
  title: string;
  subtitle?: string;
  route: string; // dashboard tab key OR /app path
  time?: string;
};

function localHourFor(tz: string): { hour: number; date: string } {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return {
      hour: parseInt(get("hour"), 10),
      date: `${get("year")}-${get("month")}-${get("day")}`,
    };
  } catch {
    const now = new Date();
    return { hour: now.getUTCHours(), date: now.toISOString().slice(0, 10) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");
    const vapidPriv = Deno.env.get("VAPID_PRIVATE_KEY");
    const supabase = createClient(url, key);

    // Identify caller. Either cron (service-role bearer or x-cron-secret) or an authenticated user.
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const callerSecret = req.headers.get("x-cron-secret") || "";
    const isCron =
      (bearer && bearer === key) ||
      (cronSecret && callerSecret === cronSecret);

    let authedUserId: string | null = null;
    if (!isCron) {
      if (!bearer) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(url, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authedUserId = userData.user.id;
    }

    // Optional: caller can force a specific user (manual trigger from UI).
    // Authenticated users can only force themselves; cron callers can force any user.
    let forceUserId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.user_id === "string") forceUserId = body.user_id;
      } catch { /* ignore */ }
    }
    if (!isCron) {
      forceUserId = authedUserId;
    }


    // Pull all users with briefing prefs
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, daily_briefing_enabled, daily_briefing_hour, daily_briefing_timezone");

    if (!profiles?.length) {
      return new Response(JSON.stringify({ generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0;
    let pushed = 0;

    for (const p of profiles) {
      if (!forceUserId && p.daily_briefing_enabled === false) continue;
      if (forceUserId && p.user_id !== forceUserId) continue;

      const tz = p.daily_briefing_timezone || "UTC";
      const { hour, date } = localHourFor(tz);
      const targetHour = typeof p.daily_briefing_hour === "number" ? p.daily_briefing_hour : 7;

      if (!forceUserId && hour !== targetHour) continue;

      // Idempotency: skip if briefing already exists for today
      const { data: existing } = await supabase
        .from("daily_briefings")
        .select("id, sent_push")
        .eq("user_id", p.user_id)
        .eq("briefing_date", date)
        .maybeSingle();

      let briefingId = existing?.id ?? null;
      let alreadyPushed = existing?.sent_push ?? false;

      if (!briefingId) {
        const items = await buildBriefingItems(supabase, p.user_id, date);
        const headline = headlineFor(items);

        const { data: inserted, error: insErr } = await supabase
          .from("daily_briefings")
          .insert({
            user_id: p.user_id,
            briefing_date: date,
            headline,
            items,
          })
          .select("id")
          .single();

        if (insErr) {
          console.error("insert briefing failed", p.user_id, insErr.message);
          continue;
        }
        briefingId = inserted.id;
        generated++;
      }

      // Send push (once per day)
      if (vapidPriv && briefingId && !alreadyPushed) {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", p.user_id);

        if (subs?.length) {
          // Re-read items to compose body
          const { data: brief } = await supabase
            .from("daily_briefings")
            .select("headline, items")
            .eq("id", briefingId)
            .single();

          const items: BriefingItem[] = (brief?.items as BriefingItem[]) || [];
          const body = items.length
            ? items.slice(0, 3).map((i) => `• ${i.title}`).join("\n")
            : "Open Pendragon to plan your day.";

          const vapidPrivateKey = urlBase64ToUint8Array(vapidPriv);
          const vapidPublicKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY_B64);

          let sentAny = false;
          for (const sub of subs) {
            try {
              const r = await sendPushNotification(
                { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
                {
                  title: `🗞️ ${brief?.headline || "Your daily briefing"}`,
                  body,
                  tag: `briefing-${date}`,
                  url: "/app?tab=dashboard&briefing=1",
                },
                vapidPrivateKey,
                vapidPublicKey,
              );
              if (r.gone) await supabase.from("push_subscriptions").delete().eq("id", sub.id);
              else if (r.success) sentAny = true;
            } catch (e) {
              console.error("push err", e);
            }
          }
          if (sentAny) {
            pushed++;
            await supabase.from("daily_briefings").update({ sent_push: true }).eq("id", briefingId);
          }
        }
      }
    }

    return new Response(JSON.stringify({ generated, pushed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-daily-briefing error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

type SbClient = ReturnType<typeof createClient>;

function headlineFor(items: BriefingItem[]): string {
  const tasks = items.filter((i) => i.kind === "task").length;
  const events = items.filter((i) => i.kind === "event").length;
  if (!tasks && !events) return "A quiet day — perfect for deep work";
  const parts: string[] = [];
  if (tasks) parts.push(`${tasks} task${tasks > 1 ? "s" : ""}`);
  if (events) parts.push(`${events} event${events > 1 ? "s" : ""}`);
  return `${parts.join(" • ")} on your plate today`;
}

async function buildBriefingItems(
  supabase: SbClient,
  userId: string,
  todayIso: string,
): Promise<BriefingItem[]> {
  const items: BriefingItem[] = [];

  // Tasks due today
  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("id, name, due_date, status")
    .eq("user_id", userId)
    .eq("due_date", todayIso)
    .neq("status", "done")
    .limit(8);
  for (const t of tasks || []) {
    items.push({
      kind: "task",
      id: t.id,
      title: t.name,
      subtitle: "Due today",
      route: "tasks",
    });
  }

  // Events today
  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, title, event_time")
    .eq("user_id", userId)
    .eq("event_date", todayIso)
    .order("event_time", { ascending: true })
    .limit(8);
  for (const e of events || []) {
    items.push({
      kind: "event",
      id: e.id,
      title: e.title,
      subtitle: e.event_time ? `at ${String(e.event_time).slice(0, 5)}` : "Today",
      time: e.event_time ?? undefined,
      route: "calendar",
    });
  }

  // A recent card to revisit (yesterday's work)
  const { data: cards } = await supabase
    .from("zettel_cards")
    .select("id, title, updated_at, number")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (cards?.[0]) {
    items.push({
      kind: "card",
      id: cards[0].id,
      title: cards[0].title || "Untitled card",
      subtitle: "Pick up where you left off",
      route: "cards",
    });
  }

  // A recent note
  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (notes?.[0]) {
    items.push({
      kind: "note",
      id: notes[0].id,
      title: notes[0].title || "Untitled note",
      subtitle: "Recently edited",
      route: "notes",
    });
  }

  return items;
}
