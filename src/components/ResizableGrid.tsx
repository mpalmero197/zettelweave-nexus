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
    // Create a clean, mobile-first layout
    const createOptimizedLayout = () => {
      const arranged: DashboardWidget[] = [];
      let currentY = 0;
      
      // Priority order for widgets
      const priority: { [key: string]: number } = {
        'welcome': 1,
        'stats': 2,
        'quick-capture': 3,
        'recent-cards': 4,
        'recent-notes': 5,
        'content-summarizer': 6,
        'task-tracker': 7,
        'favorites': 8,
        'calendar-events': 9,
        'habit-tracker': 10,
        'weather': 11,
        'quotes': 12,
        'notebook-list': 13,
        'task-manager': 14,
        'activity-feed': 15
      };
      
      // Optimal sizes for each widget type (desktop) - standardized heights
      const optimalSizes: { [key: string]: { w: number; h: number } } = {
        'welcome': { w: 12, h: 3 },
        'stats': { w: 12, h: 3 },
        'quick-capture': { w: 6, h: 4 },
        'recent-cards': { w: 6, h: 4 },
        'recent-notes': { w: 6, h: 4 },
        'content-summarizer': { w: 6, h: 4 },
        'task-tracker': { w: 4, h: 4 },
        'favorites': { w: 4, h: 4 },
        'calendar-events': { w: 4, h: 4 },
        'habit-tracker': { w: 4, h: 4 },
        'weather': { w: 4, h: 4 },
        'quotes': { w: 4, h: 4 },
        'notebook-list': { w: 6, h: 4 },
        'task-manager': { w: 6, h: 4 },
        'activity-feed': { w: 12, h: 4 }
      };
      
      // Sort by priority
      const sorted = [...widgets].sort((a, b) => 
        (priority[a.type] || 100) - (priority[b.type] || 100)
      );
      
      // Layout rows
      const rows: DashboardWidget[][] = [];
      let currentRow: DashboardWidget[] = [];
      let currentRowWidth = 0;
      const COLS = 12;
      
      sorted.forEach((widget) => {
        const size = optimalSizes[widget.type] || { w: 4, h: 3 };
        
        // Check if widget fits in current row
        if (currentRowWidth + size.w > COLS && currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
          currentRowWidth = 0;
        }
        
        currentRow.push({
          ...widget,
          position: { x: currentRowWidth, y: currentY, w: size.w, h: size.h }
        });
        currentRowWidth += size.w;
      });
      
      // Add last row
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      
      // Position all widgets
      currentY = 0;
      rows.forEach(row => {
        let x = 0;
        const maxHeight = Math.max(...row.map(w => w.position.h));
        
        row.forEach(widget => {
          widget.position.x = x;
          widget.position.y = currentY;
          widget.position.h = maxHeight; // Normalize row height
          arranged.push(widget);
          x += widget.position.w;
        });
        
        currentY += maxHeight;
      });
      
      return arranged;
    };
    
    const optimizedLayout = createOptimizedLayout();
    onLayoutChange(optimizedLayout);
    toast.success('Dashboard layout optimized');
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
        {visibleWidgets.map((widget) => (
          <div key={widget.id} className="grid-item">
            {children(widget)}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}