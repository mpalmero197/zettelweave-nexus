import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Settings, 
  Plus, 
  Brain, 
  FileText, 
  Calendar,
  BarChart3,
  Edit3,
  Sparkles,
  BookOpen,
  Activity,
  CheckSquare,
  Sun,
  Quote,
  StickyNote,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw
} from "lucide-react";
import { DashboardWidget, WidgetType, WidgetDefinition } from "@/types/dashboard";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { toast } from "sonner";

const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    type: 'welcome',
    name: 'Welcome Banner',
    description: 'Personalized welcome message with quick actions',
    icon: Sparkles,
    defaultSize: { w: 12, h: 3 },
    minSize: { w: 8, h: 2 }
  },
  {
    type: 'stats',
    name: 'Statistics Overview',
    description: 'Key metrics and counts at a glance',
    icon: BarChart3,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 6, h: 2 }
  },
  {
    type: 'recent-cards',
    name: 'Recent Zettel Cards',
    description: 'Your most recently updated cards',
    icon: Brain,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 }
  },
  {
    type: 'recent-notes',
    name: 'Recent Notes',
    description: 'Your latest notes and thoughts',
    icon: FileText,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 }
  },
  {
    type: 'calendar-events',
    name: 'Upcoming Events',
    description: 'Calendar events and schedules',
    icon: Calendar,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 }
  },
  {
    type: 'quick-capture',
    name: 'Quick Capture',
    description: 'Rapid note-taking and idea capture',
    icon: Edit3,
    defaultSize: { w: 8, h: 3 },
    minSize: { w: 6, h: 3 }
  },
  {
    type: 'activity-feed',
    name: 'Activity Feed',
    description: 'Recent actions and updates',
    icon: Activity,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 }
  },
  {
    type: 'favorites',
    name: 'Favorites',
    description: 'Your starred content',
    icon: BookOpen,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 }
  },
  {
    type: 'task-tracker',
    name: 'Task Tracker',
    description: 'To-do lists and task management',
    icon: CheckSquare,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 }
  },
  {
    type: 'habit-tracker',
    name: 'Habit Tracker',
    description: 'Track daily habits and routines',
    icon: Activity,
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 }
  },
  {
    type: 'weather',
    name: 'Weather',
    description: 'Current weather conditions',
    icon: Sun,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 }
  },
  {
    type: 'quotes',
    name: 'Daily Quote',
    description: 'Inspirational quotes and wisdom',
    icon: Quote,
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 2 }
  },
  {
    type: 'custom-note',
    name: 'Custom Note',
    description: 'Personal note widget',
    icon: StickyNote,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 }
  }
];

export function DashboardCustomizer() {
  const { widgets, addWidget, removeWidget, updateWidget, resetToDefault } = useDashboardLayout();
  const [isOpen, setIsOpen] = useState(false);

  const getNextPosition = () => {
    // Find the next available position in a 12-column grid
    const maxY = Math.max(...widgets.map(w => w.position.y + w.position.h), 0);
    return { x: 0, y: maxY, w: 6, h: 4 };
  };

  const handleAddWidget = (definition: WidgetDefinition) => {
    const position = getNextPosition();
    addWidget({
      type: definition.type,
      title: definition.name,
      position: { ...position, ...definition.defaultSize },
      isVisible: true
    });
    toast.success(`Added ${definition.name} widget`);
  };

  const handleRemoveWidget = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) {
      removeWidget(widgetId);
      toast.success(`Removed ${widget.title} widget`);
    }
  };

  const handleToggleVisibility = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) {
      updateWidget(widgetId, { isVisible: !widget.isVisible });
      toast.success(`${widget.isVisible ? 'Hidden' : 'Shown'} ${widget.title} widget`);
    }
  };

  const handleResetToDefault = () => {
    resetToDefault();
    toast.success('Dashboard reset to default layout');
    setIsOpen(false);
  };

  const availableWidgets = WIDGET_DEFINITIONS.filter(
    def => !widgets.some(w => w.type === def.type)
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Customize Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Customize Your Dashboard
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Current Widgets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Current Widgets</h3>
              <Button variant="outline" size="sm" onClick={handleResetToDefault}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            </div>
            
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {widgets.map((widget) => {
                  const definition = WIDGET_DEFINITIONS.find(d => d.type === widget.type);
                  const Icon = definition?.icon || StickyNote;
                  
                  return (
                    <div
                      key={widget.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{widget.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {definition?.description || 'Custom widget'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleVisibility(widget.id)}
                          className="h-8 w-8 p-0"
                        >
                          {widget.isVisible ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveWidget(widget.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Available Widgets */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add Widgets</h3>
            
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {availableWidgets.map((definition) => {
                  const Icon = definition.icon;
                  
                  return (
                    <div
                      key={definition.type}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                      onClick={() => handleAddWidget(definition)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{definition.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {definition.description}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                
                {availableWidgets.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      All available widgets have been added
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}