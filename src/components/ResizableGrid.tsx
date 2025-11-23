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

  // Convert widgets to grid layout format
  const convertWidgetsToLayout = useCallback((widgets: DashboardWidget[]): Layout[] => {
    return widgets.map(widget => {
      // Mobile-first minimum sizes - standardized to 2 heights for clean layout
      const minSizes: { [key: string]: { w: number; h: number } } = {
        'welcome': { w: 2, h: 3 },
        'stats': { w: 2, h: 3 },
        'quick-capture': { w: 2, h: 4 },
        'recent-cards': { w: 2, h: 4 },
        'recent-notes': { w: 2, h: 4 },
        'content-summarizer': { w: 2, h: 4 },
        'task-manager': { w: 2, h: 4 },
        'task-tracker': { w: 2, h: 4 },
        'favorites': { w: 2, h: 4 },
        'calendar-events': { w: 2, h: 4 },
        'habit-tracker': { w: 2, h: 3 },
        'weather': { w: 2, h: 3 },
        'quotes': { w: 2, h: 3 },
        'notebook-list': { w: 2, h: 4 },
        'activity-feed': { w: 2, h: 4 }
      };
      
      const minSize = minSizes[widget.type] || { w: 2, h: 3 };
      
      return {
        i: widget.id,
        x: widget.position.x,
        y: widget.position.y,
        w: Math.max(widget.position.w, minSize.w),
        h: Math.max(widget.position.h, minSize.h),
        minW: minSize.w,
        minH: minSize.h,
        maxW: 12,
        maxH: 12,
      };
    });
  }, []);

  // Convert grid layout back to widgets
  const convertLayoutToWidgets = useCallback((layout: Layout[], originalWidgets: DashboardWidget[]): DashboardWidget[] => {
    return originalWidgets.map(widget => {
      const layoutItem = layout.find(item => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          position: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          }
        };
      }
      return widget;
    });
  }, []);

  useEffect(() => {
    const initialLayout = convertWidgetsToLayout(widgets);
    setLayouts({
      lg: initialLayout,
      md: initialLayout,
      sm: initialLayout,
      xs: initialLayout,
      xxs: initialLayout,
    });
  }, [widgets, convertWidgetsToLayout]);

  const handleLayoutChange = (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    if (isLocked) return;

    setLayouts(allLayouts);
    
    // Update widgets with new positions
    const updatedWidgets = convertLayoutToWidgets(layout, widgets);
    onLayoutChange(updatedWidgets);
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
    toast.success(isLocked ? 'Grid unlocked - you can now resize and move widgets' : 'Grid locked - widgets are now fixed in place');
  };

  const resetLayout = () => {
    // Create a clean, professional layout inspired by modern productivity apps
    const createOptimizedLayout = () => {
      const arranged: DashboardWidget[] = [];
      
      // Priority groups with intentional visual hierarchy
      const layoutGroups = [
        // Hero: Welcome banner (full width)
        { widgets: ['welcome'], layout: [{ w: 12, h: 3 }] },
        
        // Quick Actions: Primary interaction area
        { widgets: ['quick-capture', 'stats'], layout: [{ w: 8, h: 4 }, { w: 4, h: 4 }] },
        
        // Recent Activity: Two equal columns
        { widgets: ['recent-cards', 'recent-notes'], layout: [{ w: 6, h: 4 }, { w: 6, h: 4 }] },
        
        // Productivity: Three equal columns
        { widgets: ['task-tracker', 'task-manager', 'calendar-events'], layout: [{ w: 4, h: 4 }, { w: 4, h: 4 }, { w: 4, h: 4 }] },
        
        // Knowledge: Two equal columns
        { widgets: ['notebook-list', 'favorites'], layout: [{ w: 6, h: 4 }, { w: 6, h: 4 }] },
        
        // Tools: Asymmetric for visual interest
        { widgets: ['content-summarizer', 'habit-tracker'], layout: [{ w: 8, h: 4 }, { w: 4, h: 4 }] },
        
        // Insights: Compact info widgets
        { widgets: ['weather', 'quotes'], layout: [{ w: 4, h: 3 }, { w: 8, h: 3 }] },
        
        // Footer: Full width activity
        { widgets: ['activity-feed'], layout: [{ w: 12, h: 4 }] }
      ];
      
      let currentY = 0;
      
      layoutGroups.forEach(group => {
        let x = 0;
        group.widgets.forEach((widgetType, index) => {
          const widget = widgets.find(w => w.type === widgetType);
          if (widget) {
            const size = group.layout[index];
            arranged.push({
              ...widget,
              position: { x, y: currentY, w: size.w, h: size.h }
            });
            x += size.w;
          }
        });
        // Move to next row (use max height from group)
        const maxHeight = Math.max(...group.layout.map(l => l.h));
        currentY += maxHeight;
      });
      
      return arranged;
    };
    
    const optimizedLayout = createOptimizedLayout();
    onLayoutChange(optimizedLayout);
    toast.success('Dashboard optimized with professional layout');
  };

  const visibleWidgets = widgets.filter(w => w.isVisible);

  return (
    <div className={`w-full ${className}`}>
      {/* Grid Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={isLocked ? "default" : "outline"}
            size="sm"
            onClick={toggleLock}
            className="flex items-center gap-2 h-8 text-xs"
          >
            {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            <span className="hidden sm:inline">{isLocked ? 'Locked' : 'Unlocked'}</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetLayout}
            className="flex items-center gap-2 h-8 text-xs"
          >
            <Grid3X3 className="h-3 w-3" />
            <span className="hidden sm:inline">Optimize</span>
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground hidden md:block">
          {isLocked ? 'Widgets locked' : 'Drag to move, resize from corners'}
        </div>
      </div>

      {/* Responsive Grid */}
      <div className="animate-fade-in">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          onLayoutChange={handleLayoutChange}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          isDraggable={isDraggable && !isLocked}
          isResizable={isResizable && !isLocked}
          compactType="vertical"
          preventCollision={false}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
          transformScale={1}
          isBounded={false}
        >
          {visibleWidgets.map((widget, index) => (
            <div 
              key={widget.id} 
              className="grid-item"
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              {children(widget)}
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}