import { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, Grid3X3 } from 'lucide-react';
import { DashboardWidget } from '@/types/dashboard';
import { toast } from 'sonner';
import '../styles/grid-layout.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface ResizableGridProps {
  widgets: DashboardWidget[];
  onLayoutChange: (layout: DashboardWidget[]) => void;
  children: (widget: DashboardWidget) => React.ReactNode;
  isDraggable?: boolean;
  isResizable?: boolean;
  className?: string;
}

export function ResizableGrid({
  widgets,
  onLayoutChange,
  children,
  isDraggable = true,
  isResizable = true,
  className = ""
}: ResizableGridProps) {
  const [isLocked, setIsLocked] = useState(true);
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});

  const convertWidgetsToLayout = useCallback((widgets: DashboardWidget[]): Layout[] => {
    return widgets.map(widget => {
      const minSizes: { [key: string]: { w: number; h: number } } = {
        'welcome': { w: 4, h: 2 },
        'stats': { w: 3, h: 2 },
        'quick-capture': { w: 4, h: 3 },
        'recent-cards': { w: 4, h: 3 },
        'recent-notes': { w: 4, h: 3 },
        'content-summarizer': { w: 4, h: 3 },
        'task-manager': { w: 4, h: 3 },
        'task-tracker': { w: 4, h: 3 },
        'favorites': { w: 4, h: 3 },
        'calendar-events': { w: 4, h: 3 },
        'habit-tracker': { w: 3, h: 3 },
        'weather': { w: 3, h: 2 },
        'quotes': { w: 4, h: 2 },
        'notebook-list': { w: 4, h: 3 },
        'activity-feed': { w: 6, h: 3 }
      };
      
      const minSize = minSizes[widget.type] || { w: 3, h: 2 };
      
      return {
        i: widget.id,
        x: widget.position.x,
        y: widget.position.y,
        w: Math.max(widget.position.w, minSize.w),
        h: Math.max(widget.position.h, minSize.h),
        minW: minSize.w,
        minH: minSize.h,
        maxW: 12,
        maxH: 8,
      };
    });
  }, []);

  const convertLayoutToWidgets = useCallback((layout: Layout[], originalWidgets: DashboardWidget[]): DashboardWidget[] => {
    return originalWidgets.map(widget => {
      const layoutItem = layout.find(item => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          position: { x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h }
        };
      }
      return widget;
    });
  }, []);

  useEffect(() => {
    const initialLayout = convertWidgetsToLayout(widgets);
    setLayouts({
      lg: initialLayout, md: initialLayout, sm: initialLayout, xs: initialLayout, xxs: initialLayout,
    });
  }, [widgets, convertWidgetsToLayout]);

  const handleLayoutChange = (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    if (isLocked) return;
    setLayouts(allLayouts);
    const updatedWidgets = convertLayoutToWidgets(layout, widgets);
    onLayoutChange(updatedWidgets);
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
    toast.success(isLocked ? 'Grid unlocked' : 'Grid locked');
  };

  const resetLayout = () => {
    const createOptimizedLayout = () => {
      const arranged: DashboardWidget[] = [];
      const layoutGroups = [
        { widgets: ['welcome'], layout: [{ w: 12, h: 2 }] },
        { widgets: ['quick-capture', 'stats'], layout: [{ w: 8, h: 3 }, { w: 4, h: 3 }] },
        { widgets: ['recent-cards', 'recent-notes'], layout: [{ w: 6, h: 4 }, { w: 6, h: 4 }] },
        { widgets: ['task-tracker', 'calendar-events'], layout: [{ w: 6, h: 4 }, { w: 6, h: 4 }] },
        { widgets: ['notebook-list', 'favorites'], layout: [{ w: 6, h: 4 }, { w: 6, h: 4 }] },
        { widgets: ['activity-feed'], layout: [{ w: 12, h: 4 }] }
      ];
      
      let currentY = 0;
      layoutGroups.forEach(group => {
        let x = 0;
        group.widgets.forEach((widgetType, index) => {
          const widget = widgets.find(w => w.type === widgetType);
          if (widget) {
            const size = group.layout[index];
            arranged.push({ ...widget, position: { x, y: currentY, w: size.w, h: size.h } });
            x += size.w;
          }
        });
        const maxHeight = Math.max(...group.layout.map(l => l.h));
        currentY += maxHeight;
      });
      
      return arranged;
    };
    
    onLayoutChange(createOptimizedLayout());
    toast.success('Layout optimized');
  };

  const visibleWidgets = widgets.filter(w => w.isVisible);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLock}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          {isLocked ? <Lock className="h-3 w-3 mr-1.5" /> : <Unlock className="h-3 w-3 mr-1.5" />}
          {isLocked ? 'Locked' : 'Unlocked'}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={resetLayout}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          <Grid3X3 className="h-3 w-3 mr-1.5" />
          Optimize
        </Button>

        {!isLocked && (
          <span className="text-[10px] text-muted-foreground/60 hidden md:inline">Drag to move · Resize from corners</span>
        )}
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={70}
        isDraggable={isDraggable && !isLocked}
        isResizable={isResizable && !isLocked}
        compactType="vertical"
        preventCollision={false}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        transformScale={1}
        isBounded={false}
      >
        {visibleWidgets.map((widget) => (
          <div key={widget.id} className="grid-item">
            {children(widget)}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
