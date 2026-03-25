import React, { useState, useMemo } from 'react';
import { Habit, HABIT_COLORS } from './types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { toast } from 'sonner';

interface HabitTrackerProps {
  habits: Habit[];
  onAdd: (habit: Habit) => void;
  onToggle: (habitId: string, date: string) => void;
  onDelete: (id: string) => void;
}

const DAYS_SHOWN = 14;

export const HabitTrackerComponent: React.FC<HabitTrackerProps> = ({ habits, onAdd, onToggle, onDelete }) => {
  const [newName, setNewName] = useState('');

  const dates = useMemo(() =>
    Array.from({ length: DAYS_SHOWN }, (_, i) =>
      format(subDays(new Date(), DAYS_SHOWN - 1 - i), 'yyyy-MM-dd')
    ), []
  );

  const addHabit = () => {
    const name = newName.trim();
    if (!name) return;
    const habit: Habit = {
      id: crypto.randomUUID(),
      name,
      days: [],
      color: HABIT_COLORS[habits.length % HABIT_COLORS.length],
    };
    onAdd(habit);
    setNewName('');
    toast.success('Habit added');
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Track daily habits over the last {DAYS_SHOWN} days.</p>

      {habits.length > 0 && (
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground min-w-[120px]">Habit</th>
                {dates.map(d => (
                  <th key={d} className="px-1 py-2 text-center font-mono text-[10px] text-muted-foreground/60 min-w-[28px]">
                    {format(new Date(d + 'T12:00:00'), 'd')}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {habits.map(habit => {
                const streak = getStreak(habit, dates);
                return (
                  <tr key={habit.id} className="border-b border-border/10 hover:bg-accent/10 group">
                    <td className="px-3 py-2 text-foreground font-medium flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                      <span className="truncate">{habit.name}</span>
                      {streak > 0 && (
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">{streak}d</span>
                      )}
                    </td>
                    {dates.map(d => {
                      const done = habit.days.some(day => day.date === d && day.done);
                      return (
                        <td key={d} className="px-1 py-2 text-center">
                          <button
                            onClick={() => onToggle(habit.id, d)}
                            className={`w-5 h-5 rounded-md transition-all ${
                              done
                                ? 'shadow-sm'
                                : 'border border-border/40 hover:border-border'
                            }`}
                            style={done ? { backgroundColor: habit.color } : undefined}
                          />
                        </td>
                      );
                    })}
                    <td className="px-1 py-2">
                      <button
                        onClick={() => onDelete(habit.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add habit */}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHabit(); } }}
          placeholder="New habit…"
          className="flex-1 h-8 text-sm"
        />
        <Button size="sm" onClick={addHabit} disabled={!newName.trim()} className="h-8 gap-1">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
};

function getStreak(habit: Habit, dates: string[]): number {
  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (habit.days.some(d => d.date === dates[i] && d.done)) streak++;
    else break;
  }
  return streak;
}
