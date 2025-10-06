import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Sun, Moon, User, Plus, ChevronDown, Search, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Link } from "react-router-dom";
import {
  FileText,
  BarChart3,
  Palette,
  StickyNote,
  Target,
  BookOpen,
  Calendar as CalendarIcon,
  FolderOpen,
  Trash2,
  Mic,
  Home,
  LogOut,
  Settings,
  Shield,
} from "lucide-react";

interface NavigationBarProps {
  user: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  onAccountSettings: () => void;
  isAdmin: boolean;
  onCreateNote?: () => void;
  onCreateWhiteboard?: () => void;
  onStartRecording?: () => void;
}

export function NavigationBar({
  user,
  activeTab,
  onTabChange,
  onSignOut,
  onAccountSettings,
  isAdmin,
  onCreateNote,
  onCreateWhiteboard,
  onStartRecording,
}: NavigationBarProps) {
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-card/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 flex-shrink-0">
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

          {/* Create Button */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:inline">Create</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-popover/95 backdrop-blur-sm border-border/60">
                <DropdownMenuItem onClick={onCreateNote}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  New Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCreateWhiteboard}>
                  <Palette className="h-4 w-4 mr-2" />
                  New Whiteboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onStartRecording}>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Main Navigation */}
          <nav className="hidden lg:flex flex-1 justify-center">
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                {/* Dashboard - Direct Link */}
                <NavigationMenuItem>
                  <Button
                    variant={activeTab === "dashboard" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onTabChange("dashboard")}
                    className="h-9 px-3"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </NavigationMenuItem>

                {/* Knowledge Base - Dropdown */}
                <NavigationMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={["cards", "graph", "notes", "notebooks", "files"].includes(activeTab) ? "secondary" : "ghost"}
                        size="sm"
                        className="h-9 px-3 gap-1"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Knowledge Base
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-popover/95 backdrop-blur-sm border-border/60">
                      <DropdownMenuItem onClick={() => onTabChange("cards")}>
                        <FileText className="h-4 w-4 mr-2" />
                        Cards
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onTabChange("graph")}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Graph
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onTabChange("notes")}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Notes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onTabChange("notebooks")}>
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Notebooks
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </NavigationMenuItem>

                {/* Whiteboard - Direct Link */}
                <NavigationMenuItem>
                  <Button
                    variant={activeTab === "whiteboard" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onTabChange("whiteboard")}
                    className="h-9 px-3"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Whiteboard
                  </Button>
                </NavigationMenuItem>

                {/* Planner - Dropdown */}
                <NavigationMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={["calendar", "journal", "habits"].includes(activeTab) ? "secondary" : "ghost"}
                        size="sm"
                        className="h-9 px-3 gap-1"
                      >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Planner
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-popover/95 backdrop-blur-sm border-border/60">
                      <DropdownMenuItem onClick={() => onTabChange("calendar")}>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Calendar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onTabChange("journal")}>
                        <StickyNote className="h-4 w-4 mr-2" />
                        Journal
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onTabChange("habits")}>
                        <Target className="h-4 w-4 mr-2" />
                        Habits
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search Bar */}
            <div className="hidden md:flex items-center relative">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-48 pl-9 bg-muted/50 border-border/50"
              />
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 p-0 rounded-xl hover:bg-muted/50 transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-popover/95 backdrop-blur-sm border-border/60"
              >
                <DropdownMenuItem disabled className="text-xs">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onAccountSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTabChange("recycle")}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Recycle Bin
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
                  className="h-9 w-9 p-0 rounded-xl"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col space-y-2 mt-4 pb-4">
                    {/* Dashboard */}
                    <Button
                      variant={activeTab === "dashboard" ? "default" : "ghost"}
                      onClick={() => {
                        onTabChange("dashboard");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start gap-2"
                    >
                      <Home className="h-4 w-4" />
                      Dashboard
                    </Button>

                    {/* Knowledge Base Section */}
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-muted-foreground px-3 pb-2">Knowledge Base</p>
                      <Button
                        variant={activeTab === "cards" ? "default" : "ghost"}
                        onClick={() => {
                          onTabChange("cards");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full justify-start gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Cards
                      </Button>
                      <Button
                        variant={activeTab === "graph" ? "default" : "ghost"}
                        onClick={() => {
                          onTabChange("graph");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full justify-start gap-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Graph
                      </Button>
                      <Button
                        variant={activeTab === "notes" ? "default" : "ghost"}
                        onClick={() => {
                          onTabChange("notes");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full justify-start gap-2"
                      >
                        <BookOpen className="h-4 w-4" />
                        Notes
                      </Button>
                      <Button
                        variant={activeTab === "notebooks" ? "default" : "ghost"}
                        onClick={() => {
                          onTabChange("notebooks");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full justify-start gap-2"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Notebooks
                      </Button>
                    </div>

                    {/* Whiteboard */}
                    <Button
                      variant={activeTab === "whiteboard" ? "default" : "ghost"}
                      onClick={() => {
                        onTabChange("whiteboard");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start gap-2"
                    >
                      <Palette className="h-4 w-4" />
                      Whiteboard
                    </Button>

                    {/* Planner Section */}
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-muted-foreground px-3 pb-2">Planner</p>
                      <Button
                        variant={activeTab === "calendar" ? "default" : "ghost"}
                        onClick={() => {
                          onTabChange("calendar");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full justify-start gap-2"
                      >
                        <CalendarIcon className="h-4 w-4" />
                        Calendar
                      </Button>
                      <Button
                        variant={activeTab === "journal" ? "default" : "ghost"}
                        onClick={() => {
                          onTabChange("journal");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full justify-start gap-2"
                      >
                        <StickyNote className="h-4 w-4" />
                        Journal
                      </Button>
                      <Button
                        variant={activeTab === "habits" ? "default" : "ghost"}
                        onClick={() => {
                          onTabChange("habits");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full justify-start gap-2"
                      >
                        <Target className="h-4 w-4" />
                        Habits
                      </Button>
                    </div>

                    {/* Recorder */}
                    <Button
                      variant={activeTab === "recorder" ? "default" : "ghost"}
                      onClick={() => {
                        onTabChange("recorder");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full justify-start gap-2"
                    >
                      <Mic className="h-4 w-4" />
                      Recorder
                    </Button>
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
