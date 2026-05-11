import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
    label: "Knowledge",
    tabs: ["dashboard", "cards", "graph", "notes", "files", "learning", "knowledge-gaps"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "cards", label: "Cards", icon: FileText },
      { id: "graph", label: "Graph", icon: BarChart3 },
      { id: "notes", label: "Notes", icon: BookOpen },
      { id: "files", label: "Files", icon: FolderOpen },
      { id: "learning", label: "Learning Hub", icon: GraduationCap },
      { id: "knowledge-gaps", label: "Knowledge Gaps", icon: Lightbulb },
    ],
  },
  {
    label: "Planner",
    tabs: ["calendar", "journal", "scratchpad", "stickynotes", "projects"],
    items: [
      { id: "calendar", label: "Calendar", icon: Calendar },
      { id: "projects", label: "Projects", icon: FolderOpen },
      { id: "journal", label: "Journal", icon: NotebookPen },
      { id: "scratchpad", label: "Scratchpad", icon: PenLine },
      { id: "stickynotes", label: "Sticky Notes", icon: StickyNote },
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
          group.tabs.includes("cards") ? "nav-cards" :
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
    </nav>
  );
}
