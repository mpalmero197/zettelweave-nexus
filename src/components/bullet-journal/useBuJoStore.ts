import { useState, useEffect, useCallback } from 'react';
import { BuJoData, BulletEntry, Habit, CustomCollection } from './types';

const STORAGE_KEY = 'bujo-data';

const defaultData: BuJoData = { entries: [], habits: [], collections: [] };

function load(): BuJoData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);
    return { ...defaultData, ...parsed };
  } catch {
    return defaultData;
  }
}

export function useBuJoStore() {
  const [data, setData] = useState<BuJoData>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const addEntry = useCallback((entry: BulletEntry) => {
    setData(d => ({ ...d, entries: [entry, ...d.entries] }));
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<BulletEntry>) => {
    setData(d => ({
      ...d,
      entries: d.entries.map(e => e.id === id ? { ...e, ...patch } : e),
    }));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setData(d => ({ ...d, entries: d.entries.filter(e => e.id !== id) }));
  }, []);

  const addHabit = useCallback((habit: Habit) => {
    setData(d => ({ ...d, habits: [...d.habits, habit] }));
  }, []);

  const toggleHabitDay = useCallback((habitId: string, dateStr: string) => {
    setData(d => ({
      ...d,
      habits: d.habits.map(h => {
        if (h.id !== habitId) return h;
        const existing = h.days.find(d => d.date === dateStr);
        if (existing) {
          return { ...h, days: h.days.map(d => d.date === dateStr ? { ...d, done: !d.done } : d) };
        }
        return { ...h, days: [...h.days, { date: dateStr, done: true }] };
      }),
    }));
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setData(d => ({ ...d, habits: d.habits.filter(h => h.id !== id) }));
  }, []);

  const addCollection = useCallback((col: CustomCollection) => {
    setData(d => ({ ...d, collections: [...d.collections, col] }));
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setData(d => ({
      ...d,
      collections: d.collections.filter(c => c.id !== id),
      entries: d.entries.map(e => e.collection === id ? { ...e, collection: undefined } : e),
    }));
  }, []);

  return {
    data,
    addEntry,
    updateEntry,
    deleteEntry,
    addHabit,
    toggleHabitDay,
    deleteHabit,
    addCollection,
    deleteCollection,
  };
}
