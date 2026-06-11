// oauth-admin-config: admin-only CRUD for OAuth provider credentials.
// Never returns client_secret values. Logs every change to security_audit_log.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PROVIDERS } from "../_shared/oauth-providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  if (claimsError || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const userId = claimsData.claims.sub;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Verify caller is admin
  const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userId });
  if (!isAdmin) return json({ error: "Admin privileges required" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = body?.action;

  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-callback`;

  if (action === "list") {
    const { data } = await admin
      .from("oauth_provider_configs")
      .select("provider, client_id, enabled, updated_at");
    const rows = (data || []).filter((r: any) => r.provider !== "__state__");
    const byProvider = new Map(rows.map((r: any) => [r.provider, r]));
    const items = Object.values(PROVIDERS).map((p) => {
      const row: any = byProvider.get(p.id);
      return {
        provider: p.id,
        label: p.label,
        client_id: row?.client_id ?? null,
        has_secret: !!row?.client_id && !!row && row.enabled !== null,
        enabled: !!row?.enabled,
        scopes: p.scopes,
        authorize_url: p.authorizeUrl,
        updated_at: row?.updated_at ?? null,
      };
    });
    return json({ items, redirect_uri: redirectUri });
  }

  if (action === "save") {
    const provider = String(body?.provider || "");
    if (!PROVIDERS[provider]) return json({ error: "Unknown provider" }, 400);

    const update: Record<string, any> = { provider, updated_by: userId };
    if (typeof body?.client_id === "string") update.client_id = body.client_id.trim() || null;
    if (typeof body?.client_secret === "string" && body.client_secret.length > 0) {
      update.client_secret = body.client_secret;
    }
    if (typeof body?.enabled === "boolean") update.enabled = body.enabled;

    const { error } = await admin
      .from("oauth_provider_configs")
      .upsert(update, { onConflict: "provider" });
    if (error) return json({ error: error.message }, 500);

    await admin.rpc("log_security_event", {
      p_user_id: userId,
      p_event_type: "oauth_provider_config_update",
      p_event_details: {
        provider,
        fields_changed: Object.keys(update).filter((k) => k !== "updated_by" && k !== "provider"),
        enabled: update.enabled,
      },
    });

    return json({ ok: true });
  }

  if (action === "delete") {
    const provider = String(body?.provider || "");
    if (!PROVIDERS[provider]) return json({ error: "Unknown provider" }, 400);
    const { error } = await admin
      .from("oauth_provider_configs")
      .delete()
      .eq("provider", provider);
    if (error) return json({ error: error.message }, 500);
    await admin.rpc("log_security_event", {
      p_user_id: userId,
      p_event_type: "oauth_provider_config_delete",
      p_event_details: { provider },
    });
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
