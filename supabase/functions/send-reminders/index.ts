import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

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

    for (const reminder of dueReminders) {
      // Create in-app notification
      await supabase.from("in_app_notifications").insert({
        user_id: reminder.user_id,
        title: `⏰ Reminder: ${reminder.item_title || reminder.item_type}`,
        body: `Your ${reminder.item_type} is coming up in ${formatOffset(reminder.offset_minutes)}.`,
        item_type: reminder.item_type,
        item_id: reminder.item_id,
      });

      // Try push notification
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", reminder.user_id);

      if (subscriptions && subscriptions.length > 0) {
        // Note: Web Push requires VAPID keys and the web-push library.
        // For now we create in-app notifications. Push delivery
        // would require a VAPID private key secret and the web-push npm package.
        // This is a placeholder for when VAPID keys are configured.
        console.log(`Would send push to ${subscriptions.length} device(s) for user ${reminder.user_id}`);
      }

      // Mark as sent
      await supabase
        .from("reminders")
        .update({ is_sent: true })
        .eq("id", reminder.id);

      sentCount++;
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
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
