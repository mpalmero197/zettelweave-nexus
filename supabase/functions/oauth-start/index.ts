// oauth-start: returns the provider's authorize URL for the signed-in user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PROVIDERS, signState, redirectUri } from "../_shared/oauth-providers.ts";
import { getProviderCreds, getStateSecret } from "../_shared/oauth-config-store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { provider, return_to } = await req.json();
    const cfg = PROVIDERS[provider];
    if (!cfg) {
      return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creds = await getProviderCreds(provider, cfg.clientIdEnv, cfg.clientSecretEnv);
    const stateSecret = await getStateSecret();
    if (!creds.clientId || !creds.clientSecret || !creds.enabled || !stateSecret) {
      return new Response(
        JSON.stringify({
          error: `${cfg.label} is not configured or is disabled. An admin can set this up in Admin Panel → OAuth Providers.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const state = await signState(
      {
        u: userId,
        p: provider,
        r: typeof return_to === "string" ? return_to : null,
        n: crypto.randomUUID(),
        exp: Date.now() + 10 * 60 * 1000,
      },
      stateSecret,
    );

    const params = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: redirectUri(),
      response_type: "code",
      state,
      ...(cfg.scopes ? { scope: cfg.scopes } : {}),
      ...(cfg.extraAuthParams || {}),
    });

    const url = `${cfg.authorizeUrl}?${params.toString()}`;
    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("oauth-start error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
