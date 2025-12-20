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
import { DocumentsWidget } from "./widgets/DocumentsWidget";
import { DatabaseWidget } from "./widgets/DatabaseWidget";
import { ActivityFeedWidget } from "./widgets/ActivityFeedWidget";
import { NotebookListWidget } from "./widgets/NotebookListWidget";
import { WeatherWidget } from "./widgets/WeatherWidget";
import { QuotesWidget } from "./widgets/QuotesWidget";
import { CustomNoteWidget } from "./widgets/CustomNoteWidget";
import { FavoritesWidget } from "./widgets/FavoritesWidget";
import { CalendarEventsWidget } from "./widgets/CalendarEventsWidget";
import { TaskTrackerWidget } from "./widgets/TaskTrackerWidget";
import { ToolHealthWidget } from "./widgets/ToolHealthWidget";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { DashboardWidget, WidgetType } from "@/types/dashboard";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { Brain, Eye, EyeOff, Trash2, Sparkles } from "lucide-react";
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
  const { widgets, isLoading, removeWidget, updateWidget, saveLayout, resetToDefault } = useDashboardLayout();

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
        
        case 'documents':
          return <DocumentsWidget />;
        
        case 'database':
          return <DatabaseWidget />;
        
        case 'tool-health':
          return <ToolHealthWidget />;
        
        default:
          return (
            <Card className="h-full bg-card border border-border/50">
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
            className="h-8 w-8 p-0 bg-background hover:bg-background"
          >
            {widget.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveWidget}
            className="h-8 w-8 p-0 bg-background hover:bg-destructive/10 text-destructive"
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
    <div className="w-full bg-background">
      <div className="w-full max-w-[1600px] mx-auto p-2 sm:p-3 space-y-3">
        {/* Modern Dashboard Header */}
        <div className="animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Your knowledge hub at a glance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefault}
                className="h-8 text-xs"
              >
                Reset Layout
              </Button>
              <DashboardWidgetSidebar />
            </div>
          </div>
        </div>

        {/* Resizable Grid Layout */}
        {visibleWidgets.length > 0 ? (
          <ResizableGrid
            widgets={visibleWidgets}
            onLayoutChange={saveLayout}
          >
            {renderWidget}
          </ResizableGrid>
        ) : (
          <div className="text-center py-8 animate-fade-in">
            <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-semibold text-foreground mb-1">No widgets to display</h3>
            <p className="text-xs text-muted-foreground mb-3">Add widgets to customize your dashboard</p>
            <DashboardWidgetSidebar />
          </div>
        )}
      </div>
    </div>
  );
}