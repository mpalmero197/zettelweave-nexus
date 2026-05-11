// Per-user OAuth provider configurations.
// Add a new provider by appending an entry — the oauth-start / oauth-callback
// edge functions handle the rest generically.

export interface OAuthProvider {
  id: string;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  /** Space-separated default scopes */
  scopes: string;
  /** Names of the env vars holding client_id and client_secret */
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Extra query params for /authorize (e.g. access_type=offline for Google) */
  extraAuthParams?: Record<string, string>;
  /** If true, use HTTP Basic auth on the token endpoint (Notion). Otherwise post in body. */
  basicAuth?: boolean;
  /** URL to fetch the user profile after token exchange */
  userInfoUrl?: string;
  /** Map a provider profile JSON to { id, email, name } */
  parseProfile?: (json: any) => { id?: string; email?: string; name?: string };
}

export const PROVIDERS: Record<string, OAuthProvider> = {
  microsoft: {
    id: "microsoft",
    label: "Microsoft 365",
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: [
      "openid",
      "email",
      "profile",
      "offline_access",
      "User.Read",
      "Mail.Read",
      "Mail.Send",
      "Calendars.ReadWrite",
      "Files.Read.All",
      "Notes.Read.All",
    ].join(" "),
    clientIdEnv: "MS_OAUTH_CLIENT_ID",
    clientSecretEnv: "MS_OAUTH_CLIENT_SECRET",
    extraAuthParams: { prompt: "select_account" },
    userInfoUrl: "https://graph.microsoft.com/v1.0/me",
    parseProfile: (j) => ({ id: j.id, email: j.mail || j.userPrincipalName, name: j.displayName }),
  },
  google: {
    id: "google",
    label: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/gmail.readonly",
    ].join(" "),
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    extraAuthParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
    userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    parseProfile: (j) => ({ id: j.sub, email: j.email, name: j.name }),
  },
  notion: {
    id: "notion",
    label: "Notion",
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: "",
    clientIdEnv: "NOTION_OAUTH_CLIENT_ID",
    clientSecretEnv: "NOTION_OAUTH_CLIENT_SECRET",
    extraAuthParams: { owner: "user" },
    basicAuth: true,
    parseProfile: (j) => ({
      id: j.workspace_id || j.bot_id,
      email: j.owner?.user?.person?.email,
      name: j.workspace_name || j.owner?.user?.name,
    }),
  },
};

/** Stable, signed state token (HMAC-SHA256) so we can trust the provider's redirect. */
export async function signState(payload: object, secret: string): Promise<string> {
  const body = btoa(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${body}.${sigB64}`;
}

export async function verifyState<T = any>(token: string, secret: string): Promise<T | null> {
  const [body, sigB64] = token.split(".");
  if (!body || !sigB64) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sig = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(body));
  if (!ok) return null;
  try {
    const payload = JSON.parse(atob(body));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload as T;
  } catch {
    return null;
  }
}

export function redirectUri(): string {
  const url = Deno.env.get("SUPABASE_URL")!;
  return `${url}/functions/v1/oauth-callback`;
}
