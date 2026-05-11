// oauth-disconnect: revokes the provider token (best-effort) and deletes the
// per-user connection row.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PROVIDERS } from "../_shared/oauth-providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REVOKE_URLS: Record<string, string> = {
  google: "https://oauth2.googleapis.com/revoke",
  microsoft: "", // Microsoft has no standard revoke endpoint for v2; deletion alone is sufficient
  notion: "",   // Notion: user removes integration from workspace; we just delete locally
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { provider } = await req.json();
    if (!provider || !PROVIDERS[provider]) {
      return new Response(JSON.stringify({ error: "Unknown provider" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Best-effort token revocation
    const { data: row } = await admin
      .from("user_connections")
      .select("access_token, refresh_token")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();

    const revokeUrl = REVOKE_URLS[provider];
    if (revokeUrl && row?.access_token) {
      try {
        await fetch(revokeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: row.refresh_token || row.access_token }),
        });
      } catch {/* ignore network errors */}
    }

    const { error: delErr } = await admin
      .from("user_connections")
      .delete()
      .eq("user_id", userId)
      .eq("provider", provider);

    if (delErr) throw delErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("oauth-disconnect error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
