import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Sun, Moon, User, Menu, X, Search, Crown } from "lucide-react";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import pendragonLogo from "@/assets/pendragon-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import {
  FileText,
  BarChart3,
  Palette,
  StickyNote,
  Target,
  Grid3X3,
  Home,
  Mic,
  LogOut,
  Settings,
  Shield,
  BookOpen,
  Calendar as CalendarIcon,
  FolderOpen,
  Trash2,
  Users,
} from "lucide-react";

interface UnifiedHeaderProps {
  user: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  onAccountSettings: () => void;
  isAdmin: boolean;
  onSearchClick?: () => void;
}

export function UnifiedHeader({
  user,
  activeTab,
  onTabChange,
  onSignOut,
  onAccountSettings,
  isAdmin,
  onSearchClick,
}: UnifiedHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasAccess: hasPremium } = usePremiumAccess();

  const PREMIUM_TABS = new Set([
    'graph', 'canvas', 'journal', 'recorder', 'collab',
  ]);

  const navItems = [
    { id: "dashboard", icon: Home },
    { id: "cards", icon: FileText },
    { id: "notes", icon: BookOpen },
    { id: "notebooks", icon: Grid3X3 },
    { id: "calendar", icon: CalendarIcon },
    { id: "files", icon: FolderOpen },
    { id: "collab", icon: Users },
    { id: "recycle", icon: Trash2 },
    { id: "graph", icon: BarChart3 },
    { id: "recorder", icon: Mic },
    { id: "canvas", icon: Palette },
    { id: "journal", icon: StickyNote },
    { id: "stickynotes", icon: StickyNote },
  ];

  return (
    <header 
      className="bg-card/98 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50 shadow-lg hover-lift transition-all duration-300"
      role="banner"
    >
      <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2 md:space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:blur-lg transition-all duration-300"></div>
              <img 
                src={pendragonLogo} 
                alt="Pendragon logo" 
                className="h-8 w-8 md:h-10 md:w-10 object-contain relative z-10 group-hover:scale-110 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base md:text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                PendragonX
              </h1>
              <p className="text-[10px] md:text-xs text-muted-foreground font-medium">
                Advanced Knowledge System
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav 
            className="hidden lg:flex items-center space-x-1 flex-1 justify-center bg-muted/30 rounded-full px-2 py-1.5 mx-4"
            role="navigation"
            aria-label="Main navigation"
          >
            {navItems.map(({ id, icon: Icon }) => {
              const isPremiumItem = PREMIUM_TABS.has(id) && !hasPremium;
              return (
                <div key={id} className="relative">
                  <Button
                    variant={activeTab === id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onTabChange(id)}
                    className={`h-9 w-9 p-0 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring ${
                      activeTab === id 
                        ? 'shadow-lg shadow-primary/30 scale-110' 
                        : 'hover:scale-105 hover:bg-accent/50'
                    }`}
                    aria-label={`Navigate to ${id.charAt(0).toUpperCase() + id.slice(1)}`}
                    aria-current={activeTab === id ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {isPremiumItem && (
                    <Crown className="h-2.5 w-2.5 text-primary absolute -top-0.5 -right-0.5 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Notification Bell */}
            <NotificationBell />

            {/* Theme Toggle - Always Visible */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 md:h-10 md:w-10 p-0 rounded-full border-2 border-border/50 hover:border-primary/50 hover:bg-primary/10 hover:scale-110 hover:rotate-12 transition-all duration-300 touch-manipulation shadow-md hover:shadow-primary/20"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-primary" aria-hidden="true" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 md:h-10 md:w-10 p-0 rounded-full border-2 border-border/50 hover:border-primary/50 hover:bg-primary/10 hover:scale-110 transition-all duration-300 touch-manipulation shadow-md hover:shadow-primary/20"
                  aria-label="User menu"
                >
                  <User className="h-4 w-4 text-primary" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-card border-border/60 w-56 shadow-2xl rounded-xl mt-2 animate-fade-in"
              >
                <DropdownMenuItem disabled className="text-xs font-medium text-muted-foreground">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem 
                  onClick={onAccountSettings}
                  className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-lg"
                >
                  <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                  Account Settings
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator className="bg-border/50" />
                    <DropdownMenuItem asChild>
                      <Link 
                        to="/admin" 
                        className="w-full flex items-center hover:bg-accent/50 hover:text-accent-foreground transition-colors cursor-pointer rounded-lg"
                      >
                        <Shield className="h-4 w-4 mr-2" aria-hidden="true" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                  onClick={onSignOut}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:text-destructive transition-colors cursor-pointer rounded-lg"
                >
                  <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 md:h-10 md:w-10 p-0 rounded-lg touch-manipulation"
                  aria-label="Open mobile menu"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col space-y-2 mt-4 pb-4">
                    {navItems.map(({ id, icon: Icon }) => (
                      <Button
                        key={id}
                        variant={activeTab === id ? "default" : "ghost"}
                        onClick={() => {
                          onTabChange(id);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full justify-start gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="capitalize">{id}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
