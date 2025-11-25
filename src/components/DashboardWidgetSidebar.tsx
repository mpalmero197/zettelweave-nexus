import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { WidgetDefinition } from "@/types/dashboard";
import { 
  Settings2, 
  Brain, 
  BarChart3, 
  FileText, 
  NotebookPen, 
  Calendar, 
  Activity, 
  Heart, 
  CheckSquare, 
  Sun, 
  Quote, 
  StickyNote,
  Plus,
  File,
  Database
} from "lucide-react";
import { toast } from "sonner";

const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    type: 'welcome',
    name: 'Welcome',
    description: 'Welcome message and quick actions',
    icon: Brain,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 3 }
  },
  {
    type: 'stats',
    name: 'Statistics',
    description: 'Overview of your knowledge base stats',
    icon: BarChart3,
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
    maxSize: { w: 4, h: 2 }
  },
  {
    type: 'recent-cards',
    name: 'Recent Cards',
    description: 'Your most recently created cards',
    icon: FileText,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 }
  },
  {
    type: 'recent-notes',
    name: 'Recent Notes',
    description: 'Your latest notes and observations',
    icon: NotebookPen,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 }
  },
  {
    type: 'quick-capture',
    name: 'Quick Capture',
    description: 'Rapidly create new cards and notes',
    icon: Plus,
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
    maxSize: { w: 3, h: 2 }
  },
  {
    type: 'calendar-events',
    name: 'Calendar',
    description: 'Upcoming events and deadlines',
    icon: Calendar,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 }
  },
  {
    type: 'activity-feed',
    name: 'Activity Feed',
    description: 'Recent activity across your workspace',
    icon: Activity,
    defaultSize: { w: 2, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 }
  },
  {
    type: 'favorites',
    name: 'Favorites',
    description: 'Your starred cards and content',
    icon: Heart,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 }
  },
  {
    type: 'task-tracker',
    name: 'Tasks',
    description: 'Track your tasks and todos',
    icon: CheckSquare,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 }
  },
  {
    type: 'habit-tracker',
    name: 'Habits',
    description: 'Monitor your daily habits',
    icon: Activity,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 }
  },
  {
    type: 'weather',
    name: 'Weather',
    description: 'Current weather conditions',
    icon: Sun,
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 2, h: 2 }
  },
  {
    type: 'quotes',
    name: 'Daily Quote',
    description: 'Inspirational quotes and thoughts',
    icon: Quote,
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 1 },
    maxSize: { w: 4, h: 2 }
  },
  {
    type: 'custom-note',
    name: 'Custom Note',
    description: 'Add your own custom content',
    icon: StickyNote,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 }
  },
  {
    type: 'content-summarizer',
    name: 'Content Summarizer',
    description: 'AI-powered content summarization tool',
    icon: Brain,
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 }
  },
  {
    type: 'task-manager',
    name: 'Task Manager',
    description: 'Advanced task management with time tracking',
    icon: CheckSquare,
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 }
  },
  {
    type: 'documents',
    name: 'Documents',
    description: 'Notion-style document management with search',
    icon: File,
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 4 },
  },
  {
    type: 'database',
    name: 'Database',
    description: 'Notion-style table database with status tracking',
    icon: Database,
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 4 },
  }
];

export function DashboardWidgetSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { widgets, addWidget, updateWidget, resetToDefault } = useDashboardLayout();

  const getWidgetStatus = (widgetType: string) => {
    const existingWidget = widgets.find(w => w.type === widgetType);
    return {
      exists: !!existingWidget,
      isVisible: existingWidget?.isVisible ?? false,
      widget: existingWidget
    };
  };

  const handleAddWidget = (definition: WidgetDefinition) => {
    const { exists, widget } = getWidgetStatus(definition.type);
    
    if (exists && widget) {
      // Widget exists, just make it visible
      updateWidget(widget.id, { isVisible: true });
      toast.success(`${definition.name} widget is now visible`);
    } else {
      // Add new widget
      const newWidget = {
        type: definition.type,
        title: definition.name,
        position: {
          x: 0,
          y: widgets.length, // Stack vertically
          w: Math.min(definition.defaultSize.w, 2), // Limit width for mobile
          h: definition.defaultSize.h
        },
        isVisible: true
      };
      
      addWidget(newWidget);
      toast.success(`Added ${definition.name} widget to dashboard`);
    }
  };

  const handleToggleWidget = (definition: WidgetDefinition) => {
    const { exists, isVisible, widget } = getWidgetStatus(definition.type);
    
    if (exists && widget) {
      updateWidget(widget.id, { isVisible: !isVisible });
      toast.success(`${definition.name} widget ${!isVisible ? 'shown' : 'hidden'}`);
    }
  };

  const handleResetDashboard = () => {
    resetToDefault();
    toast.success("Dashboard reset to default layout");
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden md:inline ml-1">Widget Toolbox</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Dashboard Widgets</SheetTitle>
          <SheetDescription>
            Add, remove, or toggle visibility of widgets on your dashboard
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          {/* Reset Button */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={handleResetDashboard}
              className="w-full"
            >
              Reset to Default Layout
            </Button>
          </div>

          {/* Widget Grid */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Available Widgets</h3>
            <div className="grid gap-3">
              {WIDGET_DEFINITIONS.map((definition) => {
                const { exists, isVisible } = getWidgetStatus(definition.type);
                const IconComponent = definition.icon;

                return (
                  <Card key={definition.type} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <IconComponent className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">{definition.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {definition.description}
                            </CardDescription>
                          </div>
                        </div>
                        
                        <Switch 
                          checked={exists && isVisible}
                          onCheckedChange={() => {
                            if (exists) {
                              handleToggleWidget(definition);
                            } else {
                              handleAddWidget(definition);
                            }
                          }}
                        />
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {definition.defaultSize.w}×{definition.defaultSize.h}
                        </Badge>
                        {exists && (
                          <Badge variant={isVisible ? "default" : "outline"} className="text-xs">
                            {isVisible ? "Visible" : "Hidden"}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}