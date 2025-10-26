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
    // Auto-arrange to fill full width with optimized layout
    const autoArrangeWidgets = () => {
      const sorted = [...widgets].sort((a, b) => {
        // Prioritize larger widgets first for better packing
        const sizeA = (a.position?.w || 4) * (a.position?.h || 3);
        const sizeB = (b.position?.w || 4) * (b.position?.h || 3);
        return sizeB - sizeA;
      });

      const arranged: DashboardWidget[] = [];
      const grid: boolean[][] = Array(100).fill(null).map(() => Array(12).fill(false));
      
      sorted.forEach(widget => {
        const w = Math.max(widget.position?.w || 4, widget.type === 'welcome' || widget.type === 'stats' ? 4 : 3);
        const h = Math.max(widget.position?.h || 3, widget.type === 'welcome' ? 3 : 3);
        
        // Find best position that fits
        let placed = false;
        for (let y = 0; y < 100 && !placed; y++) {
          for (let x = 0; x <= 12 - w && !placed; x++) {
            // Check if space is available
            let canPlace = true;
            for (let dy = 0; dy < h && canPlace; dy++) {
              for (let dx = 0; dx < w && canPlace; dx++) {
                if (grid[y + dy]?.[x + dx]) {
                  canPlace = false;
                }
              }
            }
            
            if (canPlace) {
              // Mark space as occupied
              for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < w; dx++) {
                  grid[y + dy][x + dx] = true;
                }
              }
              
              arranged.push({
                ...widget,
                position: { x, y, w, h }
              });
              placed = true;
            }
          }
        }
      });
      
      return arranged;
    };
    
    const arrangedWidgets = autoArrangeWidgets();
    onLayoutChange(arrangedWidgets);
    toast.success('Layout auto-arranged to fill width');
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
        compactType="horizontal"
        preventCollision={false}
        margin={[12, 12]}
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