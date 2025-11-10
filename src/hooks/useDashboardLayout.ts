import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DashboardWidget, DashboardLayout } from '@/types/dashboard';
import { toast } from 'sonner';

const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'welcome',
    type: 'welcome',
    title: 'Welcome',
    position: { x: 0, y: 0, w: 6, h: 3 },
    isVisible: true
  },
  {
    id: 'stats',
    type: 'stats',
    title: 'Statistics',
    position: { x: 6, y: 0, w: 6, h: 3 },
    isVisible: true
  },
  {
    id: 'quick-capture',
    type: 'quick-capture',
    title: 'Quick Capture',
    position: { x: 0, y: 3, w: 6, h: 4 },
    isVisible: true
  },
  {
    id: 'recent-cards',
    type: 'recent-cards',
    title: 'Recent Cards',
    position: { x: 6, y: 3, w: 6, h: 4 },
    isVisible: true
  }
];

export function useDashboardLayout() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadLayout();
    }
  }, [user]);

  const loadLayout = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        console.error('Error loading dashboard layout:', errorMessage, error);
        return;
      }

      if (data && data.layout_data) {
        try {
          const layoutData = data.layout_data as unknown as DashboardWidget[];
          console.log('Loading dashboard layout:', layoutData);
          setWidgets(layoutData);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
          console.error('Error parsing layout data:', errorMessage, error);
          // Fall back to default widgets if parsing fails
          setWidgets(DEFAULT_WIDGETS);
        }
      } else {
        // No saved layout found, use defaults
        console.log('No saved layout found, using defaults');
        setWidgets(DEFAULT_WIDGETS);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Error loading dashboard layout:', errorMessage, error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveLayout = async (newWidgets: DashboardWidget[]) => {
    if (!user || isSaving) return;

    setIsSaving(true);
    console.log('Saving dashboard layout:', newWidgets.length, 'widgets');
    
    try {
      // First update local state immediately for responsiveness
      setWidgets(newWidgets);
      
      const { error } = await supabase
        .from('dashboard_layouts')
        .upsert([{
          user_id: user.id,
          layout_data: newWidgets as any,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Dashboard layout save error:', error);
        throw error;
      }

      console.log('Dashboard layout saved successfully');
      // Silent auto-save - no toast notification
      
      // Verify the save by reloading
      setTimeout(() => {
        loadLayout();
      }, 100);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Error saving dashboard layout:', errorMessage, error);
      toast.error(`Failed to save dashboard layout: ${errorMessage}`);
      
      // Reload to get the correct state from database
      await loadLayout();
    } finally {
      setIsSaving(false);
    }
  };

  const addWidget = (widget: Omit<DashboardWidget, 'id'>) => {
    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    const newWidgets = [...widgets, newWidget];
    saveLayout(newWidgets);
  };

  const removeWidget = (widgetId: string) => {
    const newWidgets = widgets.filter(w => w.id !== widgetId);
    saveLayout(newWidgets);
  };

  const updateWidget = (widgetId: string, updates: Partial<DashboardWidget>) => {
    const newWidgets = widgets.map(w => 
      w.id === widgetId ? { ...w, ...updates } : w
    );
    saveLayout(newWidgets);
  };

  const resetToDefault = () => {
    saveLayout(DEFAULT_WIDGETS);
  };

  return {
    widgets,
    isLoading,
    isSaving,
    addWidget,
    removeWidget,
    updateWidget,
    saveLayout,
    resetToDefault
  };
}