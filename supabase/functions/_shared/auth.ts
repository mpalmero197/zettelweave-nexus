// Shared auth helpers for edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

/**
 * True when the request carries either the platform service-role bearer,
 * or a matching x-cron-secret header. Used to gate cron-only endpoints.
 */
export function isCronCaller(req: Request): boolean {
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const callerSecret = req.headers.get("x-cron-secret") || "";
  if (bearer && SERVICE_KEY && bearer === SERVICE_KEY) return true;
  if (CRON_SECRET && callerSecret === CRON_SECRET) return true;
  return false;
}

export function unauthorized(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Verify a Bearer JWT and return the auth user id, or null.
 */
export async function getAuthedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

/**
 * True when the caller is a cron/service-role caller OR an authenticated admin user.
 * Use for endpoints that both cron and admin dashboard "Run now" buttons hit.
 */
export async function isCronOrAdminCaller(req: Request): Promise<boolean> {
  if (isCronCaller(req)) return true;
  const userId = await getAuthedUserId(req);
  if (!userId) return false;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

