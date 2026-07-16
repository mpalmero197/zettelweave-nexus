import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PrefetchLink as Link } from "@/components/PrefetchLink";
import { Wand2, LayoutGrid } from "lucide-react";
import {
  ChevronDown,
  LayoutDashboard,
  FileText,
  BarChart3,
  BookOpen,
  FolderOpen,
  Palette,
  Calendar,
  NotebookPen,
  Target,
  PenLine,
  StickyNote,
  Lightbulb,
  Users,
  GraduationCap,
  Mic,
  Trash2,
  Bug,
  Brain,
  MessageSquareText,
  Puzzle,
} from "lucide-react";

interface TopNavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navGroups = [
  {
    label: "Capture",
    tabs: ["hub"],
    items: [
      { id: "hub", label: "Capture Hub", icon: FileText },
    ],
  },
  {
    label: "Knowledge",
    tabs: ["dashboard", "graph", "files", "learning", "knowledge-gaps"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "graph", label: "Graph", icon: BarChart3 },
      { id: "files", label: "Files", icon: FolderOpen },
      { id: "learning", label: "Learning Hub", icon: GraduationCap },
      { id: "knowledge-gaps", label: "Knowledge Gaps", icon: Lightbulb },
    ],
  },
  {
    label: "Planner",
    tabs: ["calendar", "journal", "projects"],
    items: [
      { id: "calendar", label: "Calendar", icon: Calendar },
      { id: "projects", label: "Projects", icon: FolderOpen },
      { id: "journal", label: "Journal", icon: NotebookPen },
    ],
  },
  {
    label: "Create",
    tabs: ["catalyst", "collab", "canvas"],
    items: [
      { id: "catalyst", label: "Catalyst", icon: Lightbulb },
      { id: "collab", label: "Collab", icon: Users },
      { id: "canvas", label: "Canvas Studio", icon: Palette },
    ],
  },
  {
    label: "Tools",
    tabs: ["recorder", "integrations", "recycle", "debugger"],
    items: [
      { id: "recorder", label: "Recorder", icon: Mic },
      { id: "integrations", label: "Connectors", icon: Puzzle },
      { id: "recycle", label: "Recycle Bin", icon: Trash2 },
      { id: "debugger", label: "Debugger", icon: Bug },
    ],
  },
];

export function TopNavBar({ activeTab, onTabChange }: TopNavBarProps) {
  return (
    <nav className="hidden md:flex items-center gap-0.5 ml-2" role="navigation" aria-label="Main navigation">
      {navGroups.map((group) => {
        const isActive = group.tabs.includes(activeTab);
        const anchor =
          group.tabs.includes("hub") ? "nav-hub" :
          group.tabs.includes("catalyst") ? "nav-catalyst" : undefined;
        return (
          <DropdownMenu key={group.label}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-onboarding={anchor}
                className={`h-8 px-3 text-xs font-medium gap-1 rounded-lg transition-colors ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {group.label}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[170px] bg-card border-border rounded-lg shadow-hover">
              {group.items.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={`gap-2.5 cursor-pointer rounded-md ${
                    activeTab === id ? "bg-primary/10 text-primary" : ""
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-8 px-3 text-xs font-medium gap-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <Link to="/macros" aria-label="Macro Suite">
          <Wand2 className="h-3.5 w-3.5" />
          Macros
        </Link>
      </Button>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-8 px-3 text-xs font-medium gap-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <Link to="/decks" aria-label="Deck Studio">
          <LayoutGrid className="h-3.5 w-3.5" />
          Decks
        </Link>
      </Button>
    </nav>
  );
}

