import { useEffect } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { JarvisChat } from "@/components/jarvis/JarvisChat";
import { AliceWakeIndicator } from "@/components/alice/AliceWakeIndicator";
import { useAliceWakeWord } from "@/hooks/useAliceWakeWord";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Standalone ALICE shell — runs as its own installable app at /alice-app.
 *
 * - Auth-gated: signs in with the same PendragonX account, so RLS gives
 *   ALICE full access to the user's cards, notes, calendar, tasks, etc.
 * - No AppLayout: pure full-viewport chat. No PendragonX nav, no toolbox.
 * - Separate PWA manifest (`/alice-manifest.webmanifest`) so installing
 *   from this page creates its own home-screen icon labeled "ALICE",
 *   independent of the main PendragonX installable app.
 * - Same chat surface as in-app ALICE → identical tool set (search
 *   knowledge, create cards/notes/tasks/events, web/image, navigate, etc.).
 * - Wake word + voice carry over (they live in client storage / mic perms).
 */
export default function AliceStandalone() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  // Swap the document manifest to the ALICE-only one + tag the standalone
  // surface so the browser treats it as a distinct installable app.
  useEffect(() => {
    const prev = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const prevHref = prev?.getAttribute("href") ?? null;
    if (prev) prev.setAttribute("href", "/alice-manifest.webmanifest");

    const prevTitle = document.title;
    document.title = "ALICE — PendragonX Companion";

    document.documentElement.setAttribute("data-alice-standalone", "true");
    document.body.classList.add("alice-standalone-body");

    return () => {
      if (prev && prevHref) prev.setAttribute("href", prevHref);
      document.title = prevTitle;
      document.documentElement.removeAttribute("data-alice-standalone");
      document.body.classList.remove("alice-standalone-body");
    };
  }, []);

  // Wake word mounted here so "Hey ALICE" works even when the standalone
  // shell is the only thing the user has open.
  useAliceWakeWord();

  // Quick-launch shortcut: ?new=1 dispatches a new-conversation event.
  useEffect(() => {
    if (params.get("new") === "1") {
      window.dispatchEvent(new CustomEvent("alice-new-conversation"));
    }
  }, [params]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[hsl(240_33%_6%)] text-white/80">
        <Loader2 className="h-7 w-7 animate-spin mb-3" />
        <p className="text-sm opacity-70">Waking ALICE…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/alice-app" replace />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[hsl(240_33%_6%)] text-foreground overflow-hidden">
      {/* Slim standalone header — identifies you, lets you bail to the full app or sign out */}
      <header className="flex items-center justify-between px-3 h-10 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/icon-192x192.png" alt="" className="h-5 w-5 rounded" aria-hidden />
          <span className="text-xs font-medium tracking-wide opacity-80">ALICE</span>
          <span className="text-[10px] opacity-50 truncate hidden sm:inline">
            · signed in as {user.email}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Link to="/app">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              PendragonX
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => supabase.auth.signOut()}
            aria-label="Sign out of ALICE"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 min-h-0 relative">
        <JarvisChat />
        <AliceWakeIndicator />
      </main>
    </div>
  );
}
