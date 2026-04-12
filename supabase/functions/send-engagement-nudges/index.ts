import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";
import { sendPushNotification, urlBase64ToUint8Array, VAPID_PUBLIC_KEY_B64 } from "../_shared/webpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INSPIRATIONAL_QUOTES = [
  "Small steps every day lead to big results. 🚀",
  "Your second brain is growing — keep feeding it! 🧠",
  "Knowledge compounds. Every note matters. 📝",
  "Don't break your learning streak! 💪",
  "The best time to capture a thought is right now. ⏰",
  "Your future self will thank you for taking notes today. 🙌",
  "Consistency beats intensity. Keep going! 🔥",
  "Every expert was once a beginner. 🌱",
  "Your ideas deserve to be written down. ✨",
  "A note a day keeps forgetfulness away! 📖",
  "Great minds take great notes. You're doing amazing! 🌟",
  "Building knowledge is building power. Keep at it! ⚡",
  "Your personal wiki is becoming incredible. 📚",
  "Capture, connect, create — you're on the right track! 🎯",
  "The pen is mightier than the sword, and your keyboard even more so. ⌨️",
];

// Minimum 4 hours, with up to 2 hours random jitter = 4-6 hour window
const MIN_INTERVAL_MS = 4 * 60 * 60 * 1000;
const MAX_JITTER_MS = 2 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKeyB64 = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPrivateKeyB64) {
      return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPrivateKey = urlBase64ToUint8Array(vapidPrivateKeyB64);
    const vapidPublicKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY_B64);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get users who have push subscriptions and nudges enabled
    const { data: subscriptions, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth, id");

    if (subErr || !subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: subErr ? "fetch_error" : "no_subs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(subscriptions.map((s) => s.user_id))];

    // Fetch profiles for these users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, engagement_nudges_enabled, last_nudge_sent_at")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
    const now = Date.now();
    let pushCount = 0;

    for (const userId of userIds) {
      const profile = profileMap.get(userId);

      // Skip if nudges disabled
      if (profile?.engagement_nudges_enabled === false) continue;

      // Check interval with random jitter
      if (profile?.last_nudge_sent_at) {
        const lastSent = new Date(profile.last_nudge_sent_at).getTime();
        const jitter = Math.random() * MAX_JITTER_MS;
        if (now - lastSent < MIN_INTERVAL_MS + jitter) continue;
      }

      // Build notification
      const notification = await buildNotification(supabase, userId);
      if (!notification) continue;

      // Send to all user devices
      const userSubs = subscriptions.filter((s) => s.user_id === userId);
      let sent = false;

      for (const sub of userSubs) {
        try {
          const result = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            notification,
            vapidPrivateKey,
            vapidPublicKey,
          );

          if (result.gone) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          } else if (result.success) {
            sent = true;
            pushCount++;
          }
        } catch (e) {
          console.error(`Push error for ${sub.endpoint}:`, e);
        }
      }

      // Update last_nudge_sent_at
      if (sent) {
        await supabase
          .from("profiles")
          .update({ last_nudge_sent_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    }

    console.log(`Engagement nudges: sent ${pushCount} push(es)`);
    return new Response(JSON.stringify({ sent: pushCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-engagement-nudges:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

type SupabaseClient = ReturnType<typeof createClient>;

async function buildNotification(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown> | null> {
  // Pick a random type
  const types = ["longest_note", "recent_note", "longest_card", "inspirational"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "inspirational") {
    const quote = INSPIRATIONAL_QUOTES[Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length)];
    return {
      title: "💡 Daily Inspiration",
      body: quote,
      tag: "nudge-inspirational",
      url: "/app",
    };
  }

  if (type === "longest_note") {
    const { data } = await supabase
      .from("notes")
      .select("title, content")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("content", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const words = (data.content || "").split(/\s+/).filter(Boolean).length;
      return {
        title: "📝 Your Longest Note",
        body: `"${truncate(data.title, 40)}" has grown to ${words} words — keep building!`,
        tag: "nudge-longest",
        url: "/app",
      };
    }
  }

  if (type === "recent_note") {
    const { data } = await supabase
      .from("notes")
      .select("title, updated_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const ago = timeAgo(new Date(data.updated_at));
      return {
        title: "✏️ Continue Where You Left Off",
        body: `You last worked on "${truncate(data.title, 40)}" ${ago} — ready to continue?`,
        tag: "nudge-recent",
        url: "/app",
      };
    }
  }

  if (type === "longest_card") {
    const { data } = await supabase
      .from("zettel_cards")
      .select("title, content")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("content", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const words = (data.content || "").split(/\s+/).filter(Boolean).length;
      return {
        title: "🗃️ Your Knowledge Card",
        body: `"${truncate(data.title, 40)}" is ${words} words strong — your second brain is growing!`,
        tag: "nudge-card",
        url: "/app",
      };
    }
  }

  // Fallback to inspirational
  const quote = INSPIRATIONAL_QUOTES[Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length)];
  return {
    title: "💡 Daily Inspiration",
    body: quote,
    tag: "nudge-inspirational",
    url: "/app",
  };
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len - 1) + "…" : str;
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
