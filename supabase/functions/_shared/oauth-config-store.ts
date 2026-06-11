// Reads OAuth provider configuration from the `oauth_provider_configs` table
// (admin-managed via the Admin Panel) and falls back to env vars for legacy setups.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface ProviderCreds {
  clientId: string | null;
  clientSecret: string | null;
  enabled: boolean;
  source: "db" | "env" | "none";
}

const STATE_KEY = "__state__";

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export async function getProviderCreds(
  provider: string,
  clientIdEnv: string,
  clientSecretEnv: string,
): Promise<ProviderCreds> {
  try {
    const { data } = await adminClient()
      .from("oauth_provider_configs")
      .select("client_id, client_secret, enabled")
      .eq("provider", provider)
      .maybeSingle();
    if (data && data.client_id && data.client_secret) {
      return {
        clientId: data.client_id,
        clientSecret: data.client_secret,
        enabled: !!data.enabled,
        source: "db",
      };
    }
  } catch (e) {
    console.warn("oauth config DB read failed:", e);
  }
  const envId = Deno.env.get(clientIdEnv);
  const envSecret = Deno.env.get(clientSecretEnv);
  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, enabled: true, source: "env" };
  }
  return { clientId: null, clientSecret: null, enabled: false, source: "none" };
}

/** Returns the HMAC signing secret for OAuth state tokens.
 *  Auto-generates and persists one on first call so admins don't have to add it manually. */
export async function getStateSecret(): Promise<string | null> {
  const envSecret = Deno.env.get("OAUTH_STATE_SECRET");
  if (envSecret) return envSecret;

  try {
    const client = adminClient();
    const { data } = await client
      .from("oauth_provider_configs")
      .select("client_secret")
      .eq("provider", STATE_KEY)
      .maybeSingle();
    if (data?.client_secret) return data.client_secret;

    // Auto-generate a fresh 48-byte random secret and persist it
    const bytes = new Uint8Array(48);
    crypto.getRandomValues(bytes);
    const secret = btoa(String.fromCharCode(...bytes));
    await client
      .from("oauth_provider_configs")
      .upsert(
        { provider: STATE_KEY, client_secret: secret, enabled: true },
        { onConflict: "provider" },
      );
    return secret;
  } catch (e) {
    console.error("getStateSecret failed:", e);
    return null;
  }
}

export async function listEnabledProviders(): Promise<string[]> {
  try {
    const { data } = await adminClient()
      .from("oauth_provider_configs")
      .select("provider, client_id, client_secret, enabled");
    return (data || [])
      .filter((r) => r.provider !== STATE_KEY && r.enabled && r.client_id && r.client_secret)
      .map((r) => r.provider);
  } catch {
    return [];
  }
}
