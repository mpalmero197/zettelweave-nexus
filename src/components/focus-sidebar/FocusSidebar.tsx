import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Play, Pause, RotateCcw, Target, Coffee, ChevronLeft, ChevronRight,
  BellOff, Timer, Volume2, SkipForward, X,
} from 'lucide-react';
import { FocusTimerRing } from './FocusTimerRing';
import { FocusTaskList, FocusTask } from './FocusTaskList';
import { FocusReadingView } from './FocusReadingView';
import { FocusStatsPanel } from './FocusStatsPanel';
import { FocusSessionLog } from './FocusSessionLog';
import { FocusAmbientSound } from './FocusAmbientSound';
import { useFocusState } from './useFocusState';
import { useZettelCards } from '@/hooks/useZettelCards';
import { ZettelCard } from '@/types/zettel';
import { useIsMobile } from '@/hooks/use-mobile';

const DURATION_OPTIONS = [15, 20, 25, 30, 45, 60];
const AMBIENT_OPTIONS = [
  { value: 'none', label: 'Off' },
  { value: 'white-noise', label: 'White Noise' },
  { value: 'brown-noise', label: 'Brown Noise' },
  { value: 'rain', label: 'Rain' },
  { value: 'binaural', label: 'Binaural' },
];

interface FocusSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FocusSidebar({ open, onOpenChange }: FocusSidebarProps) {
  const isMobile = useIsMobile();
  if (isMobile) return null;
  return <FocusSidebarInner open={open} onOpenChange={onOpenChange} />;
}

function FocusSidebarInner({ open, onOpenChange }: FocusSidebarProps) {
  const {
    tasks, setTasks, activeTaskId, setActiveTaskId,
    mode, seconds, totalSeconds, isRunning, cycle, dndActive,
    start, pause, reset, changeMode, setCustomDuration,
    autoStart, setAutoStart, autoStartCountdown, cancelAutoStart,
    ambientSound, setAmbientSound, ambientVolume, setAmbientVolume,
    sessionHistory, dailyStats, dailyGoal, setDailyGoal,
    pendingNote, addNoteToLastSession, dismissNote,
  } = useFocusState();

  const { cards } = useZettelCards();
  const [notes, setNotes] = useState<any[]>([]);
  const [showDurations, setShowDurations] = useState(false);
  const [sessionNote, setSessionNote] = useState('');

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('notes')
          .select('id, title, content, tags')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(50);
        if (data) setNotes(data);
      } catch {}
    };
    fetchNotes();
  }, []);

  const [snappedSide, setSnappedSide] = useState<'left' | 'right'>('right');
  const [collapsed, setCollapsed] = useState(!open);
  const [readingCard, setReadingCard] = useState<ZettelCard | null>(null);
  const [readingNote, setReadingNote] = useState<any>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapped, setIsSnapped] = useState(true);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const sidebarRef = useRef<HTMLDivElement>(null);

  const WIDTH = 350;
  const EDGE_HANDLE = 5;
  const SNAP_THRESHOLD = 20;

  useEffect(() => { setCollapsed(!open); }, [open]);

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
  }, [collapsed, isSnapped, snappedSide]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, [role="checkbox"], [role="slider"]')) return;
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

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, [role="checkbox"], [role="slider"]')) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStart.current = { x: touch.clientX, y: touch.clientY, px: position.x, py: position.y };
    if (isSnapped) setIsSnapped(false);
  }, [position, isSnapped]);

  useEffect(() => {
    if (!isDragging) return;
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.current.x;
      const dy = touch.clientY - dragStart.current.y;
      setPosition({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    };
    const onTouchEnd = (e: TouchEvent) => {
      setIsDragging(false);
      const touch = e.changedTouches[0];
      if (touch.clientX < SNAP_THRESHOLD) { setIsSnapped(true); setSnappedSide('left'); setPosition({ x: 0, y: 0 }); }
      else if (touch.clientX > window.innerWidth - SNAP_THRESHOLD) { setIsSnapped(true); setSnappedSide('right'); setPosition({ x: 0, y: 0 }); }
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => { document.removeEventListener('touchmove', onTouchMove); document.removeEventListener('touchend', onTouchEnd); };
  }, [isDragging]);

  const pulseClass = isRunning && mode === 'work' ? 'animate-[focus-pulse_2s_ease-in-out_infinite]' : '';

  // Collapsed edge handle
  if (collapsed) {
    return (
      <div
        className="fixed top-0 z-[9999] h-full cursor-pointer transition-all group"
        style={{
          width: EDGE_HANDLE,
          [snappedSide]: 0,
          background: isRunning
            ? 'linear-gradient(180deg, rgba(56,189,248,0.3) 0%, rgba(56,189,248,0.05) 100%)'
            : 'rgba(255,255,255,0.05)',
        }}
        onClick={() => { setCollapsed(false); onOpenChange(true); }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ [snappedSide === 'right' ? 'left' : 'right']: -16 }}>
          {snappedSide === 'right'
            ? <ChevronLeft className="h-4 w-4 text-white/50" />
            : <ChevronRight className="h-4 w-4 text-white/50" />
          }
        </div>
      </div>
    );
  }

  const sidebarStyle: React.CSSProperties = isSnapped
    ? { position: 'fixed', top: 0, [snappedSide]: 0, width: WIDTH, height: '100vh', zIndex: 9998 }
    : { position: 'fixed', left: position.x, top: position.y, width: WIDTH, height: 'auto', maxHeight: '100vh', zIndex: 9998 };

  return (
    <div
      ref={sidebarRef}
      className={`flex flex-col overflow-hidden select-none ${pulseClass}`}
      style={{
        ...sidebarStyle,
        background: 'rgba(15,15,15,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderLeft: isSnapped && snappedSide === 'right' ? '1px solid rgba(255,255,255,0.06)' : undefined,
        borderRight: isSnapped && snappedSide === 'left' ? '1px solid rgba(255,255,255,0.06)' : undefined,
        border: !isSnapped ? '1px solid rgba(255,255,255,0.06)' : undefined,
        borderRadius: !isSnapped ? 16 : 0,
        cursor: isDragging ? 'grabbing' : 'default',
        boxShadow: !isSnapped ? '0 24px 80px rgba(0,0,0,0.5)' : undefined,
        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Ambient sound engine */}
      <FocusAmbientSound sound={ambientSound} volume={ambientVolume} isPlaying={isRunning && mode === 'work'} />

      {/* Grip strip + collapse */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 rounded-full bg-white/10 cursor-grab" />
          {dndActive && (
            <span className="flex items-center gap-1 text-[10px] text-cyan-400/80">
              <BellOff className="h-2.5 w-2.5" /> DND
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost"
          onClick={() => { setCollapsed(true); onOpenChange(false); }}
          className="h-6 w-6 p-0 text-white/30 hover:text-white/60"
        >
          {snappedSide === 'right' ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 relative">
        {/* Reading overlay */}
        {(readingCard || readingNote) && (
          <FocusReadingView card={readingCard} note={readingNote} onClose={() => { setReadingCard(null); setReadingNote(null); }} />
        )}

        {/* Session note prompt */}
        {pendingNote && (
          <div className="bg-cyan-400/10 border border-cyan-400/20 rounded-lg p-3 space-y-2">
            <p className="text-[10px] text-cyan-400/80 uppercase tracking-wider">Session complete — what did you accomplish?</p>
            <Input
              value={sessionNote}
              onChange={e => setSessionNote(e.target.value)}
              placeholder="Quick note…"
              className="h-7 text-xs bg-white/5 border-white/10"
              onKeyDown={e => { if (e.key === 'Enter') { addNoteToLastSession(sessionNote); setSessionNote(''); } }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-white/40" onClick={() => { addNoteToLastSession(sessionNote); setSessionNote(''); }}>Save</Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-white/30" onClick={() => { dismissNote(); setSessionNote(''); }}>Skip</Button>
            </div>
          </div>
        )}

        {/* Auto-start countdown */}
        {autoStartCountdown !== null && (
          <div className="flex items-center justify-center gap-2 py-2">
            <span className="text-xs text-cyan-400/80">Starting in {autoStartCountdown}s</span>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-white/40" onClick={cancelAutoStart}>
              <X className="h-3 w-3 mr-0.5" />Cancel
            </Button>
          </div>
        )}

        {/* Timer */}
        <div className="flex flex-col items-center gap-3">
          <FocusTimerRing seconds={seconds} totalSeconds={totalSeconds} isRunning={isRunning} mode={mode} />

          {/* Mode buttons */}
          <div className="flex gap-1">
            {([['work', 'Focus', Target], ['short-break', 'Short', Coffee], ['long-break', 'Long', Coffee]] as const).map(([m, label, Icon]) => (
              <Button key={m} size="sm" variant="ghost" onClick={() => changeMode(m)}
                className={`h-6 text-[10px] px-2 ${mode === m ? 'bg-white/10 text-white' : 'text-white/40'}`}
              >
                <Icon className="h-2.5 w-2.5 mr-0.5" />{label}
              </Button>
            ))}
          </div>

          {/* Duration picker chips */}
          {mode === 'work' && (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setShowDurations(!showDurations)}
                className="text-[10px] text-white/30 flex items-center gap-1 hover:text-white/50 transition-colors"
              >
                <Timer className="h-2.5 w-2.5" />
                {Math.round(totalSeconds / 60)} min {showDurations ? '▲' : '▼'}
              </button>
              {showDurations && (
                <div className="flex flex-wrap justify-center gap-1">
                  {DURATION_OPTIONS.map(d => (
                    <Button key={d} size="sm" variant="ghost"
                      onClick={() => { setCustomDuration(d); setShowDurations(false); }}
                      className={`h-5 px-2 text-[9px] ${totalSeconds === d * 60 ? 'bg-white/10 text-white' : 'text-white/30'}`}
                    >
                      {d}m
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            <Button size="sm" onClick={isRunning ? pause : start}
              className="h-8 px-5 text-xs bg-white/10 hover:bg-white/15 text-white border-0"
            >
              {isRunning ? <><Pause className="h-3 w-3 mr-1" />Pause</> : <><Play className="h-3 w-3 mr-1" />Start</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset} className="h-8 w-8 p-0 text-white/30 hover:text-white/60">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {activeTaskId && (
            <p className="text-[10px] text-cyan-400/60 text-center">
              Logging to: {tasks.find(t => t.id === activeTaskId)?.title}
            </p>
          )}

          {/* Auto-start + cycle info */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/20">Cycle {cycle}</span>
            <div className="flex items-center gap-1.5">
              <SkipForward className="h-2.5 w-2.5 text-white/20" />
              <span className="text-[9px] text-white/20">Auto</span>
              <Switch
                checked={autoStart}
                onCheckedChange={setAutoStart}
                className="h-3 w-6 data-[state=checked]:bg-cyan-400/50"
              />
            </div>
          </div>
        </div>

        {/* Ambient sound */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Volume2 className="h-2.5 w-2.5 text-white/30" />
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Ambient</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {AMBIENT_OPTIONS.map(opt => (
              <Button key={opt.value} size="sm" variant="ghost"
                onClick={() => setAmbientSound(opt.value)}
                className={`h-5 px-2 text-[9px] ${ambientSound === opt.value ? 'bg-white/10 text-white' : 'text-white/30'}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          {ambientSound !== 'none' && (
            <Slider
              value={[ambientVolume * 100]}
              onValueChange={([v]) => setAmbientVolume(v / 100)}
              max={100} step={5}
              className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            />
          )}
        </div>

        <div className="h-px bg-white/5" />

        {/* Daily stats */}
        <FocusStatsPanel
          sessionsToday={dailyStats.sessionsToday}
          minutesToday={dailyStats.minutesToday}
          streak={dailyStats.streak}
          dailyGoal={dailyGoal}
          onGoalChange={setDailyGoal}
          variant="desktop"
        />

        <div className="h-px bg-white/5" />

        {/* Task list */}
        <div>
          <h4 className="text-[10px] uppercase tracking-widest text-white/30 mb-2">
            Today's Tasks
            {tasks.filter(t => !t.completed).length > 0 && (
              <span className="ml-2 text-cyan-400/60 normal-case tracking-normal">
                {tasks.filter(t => !t.completed).length} remaining
              </span>
            )}
          </h4>
          <FocusTaskList
            tasks={tasks}
            onTasksChange={setTasks}
            activeTaskId={activeTaskId}
            onSetActiveTask={setActiveTaskId}
            cards={cards}
            notes={notes}
            onViewCard={setReadingCard}
            onViewNote={setReadingNote}
          />
        </div>

        <div className="h-px bg-white/5" />

        {/* Session log */}
        <FocusSessionLog sessions={sessionHistory} variant="desktop" />
      </div>
    </div>
  );
}
