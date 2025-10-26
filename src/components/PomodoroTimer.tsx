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
}

export function PomodoroTimer({ habits = [], onSessionComplete }: PomodoroTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60); // 25 minutes default
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
          if (prev <= 1) {
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, seconds]);

  const completeSession = () => {
    const session: PomodoroSession = {
      id: crypto.randomUUID(),
      habitId: selectedHabit,
      startTime: new Date(Date.now() - (initialTime.current - seconds) * 1000),
      endTime: new Date(),
      duration: initialTime.current,
      type: mode,
      completed: true
    };

    setSessions(prev => [...prev, session]);
    setIsRunning(false);
    
    // Auto-cycle to next mode
    if (mode === 'work') {
      if (cycle % 4 === 0) {
        setMode('long-break');
        setSeconds(timePresets['long-break']);
        initialTime.current = timePresets['long-break'];
      } else {
        setMode('short-break');
        setSeconds(timePresets['short-break']);
        initialTime.current = timePresets['short-break'];
      }
      setCycle(prev => prev + 1);
    } else {
      setMode('work');
      setSeconds(timePresets.work);
      initialTime.current = timePresets.work;
    }

    onSessionComplete?.(session);
    
    // Show completion notification
    const modeNames = {
      work: 'Work session',
      'short-break': 'Short break',
      'long-break': 'Long break'
    };
    
    toast.success(`${modeNames[mode]} completed! 🍅`, {
      description: mode === 'work' ? 'Take a break!' : 'Ready for work?'
    });
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSeconds(timePresets[mode]);
    initialTime.current = timePresets[mode];
  };

  const changeMode = (newMode: 'work' | 'short-break' | 'long-break') => {
    setMode(newMode);
    setSeconds(timePresets[newMode]);
    initialTime.current = timePresets[newMode];
    setCustomMinutes(Math.floor(timePresets[newMode] / 60).toString());
    setIsRunning(false);
  };

  const handleSetCustomTime = () => {
    const mins = parseInt(customMinutes) || 25;
    const totalSeconds = mins * 60;
    setSeconds(totalSeconds);
    initialTime.current = totalSeconds;
    setIsEditingTime(false);
    setIsRunning(false);
    toast.success(`Timer set to ${mins} minutes`);
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const remainingSeconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progress = ((initialTime.current - seconds) / initialTime.current) * 100;
  const todaySessions = sessions.filter(s => 
    s.startTime.toDateString() === new Date().toDateString()
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Pomodoro Timer
            <Badge variant="outline" className="ml-auto">
              Cycle {cycle}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode selector */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'work' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeMode('work')}
              className="flex-1"
            >
              <Target className="h-3 w-3 mr-1" />
              Work
            </Button>
            <Button
              variant={mode === 'short-break' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeMode('short-break')}
              className="flex-1"
            >
              <Coffee className="h-3 w-3 mr-1" />
              Short Break
            </Button>
            <Button
              variant={mode === 'long-break' ? 'default' : 'outline'}
              size="sm"
              onClick={() => changeMode('long-break')}
              className="flex-1"
            >
              <Coffee className="h-3 w-3 mr-1" />
              Long Break
            </Button>
          </div>

          {/* Habit selector */}
          {mode === 'work' && habits.length > 0 && (
            <Select 
              value={selectedHabit || 'no-habit'} 
              onValueChange={(value) => setSelectedHabit(value === 'no-habit' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a habit to work on" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-habit">No specific habit</SelectItem>
                {habits.map(habit => (
                  <SelectItem key={habit.id} value={habit.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: habit.color }}
                      />
                      {habit.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Timer display */}
          <div className="text-center space-y-4">
            {isEditingTime ? (
              <div className="flex items-center justify-center gap-2">
                <Input
                  type="number"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-24 text-center text-2xl font-mono"
                  min="1"
                  max="999"
                />
                <span className="text-2xl font-mono">min</span>
                <Button size="sm" onClick={handleSetCustomTime}>Set</Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditingTime(false)}>Cancel</Button>
              </div>
            ) : (
              <div 
                className="text-6xl font-mono font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => !isRunning && setIsEditingTime(true)}
                title="Click to edit timer"
              >
                {formatTime(seconds)}
              </div>
            )}
            <Progress value={progress} className="h-2" />
            <div className="text-sm text-muted-foreground">
              {mode === 'work' ? 'Focus time' : 'Break time'} • {Math.ceil(seconds / 60)} min remaining
              {!isRunning && !isEditingTime && (
                <span className="block text-xs mt-1">Click timer to customize duration</span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2 justify-center">
            <Button onClick={toggleTimer} size="lg" className="px-8">
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button onClick={resetTimer} variant="outline" size="lg">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Today's stats */}
          {todaySessions.length > 0 && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {todaySessions.filter(s => s.type === 'work').length}
                </div>
                <div className="text-xs text-muted-foreground">Work Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {Math.round(todaySessions.filter(s => s.type === 'work').reduce((sum, s) => sum + s.duration, 0) / 60)}
                </div>
                <div className="text-xs text-muted-foreground">Minutes Focused</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {todaySessions.filter(s => s.type !== 'work').length}
                </div>
                <div className="text-xs text-muted-foreground">Breaks Taken</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}