import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, Plus, CheckCircle2, Circle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Habit {
  id: string;
  name: string;
  color: string;
  streak: number;
  completions: { date: string; completed: boolean }[];
}

export function HabitTrackerWidget() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('habit-tracker-data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  
  const isMobile = useIsMobile();
  const today = new Date().toISOString().split('T')[0];
  
  const todaysHabits = habits.map(habit => ({
    ...habit,
    isCompletedToday: habit.completions.some(c => c.date === today && c.completed)
  }));
  
  const completedToday = todaysHabits.filter(h => h.isCompletedToday).length;
  const progressPercentage = todaysHabits.length > 0 ? (completedToday / todaysHabits.length) * 100 : 0;

  const toggleHabit = (habitId: string) => {
    const updatedHabits = habits.map(habit => {
      if (habit.id !== habitId) return habit;

      const existingCompletion = habit.completions.find(c => c.date === today);
      let updatedCompletions;
      
      if (existingCompletion) {
        updatedCompletions = habit.completions.map(c => 
          c.date === today ? { ...c, completed: !c.completed } : c
        );
      } else {
        updatedCompletions = [...habit.completions, { date: today, completed: true }];
      }

      return { ...habit, completions: updatedCompletions };
    });

    setHabits(updatedHabits);
    localStorage.setItem('habit-tracker-data', JSON.stringify(updatedHabits));
  };

  if (habits.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Habits
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-6">
          <Activity className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">No habits yet</p>
          <Button size="sm" onClick={() => window.location.hash = 'habits'}>
            <Plus className="h-3 w-3 mr-1" />
            Add Habit
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Today's Habits
          </CardTitle>
          <Badge variant={progressPercentage === 100 ? "default" : "secondary"} className="text-xs">
            {completedToday}/{todaysHabits.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {progressPercentage === 100 ? "All habits completed! 🎉" : `${Math.round(progressPercentage)}% complete`}
          </p>
        </div>
        
        <div className="space-y-2">
          {todaysHabits.slice(0, isMobile ? 3 : 4).map(habit => (
            <div key={habit.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleHabit(habit.id)}
                  className="p-0 h-auto"
                >
                  {habit.isCompletedToday ? (
                    <CheckCircle2 
                      className="h-4 w-4" 
                      style={{ color: habit.color }}
                    />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <span className={`text-xs truncate ${habit.isCompletedToday ? 'line-through text-muted-foreground' : ''}`}>
                  {habit.name}
                </span>
              </div>
              {habit.streak > 0 && (
                <Badge variant="outline" className="text-xs h-5">
                  {habit.streak}
                </Badge>
              )}
            </div>
          ))}
        </div>
        
        {todaysHabits.length > (isMobile ? 3 : 4) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.location.hash = 'habits'}
            className="w-full text-xs"
          >
            View All ({todaysHabits.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}