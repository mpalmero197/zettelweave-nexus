// oauth-callback: public endpoint that the OAuth provider redirects to after
// the user grants consent. Exchanges the authorization code for tokens, stores
// them per-user, then renders a tiny HTML page that closes the popup.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PROVIDERS, verifyState, redirectUri } from "../_shared/oauth-providers.ts";

const html = (status: "ok" | "error", message: string, provider?: string) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${status === "ok" ? "Connected" : "Connection failed"}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif; background: hsl(220 13% 98%); color: hsl(220 13% 18%); margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .card { background: white; border: 1px solid hsl(220 13% 91%); border-radius: 8px; padding: 32px 36px; max-width: 380px; text-align: center; }
  .icon { font-size: 36px; margin-bottom: 12px; }
  h1 { font-size: 18px; margin: 0 0 6px; font-weight: 600; }
  p { font-size: 13px; color: hsl(220 9% 46%); margin: 0 0 16px; line-height: 1.5; }
  button { background: hsl(220 13% 18%); color: white; border: 0; padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; }
</style></head>
<body>
<div class="card">
  <div class="icon">${status === "ok" ? "✅" : "⚠️"}</div>
  <h1>${status === "ok" ? `Connected to ${provider ?? "service"}` : "Connection failed"}</h1>
  <p>${message}</p>
  <button onclick="window.close()">Close window</button>
</div>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage({ type: 'pendragonx:oauth', status: ${JSON.stringify(status)}, provider: ${JSON.stringify(provider ?? null)}, message: ${JSON.stringify(message)} }, '*');
      setTimeout(() => window.close(), 1200);
    }
  } catch (e) {}
</script>
</body></html>`;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error_description") || url.searchParams.get("error");

  if (errParam) {
    return new Response(html("error", errParam), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  if (!code || !state) {
    return new Response(html("error", "Missing code or state from provider."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const stateSecret = Deno.env.get("OAUTH_STATE_SECRET");
  if (!stateSecret) {
    return new Response(html("error", "Server is missing OAUTH_STATE_SECRET."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const payload = await verifyState<{ u: string; p: string }>(state, stateSecret);
  if (!payload) {
    return new Response(html("error", "Invalid or expired state. Please try connecting again."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const cfg = PROVIDERS[payload.p];
  if (!cfg) {
    return new Response(html("error", `Unknown provider: ${payload.p}`), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const clientId = Deno.env.get(cfg.clientIdEnv);
  const clientSecret = Deno.env.get(cfg.clientSecretEnv);
  if (!clientId || !clientSecret) {
    return new Response(
      html("error", `${cfg.label} is not configured on the server (missing ${cfg.clientIdEnv} / ${cfg.clientSecretEnv}).`),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Exchange the code for tokens
  let tokenRes: Response;
  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      ...(cfg.basicAuth ? {} : { client_id: clientId, client_secret: clientSecret }),
    });
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    };
    if (cfg.basicAuth) {
      headers["Authorization"] = "Basic " + btoa(`${clientId}:${clientSecret}`);
    }
    tokenRes = await fetch(cfg.tokenUrl, { method: "POST", headers, body });
  } catch (err) {
    return new Response(html("error", `Network error contacting ${cfg.label}: ${err}`), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const tokenJson: any = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson.access_token) {
    console.error("Token exchange failed:", tokenJson);
    return new Response(
      html("error", tokenJson.error_description || tokenJson.error || `Token exchange failed (${tokenRes.status}).`, cfg.label),
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Optional: fetch user profile so we can show the connected account
  let profile: { id?: string; email?: string; name?: string } = {};
  if (cfg.userInfoUrl) {
    try {
      const r = await fetch(cfg.userInfoUrl, {
        headers: { Authorization: `Bearer ${tokenJson.access_token}`, Accept: "application/json" },
      });
      if (r.ok) profile = cfg.parseProfile?.(await r.json()) || {};
    } catch {/* ignore */}
  } else if (cfg.parseProfile) {
    profile = cfg.parseProfile(tokenJson) || {};
  }

  const expiresAt = tokenJson.expires_in
    ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
    : null;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error: upsertErr } = await admin
    .from("user_connections")
    .upsert(
      {
        user_id: payload.u,
        provider: cfg.id,
        provider_account_id: profile.id ?? null,
        provider_account_email: profile.email ?? null,
        provider_account_name: profile.name ?? null,
        access_token: tokenJson.access_token,
        refresh_token: tokenJson.refresh_token ?? null,
        token_type: tokenJson.token_type ?? "Bearer",
        expires_at: expiresAt,
        scopes: typeof tokenJson.scope === "string" ? tokenJson.scope.split(/[\s,]+/).filter(Boolean) : [],
        metadata: { raw_token_response_keys: Object.keys(tokenJson) },
        last_synced_at: new Date().toISOString(),
        last_error: null,
      },
      { onConflict: "user_id,provider" },
    );

  if (upsertErr) {
    console.error("Upsert error:", upsertErr);
    return new Response(html("error", `Could not save your connection: ${upsertErr.message}`, cfg.label), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(
    html("ok", profile.email ? `Signed in as ${profile.email}.` : "You can close this window.", cfg.label),
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
});
