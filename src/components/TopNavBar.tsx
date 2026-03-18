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
} from "lucide-react";

interface TopNavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navGroups = [
  {
    label: "Knowledge",
    tabs: ["dashboard", "cards", "graph", "notes", "files", "learning"],
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "cards", label: "Cards", icon: FileText },
      { id: "graph", label: "Graph", icon: BarChart3 },
      { id: "notes", label: "Notes", icon: BookOpen },
      { id: "files", label: "Files", icon: FolderOpen },
      { id: "learning", label: "Learning Hub", icon: GraduationCap },
    ],
  },
  {
    label: "Planner",
    tabs: ["calendar", "journal", "habits", "scratchpad", "stickynotes"],
    items: [
      { id: "calendar", label: "Calendar", icon: Calendar },
      { id: "journal", label: "Journal", icon: NotebookPen },
      { id: "habits", label: "Habits", icon: Target },
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
    tabs: ["recorder", "recycle", "debugger"],
    items: [
      { id: "recorder", label: "Recorder", icon: Mic },
      { id: "recycle", label: "Recycle Bin", icon: Trash2 },
      { id: "debugger", label: "Debugger", icon: Bug },
    ],
  },
];

export function TopNavBar({ activeTab, onTabChange }: TopNavBarProps) {
  return (
    <nav className="hidden md:flex items-center gap-0.5" role="navigation" aria-label="Main navigation">
      {navGroups.map((group) => {
        const isActive = group.tabs.includes(activeTab);
        return (
          <DropdownMenu key={group.label}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 text-xs font-medium gap-1 ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {group.label}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {group.items.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={`gap-2 cursor-pointer ${
                    activeTab === id ? "bg-accent text-accent-foreground" : ""
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
