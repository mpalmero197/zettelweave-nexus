import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FocusTask } from './FocusTaskList';
import { toast } from 'sonner';

const STORAGE_KEY = 'bakuscribe-focus-sidebar';
const AUTO_IMPORT_KEY = 'bakuscribe-focus-auto-imported';
const HISTORY_KEY = 'bakuscribe-focus-history';
const GOAL_KEY = 'bakuscribe-focus-daily-goal';
const STREAK_KEY = 'bakuscribe-focus-streak';

export interface FocusSession {
  id: string;
  timestamp: number;
  duration: number; // seconds
  mode: 'work' | 'short-break' | 'long-break';
  taskTitle?: string;
  note?: string;
}

interface FocusState {
  tasks: FocusTask[];
  activeTaskId: string | null;
  timerMode: 'work' | 'short-break' | 'long-break';
  timerSeconds: number;
  timerTotal: number;
  cycle: number;
  dndActive: boolean;
  autoStart: boolean;
  ambientSound: string;
  ambientVolume: number;
}

const PRESETS = { work: 25 * 60, 'short-break': 5 * 60, 'long-break': 15 * 60 };

// Local-date key (YYYY-MM-DD) — avoids UTC drift near midnight that broke streaks
function dateKey(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey() {
  return dateKey();
}

function loadHistory(): FocusSession[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(sessions: FocusSession[]) {
  // Keep last 500 — enough to preserve streak data for ~2 months of heavy use
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(-500)));
}

function loadWorkDays(): Set<string> {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveWorkDays(days: Set<string>) {
  // Keep last 365 days
  const sorted = Array.from(days).sort().slice(-365);
  localStorage.setItem(STREAK_KEY, JSON.stringify(sorted));
}

function loadDailyGoal(): number {
  try {
    return parseInt(localStorage.getItem(GOAL_KEY) || '8') || 8;
  } catch { return 8; }
}

function computeStreak(sessions: FocusSession[], persistedDays: Set<string>): number {
  // Merge session-derived work days with persisted set (survives history truncation)
  const workDays = new Set(persistedDays);
  sessions
    .filter(s => s.mode === 'work')
    .forEach(s => workDays.add(dateKey(new Date(s.timestamp))));

  let streak = 0;
  const d = new Date();
  // If today has no session, start counting from yesterday so streak doesn't reset before day ends
  if (!workDays.has(dateKey(d))) {
    d.setDate(d.getDate() - 1);
  }
  while (workDays.has(dateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function useFocusState() {
  const loadState = (): FocusState => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          tasks: parsed.tasks || [],
          activeTaskId: parsed.activeTaskId || null,
          timerMode: parsed.timerMode || 'work',
          timerSeconds: parsed.timerSeconds ?? PRESETS.work,
          timerTotal: parsed.timerTotal ?? PRESETS.work,
          cycle: parsed.cycle || 1,
          dndActive: parsed.dndActive || false,
          autoStart: parsed.autoStart || false,
          ambientSound: parsed.ambientSound || 'none',
          ambientVolume: parsed.ambientVolume ?? 0.5,
        };
      }
    } catch {}
    return {
      tasks: [],
      activeTaskId: null,
      timerMode: 'work',
      timerSeconds: PRESETS.work,
      timerTotal: PRESETS.work,
      cycle: 1,
      dndActive: false,
      autoStart: false,
      ambientSound: 'none',
      ambientVolume: 0.5,
    };
  };

  const initial = loadState();
  const [tasks, setTasks] = useState<FocusTask[]>(initial.tasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(initial.activeTaskId);
  const [mode, setMode] = useState<'work' | 'short-break' | 'long-break'>(initial.timerMode);
  const [seconds, setSeconds] = useState(initial.timerSeconds);
  const [totalSeconds, setTotalSeconds] = useState(initial.timerTotal);
  const [cycle, setCycle] = useState(initial.cycle);
  const [isRunning, setIsRunning] = useState(false);
  const [dndActive, setDndActive] = useState(false);
  const [autoStart, setAutoStart] = useState(initial.autoStart);
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(null);
  const [ambientSound, setAmbientSound] = useState(initial.ambientSound);
  const [ambientVolume, setAmbientVolume] = useState(initial.ambientVolume);
  const [sessionHistory, setSessionHistory] = useState<FocusSession[]>(loadHistory);
  const [workDays, setWorkDays] = useState<Set<string>>(loadWorkDays);
  const [dailyGoal, setDailyGoal] = useState(loadDailyGoal);
  const [pendingNote, setPendingNote] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const autoStartRef = useRef<ReturnType<typeof setTimeout>>();
  const autoImportedRef = useRef(false);

  // Computed daily stats
  const dailyStats = useMemo(() => {
    const today = todayKey();
    const todaySessions = sessionHistory.filter(
      s => dateKey(new Date(s.timestamp)) === today && s.mode === 'work'
    );
    return {
      sessionsToday: todaySessions.length,
      minutesToday: Math.round(todaySessions.reduce((sum, s) => sum + s.duration, 0) / 60),
      streak: computeStreak(sessionHistory, workDays),
    };
  }, [sessionHistory, workDays]);

  // Auto-import today's important tasks from project_tasks
  useEffect(() => {
    if (autoImportedRef.current) return;
    autoImportedRef.current = true;

    const importTodayTasks = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = todayKey();
        const lastImport = localStorage.getItem(AUTO_IMPORT_KEY);
        if (lastImport === today) return;

        const { data: dbTasks } = await supabase
          .from('project_tasks')
          .select('id, name, priority, due_date, status')
          .eq('user_id', user.id)
          .neq('status', 'done')
          .is('parent_task_id', null)
          .or(`priority.eq.high,due_date.eq.${today}`)
          .order('due_date', { ascending: true })
          .order('priority', { ascending: false })
          .limit(10);

        if (!dbTasks || dbTasks.length === 0) return;

        setTasks(prev => {
          const existingSourceIds = new Set(prev.map(t => t.id));
          const newFocusTasks: FocusTask[] = dbTasks
            .filter(dt => !existingSourceIds.has(`db-${dt.id}`))
            .map(dt => ({
              id: `db-${dt.id}`,
              title: dt.name,
              priority: (dt.priority === 'high' ? 'high' : dt.priority === 'medium' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
              completed: false,
              linkedCardIds: [],
              linkedNoteIds: [],
              pomodoroMinutes: 0,
            }));

          if (newFocusTasks.length > 0) {
            toast.info(`${newFocusTasks.length} task${newFocusTasks.length > 1 ? 's' : ''} loaded for today`, {
              description: 'Your important tasks are ready in Focus Mode.',
            });
          }

          return [...newFocusTasks, ...prev];
        });

        localStorage.setItem(AUTO_IMPORT_KEY, today);
      } catch {}
    };

    importTodayTasks();
  }, []);

  // Persist main state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tasks, activeTaskId, timerMode: mode,
      timerSeconds: seconds, timerTotal: totalSeconds,
      cycle, dndActive, autoStart, ambientSound, ambientVolume,
    }));
  }, [tasks, activeTaskId, mode, seconds, totalSeconds, cycle, dndActive, autoStart, ambientSound, ambientVolume]);

  // Persist daily goal
  useEffect(() => {
    localStorage.setItem(GOAL_KEY, String(dailyGoal));
  }, [dailyGoal]);

  const addSessionToHistory = useCallback((sessionMode: 'work' | 'short-break' | 'long-break', duration: number) => {
    const session: FocusSession = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      duration,
      mode: sessionMode,
      taskTitle: activeTaskId ? tasks.find(t => t.id === activeTaskId)?.title : undefined,
    };
    setSessionHistory(prev => {
      const updated = [...prev, session].slice(-500);
      saveHistory(updated);
      return updated;
    });
    if (sessionMode === 'work') {
      setWorkDays(prev => {
        const next = new Set(prev);
        next.add(todayKey());
        saveWorkDays(next);
        return next;
      });
    }
    return session.id;
  }, [activeTaskId, tasks]);

  const completeSession = useCallback(() => {
    setIsRunning(false);
    setDndActive(false);

    // Log time to active task
    if (mode === 'work' && activeTaskId) {
      setTasks(prev => prev.map(t =>
        t.id === activeTaskId
          ? { ...t, pomodoroMinutes: t.pomodoroMinutes + Math.floor(totalSeconds / 60) }
          : t
      ));
    }

    // Add to history
    addSessionToHistory(mode, totalSeconds);

    if (mode === 'work') {
      setPendingNote(true); // prompt for session note
      const nextCycle = cycle + 1;
      setCycle(nextCycle);
      if (nextCycle % 4 === 1 && nextCycle > 1) {
        // This logic slightly adjusted to use nextCycle to decide
        setMode('long-break');
        setSeconds(PRESETS['long-break']);
        setTotalSeconds(PRESETS['long-break']);
      } else {
        setMode('short-break');
        setSeconds(PRESETS['short-break']);
        setTotalSeconds(PRESETS['short-break']);
      }
      toast.success('Focus session complete! 🍅', { description: 'Take a break.' });
    } else {
      setMode('work');
      setSeconds(PRESETS.work);
      setTotalSeconds(PRESETS.work);
      toast.success('Break over!', { description: 'Ready to focus?' });
    }

    // Auto-start next session
    if (autoStart) {
      setAutoStartCountdown(5);
    }
  }, [mode, activeTaskId, cycle, totalSeconds, autoStart, addSessionToHistory]);

  // Timer tick
  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, seconds, completeSession]);

  // Auto-start countdown
  useEffect(() => {
    if (autoStartCountdown === null) return;
    if (autoStartCountdown <= 0) {
      setAutoStartCountdown(null);
      // Note: we can't call internal 'start' here easily if not memoized, but we handle it manually
      setIsRunning(true);
      if (mode === 'work') setDndActive(true);
      return;
    }
    const t = setTimeout(() => setAutoStartCountdown(prev => prev !== null ? prev - 1 : null), 1000);
    return () => clearTimeout(t);
  }, [autoStartCountdown, mode]);

  const cancelAutoStart = useCallback(() => setAutoStartCountdown(null), []);

  const addNoteToLastSession = useCallback((note: string) => {
    setSessionHistory(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], note };
      saveHistory(updated);
      return updated;
    });
    setPendingNote(false);
  }, []);

  const dismissNote = useCallback(() => setPendingNote(false), []);

  const start = useCallback(() => {
    setAutoStartCountdown(null);
    setIsRunning(true);
    if (mode === 'work') setDndActive(true);
  }, [mode]);

  const pause = useCallback(() => setIsRunning(false), []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setAutoStartCountdown(null);
    setSeconds(PRESETS[mode]);
    setTotalSeconds(PRESETS[mode]);
    setDndActive(false);
  }, [mode]);

  const changeMode = useCallback((m: 'work' | 'short-break' | 'long-break') => {
    setIsRunning(false);
    setAutoStartCountdown(null);
    setMode(m);
    setSeconds(PRESETS[m]);
    setTotalSeconds(PRESETS[m]);
    setDndActive(false);
  }, []);

  const setCustomDuration = useCallback((minutes: number) => {
    setIsRunning(false);
    const s = minutes * 60;
    setSeconds(s);
    setTotalSeconds(s);
  }, []);

  // ── ALICE remote control ─────────────────────────────────────────────
  // ALICE dispatches `alice:start_pomodoro` / `pause_pomodoro` / `reset_pomodoro`
  // when the user asks her to drive the timer.
  useEffect(() => {
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const minutes = Math.min(Math.max(Number(detail.minutes) || 25, 1), 180);
      const newMode = ['work', 'short-break', 'long-break'].includes(detail.mode) ? detail.mode : 'work';
      const taskTitle = typeof detail.taskTitle === 'string' ? detail.taskTitle.trim() : '';

      if (taskTitle) {
        const taskId = `alice-${Date.now()}`;
        setTasks(prev => [
          { id: taskId, title: taskTitle, priority: 'medium', completed: false, linkedCardIds: [], linkedNoteIds: [], pomodoroMinutes: 0 },
          ...prev,
        ]);
        setActiveTaskId(taskId);
      }

      setMode(newMode as 'work' | 'short-break' | 'long-break');
      const secs = minutes * 60;
      setSeconds(secs);
      setTotalSeconds(secs);
      setIsRunning(true);
      if (newMode === 'work') setDndActive(true);

      window.dispatchEvent(new CustomEvent('alice:open-focus-sidebar'));
      toast.success(`Pomodoro started — ${minutes} minute${minutes === 1 ? '' : 's'}`, {
        description: taskTitle ? `Focusing on: ${taskTitle}` : undefined,
      });
    };
    const onPause = () => { setIsRunning(false); toast.info('Timer paused'); };
    const onReset = () => {
      setIsRunning(false);
      setAutoStartCountdown(null);
      const presetSecs = PRESETS[mode];
      setSeconds(presetSecs);
      setTotalSeconds(presetSecs);
      setDndActive(false);
      toast.info('Timer reset');
    };

    window.addEventListener('alice:start_pomodoro', onStart);
    window.addEventListener('alice:pause_pomodoro', onPause);
    window.addEventListener('alice:reset_pomodoro', onReset);
    return () => {
      window.removeEventListener('alice:start_pomodoro', onStart);
      window.removeEventListener('alice:pause_pomodoro', onPause);
      window.removeEventListener('alice:reset_pomodoro', onReset);
    };
  }, [mode]);

  return {
    tasks, setTasks, activeTaskId, setActiveTaskId,
    mode, seconds, totalSeconds, isRunning, cycle, dndActive,
    start, pause, reset, changeMode, setCustomDuration,
    autoStart, setAutoStart,
    autoStartCountdown, cancelAutoStart,
    ambientSound, setAmbientSound,
    ambientVolume, setAmbientVolume,
    sessionHistory, dailyStats, dailyGoal, setDailyGoal,
    pendingNote, addNoteToLastSession, dismissNote,
  };
}
