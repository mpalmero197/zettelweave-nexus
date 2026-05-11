import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobileNavigation } from "./MobileNavigation";
import { FloatingChatBubble } from "./FloatingChatBubble";
import { PWAInstallPrompt } from "./PWAInstallPrompt";
import { OfflineDataManager } from "./OfflineDataManager";
import { SecurityNotice } from "./SecurityNotice";
import { PushNotificationPrompt } from "./PushNotificationPrompt";
import { MobileDetector } from "./MobileDetector";
import { MobileOptimizedLayout } from "./MobileOptimizedLayout";
import { FeatureRequestDialog } from "./FeatureRequestDialog";
import { SkipToMain } from "./SkipToMain";
import { ThemeVariantSelector } from "./ThemeVariantSelector";
import { TopNavBar } from "./TopNavBar";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { Wrench, Search, ExternalLink } from "lucide-react";
import { ToolboxSidebar } from "./toolbox/ToolboxSidebar";
import { FocusMiniPill } from "./focus-sidebar/FocusMiniPill";
import { JarvisFAB } from "./jarvis/JarvisFAB";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { Link } from "react-router-dom";
import pendragonLogo from "@/assets/pendragon-logo.png";
import { toast } from "sonner";
import { usePopoutMode } from "@/hooks/usePopoutMode";
import { useWindowSync } from "@/hooks/useWindowSync";
import { useWritingContextDetector } from "@/hooks/useWritingContextDetector";
import { AutoSEOOverrides } from "./seo/AutoSEOOverrides";

export function AppLayout() {
  useWritingContextDetector();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline: hookOnline } = useOfflineMode();
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const isPopout = usePopoutMode();

  // Live cross-window sync (BroadcastChannel) â invalidates queries when
  // another window mutates data.
  useWindowSync();

  const isOnline = hookOnline && browserOnline;

  const [realActiveTab, setRealActiveTab] = useState("dashboard");

  // Derive active tab from the current route for non-app pages
  const activeTab = (() => {
    const path = location.pathname;
    if (path === "/app" || path.startsWith("/app/")) return realActiveTab;
    if (path === "/admin") return "admin";
    if (path === "/subscription") return "subscription";
    if (path === "/settings") return "settings";
    if (path === "/install") return "install";
    return realActiveTab;
  })();

  // Listen for tab sync from Index.tsx
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      if (tab) setRealActiveTab(tab);
    };
    window.addEventListener("app-tab-sync", handler);
    return () => window.removeEventListener("app-tab-sync", handler);
  }, []);

  useEffect(() => {
    const on = () => setBrowserOnline(true);
    const off = () => setBrowserOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) { setIsAdmin(false); return; }
      try {
        const { data } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        setIsAdmin(data === true);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user]);

  // ALICE-driven navigation: edge function returns a `navigate_to` path.
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent).detail as string;
      if (!path || typeof path !== "string") return;
      if (path.startsWith("/admin")) return; // ALICE is barred from admin
      navigate(path);
      const m = path.match(/^\/app\/([\w-]+)/);
      if (m) window.dispatchEvent(new CustomEvent("app-tab-change", { detail: m[1] }));

      // Deep-link: /app/catalyst?docId=...&highlight=... → tell Catalyst to open it.
      try {
        const url = new URL(path, window.location.origin);
        if (url.pathname === "/app/catalyst") {
          const docId = url.searchParams.get("docId");
          const highlight = url.searchParams.get("highlight") || "";
          if (docId) {
            // Defer so Catalyst has mounted and subscribed.
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("catalyst-open-document", {
                detail: { documentId: docId, highlight },
              }));
            }, 250);
          }
        }
      } catch { /* ignore */ }
    };
    window.addEventListener("alice-navigate", handler);
    return () => window.removeEventListener("alice-navigate", handler);
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast("Signed out successfully");
    } catch {
      toast("Error signing out");
    }
  };

  const APP_TABS = new Set([
    "dashboard","cards","graph","notes","files","canvas","calendar","journal",
    "habits","scratchpad","stickynotes","catalyst","collab","recorder","recycle",
    "search","debugger","learning","projects","spaces","integrations",
    "knowledge-gaps","notebooks",
  ]);

  const handleTabChange = (tab: string) => {
    if (APP_TABS.has(tab)) {
      // Preserve ?popout=1 if present so the popout window stays a popout
      const search = location.search;
      navigate(`/app/${tab}${search}`);
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: tab }));
    } else {
      navigate("/app");
    }
  };

  /** Open the current (or given) feature in a new focused window. */
  const handlePopOut = (tab?: string) => {
    const target = tab && APP_TABS.has(tab) ? tab : (APP_TABS.has(activeTab) ? activeTab : "dashboard");
    const url = `${window.location.origin}/app/${target}?popout=1`;
    const features = "noopener=yes,popup=yes,width=1200,height=800";
    window.open(url, `pendragonx-${target}`, features);
  };

  return (
    <>
      <SkipToMain />
      <OfflineDataManager />
      <MobileDetector>
        <MobileOptimizedLayout>
          <div
            className="flex flex-col min-h-screen transition-all duration-300"
            style={{
              marginLeft: 'var(--focus-sidebar-ml, 0px)',
              marginRight: 'var(--focus-sidebar-mr, 0px)',
            } as React.CSSProperties}
          >
          <SecurityNotice />

          {/* Persistent Header â hidden in pop-out windows for a focused single-feature view */}
          {!isPopout && (
          <header
            className="h-12 border-b border-border bg-background sticky top-0 z-50"
            role="banner"
          >
            <div className="h-full px-3 md:px-5 flex items-center justify-between gap-3">
              {/* Left: Logo + Nav */}
              <div className="flex items-center gap-2.5">
                <Link to="/app" className="flex items-center gap-2 rounded-full hover:bg-accent px-2 py-1 transition-colors">
                  <img
                    src={pendragonLogo}
                    alt="PendragonX"
                    className="h-6 w-6 object-contain"
                  />
                  <span className="text-[15px] font-medium tracking-tight text-foreground" style={{ fontFamily: "'Inter',sans-serif" }}>
                    PendragonX
                  </span>
                  <div className="relative ml-0.5">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        isOnline ? "bg-primary" : "bg-destructive"
                      }`}
                      aria-label={isOnline ? "Online" : "Offline"}
                    />
                    {isOnline && (
                      <div className="absolute inset-0 h-2 w-2 rounded-full bg-primary animate-ping opacity-30" />
                    )}
                  </div>
                </Link>

                <TopNavBar activeTab={activeTab} onTabChange={handleTabChange} />
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hidden md:flex rounded-full hover:bg-accent"
                  onClick={() => handleTabChange("search")}
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hidden md:flex rounded-full hover:bg-accent"
                  onClick={() => handlePopOut()}
                  aria-label="Open this feature in a new window"
                  title="Pop out to a new window"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 md:h-9 md:w-9 p-0 rounded-full hover:bg-accent"
                  onClick={() => setToolboxOpen(!toolboxOpen)}
                  aria-label="Toolbox"
                  title="Toolbox (Focus, Tasks, AI Modify)"
                >
                  <Wrench className="h-4 w-4" />
                </Button>
                <ThemeVariantSelector />
                <UserMenu isAdmin={isAdmin} onSignOut={handleSignOut} />
                <FeatureRequestDialog />
              </div>
            </div>
          </header>
          )}

          {/* Page Content */}
          <main id="main-content" className="flex-1">
            <Outlet context={{ isAdmin, activeTab, handleTabChange, pendingSearchQuery, setPendingSearchQuery, isPopout }} />
          </main>

          {!isPopout && (
            <MobileNavigation
              isAdmin={isAdmin}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onSearchWithQuery={(query) => {
                setPendingSearchQuery(query);
                handleTabChange("search");
              }}
              onSignOut={handleSignOut}
              onAccountSettings={() => navigate("/settings")}
            />
          )}
          </div>
        </MobileOptimizedLayout>
      </MobileDetector>

      <AutoSEOOverrides />
      <PWAInstallPrompt />
      {typeof PushNotificationPrompt !== 'undefined' && <PushNotificationPrompt />}
      <FloatingChatBubble />
      <ToolboxSidebar open={toolboxOpen} onOpenChange={setToolboxOpen} />
      <FocusMiniPill />
      {!isPopout && <JarvisFAB />}
    </>
  );
}