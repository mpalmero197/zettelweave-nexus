import { useState, useEffect, useRef, useCallback } from 'react';
import { FocusTask } from './FocusTaskList';
import { toast } from 'sonner';

const STORAGE_KEY = 'pendragonx-focus-sidebar';
const AUTO_IMPORT_KEY = 'pendragonx-focus-auto-imported';

interface FocusState {
  tasks: FocusTask[];
  activeTaskId: string | null;
  timerMode: 'work' | 'short-break' | 'long-break';
  timerSeconds: number;
  timerTotal: number;
  cycle: number;
  dndActive: boolean;
}

const PRESETS = { work: 25 * 60, 'short-break': 5 * 60, 'long-break': 15 * 60 };

export function useFocusState() {
  const loadState = (): FocusState => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      tasks: [],
      activeTaskId: null,
      timerMode: 'work',
      timerSeconds: PRESETS.work,
      timerTotal: PRESETS.work,
      cycle: 1,
      dndActive: false,
    };
  };

  const [tasks, setTasks] = useState<FocusTask[]>(() => loadState().tasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => loadState().activeTaskId);
  const [mode, setMode] = useState<'work' | 'short-break' | 'long-break'>(() => loadState().timerMode);
  const [seconds, setSeconds] = useState(() => loadState().timerSeconds);
  const [totalSeconds, setTotalSeconds] = useState(() => loadState().timerTotal);
  const [cycle, setCycle] = useState(() => loadState().cycle);
  const [isRunning, setIsRunning] = useState(false);
  const [dndActive, setDndActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const autoImportedRef = useRef(false);

  // Auto-import today's important tasks from project_tasks
  useEffect(() => {
    if (autoImportedRef.current) return;
    autoImportedRef.current = true;

    const importTodayTasks = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];
        const lastImport = localStorage.getItem(AUTO_IMPORT_KEY);
        // Only auto-import once per day
        if (lastImport === today) return;

        // Fetch high-priority tasks + tasks due today that aren't done
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

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tasks, activeTaskId, timerMode: mode,
      timerSeconds: seconds, timerTotal: totalSeconds,
      cycle, dndActive,
    }));
  }, [tasks, activeTaskId, mode, seconds, totalSeconds, cycle, dndActive]);

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
  }, [isRunning]);

  const completeSession = useCallback(() => {
    setIsRunning(false);
    setDndActive(false);

    // Auto-log time to active task
    if (mode === 'work' && activeTaskId) {
      setTasks(prev => prev.map(t =>
        t.id === activeTaskId
          ? { ...t, pomodoroMinutes: t.pomodoroMinutes + Math.floor(totalSeconds / 60) }
          : t
      ));
    }

    if (mode === 'work') {
      const nextCycle = cycle + 1;
      setCycle(nextCycle);
      if (cycle % 4 === 0) {
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
  }, [mode, activeTaskId, cycle, totalSeconds]);

  const start = () => {
    setIsRunning(true);
    if (mode === 'work') setDndActive(true);
  };
  const pause = () => setIsRunning(false);
  const reset = () => {
    setIsRunning(false);
    setSeconds(PRESETS[mode]);
    setTotalSeconds(PRESETS[mode]);
    setDndActive(false);
  };
  const changeMode = (m: 'work' | 'short-break' | 'long-break') => {
    setIsRunning(false);
    setMode(m);
    setSeconds(PRESETS[m]);
    setTotalSeconds(PRESETS[m]);
    setDndActive(false);
  };
  const setCustomDuration = (minutes: number) => {
    setIsRunning(false);
    const s = minutes * 60;
    setSeconds(s);
    setTotalSeconds(s);
  };

  return {
    tasks, setTasks, activeTaskId, setActiveTaskId,
    mode, seconds, totalSeconds, isRunning, cycle, dndActive,
    start, pause, reset, changeMode, setCustomDuration,
  };
}
