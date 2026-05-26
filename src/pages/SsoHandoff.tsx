import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Toolbox → Web SSO handoff.
 *
 * The Chrome extension opens:
 *   https://pendragonx.com/sso#at=<access>&rt=<refresh>&to=/app/catalyst
 *
 * We read the tokens from the URL hash (never in the query string so they
 * don't hit server logs / referer headers), call supabase.auth.setSession,
 * scrub the hash, and bounce to the requested destination.
 */
export default function SsoHandoff() {
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("Signing you in from the Toolbox…");

  useEffect(() => {
    const run = async () => {
      try {
        const raw = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;
        const params = new URLSearchParams(raw);
        const accessToken = params.get("at");
        const refreshToken = params.get("rt");
        const rawTo = params.get("to") || "/app";
        const to = rawTo.startsWith("/") && !rawTo.startsWith("//") ? rawTo : "/app";

        if (!accessToken || !refreshToken) {
          // No tokens — maybe the user is already signed in here. Just bounce.
          window.history.replaceState(null, "", "/sso");
          window.location.replace(to);
          return;
        }

        const { data: existing } = await supabase.auth.getSession();
        // If a different user is already signed in here, sign out first.
        if (existing.session?.access_token && existing.session.access_token !== accessToken) {
          await supabase.auth.signOut();
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;

        // Scrub the hash so tokens never linger in history.
        window.history.replaceState(null, "", "/sso");
        // Hard navigation so the rest of the app re-bootstraps with the new session.
        window.location.replace(to);
      } catch (e: any) {
        console.error("[SSO] handoff failed", e);
        setStatus("error");
        setMessage(e?.message || "We couldn't sign you in from the Toolbox.");
      }
    };
    run();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {status === "working" ? (
        <>
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </>
      ) : (
        <div className="max-w-sm space-y-3">
          <h1 className="text-lg font-semibold tracking-tight">Toolbox sign-in failed</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <a
            href="/auth"
            className="inline-block rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Sign in manually
          </a>
        </div>
      )}
    </div>
  );
}
