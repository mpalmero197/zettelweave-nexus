import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { HABIT_COLORS, type Habit } from '@/components/bullet-journal/types';

type DbHabit = {
  id: string;
  user_id: string;
  title: string;
  frequency: string;
  start_date: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type DbCompletion = {
  id: string;
  habit_id: string;
  user_id: string;
  completed_on: string;
  notes: string | null;
};

/**
 * Supabase-backed habits store. Single source of truth shared by
 * the BulletJournal and Calendar screens.
 */
export function useHabitsStore() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setHabits([]);
      return;
    }
    setLoading(true);
    try {
      const { data: habitRows, error: habitErr } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });
      if (habitErr) throw habitErr;
      const habitsDb = (habitRows ?? []) as DbHabit[];

      let completions: DbCompletion[] = [];
      if (habitsDb.length > 0) {
        const { data: completionRows, error: completionErr } = await supabase
          .from('habit_completions')
          .select('*')
          .eq('user_id', user.id)
          .in('habit_id', habitsDb.map(h => h.id));
        if (completionErr) throw completionErr;
        completions = (completionRows ?? []) as DbCompletion[];
      }

      const byHabitId = new Map<string, Set<string>>();
      for (const c of completions) {
        if (!byHabitId.has(c.habit_id)) byHabitId.set(c.habit_id, new Set());
        byHabitId.get(c.habit_id)!.add(c.completed_on);
      }

      const shaped: Habit[] = habitsDb.map((h, i) => ({
        id: h.id,
        name: h.title,
        color: HABIT_COLORS[i % HABIT_COLORS.length],
        days: Array.from(byHabitId.get(h.id) ?? []).map(date => ({ date, done: true })),
      }));

      setHabits(shaped);
    } catch (err) {
      console.error('Failed to load habits', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const addHabit = useCallback(async (habitTitle: string) => {
    if (!user) throw new Error('Not authenticated');
    const title = habitTitle.trim();
    if (!title) return;
    const { error } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        title,
        frequency: 'daily',
        start_date: new Date().toISOString().slice(0, 10),
      });
    if (error) throw error;
    await load();
  }, [user?.id, load]);

  const deleteHabit = useCallback(async (habitId: string) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId)
      .eq('user_id', user.id);
    if (error) throw error;
    setHabits(prev => prev.filter(h => h.id !== habitId));
  }, [user?.id]);

  const toggleHabitDay = useCallback(async (habitId: string, dateStr: string) => {
    if (!user) throw new Error('Not authenticated');
    const { data: existing, error: existErr } = await supabase
      .from('habit_completions')
      .select('id')
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .eq('completed_on', dateStr)
      .maybeSingle();
    if (existErr) throw existErr;

    if (existing) {
      const { error } = await supabase
        .from('habit_completions')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
      setHabits(prev => prev.map(h =>
        h.id === habitId
          ? { ...h, days: h.days.filter(d => d.date !== dateStr) }
          : h
      ));
    } else {
      const { error } = await supabase
        .from('habit_completions')
        .insert({ user_id: user.id, habit_id: habitId, completed_on: dateStr });
      if (error) throw error;
      setHabits(prev => prev.map(h =>
        h.id === habitId
          ? { ...h, days: [...h.days.filter(d => d.date !== dateStr), { date: dateStr, done: true }] }
          : h
      ));
    }
  }, [user?.id]);

  return { habits, loading, addHabit, toggleHabitDay, deleteHabit, reload: load };
}
