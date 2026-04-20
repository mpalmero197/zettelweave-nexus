import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Play, Pause, RotateCcw, Target, Coffee, BellOff, Timer, Volume2, SkipForward, X,
} from 'lucide-react';
import { FocusTimerRing } from '@/components/focus-sidebar/FocusTimerRing';
import { FocusStatsPanel } from '@/components/focus-sidebar/FocusStatsPanel';
import { FocusSessionLog } from '@/components/focus-sidebar/FocusSessionLog';
import { FocusAmbientSound } from '@/components/focus-sidebar/FocusAmbientSound';
import { useFocusState } from '@/components/focus-sidebar/useFocusState';

const DURATION_OPTIONS = [15, 20, 25, 30, 45, 60];
const AMBIENT_OPTIONS = [
  { value: 'none', label: 'Off' },
  { value: 'white-noise', label: 'White Noise' },
  { value: 'brown-noise', label: 'Brown Noise' },
  { value: 'rain', label: 'Rain' },
  { value: 'binaural', label: 'Binaural' },
];

export function FocusPanel() {
  const {
    tasks, activeTaskId,
    mode, seconds, totalSeconds, isRunning, cycle, dndActive,
    start, pause, reset, changeMode, setCustomDuration,
    autoStart, setAutoStart, autoStartCountdown, cancelAutoStart,
    ambientSound, setAmbientSound, ambientVolume, setAmbientVolume,
    sessionHistory, dailyStats, dailyGoal, setDailyGoal,
    pendingNote, addNoteToLastSession, dismissNote,
  } = useFocusState();

  const [showDurations, setShowDurations] = useState(false);
  const [sessionNote, setSessionNote] = useState('');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
        <Timer className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">Focus</span>
        {dndActive && (
          <span className="ml-auto flex items-center gap-1 text-[9px] text-cyan-400/80">
            <BellOff className="h-2.5 w-2.5" /> DND
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <FocusAmbientSound sound={ambientSound} volume={ambientVolume} isPlaying={isRunning && mode === 'work'} />

        {pendingNote && (
          <div className="bg-cyan-400/10 border border-cyan-400/20 rounded-lg p-3 space-y-2">
            <p className="text-[10px] text-cyan-400/80 uppercase tracking-wider">Session complete — what did you accomplish?</p>
            <Input
              value={sessionNote}
              onChange={e => setSessionNote(e.target.value)}
              placeholder="Quick note…"
              className="h-7 text-xs"
              onKeyDown={e => { if (e.key === 'Enter') { addNoteToLastSession(sessionNote); setSessionNote(''); } }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { addNoteToLastSession(sessionNote); setSessionNote(''); }}>Save</Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { dismissNote(); setSessionNote(''); }}>Skip</Button>
            </div>
          </div>
        )}

        {autoStartCountdown !== null && (
          <div className="flex items-center justify-center gap-2 py-2">
            <span className="text-xs text-cyan-400/80">Starting in {autoStartCountdown}s</span>
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={cancelAutoStart}>
              <X className="h-3 w-3 mr-0.5" />Cancel
            </Button>
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          <FocusTimerRing seconds={seconds} totalSeconds={totalSeconds} isRunning={isRunning} mode={mode} />

          <div className="flex gap-1">
            {([['work', 'Focus', Target], ['short-break', 'Short', Coffee], ['long-break', 'Long', Coffee]] as const).map(([m, label, Icon]) => (
              <Button key={m} size="sm" variant="ghost" onClick={() => changeMode(m)}
                className={`h-6 text-[10px] px-2 ${mode === m ? 'bg-primary/15 text-foreground' : 'text-muted-foreground'}`}
              >
                <Icon className="h-2.5 w-2.5 mr-0.5" />{label}
              </Button>
            ))}
          </div>

          {mode === 'work' && (
            <div className="flex flex-col items-center gap-1">
              <button onClick={() => setShowDurations(!showDurations)}
                className="text-[10px] text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Timer className="h-2.5 w-2.5" />
                {Math.round(totalSeconds / 60)} min {showDurations ? '▲' : '▼'}
              </button>
              {showDurations && (
                <div className="flex flex-wrap justify-center gap-1">
                  {DURATION_OPTIONS.map(d => (
                    <Button key={d} size="sm" variant="ghost"
                      onClick={() => { setCustomDuration(d); setShowDurations(false); }}
                      className={`h-5 px-2 text-[9px] ${totalSeconds === d * 60 ? 'bg-primary/15 text-foreground' : 'text-muted-foreground'}`}
                    >
                      {d}m
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={isRunning ? pause : start} className="h-8 px-5 text-xs">
              {isRunning ? <><Pause className="h-3 w-3 mr-1" />Pause</> : <><Play className="h-3 w-3 mr-1" />Start</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset} className="h-8 w-8 p-0">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {activeTaskId && (
            <p className="text-[10px] text-cyan-400/70 text-center">
              Logging to: {tasks.find(t => t.id === activeTaskId)?.title}
            </p>
          )}

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground">Cycle {cycle}</span>
            <div className="flex items-center gap-1.5">
              <SkipForward className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">Auto</span>
              <Switch checked={autoStart} onCheckedChange={setAutoStart} className="h-3 w-6" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Volume2 className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Ambient</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {AMBIENT_OPTIONS.map(opt => (
              <Button key={opt.value} size="sm" variant="ghost"
                onClick={() => setAmbientSound(opt.value)}
                className={`h-5 px-2 text-[9px] ${ambientSound === opt.value ? 'bg-primary/15 text-foreground' : 'text-muted-foreground'}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          {ambientSound !== 'none' && (
            <Slider value={[ambientVolume * 100]} onValueChange={([v]) => setAmbientVolume(v / 100)} max={100} step={5}
              className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            />
          )}
        </div>

        <div className="h-px bg-border/50" />

        <FocusStatsPanel
          sessionsToday={dailyStats.sessionsToday}
          minutesToday={dailyStats.minutesToday}
          streak={dailyStats.streak}
          dailyGoal={dailyGoal}
          onGoalChange={setDailyGoal}
          variant="desktop"
        />

        <div className="h-px bg-border/50" />

        <FocusSessionLog sessions={sessionHistory} variant="desktop" />
      </div>
    </div>
  );
}
