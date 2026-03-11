import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Plus, Flame } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Habit {
  id: string;
  name: string;
  color: string;
  streak: number;
  completions: { date: string; completed: boolean }[];
}

function MiniRing({ size = 28, progress = 0, color = '#3b82f6' }: { size?: number; progress: number; color: string }) {
  const sw = 3;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-500" />
    </svg>
  );
}

export function HabitTrackerWidget() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);

  const loadHabits = useCallback(async () => {
    if (!user) return;
    const { data: habitsData } = await (supabase.from('habits' as any))
      .select('*')
      .eq('user_id', user.id);
    if (!habitsData) return;
    const { data: completionsData } = await (supabase.from('habit_completions' as any))
      .select('*')
      .eq('user_id', user.id);
    const byHabit: Record<string, { date: string; completed: boolean }[]> = {};
    (completionsData as any[] || []).forEach((c: any) => {
      if (!byHabit[c.habit_id]) byHabit[c.habit_id] = [];
      byHabit[c.habit_id].push({ date: c.completion_date, completed: c.completed });
    });
    setHabits((habitsData as any[]).map((h: any) => ({
      id: h.id, name: h.name, color: h.color, streak: h.streak,
      completions: byHabit[h.id] || [],
    })));
  }, [user]);

  useEffect(() => { loadHabits(); }, [loadHabits]);
  
  const isMobile = useIsMobile();
  const today = new Date().toISOString().split('T')[0];
  
  const todaysHabits = habits.map(habit => ({
    ...habit,
    isCompletedToday: habit.completions.some(c => c.date === today && c.completed)
  }));
  
  const completedToday = todaysHabits.filter(h => h.isCompletedToday).length;
  const progressPct = todaysHabits.length > 0 ? (completedToday / todaysHabits.length) * 100 : 0;

  if (habits.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />Habits
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-6">
          <Activity className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">No habits yet</p>
          <Button size="sm" onClick={() => window.location.hash = 'habits'}>
            <Plus className="h-3 w-3 mr-1" />Add Habit
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />Today
          </CardTitle>
          <Badge variant={progressPct === 100 ? "default" : "secondary"} className="text-xs">
            {completedToday}/{todaysHabits.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mini progress bar */}
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Habit rings */}
        <div className="flex flex-wrap gap-3">
          {todaysHabits.slice(0, isMobile ? 4 : 6).map(habit => (
            <div key={habit.id} className="flex flex-col items-center gap-1">
              <div className="relative">
                <MiniRing size={32} progress={habit.isCompletedToday ? 100 : 0} color={habit.color} />
                {habit.isCompletedToday && (
                  <span className="absolute inset-0 flex items-center justify-center text-[8px]">✓</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground max-w-[48px] truncate text-center">{habit.name}</span>
              {habit.streak > 0 && (
                <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                  <Flame className="h-2 w-2" />{habit.streak}
                </span>
              )}
            </div>
          ))}
        </div>

        {todaysHabits.length > (isMobile ? 4 : 6) && (
          <Button variant="ghost" size="sm" onClick={() => window.location.hash = 'habits'} className="w-full text-xs">
            View All ({todaysHabits.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
