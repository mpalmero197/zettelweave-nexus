import { useState, Suspense, lazy } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ZettelCard as ZettelCardType } from '@/types/zettel';
import { Pen, GitBranch, Layout } from 'lucide-react';
import { FastLoadingFallback } from '@/components/FastLoadingFallback';
import { cn } from '@/lib/utils';
import { MobileWhiteboard } from '@/components/MobileWhiteboard';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const MindMap = lazy(() => import('@/components/MindMap'));
const DesktopWhiteboard = lazy(() => import('@/components/DesktopWhiteboard').then(m => ({ default: m.DesktopWhiteboard })));

interface CanvasStudioProps {
  cards?: ZettelCardType[];
  onCardSelect?: (card: ZettelCardType) => void;
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
}

export default function CanvasStudio({ cards = [], onCardSelect, onCreateCard }: CanvasStudioProps) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<'mindmap' | 'draw'>('mindmap');

  return (
    <div className="h-full w-full flex flex-col">
      {/* Mode Switcher — compact on mobile */}
      <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
        {!isMobile && (
          <>
            <Layout className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground mr-2">Canvas Studio</span>
          </>
        )}

        <TooltipProvider delayDuration={300}>
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "rounded-md flex items-center gap-1.5 transition-all",
                    isMobile
                      ? "h-8 w-8 justify-center"
                      : "h-7 px-3 text-xs font-medium",
                    mode === 'mindmap'
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setMode('mindmap')}
                >
                  <GitBranch className={cn(isMobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
                  {!isMobile && "Mind Map"}
                </button>
              </TooltipTrigger>
              {isMobile && <TooltipContent side="bottom"><p>Mind Map</p></TooltipContent>}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "rounded-md flex items-center gap-1.5 transition-all",
                    isMobile
                      ? "h-8 w-8 justify-center"
                      : "h-7 px-3 text-xs font-medium",
                    mode === 'draw'
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setMode('draw')}
                >
                  <Pen className={cn(isMobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
                  {!isMobile && "Whiteboard"}
                </button>
              </TooltipTrigger>
              {isMobile && <TooltipContent side="bottom"><p>Whiteboard</p></TooltipContent>}
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Mobile mode label */}
        {isMobile && (
          <span className="text-[11px] font-medium text-foreground">
            {mode === 'mindmap' ? 'Mind Map' : 'Whiteboard'}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {mode === 'mindmap' ? (
          <Suspense fallback={<FastLoadingFallback message="Loading mind map..." />}>
            <MindMap
              cards={cards}
              onCardSelect={onCardSelect}
              onCreateCard={(partial) => {
                onCreateCard({
                  number: partial.number || `MM-${Date.now()}`,
                  title: partial.title || 'Untitled',
                  content: partial.content || '',
                  category: partial.category || '000',
                  tags: partial.tags || [],
                  linkedCards: partial.linkedCards || [],
                });
              }}
            />
          </Suspense>
        ) : (
          isMobile ? (
            <MobileWhiteboard />
          ) : (
            <Suspense fallback={<FastLoadingFallback message="Loading whiteboard..." />}>
              <DesktopWhiteboard onCreateCard={onCreateCard} />
            </Suspense>
          )
        )}
      </div>
    </div>
  );
}
