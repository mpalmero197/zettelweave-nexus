import { useState, Suspense, lazy } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ZettelCard as ZettelCardType } from '@/types/zettel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pen, GitBranch, Layout } from 'lucide-react';
import { FastLoadingFallback } from '@/components/FastLoadingFallback';
import { cn } from '@/lib/utils';
import { MobileWhiteboard } from '@/components/MobileWhiteboard';

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
      {/* Mode Switcher */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
        <Layout className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground mr-2">Canvas Studio</span>
        
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <button
            className={cn(
              "h-7 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all",
              mode === 'mindmap' 
                ? "bg-card text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode('mindmap')}
          >
            <GitBranch className="h-3.5 w-3.5" />
            Mind Map
          </button>
          <button
            className={cn(
              "h-7 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all",
              mode === 'draw' 
                ? "bg-card text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode('draw')}
          >
            <Pen className="h-3.5 w-3.5" />
            Whiteboard
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
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
