import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { DashboardCustomizer } from "./DashboardCustomizer";
import { WelcomeWidget } from "./widgets/WelcomeWidget";
import { StatsWidget } from "./widgets/StatsWidget";
import { RecentCardsWidget } from "./widgets/RecentCardsWidget";
import { RecentNotesWidget } from "./widgets/RecentNotesWidget";
import { QuickCaptureWidget } from "./widgets/QuickCaptureWidget";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";
import { DashboardWidget, WidgetType } from "@/types/dashboard";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { Brain, FileText, Calendar, Activity, CheckSquare, Sun, Quote, StickyNote, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CustomizableDashboardProps {
  onCreateCard?: (card: any) => void;
  onEdit?: (item: any) => void;
  onOpenNote?: (note: any) => void;
}

interface Note {
  id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export function CustomizableDashboard({ onCreateCard, onEdit, onOpenNote }: CustomizableDashboardProps) {
  const { widgets, isLoading, removeWidget, updateWidget } = useDashboardLayout();

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
          return <WelcomeWidget onCreateCard={() => onCreateCard?.({})} />;
        
        case 'stats':
          return <StatsWidget />;
        
        case 'recent-cards':
          return <RecentCardsWidget onEdit={onEdit} />;
        
        case 'recent-notes':
          return <RecentNotesWidget onOpenNote={onOpenNote} />;
        
        case 'quick-capture':
          return <QuickCaptureWidget onCreateCard={onCreateCard} />;
        
        case 'calendar-events':
          return (
            <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Calendar events coming soon</p>
                </div>
              </CardContent>
            </Card>
          );
        
        case 'activity-feed':
          return (
            <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Activity feed coming soon</p>
                </div>
              </CardContent>
            </Card>
          );
        
        case 'favorites':
          return (
            <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Favorites coming soon</p>
                </div>
              </CardContent>
            </Card>
          );
        
        case 'task-tracker':
          return (
            <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Task tracker coming soon</p>
                </div>
              </CardContent>
            </Card>
          );
        
        case 'habit-tracker':
          return (
            <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Habit tracker coming soon</p>
                </div>
              </CardContent>
            </Card>
          );
        
        case 'weather':
          return (
            <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <Sun className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Weather coming soon</p>
                </div>
              </CardContent>
            </Card>
          );
        
        case 'quotes':
          return (
            <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <Quote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Daily quotes coming soon</p>
                </div>
              </CardContent>
            </Card>
          );
        
        case 'custom-note':
          return (
            <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Custom note coming soon</p>
                </div>
              </CardContent>
            </Card>
          );
        
        default:
          return (
            <Card className="h-full bg-card/70 backdrop-blur-xl border border-border/50">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Unknown widget type</p>
                </div>
              </CardContent>
            </Card>
          );
      }
    })();

    return (
      <div key={widget.id} style={widgetStyle} className="relative group">
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
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-none p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header with customization */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Customize your workspace to fit your workflow</p>
          </div>
          <DashboardCustomizer />
        </div>

        {/* Responsive grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 sm:gap-6 auto-rows-min">
          {visibleWidgets
            .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
            .map(renderWidget)}
        </div>

        {visibleWidgets.length === 0 && (
          <div className="text-center py-20">
            <div className="mb-4">
              <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No widgets to display</h3>
              <p className="text-muted-foreground">Use the customize button to add widgets to your dashboard</p>
            </div>
            <DashboardCustomizer />
          </div>
        )}
      </div>
    </div>
  );
}