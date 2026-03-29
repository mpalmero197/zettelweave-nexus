import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Flame, Plus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

interface Habit { id: string; name: string; checkins: string[]; }

const STORAGE_KEY = 'pendragon-habit-streaks';
const today = () => new Date().toISOString().slice(0, 10);

function getStreak(checkins: string[]): number {
  const sorted = [...new Set(checkins)].sort().reverse();
  if (!sorted.length) return 0;
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().slice(0, 10);
    if (sorted.includes(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else if (i === 0) { d.setDate(d.getDate() - 1); continue; }
    else break;
  }
  return streak;
}

function HeatmapGrid({ checkins }: { checkins: string[] }) {
  const cells: { date: string; active: boolean }[] = [];
  const d = new Date();
  for (let i = 27; i >= 0; i--) {
    const nd = new Date(d);
    nd.setDate(nd.getDate() - i);
    const ds = nd.toISOString().slice(0, 10);
    cells.push({ date: ds, active: checkins.includes(ds) });
  }
  return (
    <div className="grid grid-cols-7 gap-1">
      {cells.map(c => (
        <div key={c.date} title={c.date}
          className={`w-5 h-5 rounded-sm ${c.active ? 'bg-primary' : 'bg-muted'}`} />
      ))}
    </div>
  );
}

export function HabitStreakPlugin({ onClose }: PluginProps) {
  const [habits, setHabits] = useState<Habit[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [newName, setNewName] = useState('');

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(habits)); }, [habits]);

  const addHabit = () => {
    if (!newName.trim()) return;
    setHabits(p => [...p, { id: crypto.randomUUID(), name: newName.trim(), checkins: [] }]);
    setNewName(''); toast.success('Habit added!');
  };

  const checkin = (id: string) => {
    const t = today();
    setHabits(p => p.map(h => h.id === id
      ? { ...h, checkins: h.checkins.includes(t) ? h.checkins : [...h.checkins, t] }
      : h));
    toast.success('Checked in! 🔥');
  };

  const remove = (id: string) => setHabits(p => p.filter(h => h.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="New habit..." value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addHabit()} />
        <Button onClick={addHabit} size="sm"><Plus className="h-4 w-4" /></Button>
      </div>

      {habits.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Add a habit to start tracking streaks.</p>}

      {habits.map(h => {
        const streak = getStreak(h.checkins);
        const doneToday = h.checkins.includes(today());
        return (
          <div key={h.id} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{h.name}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1"><Flame className="h-3 w-3" />{streak}d</Badge>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => remove(h.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
            <HeatmapGrid checkins={h.checkins} />
            <Button size="sm" variant={doneToday ? 'secondary' : 'default'} className="w-full text-xs"
              disabled={doneToday} onClick={() => checkin(h.id)}>
              <Check className="h-3 w-3 mr-1" />{doneToday ? 'Done today' : 'Check in'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
