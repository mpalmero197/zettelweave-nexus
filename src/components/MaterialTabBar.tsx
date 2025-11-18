import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  FileText, 
  BarChart3, 
  Palette, 
  StickyNote, 
  Target, 
  Grid3X3,
  Home,
  Mic,
  BookOpen,
  Calendar,
  Folders,
  Archive
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MaterialTabBarProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function MaterialTabBar({ value, onValueChange }: MaterialTabBarProps) {
  const isMobile = useIsMobile();
  
  // Mobile-first tab configuration with essential features
  const mobileTabs = [
    { id: "dashboard", label: "Home", icon: Home, ariaLabel: "Dashboard home" },
    { id: "cards", label: "Cards", icon: FileText, ariaLabel: "Zettel cards" },
    { id: "notes", label: "Notes", icon: BookOpen, ariaLabel: "Notes" },
    { id: "calendar", label: "Calendar", icon: Calendar, ariaLabel: "Calendar events" },
  ];
  
  // Desktop tab configuration with all features
  const desktopTabs = [
    { id: "dashboard", label: "Dashboard", icon: Home, ariaLabel: "Dashboard home" },
    { id: "cards", label: "Cards", icon: FileText, ariaLabel: "Zettel cards" },
    { id: "notes", label: "Notes", icon: BookOpen, ariaLabel: "Notes" },
    { id: "graph", label: "Graph", icon: BarChart3, ariaLabel: "Knowledge graph" },
    { id: "recorder", label: "Recorder", icon: Mic, ariaLabel: "Audio recorder" },
    { id: "whiteboard", label: "Whiteboard", icon: Palette, ariaLabel: "Whiteboard" },
    { id: "journal", label: "Journal", icon: StickyNote, ariaLabel: "Bullet journal" },
    { id: "habits", label: "Habits", icon: Target, ariaLabel: "Habit tracker" },
    { id: "sticky", label: "Sticky", icon: Grid3X3, ariaLabel: "Sticky notes" },
  ];
  
  const tabs = isMobile ? mobileTabs : desktopTabs;

  return (
    <nav 
      className={cn(
        "w-full bg-card/95 backdrop-blur-md border-b border-border/50",
        "sticky top-0 z-40",
        isMobile && "shadow-sm"
      )}
      role="navigation"
      aria-label="Main navigation tabs"
    >
      <Tabs value={value} onValueChange={onValueChange} className="w-full">
        <TabsList 
          className={cn(
            "w-full bg-transparent gap-0.5 rounded-none",
            isMobile ? "h-14 p-1 px-2 justify-around" : "h-12 p-1 overflow-x-auto scrollbar-hide"
          )}
          role="tablist"
        >
          {tabs.map(({ id, label, icon: Icon, ariaLabel }) => (
            <TabsTrigger
              key={id}
              value={id}
              role="tab"
              aria-label={ariaLabel}
              aria-selected={value === id}
              className={cn(
                "flex items-center justify-center gap-1.5",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "data-[state=inactive]:text-muted-foreground",
                "transition-all duration-200 ease-out",
                "hover:bg-accent hover:text-accent-foreground",
                "active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "rounded-lg border-0",
                isMobile 
                  ? "flex-1 flex-col h-12 px-2 min-w-[60px] gap-0.5 text-[10px] font-medium" 
                  : "flex-row h-9 px-4 text-xs font-medium min-w-fit"
              )}
            >
              <Icon 
                className={cn(
                  isMobile ? "h-5 w-5" : "h-4 w-4"
                )} 
                aria-hidden="true"
              />
              <span className={cn(
                isMobile ? "text-[10px] leading-none" : "text-xs"
              )}>
                {label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </nav>
  );
}