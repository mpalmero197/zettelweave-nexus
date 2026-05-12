// ingest-browser-tabs — receives a tab snapshot from the PendragonX
// Chrome extension, applies the user's privacy preferences, and upserts
// the latest snapshot row.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface IncomingTab {
  url?: string;
  title?: string;
  active?: boolean;
  windowId?: number;
}

function domainOf(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

function matchesDomain(host: string, pattern: string): boolean {
  const p = pattern.trim().toLowerCase().replace(/^\*\./, "");
  if (!p) return false;
  return host === p || host.endsWith("." + p);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const tabsIn: IncomingTab[] = Array.isArray(body?.tabs) ? body.tabs : [];

    // Pull the user's privacy prefs (default: enabled, mode=all, no domains)
    const { data: prefs } = await supabase
      .from("browser_tab_privacy")
      .select("enabled, mode, domains")
      .eq("user_id", user.id)
      .maybeSingle();

    const enabled = prefs?.enabled ?? true;
    if (!enabled) {
      // Explicitly clear any stored snapshot.
      await supabase.from("browser_tab_snapshots").upsert({
        user_id: user.id, tabs: [], captured_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ ok: true, stored: 0, disabled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mode = (prefs?.mode as string) || "all";
    const domains: string[] = prefs?.domains || [];

    const filtered = tabsIn
      .filter((t) => typeof t.url === "string" && t.url.startsWith("http"))
      .filter((t) => {
        const host = domainOf(t.url!);
        if (!host) return false;
        if (mode === "all") return true;
        const hit = domains.some((d) => matchesDomain(host, d));
        return mode === "whitelist" ? hit : !hit;
      })
      .map((t) => ({
        url: String(t.url).slice(0, 2000),
        title: String(t.title || "").slice(0, 500),
        active: !!t.active,
        windowId: typeof t.windowId === "number" ? t.windowId : null,
      }))
      .slice(0, 200);

    const { error } = await supabase.from("browser_tab_snapshots").upsert({
      user_id: user.id,
      tabs: filtered,
      captured_at: new Date().toISOString(),
    });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, stored: filtered.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
