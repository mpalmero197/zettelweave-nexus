import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { DashboardWidgetSidebar } from "./DashboardWidgetSidebar";
import { DashboardGrid, DashboardSection } from "./DashboardGrid";
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
import { format } from "date-fns";
import '../styles/grid-layout.css';

interface CustomizableDashboardProps {
  onCreateCard?: (card: any) => void;
  onEdit?: (item: any) => void;
  onOpenNote?: (note: any) => void;
  onNavigate?: (tab: string) => void;
}

// Core widgets that get fixed layout positions
const CORE_WIDGET_TYPES = ['welcome', 'stats', 'quick-capture', 'recent-cards', 'recent-notes', 'task-tracker', 'calendar-events', 'notebook-list', 'favorites'];

export function CustomizableDashboard({ onCreateCard, onEdit, onOpenNote, onNavigate }: CustomizableDashboardProps) {
  const { widgets, isLoading, resetToDefault } = useDashboardLayout();

  const isVisible = (type: string) => widgets.find(w => w.type === type)?.isVisible ?? false;

  const renderExtraWidget = (widget: DashboardWidget) => {
    const content = (() => {
      switch (widget.type) {
        case 'activity-feed': return <ActivityFeedWidget />;
        case 'habit-tracker': return <HabitTrackerWidget />;
        case 'weather': return <WeatherWidget />;
        case 'quotes': return <QuotesWidget />;
        case 'custom-note': return <CustomNoteWidget />;
        case 'content-summarizer': return <ContentSummarizerWidget />;
        case 'task-manager': return <TaskManagerWidget />;
        case 'documents': return <DocumentsWidget />;
        case 'database': return <DatabaseWidget />;
        case 'tool-health': return <ToolHealthWidget />;
        default: return null;
      }
    })();
    if (!content) return null;
    return <div key={widget.id}>{content}</div>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const extraWidgets = widgets.filter(w => w.isVisible && !CORE_WIDGET_TYPES.includes(w.type));

  return (
    <div className="w-full">
      <div className="w-full max-w-[1400px] mx-auto p-3 md:p-5 space-y-1">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Dashboard</h2>
            <p className="text-xs text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetToDefault} className="h-7 text-xs text-muted-foreground hover:text-foreground">
              Reset
            </Button>
            <DashboardWidgetSidebar />
          </div>
        </div>

        <DashboardGrid>
          {/* Hero: Welcome + Quick Capture */}
          {(isVisible('welcome') || isVisible('quick-capture')) && (
            <WelcomeWidget onCreateCard={onCreateCard} />
          )}

          {/* Stat Pills */}
          {isVisible('stats') && (
            <StatsWidget onNavigate={onNavigate} />
          )}

          {/* Row: Recent Cards + Recent Notes */}
          {(isVisible('recent-cards') || isVisible('recent-notes')) && (
            <DashboardSection columns={2}>
              {isVisible('recent-cards') && <RecentCardsWidget onEdit={onEdit} />}
              {isVisible('recent-notes') && <RecentNotesWidget onOpenNote={onOpenNote} />}
            </DashboardSection>
          )}

          {/* Row: Tasks + Calendar */}
          {(isVisible('task-tracker') || isVisible('calendar-events')) && (
            <DashboardSection columns={2}>
              {isVisible('task-tracker') && <TaskTrackerWidget onNavigate={onNavigate} />}
              {isVisible('calendar-events') && <CalendarEventsWidget />}
            </DashboardSection>
          )}

          {/* Row: Notebooks + Favorites */}
          {(isVisible('notebook-list') || isVisible('favorites')) && (
            <DashboardSection columns={2}>
              {isVisible('notebook-list') && <NotebookListWidget />}
              {isVisible('favorites') && <FavoritesWidget />}
            </DashboardSection>
          )}

          {/* Extra widgets in auto-flow grid */}
          {extraWidgets.length > 0 && (
            <DashboardSection columns={2}>
              {extraWidgets.map(renderExtraWidget)}
            </DashboardSection>
          )}
        </DashboardGrid>

        {/* Empty state */}
        {widgets.every(w => !w.isVisible) && (
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
