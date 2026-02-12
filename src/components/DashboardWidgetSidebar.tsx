import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { WidgetDefinition } from "@/types/dashboard";
import { 
  Settings2, Brain, BarChart3, FileText, NotebookPen, Calendar, Activity, Heart, 
  CheckSquare, Sun, Quote, StickyNote, Plus, File, Database, HeartPulse
} from "lucide-react";
import { toast } from "sonner";

const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  { type: 'welcome', name: 'Welcome Banner', description: 'Greeting with quick capture', icon: Brain, defaultSize: { w: 2, h: 2 }, minSize: { w: 2, h: 2 } },
  { type: 'stats', name: 'Stats', description: 'Stat pills for cards, notes, notebooks', icon: BarChart3, defaultSize: { w: 2, h: 1 }, minSize: { w: 2, h: 1 } },
  { type: 'recent-cards', name: 'Recent Cards', description: 'Most recently updated cards', icon: FileText, defaultSize: { w: 2, h: 2 }, minSize: { w: 2, h: 2 } },
  { type: 'recent-notes', name: 'Recent Notes', description: 'Latest notes', icon: NotebookPen, defaultSize: { w: 2, h: 2 }, minSize: { w: 2, h: 2 } },
  { type: 'quick-capture', name: 'Quick Capture', description: 'Merged into Welcome Banner', icon: Plus, defaultSize: { w: 2, h: 1 }, minSize: { w: 2, h: 1 } },
  { type: 'calendar-events', name: 'Calendar', description: 'Upcoming events', icon: Calendar, defaultSize: { w: 2, h: 2 }, minSize: { w: 2, h: 2 } },
  { type: 'activity-feed', name: 'Activity', description: 'Recent workspace activity', icon: Activity, defaultSize: { w: 2, h: 3 }, minSize: { w: 2, h: 2 } },
  { type: 'favorites', name: 'Favorites', description: 'Starred content', icon: Heart, defaultSize: { w: 2, h: 2 }, minSize: { w: 2, h: 2 } },
  { type: 'task-tracker', name: 'Tasks', description: 'Quick task tracker', icon: CheckSquare, defaultSize: { w: 2, h: 2 }, minSize: { w: 2, h: 2 } },
  { type: 'habit-tracker', name: 'Habits', description: 'Daily habit tracking', icon: Activity, defaultSize: { w: 2, h: 2 }, minSize: { w: 2, h: 2 } },
  { type: 'weather', name: 'Weather', description: 'Current conditions', icon: Sun, defaultSize: { w: 1, h: 1 }, minSize: { w: 1, h: 1 } },
  { type: 'quotes', name: 'Daily Quote', description: 'Inspirational quotes', icon: Quote, defaultSize: { w: 2, h: 1 }, minSize: { w: 2, h: 1 } },
  { type: 'custom-note', name: 'Custom Note', description: 'Freeform content', icon: StickyNote, defaultSize: { w: 2, h: 2 }, minSize: { w: 1, h: 1 } },
  { type: 'content-summarizer', name: 'Summarizer', description: 'AI content summarization', icon: Brain, defaultSize: { w: 3, h: 3 }, minSize: { w: 2, h: 2 } },
  { type: 'task-manager', name: 'Task Manager', description: 'Advanced task management', icon: CheckSquare, defaultSize: { w: 3, h: 3 }, minSize: { w: 2, h: 2 } },
  { type: 'documents', name: 'Documents', description: 'Document management', icon: File, defaultSize: { w: 6, h: 5 }, minSize: { w: 4, h: 4 } },
  { type: 'database', name: 'Database', description: 'Table database', icon: Database, defaultSize: { w: 6, h: 5 }, minSize: { w: 4, h: 4 } },
  { type: 'tool-health', name: 'System Health', description: 'Monitor tool status', icon: HeartPulse, defaultSize: { w: 2, h: 2 }, minSize: { w: 2, h: 2 } },
  { type: 'notebook-list', name: 'Notebooks', description: 'Your notebooks', icon: NotebookPen, defaultSize: { w: 2, h: 2 }, minSize: { w: 2, h: 2 } },
];

export function DashboardWidgetSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { widgets, addWidget, updateWidget, resetToDefault } = useDashboardLayout();

  const getWidgetStatus = (widgetType: string) => {
    const existing = widgets.find(w => w.type === widgetType);
    return { exists: !!existing, isVisible: existing?.isVisible ?? false, widget: existing };
  };

  const handleToggle = (definition: WidgetDefinition) => {
    const { exists, isVisible, widget } = getWidgetStatus(definition.type);
    if (exists && widget) {
      updateWidget(widget.id, { isVisible: !isVisible });
      toast.success(`${definition.name} ${!isVisible ? 'shown' : 'hidden'}`);
    } else {
      addWidget({
        type: definition.type,
        title: definition.name,
        position: { x: 0, y: widgets.length, w: definition.defaultSize.w, h: definition.defaultSize.h },
        isVisible: true
      });
      toast.success(`Added ${definition.name}`);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden md:inline ml-1">Widgets</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[340px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Widgets</SheetTitle>
          <SheetDescription>Toggle widgets on or off</SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          <Button variant="outline" onClick={() => { resetToDefault(); toast.success("Reset"); setIsOpen(false); }} className="w-full text-sm">
            Reset to Default
          </Button>

          <div className="space-y-1">
            {WIDGET_DEFINITIONS.map((def) => {
              const { exists, isVisible } = getWidgetStatus(def.type);
              const Icon = def.icon;
              return (
                <div key={def.type} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{def.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{def.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={exists && isVisible}
                    onCheckedChange={() => handleToggle(def)}
                    aria-label={`Toggle ${def.name}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
