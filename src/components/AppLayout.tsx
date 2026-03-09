import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MinimalSidebar } from "./MinimalSidebar";
import { MobileNavigation } from "./MobileNavigation";
import { FloatingChatBubble } from "./FloatingChatBubble";
import { PWAInstallPrompt } from "./PWAInstallPrompt";
import { OfflineDataManager } from "./OfflineDataManager";
import { SecurityNotice } from "./SecurityNotice";
import { MobileDetector } from "./MobileDetector";
import { MobileOptimizedLayout } from "./MobileOptimizedLayout";
import { FeatureRequestDialog } from "./FeatureRequestDialog";
import { SkipToMain } from "./SkipToMain";
import { ThemeVariantSelector } from "./ThemeVariantSelector";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Search, Bot } from "lucide-react";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { Link } from "react-router-dom";
import pendragonLogo from "@/assets/pendragon-logo.png";
import { toast } from "sonner";

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline: hookOnline } = useOfflineMode();
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isOnline = hookOnline && browserOnline;

  // Derive active tab from the current route
  const activeTab = (() => {
    const path = location.pathname;
    if (path === "/app") return "dashboard";
    if (path === "/agents") return "agents";
    if (path === "/admin") return "admin";
    if (path === "/subscription") return "subscription";
    if (path === "/settings") return "settings";
    if (path === "/install") return "install";
    return "dashboard";
  })();

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

  const handleSignOut = async () => {
    try {
      await signOut();
      toast("Signed out successfully");
    } catch {
      toast("Error signing out");
    }
  };

  const handleTabChange = (tab: string) => {
    setSidebarOpen(false);
    switch (tab) {
      case "dashboard":
      case "cards":
      case "graph":
      case "notes":
      case "files":
      case "canvas":
      case "calendar":
      case "journal":
      case "habits":
      case "scratchpad":
      case "stickynotes":
      case "catalyst":
      case "collab":
      case "recorder":
      case "recycle":
      case "search":
      case "debugger":
        // These are all tabs within /app
        navigate("/app");
        // We dispatch a custom event so Index.tsx can pick up the tab
        window.dispatchEvent(new CustomEvent("app-tab-change", { detail: tab }));
        break;
      default:
        navigate("/app");
        break;
    }
  };

  return (
    <>
      <SkipToMain />
      <OfflineDataManager />
      <MobileDetector>
        <MobileOptimizedLayout>
          <SecurityNotice />

          {/* Persistent Header */}
          <header
            className="h-10 border-b border-border bg-background sticky top-0 z-50"
            role="banner"
          >
            <div className="h-full px-2 md:px-4 flex items-center justify-between gap-2">
              {/* Left: Menu + Logo */}
              <div className="flex items-center gap-1.5">
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-60 p-0">
                    <MinimalSidebar
                      activeTab={activeTab}
                      onTabChange={handleTabChange}
                      onSignOut={handleSignOut}
                      onAccountSettings={() => {
                        setSidebarOpen(false);
                        navigate("/settings");
                      }}
                      isAdmin={isAdmin}
                    />
                  </SheetContent>
                </Sheet>

                <Link to="/app" className="hidden md:flex items-center gap-1.5">
                  <img
                    src={pendragonLogo}
                    alt="PendragonX"
                    className="h-5 w-5 object-contain"
                  />
                  <span className="text-sm font-semibold text-foreground">
                    PendragonX
                  </span>
                  <div className="relative ml-0.5">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        isOnline ? "bg-green-500" : "bg-amber-500"
                      }`}
                      aria-label={isOnline ? "Online" : "Offline"}
                    />
                    {isOnline && (
                      <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-40" />
                    )}
                  </div>
                </Link>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleTabChange("search")}
                  aria-label="Search"
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hidden md:flex"
                  asChild
                >
                  <Link to="/agents" aria-label="Agents">
                    <Bot className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <ThemeVariantSelector />
                <FeatureRequestDialog />
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main id="main-content" className="flex-1">
            <Outlet context={{ isAdmin, activeTab, handleTabChange }} />
          </main>

          <MobileNavigation isAdmin={isAdmin} activeTab={activeTab} onTabChange={handleTabChange} />
        </MobileOptimizedLayout>
      </MobileDetector>

      <PWAInstallPrompt />
      <FloatingChatBubble />
    </>
  );
}
