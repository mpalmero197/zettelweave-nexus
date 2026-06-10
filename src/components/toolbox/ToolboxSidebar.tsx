import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ChevronLeft, ChevronRight, Timer, ListTodo, Wand2, Bot } from 'lucide-react';
import { useFocusState } from '@/components/focus-sidebar/useFocusState';
import { useIsMobile } from '@/hooks/use-mobile';
import { FocusPanel } from './FocusPanel';
import { TasksPanel } from './TasksPanel';
import { AIModifyPanel } from './AIModifyPanel';
import { MacrosPanel } from './MacrosPanel';
import { cn } from '@/lib/utils';

export type ToolboxTab = 'focus' | 'tasks' | 'ai-modify' | 'macros';

interface ToolboxSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: ToolboxTab;
}

const TABS: { id: ToolboxTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'focus', label: 'Focus', icon: Timer },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'ai-modify', label: 'AI Modify', icon: Wand2 },
];

export function ToolboxSidebar({ open, onOpenChange, initialTab = 'focus' }: ToolboxSidebarProps) {
  const isMobile = useIsMobile();
  return isMobile
    ? <ToolboxMobileSheet open={open} onOpenChange={onOpenChange} initialTab={initialTab} />
    : <ToolboxSidebarInner open={open} onOpenChange={onOpenChange} initialTab={initialTab} />;
}

function ToolboxMobileSheet({ open, onOpenChange, initialTab }: ToolboxSidebarProps) {
  const [activeTab, setActiveTab] = useState<ToolboxTab>(initialTab || 'focus');

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as ToolboxTab;
      if (tab) {
        setActiveTab(tab);
        onOpenChange(true);
      }
    };
    window.addEventListener('toolbox-open', handler);
    return () => window.removeEventListener('toolbox-open', handler);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 w-full sm:max-w-md flex flex-row gap-0">
        <div className="flex flex-col items-center py-3 gap-1 bg-muted/30 border-r border-border/50 shrink-0 w-12">
          {TABS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant="ghost"
              size="sm"
              className={cn(
                "h-10 w-10 p-0 rounded-lg",
                activeTab === id
                  ? "bg-primary/15 text-primary hover:bg-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              onClick={() => setActiveTab(id)}
              aria-label={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden pt-10">
          {activeTab === 'focus' && <FocusPanel />}
          {activeTab === 'tasks' && <TasksPanel />}
          {activeTab === 'ai-modify' && <AIModifyPanel />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToolboxSidebarInner({ open, onOpenChange, initialTab }: ToolboxSidebarProps) {
  const { isRunning, mode } = useFocusState();
  const [activeTab, setActiveTab] = useState<ToolboxTab>(initialTab || 'focus');
  const [snappedSide, setSnappedSide] = useState<'left' | 'right'>('right');
  const [collapsed, setCollapsed] = useState(!open);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapped, setIsSnapped] = useState(true);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const sidebarRef = useRef<HTMLDivElement>(null);

  const RAIL_WIDTH = 48;
  const PANEL_WIDTH = 360;
  const WIDTH = RAIL_WIDTH + PANEL_WIDTH;
  const EDGE_HANDLE = 5;
  const SNAP_THRESHOLD = 20;

  useEffect(() => { setCollapsed(!open); }, [open]);

  // Listen for external requests to switch panels (e.g. from header buttons)
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as ToolboxTab;
      if (tab) {
        setActiveTab(tab);
        setCollapsed(false);
        onOpenChange(true);
      }
    };
    window.addEventListener('toolbox-open', handler);
    return () => window.removeEventListener('toolbox-open', handler);
  }, [onOpenChange]);

  useEffect(() => {
    const root = document.documentElement;
    if (!collapsed && isSnapped) {
      root.style.setProperty('--focus-sidebar-ml', snappedSide === 'left' ? `${WIDTH}px` : '0px');
      root.style.setProperty('--focus-sidebar-mr', snappedSide === 'right' ? `${WIDTH}px` : '0px');
    } else {
      root.style.setProperty('--focus-sidebar-ml', '0px');
      root.style.setProperty('--focus-sidebar-mr', '0px');
    }
    return () => {
      root.style.setProperty('--focus-sidebar-ml', '0px');
      root.style.setProperty('--focus-sidebar-mr', '0px');
    };
  }, [collapsed, isSnapped, snappedSide, WIDTH]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea, [role="checkbox"], [role="slider"], [role="tab"], [data-no-drag]')) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y };
    if (isSnapped) setIsSnapped(false);
  }, [position, isSnapped]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    };
    const onUp = (e: MouseEvent) => {
      setIsDragging(false);
      if (e.clientX < SNAP_THRESHOLD) { setIsSnapped(true); setSnappedSide('left'); setPosition({ x: 0, y: 0 }); }
      else if (e.clientX > window.innerWidth - SNAP_THRESHOLD) { setIsSnapped(true); setSnappedSide('right'); setPosition({ x: 0, y: 0 }); }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isDragging]);

  const pulseClass = isRunning && mode === 'work' ? 'animate-[focus-pulse_2s_ease-in-out_infinite]' : '';

  if (collapsed) {
    return (
      <div
        className="fixed top-0 z-[9999] h-full cursor-pointer transition-all group"
        style={{
          width: EDGE_HANDLE,
          [snappedSide]: 0,
          background: isRunning
            ? 'linear-gradient(180deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--primary) / 0.05) 100%)'
            : 'hsl(var(--foreground) / 0.05)',
        }}
        onClick={() => { setCollapsed(false); onOpenChange(true); }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ [snappedSide === 'right' ? 'left' : 'right']: -16 }}>
          {snappedSide === 'right'
            ? <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </div>
    );
  }

  const sidebarStyle: React.CSSProperties = isSnapped
    ? { position: 'fixed', top: 0, [snappedSide]: 0, width: WIDTH, height: '100vh', zIndex: 9998 }
    : { position: 'fixed', left: position.x, top: position.y, width: WIDTH, height: 'calc(100vh - 16px)', zIndex: 9998 };

  // Rail goes on the inner edge (toward the screen center)
  const railOnRight = snappedSide === 'left';

  return (
    <div
      ref={sidebarRef}
      className={cn("flex overflow-hidden select-none bg-card border-border shadow-2xl", pulseClass)}
      style={{
        ...sidebarStyle,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderLeft: isSnapped && snappedSide === 'right' ? '1px solid hsl(var(--border))' : undefined,
        borderRight: isSnapped && snappedSide === 'left' ? '1px solid hsl(var(--border))' : undefined,
        border: !isSnapped ? '1px solid hsl(var(--border))' : undefined,
        borderRadius: !isSnapped ? 16 : 0,
        cursor: isDragging ? 'grabbing' : 'default',
        flexDirection: railOnRight ? 'row-reverse' : 'row',
        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseDown={onMouseDown}
    >
      {/* Vertical icon rail */}
      <div
        className="flex flex-col items-center py-3 gap-1 bg-muted/30 border-border shrink-0"
        style={{
          width: RAIL_WIDTH,
          borderRight: railOnRight ? undefined : '1px solid hsl(var(--border) / 0.5)',
          borderLeft: railOnRight ? '1px solid hsl(var(--border) / 0.5)' : undefined,
        }}
        data-no-drag
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 w-9 p-0 rounded-lg relative",
              activeTab === id
                ? "bg-primary/15 text-primary hover:bg-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            onClick={() => setActiveTab(id)}
            title={label}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
            {activeTab === id && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-5 w-0.5 bg-primary rounded-full"
                style={{ [railOnRight ? 'right' : 'left']: -1 }}
              />
            )}
          </Button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Collapse button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setCollapsed(true); onOpenChange(false); }}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Collapse"
          aria-label="Collapse toolbox"
        >
          {snappedSide === 'right'
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Active panel */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ width: PANEL_WIDTH }} data-no-drag>
        {activeTab === 'focus' && <FocusPanel />}
        {activeTab === 'tasks' && <TasksPanel />}
        {activeTab === 'ai-modify' && <AIModifyPanel />}
      </div>
    </div>
  );
}
