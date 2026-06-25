// Submit a user's alice_macros row to the public Macro Marketplace.
// The submission is created in `pending` status — an admin must approve it
// before it appears in the public gallery. We snapshot the steps so future
// edits to the author's local macro do not silently mutate the public copy.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

function sanitizeSteps(steps: any[]): any[] {
  // Strip anything that looks like a literal credential, leaving only the
  // {{vault.*}} tokens. Authors shouldn't accidentally publish passwords.
  return steps.map((s) => {
    const copy = { ...s };
    if (copy.sensitive && typeof copy.value === "string" && !copy.value.includes("{{")) {
      copy.value = "{{vault.password}}";
    }
    if (typeof copy.text === "string" && /password|secret|token/i.test(copy.selector || "")) {
      if (!copy.text.includes("{{")) copy.text = "{{vault.password}}";
    }
    return copy;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const macroId = String(body.macro_id || "").trim();
    if (!macroId) return json({ error: "macro_id is required" }, 400);

    // Look up the macro and confirm ownership.
    const { data: macro, error: macErr } = await supabase
      .from("alice_macros")
      .select("id, user_id, name, description, start_url, target_domain, tags, steps")
      .eq("id", macroId)
      .single();
    if (macErr || !macro) return json({ error: "Macro not found" }, 404);
    if (macro.user_id !== user.id) return json({ error: "Not your macro" }, 403);

    const steps = Array.isArray(macro.steps) ? sanitizeSteps(macro.steps) : [];
    if (!steps.length) return json({ error: "Macro has no steps" }, 400);

    const title = String(body.title || macro.name || "Untitled macro").slice(0, 120);
    const description = (body.description ? String(body.description) : macro.description || "").slice(0, 1000);
    const tags = Array.isArray(body.tags) ? body.tags.slice(0, 10).map((t: string) => String(t).slice(0, 32)) : (macro.tags || []);

    // Prevent duplicate pending submissions for the same macro.
    const { data: existing } = await supabase
      .from("macro_marketplace_submissions")
      .select("id, status")
      .eq("macro_id", macroId)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (existing) {
      return json({ error: `A ${existing.status} submission for this macro already exists.` }, 409);
    }

    const { data: sub, error: insErr } = await supabase
      .from("macro_marketplace_submissions")
      .insert({
        macro_id: macroId,
        user_id: user.id,
        title,
        description,
        tags,
        start_url: macro.start_url,
        target_domain: macro.target_domain,
        steps_snapshot: steps,
        status: "pending",
      })
      .select("*")
      .single();
    if (insErr) throw insErr;

    return json({ ok: true, submission: sub });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});
