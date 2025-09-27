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
  const [isLocked, setIsLocked] = useState(false);
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});

  // Convert widgets to grid layout format
  const convertWidgetsToLayout = useCallback((widgets: DashboardWidget[]): Layout[] => {
    return widgets.map(widget => {
      // Set minimum sizes based on widget type for better readability
      const minW = widget.type === 'welcome' || widget.type === 'stats' ? 4 : 
                   widget.type === 'quick-capture' ? 6 : 3;
      const minH = widget.type === 'welcome' ? 3 : 
                   widget.type === 'quick-capture' ? 4 : 3;
      
      return {
        i: widget.id,
        x: widget.position.x,
        y: widget.position.y,
        w: Math.max(widget.position.w, minW),
        h: Math.max(widget.position.h, minH),
        minW,
        minH,
        maxW: 12,
        maxH: 8,
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
    // Reset to default positions with better spacing
    const resetWidgets = widgets.map((widget, index) => {
      const positions = [
        { x: 0, y: 0, w: 6, h: 3 }, // welcome
        { x: 6, y: 0, w: 6, h: 3 }, // stats  
        { x: 0, y: 3, w: 8, h: 4 }, // quick-capture
        { x: 8, y: 3, w: 4, h: 4 }, // recent-cards
        { x: 0, y: 7, w: 4, h: 4 }, // recent-notes
        { x: 4, y: 7, w: 4, h: 4 }, // additional widgets
        { x: 8, y: 7, w: 4, h: 4 },
        { x: 0, y: 11, w: 6, h: 3 },
        { x: 6, y: 11, w: 6, h: 3 },
      ];
      
      const defaultPos = positions[index] || { x: (index % 4) * 3, y: Math.floor(index / 4) * 4, w: 3, h: 4 };
      
      return {
        ...widget,
        position: defaultPos
      };
    });
    
    onLayoutChange(resetWidgets);
    toast.success('Layout reset to spacious default positions');
  };

  const visibleWidgets = widgets.filter(w => w.isVisible);

  return (
    <div className={`w-full ${className}`}>
      {/* Grid Controls */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={isLocked ? "default" : "outline"}
          size="sm"
          onClick={toggleLock}
          className="flex items-center gap-2"
        >
          {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          {isLocked ? 'Locked' : 'Unlocked'}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={resetLayout}
          className="flex items-center gap-2"
        >
          <Grid3X3 className="h-4 w-4" />
          Reset Layout
        </Button>
        
        <div className="text-xs text-muted-foreground">
          {isLocked ? 'Widgets are locked in place' : 'Drag to move, resize from corners'}
        </div>
      </div>

      {/* Responsive Grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 8, xs: 6, xxs: 4 }}
        rowHeight={80}
        isDraggable={isDraggable && !isLocked}
        isResizable={isResizable && !isLocked}
        compactType="vertical"
        preventCollision={false}
        margin={[20, 20]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        transformScale={1}
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