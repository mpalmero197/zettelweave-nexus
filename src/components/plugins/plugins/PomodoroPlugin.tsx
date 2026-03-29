import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Play, Pause, RotateCcw, Target, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

type Mode = 'work' | 'short-break' | 'long-break';

const PRESETS: Record<Mode, number> = { work: 25 * 60, 'short-break': 5 * 60, 'long-break': 15 * 60 };

export function PomodoroPlugin({ onClose }: PluginProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(PRESETS.work);
  const [mode, setMode] = useState<Mode>('work');
  const [cycle, setCycle] = useState(1);
  const [sessions, setSessions] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [customMin, setCustomMin] = useState('25');
  const initialRef = useRef(PRESETS.work);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => setSeconds(p => {
        if (p <= 1) { completeSession(); return 0; }
        return p - 1;
      }), 1000);
    } else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const completeSession = () => {
    setIsRunning(false);
    if (mode === 'work') {
      setSessions(p => p + 1);
      const next: Mode = cycle % 4 === 0 ? 'long-break' : 'short-break';
      setMode(next); setSeconds(PRESETS[next]); initialRef.current = PRESETS[next];
      setCycle(p => p + 1);
      toast.success('Work session done! Take a break 🍅');
    } else {
      setMode('work'); setSeconds(PRESETS.work); initialRef.current = PRESETS.work;
      toast.success('Break over — time to focus!');
    }
  };

  const changeMode = (m: Mode) => { setMode(m); setSeconds(PRESETS[m]); initialRef.current = PRESETS[m]; setIsRunning(false); };
  const reset = () => { setIsRunning(false); setSeconds(PRESETS[mode]); initialRef.current = PRESETS[mode]; };
  const setCustom = () => { const m = parseInt(customMin) || 25; setSeconds(m*60); initialRef.current = m*60; setIsEditing(false); setIsRunning(false); };
  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const progress = ((initialRef.current - seconds) / initialRef.current) * 100;

  return (
    <div className="space-y-4">
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

      <div className="text-center space-y-3">
        {isEditing ? (
          <div className="flex items-center justify-center gap-2">
            <Input type="number" value={customMin} onChange={e => setCustomMin(e.target.value)} className="w-20 text-center text-xl font-mono" min="1" max="999" />
            <span className="text-lg font-mono">min</span>
            <Button size="sm" onClick={setCustom}>Set</Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>✕</Button>
          </div>
        ) : (
          <div className="text-5xl font-mono font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => !isRunning && setIsEditing(true)} title="Click to edit">
            {fmt(seconds)}
          </div>
        )}
        <Progress value={progress} className="h-1.5" />
        <div className="text-xs text-muted-foreground">{mode === 'work' ? 'Focus' : 'Break'} • {Math.ceil(seconds/60)}m left</div>
      </div>

      <div className="flex gap-2 justify-center">
        <Button onClick={() => setIsRunning(!isRunning)} size="lg" className="px-6">
          {isRunning ? <><Pause className="h-4 w-4 mr-1" />Pause</> : <><Play className="h-4 w-4 mr-1" />Start</>}
        </Button>
        <Button onClick={reset} variant="outline" size="lg"><RotateCcw className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
        <div className="text-center">
          <div className="text-lg font-bold text-primary">{sessions}</div>
          <div className="text-[10px] text-muted-foreground">Sessions Today</div>
        </div>
        <div className="text-center">
          <Badge variant="outline">Cycle {cycle}</Badge>
        </div>
      </div>
    </div>
  );
}
