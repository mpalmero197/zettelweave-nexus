import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Plus, Target, Flame, Trophy, TrendingUp, Timer, Edit3, Trash2, ChevronDown, ChevronRight, MoreVertical
} from "lucide-react";
import { PomodoroTimer } from "./PomodoroTimer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  target: number;
  category: string;
  color: string;
  createdAt: Date;
  completions: { date: string; completed: boolean; notes?: string }[];
  streak: number;
  bestStreak: number;
  parentId?: string | null;
}

const HABIT_CATEGORIES = [
  { id: 'health', name: 'Health & Fitness', color: '#22c55e' },
  { id: 'mindfulness', name: 'Mindfulness', color: '#8b5cf6' },
  { id: 'productivity', name: 'Productivity', color: '#3b82f6' },
  { id: 'learning', name: 'Learning', color: '#f59e0b' },
  { id: 'social', name: 'Social', color: '#ec4899' },
  { id: 'creative', name: 'Creative', color: '#06b6d4' },
  { id: 'other', name: 'Other', color: '#6b7280' }
];

const HABIT_COLORS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', 
  '#ec4899', '#06b6d4', '#ef4444', '#84cc16'
];

// --- SVG Radial Ring ---
function RadialRing({ size = 64, strokeWidth = 4, progress = 0, color = '#3b82f6', children }: {
  size?: number; strokeWidth?: number; progress: number; color: string; children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="habit-ring -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="habit-ring-progress" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// --- Contribution Heatmap ---
function ContributionHeatmap({ habits }: { habits: Habit[] }) {
  const heatmapData = useMemo(() => {
    const data: Record<string, number> = {};
    const totalHabits = habits.length || 1;

    habits.forEach(habit => {
      habit.completions.forEach(c => {
        if (c.completed) {
          data[c.date] = (data[c.date] || 0) + 1;
        }
      });
    });

    // Build 52 weeks x 7 days grid (most recent on the right)
    const cells: { date: string; level: number; count: number }[] = [];
    const today = new Date();
    // Find the next Saturday (end of row) to align the grid
    const endDay = new Date(today);
    endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));

    for (let i = 52 * 7 - 1; i >= 0; i--) {
      const d = new Date(endDay);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = data[dateStr] || 0;
      const pct = count / totalHabits;
      const level = pct === 0 ? 0 : pct <= 0.25 ? 1 : pct <= 0.5 ? 2 : pct <= 0.75 ? 3 : 4;
      cells.push({ date: dateStr, level, count });
    }

    return cells;
  }, [habits]);

  const months = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let lastMonth = -1;
    
    heatmapData.forEach((cell, i) => {
      const col = Math.floor(i / 7);
      const month = new Date(cell.date).getMonth();
      if (month !== lastMonth) {
        labels.push({ label: monthNames[month], col });
        lastMonth = month;
      }
    });
    return labels;
  }, [heatmapData]);

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">Activity</span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0,1,2,3,4].map(l => (
            <div key={l} className={`heatmap-cell heatmap-level-${l}`} />
          ))}
          <span>More</span>
        </div>
      </div>
      {/* Month labels */}
      <div className="heatmap-months mb-1">
        {months.map((m, i) => (
          <span key={i} className="text-[10px] text-muted-foreground" 
            style={{ gridColumnStart: m.col + 1 }}>{m.label}</span>
        ))}
      </div>
      {/* Grid */}
      <div className="heatmap-grid">
        {heatmapData.map((cell, i) => (
          <div key={i} className={`heatmap-cell heatmap-level-${cell.level}`}
            title={`${cell.date}: ${cell.count} habit${cell.count !== 1 ? 's' : ''} completed`} />
        ))}
      </div>
    </div>
  );
}

// --- Stats Strip ---
function StatsStrip({ habits }: { habits: Habit[] }) {
  const stats = useMemo(() => {
    const activeStreaks = habits.filter(h => h.streak > 0).length;
    const totalCompletions = habits.reduce((s, h) => s + h.completions.filter(c => c.completed).length, 0);
    const totalPossible = habits.reduce((s, h) => {
      const days = Math.floor((Date.now() - h.createdAt.getTime()) / 86400000) + 1;
      return s + Math.min(days, 365);
    }, 0);
    const rate = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;
    const best = Math.max(...habits.map(h => h.bestStreak), 0);
    return [
      { label: 'Habits', value: habits.length, icon: Target, accent: 'hsl(var(--primary))' },
      { label: 'Streaks', value: activeStreaks, icon: Flame, accent: '#f97316' },
      { label: 'Rate', value: `${rate}%`, icon: TrendingUp, accent: '#3b82f6' },
      { label: 'Best', value: best, icon: Trophy, accent: '#eab308' },
    ];
  }, [habits]);

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map(({ label, value, icon: Icon, accent }) => (
        <div key={label} className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-2"
          style={{ borderLeftColor: accent, borderLeftWidth: 3 }}>
          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight truncate">{value}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Habit Form Sheet ---
function HabitFormSheet({ open, onOpenChange, onSubmit, initial, trigger }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onSubmit: (data: any) => void; initial?: Habit | null;
  trigger?: React.ReactNode;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [desc, setDesc] = useState(initial?.description || '');
  const [freq, setFreq] = useState(initial?.frequency || 'daily');
  const [target, setTarget] = useState(String(initial?.target || 1));
  const [category, setCategory] = useState(initial?.category || 'productivity');
  const [color, setColor] = useState(initial?.color || HABIT_COLORS[0]);

  useEffect(() => {
    if (open) {
      setName(initial?.name || '');
      setDesc(initial?.description || '');
      setFreq(initial?.frequency || 'daily');
      setTarget(String(initial?.target || 1));
      setCategory(initial?.category || 'productivity');
      setColor(initial?.color || HABIT_COLORS[0]);
    }
  }, [open, initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: desc, frequency: freq, target: parseInt(target) || 1, category, color });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side="bottom" className="max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>{initial ? 'Edit Habit' : 'New Habit'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning run" required />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frequency</Label>
              <Select value={freq} onValueChange={v => setFreq(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target</Label>
              <Input type="number" value={target} onChange={e => setTarget(e.target.value)} min="1" />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HABIT_CATEGORIES.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-1">
              {HABIT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn("w-7 h-7 rounded-full transition-all", color === c && "ring-2 ring-offset-2 ring-primary")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full">{initial ? 'Save Changes' : 'Create Habit'}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// --- Main Component ---
const habitsTable = () => supabase.from('habits' as any);
const completionsTable = () => supabase.from('habit_completions' as any);

export default function HabitTracker() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [expandedHabits, setExpandedHabits] = useState<Set<string>>(new Set());
  const [addingSubHabitFor, setAddingSubHabitFor] = useState<string | null>(null);
  const [subHabitName, setSubHabitName] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // Load from Supabase
  const loadHabits = useCallback(async () => {
    if (!user) return;
    const { data: habitsData } = await habitsTable()
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!habitsData) return;
    
    const { data: completionsData } = await completionsTable()
      .select('*')
      .eq('user_id', user.id);
    
    const completionsByHabit: Record<string, { date: string; completed: boolean; notes?: string }[]> = {};
    (completionsData as any[] || []).forEach((c: any) => {
      if (!completionsByHabit[c.habit_id]) completionsByHabit[c.habit_id] = [];
      completionsByHabit[c.habit_id].push({ date: c.completion_date, completed: c.completed, notes: c.notes });
    });

    setHabits((habitsData as any[]).map((h: any) => ({
      id: h.id,
      name: h.name,
      description: h.description || '',
      frequency: h.frequency,
      target: h.target,
      category: h.category,
      color: h.color,
      createdAt: new Date(h.created_at),
      completions: completionsByHabit[h.id] || [],
      streak: h.streak,
      bestStreak: h.best_streak,
      parentId: h.parent_id || null,
    })));
  }, [user]);

  useEffect(() => { loadHabits(); }, [loadHabits]);

  // BulletJournal integration
  const addHabitFromTask = (taskName: string) => {
    const exists = habits.find(h => h.name.toLowerCase() === taskName.toLowerCase());
    if (exists) { toast(`Habit "${taskName}" already exists`); return; }
    createHabit({ name: taskName, description: 'From bullet journal', frequency: 'daily', target: 1, category: 'productivity', color: HABIT_COLORS[habits.length % HABIT_COLORS.length] });
  };

  useEffect(() => {
    (window as any).__addHabitFromTask = addHabitFromTask;
    return () => { delete (window as any).__addHabitFromTask; };
  }, [habits]);

  const toggleHabitCompletion = (habitId: string) => {
    setHabits(prev => prev.map(habit => {
      if (habit.id !== habitId) return habit;
      const isCompleted = habit.completions.some(c => c.date === today && c.completed);
      let updatedCompletions = habit.completions.filter(c => c.date !== today);
      if (!isCompleted) updatedCompletions.push({ date: today, completed: true });

      // Recalculate streak
      const sorted = updatedCompletions.filter(c => c.completed).sort((a,b) => b.date.localeCompare(a.date));
      let streak = 0;
      for (let i = 0; i < sorted.length; i++) {
        const expected = new Date(); expected.setDate(expected.getDate() - i);
        if (sorted[i].date === expected.toISOString().split('T')[0]) streak++; else break;
      }
      return { ...habit, completions: updatedCompletions, streak, bestStreak: Math.max(habit.bestStreak, streak) };
    }));
  };

  const createHabit = (data: any) => {
    const newHabit: Habit = {
      ...data, id: crypto.randomUUID(), createdAt: new Date(),
      completions: [], streak: 0, bestStreak: 0, parentId: null
    };
    setHabits(prev => [...prev, newHabit]);
    toast(`Habit "${data.name}" created!`);
  };

  const createSubHabit = (parentId: string, name: string) => {
    const parent = habits.find(h => h.id === parentId);
    if (!parent || !name.trim()) return;
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: '',
      frequency: parent.frequency,
      target: 1,
      category: parent.category,
      color: parent.color,
      createdAt: new Date(),
      completions: [],
      streak: 0,
      bestStreak: 0,
      parentId,
    };
    setHabits(prev => [...prev, newHabit]);
    toast(`Sub-habit "${name.trim()}" added!`);
    setSubHabitName('');
    setAddingSubHabitFor(null);
  };

  const updateHabit = (data: any) => {
    if (!editingHabit) return;
    setHabits(prev => prev.map(h => h.id === editingHabit.id ? { ...h, ...data } : h));
    setEditingHabit(null);
    toast('Habit updated!');
  };

  const deleteHabit = (id: string) => {
    // Also delete sub-habits
    setHabits(prev => prev.filter(h => h.id !== id && h.parentId !== id));
    toast('Habit deleted');
  };

  const toggleExpand = (id: string) => {
    setExpandedHabits(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Only root habits for the main grid; subhabits rendered inline
  const rootHabits = habits.filter(h => !h.parentId);
  const subHabitMap = habits.reduce<Record<string, Habit[]>>((acc, h) => {
    if (h.parentId) acc[h.parentId] = [...(acc[h.parentId] || []), h];
    return acc;
  }, {});

  const todaysHabits = rootHabits.map(h => ({
    ...h,
    isCompletedToday: h.completions.some(c => c.date === today && c.completed)
  }));
  const completedCount = todaysHabits.filter(h => h.isCompletedToday).length;
  const progressPct = todaysHabits.length > 0 ? (completedCount / todaysHabits.length) * 100 : 0;

  // --- Empty state ---
  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Target className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-1">Habit Studio</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Build better habits with visual streaks, heatmaps, and a built-in focus timer.
        </p>
        <HabitFormSheet open={sheetOpen} onOpenChange={setSheetOpen} onSubmit={createHabit}
          trigger={<Button><Plus className="h-4 w-4 mr-2" />Create Your First Habit</Button>} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* --- Header --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Habit Studio
          </h1>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPomodoroOpen(!pomodoroOpen)}>
            <Timer className="h-3.5 w-3.5 mr-1" />
            Focus
          </Button>
          <HabitFormSheet open={sheetOpen} onOpenChange={setSheetOpen} onSubmit={createHabit}
            trigger={<Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>} />
        </div>
      </div>

      {/* --- Stats Strip --- */}
      <StatsStrip habits={rootHabits} />

      {/* --- Heatmap --- */}
      <ContributionHeatmap habits={rootHabits} />

      {/* --- Today's Progress --- */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Today's Progress</span>
          <span className="text-xs font-medium">
            {completedCount}/{todaysHabits.length}
            {progressPct === 100 && ' 🎉'}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* --- Habit Grid --- */}
      <div className="space-y-3">
        {todaysHabits.map(habit => {
          const subs = subHabitMap[habit.id] || [];
          const hasSubs = subs.length > 0;
          const isExpanded = expandedHabits.has(habit.id);
          const isAddingSub = addingSubHabitFor === habit.id;
          const subsDoneToday = subs.filter(s => s.completions.some(c => c.date === today && c.completed)).length;

          return (
            <div key={habit.id} className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
              {/* Main habit row */}
              <div
                className={cn(
                  "group relative flex items-center gap-3 p-3 transition-all cursor-pointer hover:bg-accent/30",
                  habit.isCompletedToday && "bg-primary/5"
                )}
                onClick={() => toggleHabitCompletion(habit.id)}
              >
                <RadialRing size={44} strokeWidth={3} progress={habit.isCompletedToday ? 100 : 0} color={habit.color}>
                  {habit.isCompletedToday ? (
                    <span className="text-xs">✓</span>
                  ) : (
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: habit.color }} />
                  )}
                </RadialRing>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-sm font-medium leading-tight truncate",
                      habit.isCompletedToday && "text-muted-foreground line-through"
                    )}>
                      {habit.name}
                    </span>
                    {hasSubs && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {subsDoneToday}/{subs.length}
                      </span>
                    )}
                  </div>
                  {habit.streak > 0 && (
                    <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 gap-0.5 mt-0.5", habit.streak >= 7 && "habit-streak-flame")}>
                      <Flame className="h-2.5 w-2.5" />{habit.streak}
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Add sub-habit"
                    onClick={() => { setAddingSubHabitFor(isAddingSub ? null : habit.id); setSubHabitName(''); if (!isExpanded) toggleExpand(habit.id); }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  {hasSubs && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                      onClick={() => toggleExpand(habit.id)}>
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingHabit(habit); }}>
                        <Edit3 className="h-3 w-3 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteHabit(habit.id)}>
                        <Trash2 className="h-3 w-3 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Sub-habit add form */}
              {isAddingSub && (
                <div className="px-3 pb-2 flex gap-2 border-t border-border/30 pt-2 bg-muted/20">
                  <Input
                    value={subHabitName}
                    onChange={e => setSubHabitName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') createSubHabit(habit.id, subHabitName);
                      if (e.key === 'Escape') { setAddingSubHabitFor(null); setSubHabitName(''); }
                    }}
                    placeholder="Sub-habit name..."
                    className="text-xs h-7"
                    autoFocus
                  />
                  <Button onClick={() => createSubHabit(habit.id, subHabitName)} disabled={!subHabitName.trim()} size="sm" className="h-7 px-2 shrink-0">
                    Add
                  </Button>
                </div>
              )}

              {/* Sub-habits */}
              {isExpanded && hasSubs && (
                <div className="border-t border-border/30 bg-muted/10">
                  {subs.map(sub => {
                    const subDone = sub.completions.some(c => c.date === today && c.completed);
                    return (
                      <div
                        key={sub.id}
                        className={cn(
                          "group flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-accent/20 transition-colors border-b border-border/20 last:border-0",
                          subDone && "opacity-60"
                        )}
                        onClick={() => toggleHabitCompletion(sub.id)}
                      >
                        <div className="w-3 h-3 rounded-full shrink-0 border-2 flex items-center justify-center"
                          style={{ borderColor: sub.color, backgroundColor: subDone ? sub.color : 'transparent' }}>
                          {subDone && <span className="text-[8px] text-white font-bold">✓</span>}
                        </div>
                        <span className={cn("text-xs flex-1 truncate", subDone && "line-through text-muted-foreground")}>
                          {sub.name}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setEditingHabit(sub)}>
                            <Edit3 className="h-2.5 w-2.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => deleteHabit(sub.id)}>
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- Inline Pomodoro --- */}
      <Collapsible open={pomodoroOpen} onOpenChange={setPomodoroOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
            <Timer className="h-3.5 w-3.5" />
            <span>Focus Timer</span>
            <ChevronDown className={cn("h-3 w-3 ml-auto transition-transform", pomodoroOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="rounded-lg border border-border/50 bg-card/50 p-4">
            <PomodoroTimer habits={rootHabits} compact />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit sheet */}
      <HabitFormSheet open={!!editingHabit} onOpenChange={v => { if (!v) setEditingHabit(null); }}
        onSubmit={updateHabit} initial={editingHabit} />
    </div>
  );
}
