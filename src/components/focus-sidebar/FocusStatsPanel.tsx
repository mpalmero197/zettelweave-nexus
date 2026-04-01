import { useState } from 'react';
import { ChevronDown, ChevronUp, Flame, Target, Clock, Edit2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FocusStatsPanelProps {
  sessionsToday: number;
  minutesToday: number;
  streak: number;
  dailyGoal: number;
  onGoalChange: (goal: number) => void;
  variant?: 'desktop' | 'mobile';
}

export function FocusStatsPanel({
  sessionsToday, minutesToday, streak, dailyGoal, onGoalChange, variant = 'desktop',
}: FocusStatsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(dailyGoal));
  const goalProgress = Math.min(sessionsToday / dailyGoal, 1);

  const isDesktop = variant === 'desktop';

  const saveGoal = () => {
    const v = parseInt(goalInput) || 8;
    onGoalChange(Math.max(1, Math.min(v, 99)));
    setEditingGoal(false);
  };

  return (
    <div className={isDesktop ? '' : 'bg-muted/30 rounded-xl'}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between ${
          isDesktop
            ? 'text-[10px] uppercase tracking-widest text-white/30 hover:text-white/50'
            : 'text-xs font-semibold text-muted-foreground uppercase tracking-wider p-3'
        } transition-colors`}
      >
        <span className="flex items-center gap-1.5">
          <Target className={isDesktop ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
          Daily Progress
        </span>
        {expanded
          ? <ChevronUp className={isDesktop ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
          : <ChevronDown className={isDesktop ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
        }
      </button>

      {/* Compact inline stat */}
      {!expanded && (
        <div className={`flex items-center gap-3 ${isDesktop ? 'mt-1.5' : 'px-3 pb-3'}`}>
          {/* Mini goal bar */}
          <div className={`flex-1 h-1.5 rounded-full ${isDesktop ? 'bg-white/8' : 'bg-muted'} overflow-hidden`}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${goalProgress * 100}%`,
                background: goalProgress >= 1
                  ? 'rgb(74,222,128)'
                  : 'rgb(56,189,248)',
              }}
            />
          </div>
          <span className={`text-[10px] ${isDesktop ? 'text-white/40' : 'text-muted-foreground'} tabular-nums`}>
            {sessionsToday}/{dailyGoal}
          </span>
          {streak > 0 && (
            <span className={`flex items-center gap-0.5 text-[10px] ${isDesktop ? 'text-amber-400/60' : 'text-amber-500'}`}>
              <Flame className="h-2.5 w-2.5" />{streak}d
            </span>
          )}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className={`grid grid-cols-3 gap-2 ${isDesktop ? 'mt-2' : 'px-3 pb-3'}`}>
          <div className={`text-center p-2 rounded-lg ${isDesktop ? 'bg-white/5' : 'bg-muted/50'}`}>
            <div className={`text-lg font-bold tabular-nums ${isDesktop ? 'text-cyan-400' : 'text-primary'}`}>
              {sessionsToday}
            </div>
            <div className={`text-[9px] uppercase tracking-wider ${isDesktop ? 'text-white/30' : 'text-muted-foreground'}`}>Sessions</div>
          </div>
          <div className={`text-center p-2 rounded-lg ${isDesktop ? 'bg-white/5' : 'bg-muted/50'}`}>
            <div className={`text-lg font-bold tabular-nums ${isDesktop ? 'text-emerald-400' : 'text-emerald-500'}`}>
              {minutesToday}
            </div>
            <div className={`text-[9px] uppercase tracking-wider ${isDesktop ? 'text-white/30' : 'text-muted-foreground'}`}>Minutes</div>
          </div>
          <div className={`text-center p-2 rounded-lg ${isDesktop ? 'bg-white/5' : 'bg-muted/50'}`}>
            <div className={`text-lg font-bold tabular-nums ${isDesktop ? 'text-amber-400' : 'text-amber-500'}`}>
              {streak}
            </div>
            <div className={`text-[9px] uppercase tracking-wider ${isDesktop ? 'text-white/30' : 'text-muted-foreground'}`}>
              <Flame className="h-2.5 w-2.5 inline mr-0.5" />Streak
            </div>
          </div>

          {/* Daily goal editor */}
          <div className="col-span-3 flex items-center justify-center gap-2 mt-1">
            {editingGoal ? (
              <>
                <span className={`text-[10px] ${isDesktop ? 'text-white/40' : 'text-muted-foreground'}`}>Goal:</span>
                <Input
                  type="number" value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  className="h-6 w-14 text-center text-xs"
                  min={1} max={99}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && saveGoal()}
                />
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={saveGoal}>
                  <Check className={`h-3 w-3 ${isDesktop ? 'text-white/60' : ''}`} />
                </Button>
              </>
            ) : (
              <button
                onClick={() => { setGoalInput(String(dailyGoal)); setEditingGoal(true); }}
                className={`text-[10px] flex items-center gap-1 ${isDesktop ? 'text-white/30 hover:text-white/50' : 'text-muted-foreground'}`}
              >
                <Edit2 className="h-2.5 w-2.5" />
                Goal: {dailyGoal} sessions/day
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
