// Install an approved marketplace submission into the caller's own
// `alice_macros` table. We always copy steps (immutable snapshot) so that
// updates to the original do not silently change the installed copy.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const submissionId = String(body.submission_id || "").trim();
    if (!submissionId) return json({ error: "submission_id is required" }, 400);

    const { data: sub, error: subErr } = await supabase
      .from("macro_marketplace_submissions")
      .select("id, status, title, description, tags, start_url, target_domain, steps_snapshot")
      .eq("id", submissionId)
      .maybeSingle();
    if (subErr || !sub) return json({ error: "Submission not found" }, 404);
    if (sub.status !== "approved") return json({ error: "Submission is not approved" }, 400);

    const { data: macro, error: insErr } = await supabase
      .from("alice_macros")
      .insert({
        user_id: user.id,
        name: sub.title,
        description: sub.description,
        start_url: sub.start_url,
        target_domain: sub.target_domain,
        tags: sub.tags,
        steps: sub.steps_snapshot,
        source: "marketplace",
        enabled: true,
      })
      .select("*")
      .single();
    if (insErr) throw insErr;

    // Record the install — RLS allows the user to insert their own row.
    await supabase.from("macro_marketplace_installs").insert({
      submission_id: submissionId,
      user_id: user.id,
      installed_macro_id: macro.id,
    });

    return json({ ok: true, macro });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});
