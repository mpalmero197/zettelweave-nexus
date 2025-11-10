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
    // Improved masonry-style layout that fills width evenly
    const autoArrangeWidgets = () => {
      const COLS = 12;
      const arranged: DashboardWidget[] = [];
      let currentY = 0;
      let currentRow: DashboardWidget[] = [];
      let currentRowWidth = 0;
      
      // Sort widgets by priority (important ones first)
      const sorted = [...widgets].sort((a, b) => {
        const priority: { [key: string]: number } = {
          'welcome': 1,
          'stats': 2,
          'quick-capture': 3,
          'recent-cards': 4,
          'recent-notes': 5
        };
        return (priority[a.type] || 100) - (priority[b.type] || 100);
      });
      
      sorted.forEach((widget, index) => {
        // Determine optimal widget size based on type and content
        let w = widget.position?.w || 6;
        let h = widget.position?.h || 3;
        
        // Set minimum readable sizes
        const minSizes: { [key: string]: { w: number; h: number } } = {
          'welcome': { w: 6, h: 3 },
          'stats': { w: 6, h: 3 },
          'quick-capture': { w: 6, h: 4 },
          'recent-cards': { w: 6, h: 4 },
          'recent-notes': { w: 6, h: 4 },
          'content-summarizer': { w: 6, h: 4 },
          'task-manager': { w: 6, h: 4 },
          'habit-tracker': { w: 4, h: 3 },
          'calendar-events': { w: 4, h: 3 },
          'weather': { w: 4, h: 3 },
          'quotes': { w: 4, h: 3 },
        };
        
        const minSize = minSizes[widget.type] || { w: 4, h: 3 };
        w = Math.max(w, minSize.w);
        h = Math.max(h, minSize.h);
        
        // Check if widget fits in current row
        if (currentRowWidth + w > COLS) {
          // Distribute current row to fill width evenly
          if (currentRow.length > 0) {
            const totalWidth = currentRow.reduce((sum, w) => sum + w.position.w, 0);
            const remainingSpace = COLS - totalWidth;
            
            if (remainingSpace > 0 && currentRow.length > 0) {
              // Distribute extra space proportionally
              const extraPerWidget = Math.floor(remainingSpace / currentRow.length);
              const remainder = remainingSpace % currentRow.length;
              
              let xOffset = 0;
              currentRow.forEach((widget, i) => {
                const extraWidth = extraPerWidget + (i < remainder ? 1 : 0);
                widget.position.w += extraWidth;
                widget.position.x = xOffset;
                xOffset += widget.position.w;
              });
            } else {
              // Just position them normally
              let xOffset = 0;
              currentRow.forEach(widget => {
                widget.position.x = xOffset;
                xOffset += widget.position.w;
              });
            }
            
            // Normalize heights in row for visual consistency
            const maxHeight = Math.max(...currentRow.map(w => w.position.h));
            currentRow.forEach(widget => {
              widget.position.h = maxHeight;
            });
            
            arranged.push(...currentRow);
            currentY += maxHeight;
            currentRow = [];
            currentRowWidth = 0;
          }
        }
        
        // Add widget to current row
        currentRow.push({
          ...widget,
          position: {
            x: currentRowWidth,
            y: currentY,
            w,
            h
          }
        });
        currentRowWidth += w;
        
        // If this is the last widget, flush the row
        if (index === sorted.length - 1 && currentRow.length > 0) {
          const totalWidth = currentRow.reduce((sum, w) => sum + w.position.w, 0);
          const remainingSpace = COLS - totalWidth;
          
          if (remainingSpace > 0) {
            const extraPerWidget = Math.floor(remainingSpace / currentRow.length);
            const remainder = remainingSpace % currentRow.length;
            
            let xOffset = 0;
            currentRow.forEach((widget, i) => {
              const extraWidth = extraPerWidget + (i < remainder ? 1 : 0);
              widget.position.w += extraWidth;
              widget.position.x = xOffset;
              xOffset += widget.position.w;
            });
          } else {
            let xOffset = 0;
            currentRow.forEach(widget => {
              widget.position.x = xOffset;
              xOffset += widget.position.w;
            });
          }
          
          // Normalize heights in row
          const maxHeight = Math.max(...currentRow.map(w => w.position.h));
          currentRow.forEach(widget => {
            widget.position.h = maxHeight;
          });
          
          arranged.push(...currentRow);
        }
      });
      
      return arranged;
    };
    
    const arrangedWidgets = autoArrangeWidgets();
    onLayoutChange(arrangedWidgets);
    toast.success('Dashboard optimized for readability');
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
        cols={{ lg: 12, md: 12, sm: 8, xs: 4, xxs: 2 }}
        rowHeight={100}
        isDraggable={isDraggable && !isLocked}
        isResizable={isResizable && !isLocked}
        compactType={null}
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