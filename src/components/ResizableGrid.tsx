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
    return widgets.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.position.w,
      h: widget.position.h,
      minW: 1,
      minH: 1,
      maxW: 12,
      maxH: 6,
    }));
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
    // Reset to default positions
    const resetWidgets = widgets.map((widget, index) => ({
      ...widget,
      position: {
        x: (index % 6) * 2,
        y: Math.floor(index / 6) * 3,
        w: 2,
        h: 3,
      }
    }));
    
    onLayoutChange(resetWidgets);
    toast.success('Layout reset to default positions');
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
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        isDraggable={isDraggable && !isLocked}
        isResizable={isResizable && !isLocked}
        compactType="vertical"
        preventCollision={false}
        margin={[16, 16]}
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