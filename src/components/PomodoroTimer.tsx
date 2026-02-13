import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Play, Pause, RotateCcw, Timer, Coffee, Target } from 'lucide-react';
import { toast } from 'sonner';

interface PomodoroSession {
  id: string;
  habitId?: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  type: 'work' | 'short-break' | 'long-break';
  completed: boolean;
}

interface PomodoroTimerProps {
  habits?: any[];
  onSessionComplete?: (session: PomodoroSession) => void;
  compact?: boolean;
}

export function PomodoroTimer({ habits = [], onSessionComplete, compact = false }: PomodoroTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [mode, setMode] = useState<'work' | 'short-break' | 'long-break'>('work');
  const [selectedHabit, setSelectedHabit] = useState<string>('');
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [cycle, setCycle] = useState(1);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('25');
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const initialTime = useRef(25 * 60);

  const timePresets = {
    work: 25 * 60,
    'short-break': 5 * 60,
    'long-break': 15 * 60
  };

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) { completeSession(); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, seconds]);

  const completeSession = () => {
    const session: PomodoroSession = {
      id: crypto.randomUUID(), habitId: selectedHabit,
      startTime: new Date(Date.now() - (initialTime.current - seconds) * 1000),
      endTime: new Date(), duration: initialTime.current, type: mode, completed: true
    };
    setSessions(prev => [...prev, session]);
    setIsRunning(false);
    if (mode === 'work') {
      if (cycle % 4 === 0) { setMode('long-break'); setSeconds(timePresets['long-break']); initialTime.current = timePresets['long-break']; }
      else { setMode('short-break'); setSeconds(timePresets['short-break']); initialTime.current = timePresets['short-break']; }
      setCycle(prev => prev + 1);
    } else {
      setMode('work'); setSeconds(timePresets.work); initialTime.current = timePresets.work;
    }
    onSessionComplete?.(session);
    const modeNames = { work: 'Work session', 'short-break': 'Short break', 'long-break': 'Long break' };
    toast.success(`${modeNames[mode]} completed! 🍅`, { description: mode === 'work' ? 'Take a break!' : 'Ready for work?' });
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => { setIsRunning(false); setSeconds(timePresets[mode]); initialTime.current = timePresets[mode]; };
  const changeMode = (newMode: 'work' | 'short-break' | 'long-break') => {
    setMode(newMode); setSeconds(timePresets[newMode]); initialTime.current = timePresets[newMode];
    setCustomMinutes(Math.floor(timePresets[newMode] / 60).toString()); setIsRunning(false);
  };
  const handleSetCustomTime = () => {
    const mins = parseInt(customMinutes) || 25;
    setSeconds(mins * 60); initialTime.current = mins * 60;
    setIsEditingTime(false); setIsRunning(false);
    toast.success(`Timer set to ${mins} minutes`);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((initialTime.current - seconds) / initialTime.current) * 100;
  const todaySessions = sessions.filter(s => s.startTime.toDateString() === new Date().toDateString());

  const content = (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        <Button variant={mode === 'work' ? 'default' : 'outline'} size="sm" onClick={() => changeMode('work')} className="flex-1">
          <Target className="h-3 w-3 mr-1" />Work
        </Button>
        <Button variant={mode === 'short-break' ? 'default' : 'outline'} size="sm" onClick={() => changeMode('short-break')} className="flex-1">
          <Coffee className="h-3 w-3 mr-1" />Short
        </Button>
        <Button variant={mode === 'long-break' ? 'default' : 'outline'} size="sm" onClick={() => changeMode('long-break')} className="flex-1">
          <Coffee className="h-3 w-3 mr-1" />Long
        </Button>
      </div>

      {/* Habit selector */}
      {mode === 'work' && habits.length > 0 && (
        <Select value={selectedHabit || 'no-habit'} onValueChange={v => setSelectedHabit(v === 'no-habit' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Select a habit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="no-habit">No specific habit</SelectItem>
            {habits.map(habit => (
              <SelectItem key={habit.id} value={habit.id}>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: habit.color }} />
                  {habit.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Timer display */}
      <div className="text-center space-y-3">
        {isEditingTime ? (
          <div className="flex items-center justify-center gap-2">
            <Input type="number" value={customMinutes} onChange={e => setCustomMinutes(e.target.value)}
              className="w-20 text-center text-xl font-mono" min="1" max="999" />
            <span className="text-lg font-mono">min</span>
            <Button size="sm" onClick={handleSetCustomTime}>Set</Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditingTime(false)}>✕</Button>
          </div>
        ) : (
          <div className={`font-mono font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity ${compact ? 'text-4xl' : 'text-6xl'}`}
            onClick={() => !isRunning && setIsEditingTime(true)} title="Click to edit">
            {formatTime(seconds)}
          </div>
        )}
        <Progress value={progress} className="h-1.5" />
        <div className="text-xs text-muted-foreground">
          {mode === 'work' ? 'Focus' : 'Break'} • {Math.ceil(seconds / 60)}m left
          {!isRunning && !isEditingTime && <span className="block text-[10px] mt-0.5 opacity-60">Click timer to customize</span>}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 justify-center">
        <Button onClick={toggleTimer} size={compact ? 'sm' : 'lg'} className="px-6">
          {isRunning ? <><Pause className="h-4 w-4 mr-1" />Pause</> : <><Play className="h-4 w-4 mr-1" />Start</>}
        </Button>
        <Button onClick={resetTimer} variant="outline" size={compact ? 'sm' : 'lg'}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Today's stats */}
      {todaySessions.length > 0 && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{todaySessions.filter(s => s.type === 'work').length}</div>
            <div className="text-[10px] text-muted-foreground">Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: '#f97316' }}>
              {Math.round(todaySessions.filter(s => s.type === 'work').reduce((sum, s) => sum + s.duration, 0) / 60)}
            </div>
            <div className="text-[10px] text-muted-foreground">Min Focused</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: '#22c55e' }}>{todaySessions.filter(s => s.type !== 'work').length}</div>
            <div className="text-[10px] text-muted-foreground">Breaks</div>
          </div>
        </div>
      )}
    </div>
  );

  // When compact (embedded in HabitTracker), skip the Card wrapper
  if (compact) return content;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Pomodoro Timer
            <Badge variant="outline" className="ml-auto">Cycle {cycle}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    </div>
  );
}
