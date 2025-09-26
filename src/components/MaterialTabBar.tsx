import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  BarChart3, 
  Palette, 
  StickyNote, 
  Target, 
  Grid3X3,
  Home
} from "lucide-react";

interface MaterialTabBarProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function MaterialTabBar({ value, onValueChange }: MaterialTabBarProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "cards", label: "Cards", icon: FileText },
    { id: "graph", label: "Graph", icon: BarChart3 },
    { id: "whiteboard", label: "Board", icon: Palette },
    { id: "journal", label: "Journal", icon: StickyNote },
    { id: "habits", label: "Habits", icon: Target },
    { id: "sticky", label: "Notes", icon: Grid3X3 },
  ];

  return (
    <div className="w-full bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
      <Tabs value={value} onValueChange={onValueChange} className="w-full">
        <TabsList className="w-full h-14 bg-transparent p-1 gap-1 rounded-none">
          {tabs.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1 h-12 px-2
                data-[state=active]:bg-primary/10 data-[state=active]:text-primary
                data-[state=inactive]:text-muted-foreground
                transition-all duration-200 ease-out
                hover:bg-muted/50 active:scale-95
                rounded-xl border-0
                text-xs font-medium
              `}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}