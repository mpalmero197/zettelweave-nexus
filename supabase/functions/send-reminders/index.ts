import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";
import { sendPushNotification, urlBase64ToUint8Array, VAPID_PUBLIC_KEY_B64 } from "../_shared/webpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKeyB64 = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPrivateKeyB64) {
      console.error("VAPID_PRIVATE_KEY secret is not configured");
      return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPrivateKey = urlBase64ToUint8Array(vapidPrivateKeyB64);
    const vapidPublicKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY_B64);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find reminders that are due and not yet sent
    const now = new Date().toISOString();
    const { data: dueReminders, error: fetchError } = await supabase
      .from("reminders")
      .select("*")
      .eq("is_sent", false)
      .lte("remind_at", now)
      .limit(100);

    if (fetchError) {
      console.error("Error fetching reminders:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    let pushCount = 0;

    for (const reminder of dueReminders) {
      // Create in-app notification
      await supabase.from("in_app_notifications").insert({
        user_id: reminder.user_id,
        title: `⏰ Reminder: ${reminder.item_title || reminder.item_type}`,
        body: `Your ${reminder.item_type} is coming up in ${formatOffset(reminder.offset_minutes)}.`,
        item_type: reminder.item_type,
        item_id: reminder.item_id,
      });

      // Send push notifications to all devices
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", reminder.user_id);

      if (subscriptions && subscriptions.length > 0) {
        const pushPayload = {
          title: `⏰ ${reminder.item_title || reminder.item_type}`,
          body: `Coming up in ${formatOffset(reminder.offset_minutes)}`,
          tag: `reminder-${reminder.id}`,
          url: "/",
        };

        for (const sub of subscriptions) {
          try {
            const result = await sendPushNotification(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              pushPayload,
              vapidPrivateKey,
              vapidPublicKey,
            );

            if (result.gone) {
              console.log(`Removing expired subscription: ${sub.endpoint}`);
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("id", sub.id);
            } else if (result.success) {
              pushCount++;
            }
          } catch (pushErr) {
            console.error(`Push error for ${sub.endpoint}:`, pushErr);
          }
        }
      }

      // Mark as sent
      await supabase
        .from("reminders")
        .update({ is_sent: true })
        .eq("id", reminder.id);

      sentCount++;
    }

    console.log(`Processed ${sentCount} reminders, sent ${pushCount} push notification(s)`);

    return new Response(JSON.stringify({ sent: sentCount, pushed: pushCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-reminders:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatOffset(minutes: number): string {
  if (minutes >= 10080 && minutes % 10080 === 0) return `${minutes / 10080} week(s)`;
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440} day(s)`;
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} hour(s)`;
  return `${minutes} minute(s)`;
}
