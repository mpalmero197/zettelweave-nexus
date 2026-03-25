export type BulletType = 'task' | 'event' | 'note';
export type TaskStatus = 'open' | 'completed' | 'migrated' | 'cancelled';
export type Signifier = 'priority' | 'inspiration' | 'explore' | null;

export interface BulletEntry {
  id: string;
  type: BulletType;
  content: string;
  status: TaskStatus;
  signifier: Signifier;
  date: string; // ISO
  tags: string[];
  collection?: string; // custom collection id
}

export interface HabitDay {
  date: string; // YYYY-MM-DD
  done: boolean;
}

export interface Habit {
  id: string;
  name: string;
  days: HabitDay[];
  color: string;
}

export interface CustomCollection {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
}

export interface BuJoData {
  entries: BulletEntry[];
  habits: Habit[];
  collections: CustomCollection[];
}

export const SIGNIFIER_MAP: Record<string, { symbol: string; label: string; color: string }> = {
  priority: { symbol: '★', label: 'Priority', color: 'text-amber-500' },
  inspiration: { symbol: '!', label: 'Inspiration', color: 'text-emerald-500' },
  explore: { symbol: '?', label: 'Explore', color: 'text-blue-500' },
};

export const BULLET_SYMBOLS: Record<BulletType, string> = {
  task: '•',
  event: '○',
  note: '—',
};

export const HABIT_COLORS = [
  'hsl(var(--primary))',
  'hsl(200, 60%, 50%)',
  'hsl(150, 60%, 40%)',
  'hsl(350, 60%, 50%)',
  'hsl(270, 50%, 55%)',
  'hsl(30, 70%, 50%)',
];
