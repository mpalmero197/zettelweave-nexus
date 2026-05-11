export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config?: Record<string, any>;
  isVisible: boolean;
}

export type WidgetType = 
  | 'welcome'
  | 'stats'
  | 'recent-cards'
  | 'recent-notes'
  | 'calendar-events'
  | 'quick-capture'
  | 'activity-feed'
  | 'favorites'
  | 'notebook-list'
  | 'task-tracker'
  | 'habit-tracker'
  | 'weather'
  | 'quotes'
  | 'custom-note'
  | 'content-summarizer'
  | 'task-manager'
  | 'documents'
  | 'database'
  | 'tool-health'
  | 'daily-briefing';

export interface DashboardLayout {
  id: string;
  user_id: string;
  widgets: DashboardWidget[];
  created_at: string;
  updated_at: string;
}

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize?: { w: number; h: number };
}