import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Sun, Moon, User, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
} from "lucide-react";

interface UnifiedHeaderProps {
  user: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  onAccountSettings: () => void;
  isAdmin: boolean;
}

export function UnifiedHeader({
  user,
  activeTab,
  onTabChange,
  onSignOut,
  onAccountSettings,
  isAdmin,
}: UnifiedHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "cards", label: "Cards", icon: FileText },
    { id: "notes", label: "Notes", icon: BookOpen },
    { id: "notebooks", label: "Notebooks", icon: Grid3X3 },
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "graph", label: "Graph", icon: BarChart3 },
    { id: "recorder", label: "Recorder", icon: Mic },
    { id: "whiteboard", label: "Board", icon: Palette },
    { id: "journal", label: "Journal", icon: StickyNote },
    { id: "habits", label: "Habits", icon: Target },
    { id: "sticky", label: "Sticky", icon: Grid3X3 },
  ];

  return (
    <header className="bg-card/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground">PendragonX</h1>
              <p className="text-xs text-muted-foreground">
                Advanced Knowledge System
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1 flex-1 justify-center">
            {navItems.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeTab === id ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange(id)}
                className="flex items-center gap-2 rounded-lg transition-all"
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{label}</span>
              </Button>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-10 w-10 p-0 rounded-xl hover:bg-muted/50 transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-card/95 backdrop-blur-sm border-border/60"
              >
                <DropdownMenuItem disabled className="text-xs">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onAccountSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Account Settings
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="w-full flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onSignOut}
                  className="text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
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
                  className="h-10 w-10 p-0 rounded-xl"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col space-y-2 mt-4">
                  {navItems.map(({ id, label, icon: Icon }) => (
                    <Button
                      key={id}
                      variant={activeTab === id ? "default" : "ghost"}
                      onClick={() => {
                        onTabChange(id);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {label}
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
