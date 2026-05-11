import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { DashboardWidgetSidebar } from "./DashboardWidgetSidebar";
import { DashboardGrid, DashboardSection } from "./DashboardGrid";
import { WelcomeWidget } from "./widgets/WelcomeWidget";
import { ActionAgendaWidget } from "./widgets/ActionAgendaWidget";
import { TaskTrackerWidget } from "./widgets/TaskTrackerWidget";
import { CalendarEventsWidget } from "./widgets/CalendarEventsWidget";
import { RecentWorkWidget } from "./widgets/RecentWorkWidget";
import { FavoritesWidget } from "./widgets/FavoritesWidget";
import { NotebookListWidget } from "./widgets/NotebookListWidget";

import { ContentSummarizerWidget } from "./widgets/ContentSummarizerWidget";
import { DocumentsWidget } from "./widgets/DocumentsWidget";
import { DatabaseWidget } from "./widgets/DatabaseWidget";
import { ActivityFeedWidget } from "./widgets/ActivityFeedWidget";
import { WeatherWidget } from "./widgets/WeatherWidget";
import { QuotesWidget } from "./widgets/QuotesWidget";
import { CustomNoteWidget } from "./widgets/CustomNoteWidget";
import { TaskManagerWidget } from "./widgets/TaskManagerWidget";
import { ToolHealthWidget } from "./widgets/ToolHealthWidget";
import { DailyBriefingWidget } from "./widgets/DailyBriefingWidget";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { DashboardWidget } from "@/types/dashboard";
import { Brain } from "lucide-react";
import '../styles/grid-layout.css';

interface CustomizableDashboardProps {
  onCreateCard?: (card: any) => void;
  onEdit?: (item: any) => void;
  onOpenNote?: (note: any) => void;
  onNavigate?: (tab: string) => void;
}

const CORE_WIDGET_TYPES = ['welcome', 'stats', 'quick-capture', 'recent-cards', 'recent-notes', 'task-tracker', 'calendar-events', 'notebook-list', 'favorites'];

export function CustomizableDashboard({ onCreateCard, onEdit, onOpenNote, onNavigate }: CustomizableDashboardProps) {
  const { widgets, isLoading, resetToDefault } = useDashboardLayout();

  const isVisible = (type: string) => widgets.find(w => w.type === type)?.isVisible ?? false;

  const renderExtraWidget = (widget: DashboardWidget) => {
    const content = (() => {
      switch (widget.type) {
        case 'activity-feed': return <ActivityFeedWidget />;
        
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
        {/* Header row */}
        <div className="flex items-end justify-end gap-2 mb-1">
          <Button variant="ghost" size="sm" onClick={resetToDefault} className="h-7 text-xs text-muted-foreground hover:text-foreground">
            Reset
          </Button>
          <DashboardWidgetSidebar />
        </div>

        <DashboardGrid>
          {/* 1. Hero: Greeting + Quick Actions */}
          {(isVisible('welcome') || isVisible('quick-capture') || isVisible('stats')) && (
            <WelcomeWidget onCreateCard={onCreateCard} onNavigate={onNavigate} />
          )}

          {/* 2. Action Agenda (full width) */}
          <ActionAgendaWidget onNavigate={onNavigate} />

          {/* 3. Continue Working + Favorites (2-col) */}
          {(isVisible('recent-cards') || isVisible('recent-notes') || isVisible('favorites')) && (
            <DashboardSection columns={2}>
              {(isVisible('recent-cards') || isVisible('recent-notes')) && (
                <RecentWorkWidget onEdit={onEdit} onOpenNote={onOpenNote} onNavigate={onNavigate} />
              )}
              {isVisible('favorites') && <FavoritesWidget />}
            </DashboardSection>
          )}

          {/* 4. Notebook List + Task Tracker / Calendar (2-col) */}
          {(isVisible('notebook-list') || isVisible('task-tracker') || isVisible('calendar-events')) && (
            <DashboardSection columns={2}>
              {isVisible('notebook-list') && <NotebookListWidget onNavigate={onNavigate} />}
              {isVisible('task-tracker') && <TaskTrackerWidget onNavigate={onNavigate} />}
            </DashboardSection>
          )}

          {/* 5. Extra widgets */}
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
