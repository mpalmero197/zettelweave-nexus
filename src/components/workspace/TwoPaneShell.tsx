import { ReactNode } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface TwoPaneShellProps {
  list: ReactNode;
  detail: ReactNode;
  mobileView?: 'list' | 'detail';
  defaultListSize?: number;
  minListSize?: number;
  maxListSize?: number;
  className?: string;
  /** Tailwind height class. Default tuned for app chrome. */
  heightClassName?: string;
}

/**
 * Shared shell for two-pane layouts (Notes, Cards, Catalyst reference).
 * - Desktop: resizable horizontal split
 * - Mobile: sliding list/detail viewport
 */
export function TwoPaneShell({
  list,
  detail,
  mobileView = 'list',
  defaultListSize = 32,
  minListSize = 22,
  maxListSize = 50,
  className,
  heightClassName = 'h-[calc(100dvh-7rem-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4.5rem)]',
}: TwoPaneShellProps) {
  const isMobile = useIsMobile();

  const frame = cn(
    'rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden',
    'shadow-[0_1px_0_hsl(var(--border)/0.4),0_20px_60px_-30px_hsl(var(--primary)/0.25)]',
    className,
  );

  if (isMobile) {
    return (
      <div className={heightClassName}>
        <div className={cn('relative h-full', frame)}>
          <div
            className="flex h-full w-[200%] transition-transform duration-300 ease-out"
            style={{ transform: mobileView === 'list' ? 'translateX(0)' : 'translateX(-50%)' }}
          >
            <div className="w-1/2 h-full">{list}</div>
            <div className="w-1/2 h-full">{detail}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={heightClassName}>
      <ResizablePanelGroup direction="horizontal" className={cn('h-full', frame)}>
        <ResizablePanel defaultSize={defaultListSize} minSize={minListSize} maxSize={maxListSize}>
          {list}
        </ResizablePanel>
        <ResizableHandle className="w-px bg-border/40 hover:bg-primary/40 transition-colors data-[resize-handle-state=hover]:bg-primary/60" />
        <ResizablePanel defaultSize={100 - defaultListSize} minSize={40}>
          {detail}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
