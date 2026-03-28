import { useState } from 'react';
import { Play, Pause, Focus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFocusState } from './useFocusState';
import { MobileFocusSheet } from './MobileFocusSheet';

export function FocusMiniPill() {
  const isMobile = useIsMobile();
  const { isRunning, seconds, mode, activeTaskId, tasks, start, pause } = useFocusState();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!isMobile || !isRunning) return null;

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const activeTask = tasks.find(t => t.id === activeTaskId);

  const modeColors = {
    work: 'hsl(var(--primary))',
    'short-break': 'hsl(142 71% 45%)',
    'long-break': 'hsl(200 15% 50%)',
  };

  return (
    <>
      <div
        className="md:hidden fixed top-14 left-3 right-3 z-[55] flex items-center gap-3 px-3 py-2 rounded-xl backdrop-blur-xl border border-border/50 shadow-lg"
        style={{
          background: 'hsl(var(--card) / 0.9)',
        }}
        onClick={() => setSheetOpen(true)}
        role="button"
        aria-label="Open focus timer"
      >
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${modeColors[mode]}20` }}
        >
          <Focus className="h-4 w-4" style={{ color: modeColors[mode] }} />
        </div>

        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-mono font-bold tracking-wider"
            style={{ color: modeColors[mode] }}
          >
            {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          {activeTask && (
            <p className="text-[11px] text-muted-foreground truncate">{activeTask.title}</p>
          )}
        </div>

        <button
          className="h-10 w-10 rounded-xl flex items-center justify-center bg-accent/50 active:scale-90 transition-transform touch-manipulation"
          onClick={(e) => {
            e.stopPropagation();
            isRunning ? pause() : start();
          }}
          aria-label={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? (
            <Pause className="h-4 w-4 text-foreground" />
          ) : (
            <Play className="h-4 w-4 text-foreground" />
          )}
        </button>
      </div>

      <MobileFocusSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
