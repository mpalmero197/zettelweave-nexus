import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { DashboardWidgetSidebar } from "./DashboardWidgetSidebar";
import { ResizableGrid } from "./ResizableGrid";
import { WelcomeWidget } from "./widgets/WelcomeWidget";
import { StatsWidget } from "./widgets/StatsWidget";
import { RecentCardsWidget } from "./widgets/RecentCardsWidget";
import { RecentNotesWidget } from "./widgets/RecentNotesWidget";
import { QuickCaptureWidget } from "./widgets/QuickCaptureWidget";
import { HabitTrackerWidget } from "./widgets/HabitTrackerWidget";
import { TaskManagerWidget } from "./widgets/TaskManagerWidget";
import { ContentSummarizerWidget } from "./widgets/ContentSummarizerWidget";
import { ActivityFeedWidget } from "./widgets/ActivityFeedWidget";
import { NotebookListWidget } from "./widgets/NotebookListWidget";
import { WeatherWidget } from "./widgets/WeatherWidget";
import { QuotesWidget } from "./widgets/QuotesWidget";
import { CustomNoteWidget } from "./widgets/CustomNoteWidget";
import { FavoritesWidget } from "./widgets/FavoritesWidget";
import { CalendarEventsWidget } from "./widgets/CalendarEventsWidget";
import { TaskTrackerWidget } from "./widgets/TaskTrackerWidget";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { DashboardWidget, WidgetType } from "@/types/dashboard";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { Brain, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CustomizableDashboardProps {
  onCreateCard?: (card: any) => void;
  onEdit?: (item: any) => void;
  onOpenNote?: (note: any) => void;
  onNavigate?: (tab: string) => void;
}

interface Note {
  id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export function CustomizableDashboard({ onCreateCard, onEdit, onOpenNote, onNavigate }: CustomizableDashboardProps) {
  const { widgets, isLoading, removeWidget, updateWidget, saveLayout } = useDashboardLayout();

  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.isVisible) return null;

    const widgetStyle = {
      gridColumn: `span ${widget.position.w}`,
      gridRow: `span ${widget.position.h}`,
      minHeight: `${widget.position.h * 120}px`
    };

    const handleRemoveWidget = (e: React.MouseEvent) => {
      e.stopPropagation();
      removeWidget(widget.id);
      toast.success(`Removed ${widget.title} widget`);
    };

    const handleToggleVisibility = (e: React.MouseEvent) => {
      e.stopPropagation();
      updateWidget(widget.id, { isVisible: !widget.isVisible });
    };

    const widgetContent = (() => {
      switch (widget.type) {
        case 'welcome':
          return <WelcomeWidget />;
        
        case 'stats':
          return <StatsWidget onNavigate={onNavigate} />;
        
        case 'recent-cards':
          return <RecentCardsWidget onEdit={onEdit} />;
        
        case 'recent-notes':
          return <RecentNotesWidget onOpenNote={onOpenNote} />;
        
        case 'quick-capture':
          return <QuickCaptureWidget onCreateCard={onCreateCard} />;
        
        case 'calendar-events':
          return <CalendarEventsWidget />;
        
        case 'activity-feed':
          return <ActivityFeedWidget />;
        
        case 'favorites':
          return <FavoritesWidget />;
        
        case 'notebook-list':
          return <NotebookListWidget />;
        
        case 'task-tracker':
          return <TaskTrackerWidget />;
        
        case 'habit-tracker':
          return <HabitTrackerWidget />;
        
        case 'weather':
          return <WeatherWidget />;
        
        case 'quotes':
          return <QuotesWidget />;
        
        case 'custom-note':
          return <CustomNoteWidget />;
        
        case 'content-summarizer':
          return <ContentSummarizerWidget />;
        
        case 'task-manager':
          return <TaskManagerWidget />;
        
        default:
          return (
            <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Unknown widget type: {widget.type}</p>
                </div>
              </CardContent>
            </Card>
          );
      }
    })();

    return (
      <div className="relative group h-full">
        {/* Widget Controls */}
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleVisibility}
            className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background"
          >
            {widget.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveWidget}
            className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-destructive/10 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        {widgetContent}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  const visibleWidgets = widgets.filter(w => w.isVisible);

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="w-full max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
        {/* Header with widget toolbox */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Customize your workspace</p>
          </div>
          <DashboardWidgetSidebar />
        </div>

        {/* Resizable Grid Layout */}
        {visibleWidgets.length > 0 ? (
          <ResizableGrid
            widgets={visibleWidgets}
            onLayoutChange={saveLayout}
            className="min-h-[600px]"
          >
            {renderWidget}
          </ResizableGrid>
        ) : (
          <div className="text-center py-20">
            <div className="mb-4">
              <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No widgets to display</h3>
              <p className="text-muted-foreground">Use the customize button to add widgets to your dashboard</p>
            </div>
            <DashboardWidgetSidebar />
          </div>
        )}
      </div>
    </div>
  );
}