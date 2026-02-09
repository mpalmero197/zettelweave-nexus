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
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { DashboardWidget } from "@/types/dashboard";
import { Brain } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CustomizableDashboardProps {
  onCreateCard?: (card: any) => void;
  onEdit?: (item: any) => void;
  onOpenNote?: (note: any) => void;
  onNavigate?: (tab: string) => void;
}

export function CustomizableDashboard({ onCreateCard, onEdit, onOpenNote, onNavigate }: CustomizableDashboardProps) {
  const { widgets, isLoading, removeWidget, updateWidget, saveLayout, resetToDefault } = useDashboardLayout();

  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.isVisible) return null;

    const widgetContent = (() => {
      switch (widget.type) {
        case 'welcome': return <WelcomeWidget />;
        case 'stats': return <StatsWidget onNavigate={onNavigate} />;
        case 'recent-cards': return <RecentCardsWidget onEdit={onEdit} />;
        case 'recent-notes': return <RecentNotesWidget onOpenNote={onOpenNote} />;
        case 'quick-capture': return <QuickCaptureWidget onCreateCard={onCreateCard} />;
        case 'calendar-events': return <CalendarEventsWidget />;
        case 'activity-feed': return <ActivityFeedWidget />;
        case 'favorites': return <FavoritesWidget />;
        case 'notebook-list': return <NotebookListWidget />;
        case 'task-tracker': return <TaskTrackerWidget />;
        case 'habit-tracker': return <HabitTrackerWidget />;
        case 'weather': return <WeatherWidget />;
        case 'quotes': return <QuotesWidget />;
        case 'custom-note': return <CustomNoteWidget />;
        case 'content-summarizer': return <ContentSummarizerWidget />;
        case 'task-manager': return <TaskManagerWidget />;
        case 'documents': return <DocumentsWidget />;
        case 'database': return <DatabaseWidget />;
        case 'tool-health': return <ToolHealthWidget />;
        default:
          return (
            <div className="h-full flex items-center justify-center border border-border rounded-lg bg-card p-4">
              <p className="text-xs text-muted-foreground">Unknown widget: {widget.type}</p>
            </div>
          );
      }
    })();

    return <div className="h-full">{widgetContent}</div>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const visibleWidgets = widgets.filter(w => w.isVisible);

  return (
    <div className="w-full">
      <div className="w-full max-w-[1400px] mx-auto p-3 md:p-4 space-y-3">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetToDefault} className="h-7 text-xs text-muted-foreground hover:text-foreground">
              Reset
            </Button>
            <DashboardWidgetSidebar />
          </div>
        </div>

        {/* Grid */}
        {visibleWidgets.length > 0 ? (
          <ResizableGrid widgets={visibleWidgets} onLayoutChange={saveLayout}>
            {renderWidget}
          </ResizableGrid>
        ) : (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Brain className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground mb-3">Add widgets to customize your dashboard</p>
            <DashboardWidgetSidebar />
          </div>
        )}
      </div>
    </div>
  );
}
