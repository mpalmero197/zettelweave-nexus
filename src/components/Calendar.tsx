import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useHabitsStore } from '@/hooks/useHabitsStore';
import {
  format, isSameDay, isSameMonth, parseISO, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths,
  isToday, isTomorrow, isThisWeek, isBefore, startOfDay, addWeeks, subWeeks,
  addDays, subDays, eachHourOfInterval, startOfHour, setHours, differenceInMinutes,
  getHours, getMinutes, isWithinInterval, endOfDay
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Pencil, X, Check,
  Calendar as CalendarIcon, ListTodo, Activity, Clock, MapPin,
  User, Mail, Bell, Repeat, Eye, LayoutGrid, List, Columns,
  Search, Filter, Tag, Copy, MoreHorizontal, ChevronDown,
  Video, Phone, Globe, Briefcase, Heart, Star, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ReminderPicker } from '@/components/notifications/ReminderPicker';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  client_name?: string;
  client_email?: string;
  event_category?: string;
  color?: string;
  reminder_minutes?: number;
  is_recurring?: boolean;
  recurrence_rule?: string;
  status?: string;
  is_all_day?: boolean;
  source_type: string;
  source_id: string;
  created_at: string;
}

interface CalendarItem {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  client_name?: string;
  client_email?: string;
  event_category?: string;
  color?: string;
  status?: string;
  is_all_day?: boolean;
  source_type: string;
  taskStatus?: string;
  taskId?: string;
}

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

const CATEGORIES = [
  { value: 'event', label: 'Event', icon: CalendarIcon, color: 'hsl(var(--primary))' },
  { value: 'appointment', label: 'Appointment', icon: Briefcase, color: '#64748b' },
  { value: 'meeting', label: 'Meeting', icon: Video, color: '#3b82f6' },
  { value: 'call', label: 'Phone Call', icon: Phone, color: '#22c55e' },
  { value: 'personal', label: 'Personal', icon: Heart, color: '#ec4899' },
  { value: 'deadline', label: 'Deadline', icon: AlertCircle, color: '#ef4444' },
  { value: 'reminder', label: 'Reminder', icon: Bell, color: '#f59e0b' },
];

const CATEGORY_COLORS: Record<string, string> = {
  event: 'bg-primary',
  appointment: 'bg-slate-500',
  meeting: 'bg-blue-500',
  call: 'bg-green-500',
  personal: 'bg-pink-500',
  deadline: 'bg-red-500',
  reminder: 'bg-amber-500',
};

const CATEGORY_BORDER_COLORS: Record<string, string> = {
  event: 'border-l-primary',
  appointment: 'border-l-violet-500',
  meeting: 'border-l-blue-500',
  call: 'border-l-green-500',
  personal: 'border-l-pink-500',
  deadline: 'border-l-red-500',
  reminder: 'border-l-amber-500',
};

const SOURCE_DOT_COLORS: Record<string, string> = {
  zettel_card: 'bg-primary',
  note: 'bg-blue-500',
  scratch_pad: 'bg-slate-500',
  sticky_note: 'bg-yellow-500',
  manual: 'bg-orange-500',
  task: 'bg-rose-500',
  task_done: 'bg-green-500',
  habit: 'bg-teal-500',
};

const SOURCE_BORDER_COLORS: Record<string, string> = {
  zettel_card: 'border-l-primary',
  note: 'border-l-blue-500',
  scratch_pad: 'border-l-purple-500',
  sticky_note: 'border-l-yellow-500',
  manual: 'border-l-orange-500',
  task: 'border-l-rose-500',
  task_done: 'border-l-green-500',
  habit: 'border-l-teal-500',
};

const SOURCE_LABELS: Record<string, string> = {
  zettel_card: 'Zettel',
  note: 'Note',
  scratch_pad: 'Scratch Pad',
  sticky_note: 'Sticky',
  manual: 'Event',
  task: 'Task',
  task_done: 'Done',
  habit: 'Habit',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-500' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500' },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const REMINDER_OPTIONS = [
  { value: 0, label: 'At time of event' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTime(t?: string) {
  if (!t) return null;
  try { return format(new Date(`2000-01-01T${t}`), 'h:mm a'); }
  catch { return t; }
}

function dateLabel(d: Date) {
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isThisWeek(d)) return format(d, 'EEEE');
  return format(d, 'EEE, MMM d');
}

function getCategoryDotColor(item: CalendarItem): string {
  if (item.source_type === 'manual' && item.event_category) {
    return CATEGORY_COLORS[item.event_category] || 'bg-orange-500';
  }
  return SOURCE_DOT_COLORS[item.source_type] || 'bg-muted-foreground';
}

function getCategoryBorderColor(item: CalendarItem): string {
  if (item.source_type === 'manual' && item.event_category) {
    return CATEGORY_BORDER_COLORS[item.event_category] || 'border-l-orange-500';
  }
  return SOURCE_BORDER_COLORS[item.source_type] || 'border-l-muted-foreground';
}

function getItemLabel(item: CalendarItem): string {
  if (item.source_type === 'manual' && item.event_category) {
    const cat = CATEGORIES.find(c => c.value === item.event_category);
    return cat?.label || 'Event';
  }
  return SOURCE_LABELS[item.source_type] || 'Event';
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Calendar() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { habits: habitsList, addHabit: addHabitToStore, reload: reloadHabits } = useHabitsStore();

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allItems, setAllItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Quick-add
  const [quickTitle, setQuickTitle] = useState('');
  const quickRef = useRef<HTMLInputElement>(null);

  // Full add dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItemType, setNewItemType] = useState<'event' | 'task' | 'habit'>('event');
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', event_time: '', end_time: '',
    duration_minutes: 30, location: '', client_name: '', client_email: '',
    event_category: 'event', reminder_minutes: undefined as number | undefined,
    is_recurring: false, recurrence_rule: '', status: 'confirmed', is_all_day: false,
  });
  const [newTask, setNewTask] = useState({ name: '', priority: 'medium', notes: '' });
  const [newHabit, setNewHabit] = useState({ name: '', color: '#3b82f6' });

  // Detail view
  const [viewingItem, setViewingItem] = useState<CalendarItem | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ title: '', description: '', event_time: '' });

  /* ---------- data ---------- */

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      const { data: evData } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });
      const calEvents: CalendarEvent[] = (evData || []) as any[];
      setEvents(calEvents);

      const { data: taskData } = await supabase
        .from('project_tasks')
        .select('id, name, status, due_date, priority, notes')
        .eq('user_id', user.id);

      const taskItems: CalendarItem[] = (taskData || []).map((t: any) => ({
        id: `task-${t.id}`,
        title: t.name,
        description: t.notes,
        event_date: t.due_date,
        source_type: t.status === 'done' ? 'task_done' : 'task',
        taskStatus: t.status,
        taskId: t.id,
      }));

      const habitItems: CalendarItem[] = [];
      try {
        const { data: completionsData } = await (supabase.from('habit_completions' as any))
          .select('*, habits:habit_id(name)')
          .eq('user_id', user.id);
        if (completionsData && Array.isArray(completionsData)) {
          for (const c of completionsData as any[]) {
            if (c.completed && c.completion_date) {
              habitItems.push({
                id: `habit-${c.habit_id}-${c.completion_date}`,
                title: c.habits?.name || 'Habit',
                event_date: c.completion_date,
                source_type: 'habit',
              });
            }
          }
        }
      } catch {}

      const calItems: CalendarItem[] = [
        ...calEvents.map(ev => ({
          id: ev.id,
          title: ev.title,
          description: ev.description,
          event_date: ev.event_date,
          event_time: ev.event_time,
          end_time: ev.end_time,
          duration_minutes: ev.duration_minutes,
          location: ev.location,
          client_name: ev.client_name,
          client_email: ev.client_email,
          event_category: ev.event_category,
          color: ev.color,
          status: ev.status,
          is_all_day: ev.is_all_day,
          source_type: ev.source_type,
        })),
        ...taskItems,
        ...habitItems,
      ];

      setAllItems(calItems);
    } catch (e) {
      console.error('Error fetching calendar events:', e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) fetchEvents(); }, [user, fetchEvents]);

  /* ---------- derived ---------- */

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.client_name?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q)
      );
    }
    if (filterCategory !== 'all') {
      items = items.filter(i => {
        if (filterCategory === 'tasks') return i.source_type === 'task' || i.source_type === 'task_done';
        if (filterCategory === 'habits') return i.source_type === 'habit';
        return i.event_category === filterCategory;
      });
    }
    return items;
  }, [allItems, searchQuery, filterCategory]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of filteredItems) {
      const key = item.event_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [filteredItems]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: currentWeekStart, end: addDays(currentWeekStart, 6) });
  }, [currentWeekStart]);

  const selectedDayItems = useMemo(
    () => filteredItems
      .filter(item => isSameDay(parseISO(item.event_date), selectedDate))
      .sort((a, b) => {
        if (a.is_all_day && !b.is_all_day) return -1;
        if (!a.is_all_day && b.is_all_day) return 1;
        return (a.event_time || '99:99').localeCompare(b.event_time || '99:99');
      }),
    [filteredItems, selectedDate]
  );

  const upcomingGrouped = useMemo(() => {
    const today = startOfDay(new Date());
    const upcoming = filteredItems
      .filter(item => !isBefore(parseISO(item.event_date), today))
      .sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.event_time || '').localeCompare(b.event_time || ''));

    const groups: { date: Date; label: string; events: CalendarItem[] }[] = [];
    let lastKey = '';
    for (const item of upcoming) {
      if (item.event_date !== lastKey) {
        lastKey = item.event_date;
        const d = parseISO(item.event_date);
        groups.push({ date: d, label: dateLabel(d), events: [] });
      }
      groups[groups.length - 1].events.push(item);
    }
    return groups.slice(0, 14);
  }, [filteredItems]);

  // Stats
  const todayCount = useMemo(() =>
    allItems.filter(i => isSameDay(parseISO(i.event_date), new Date())).length
  , [allItems]);
  const weekCount = useMemo(() =>
    allItems.filter(i => isThisWeek(parseISO(i.event_date))).length
  , [allItems]);
  const pendingAppointments = useMemo(() =>
    allItems.filter(i => i.status === 'pending' && i.event_category === 'appointment').length
  , [allItems]);

  /* ---------- actions ---------- */

  const addEvent = async (title: string, opts?: Partial<CalendarEvent>) => {
    if (!user || !title.trim()) return;
    try {
      await supabase.from('calendar_events').insert({
        user_id: user.id,
        title: title.trim(),
        description: opts?.description || '',
        event_date: format(selectedDate, 'yyyy-MM-dd'),
        event_time: opts?.event_time || null,
        end_time: opts?.end_time || null,
        duration_minutes: opts?.duration_minutes || 30,
        location: opts?.location || null,
        client_name: opts?.client_name || null,
        client_email: opts?.client_email || null,
        event_category: opts?.event_category || 'event',
        color: opts?.color || null,
        reminder_minutes: opts?.reminder_minutes ?? null,
        is_recurring: opts?.is_recurring || false,
        recurrence_rule: opts?.recurrence_rule || null,
        status: opts?.status || 'confirmed',
        is_all_day: opts?.is_all_day || false,
        source_type: 'manual',
        source_id: crypto.randomUUID(),
      } as any);
      fetchEvents();
    } catch (e) { console.error('Error adding event:', e); }
  };

  const updateEvent = async (id: string) => {
    if (!editFields.title.trim()) return;
    try {
      await supabase.from('calendar_events').update({
        title: editFields.title.trim(),
        description: editFields.description,
        event_time: editFields.event_time || null,
      }).eq('id', id);
      setEditingId(null);
      fetchEvents();
    } catch (e) { console.error('Error updating event:', e); }
  };

  const updateEventStatus = async (id: string, status: string) => {
    try {
      await supabase.from('calendar_events').update({ status } as any).eq('id', id);
      fetchEvents();
    } catch (e) { console.error(e); }
  };

  const duplicateEvent = async (item: CalendarItem) => {
    if (!user) return;
    const ev = events.find(e => e.id === item.id);
    if (!ev) return;
    const nextDay = format(addDays(parseISO(ev.event_date), 1), 'yyyy-MM-dd');
    await supabase.from('calendar_events').insert({
      ...ev,
      id: undefined,
      event_date: nextDay,
      source_id: crypto.randomUUID(),
      created_at: undefined,
    } as any);
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    try {
      await supabase.from('calendar_events').delete().eq('id', id);
      fetchEvents();
    } catch (e) { console.error('Error deleting event:', e); }
  };

  const handleQuickAdd = () => {
    if (!quickTitle.trim()) return;
    addEvent(quickTitle);
    setQuickTitle('');
  };

  const handleFullAdd = async () => {
    if (newItemType === 'event') {
      await addEvent(newEvent.title, {
        description: newEvent.description,
        event_time: newEvent.event_time || undefined,
        end_time: newEvent.end_time || undefined,
        duration_minutes: newEvent.duration_minutes,
        location: newEvent.location || undefined,
        client_name: newEvent.client_name || undefined,
        client_email: newEvent.client_email || undefined,
        event_category: newEvent.event_category,
        reminder_minutes: newEvent.reminder_minutes,
        is_recurring: newEvent.is_recurring,
        recurrence_rule: newEvent.recurrence_rule || undefined,
        status: newEvent.status,
        is_all_day: newEvent.is_all_day,
      } as any);
      setNewEvent({
        title: '', description: '', event_time: '', end_time: '',
        duration_minutes: 30, location: '', client_name: '', client_email: '',
        event_category: 'event', reminder_minutes: undefined,
        is_recurring: false, recurrence_rule: '', status: 'confirmed', is_all_day: false,
      });
    } else if (newItemType === 'task' && user && newTask.name.trim()) {
      await supabase.from('project_tasks').insert({
        user_id: user.id,
        name: newTask.name.trim(),
        priority: newTask.priority,
        notes: newTask.notes || null,
        due_date: format(selectedDate, 'yyyy-MM-dd'),
        status: 'todo',
      });
      setNewTask({ name: '', priority: 'medium', notes: '' });
      fetchEvents();
    } else if (newItemType === 'habit' && user && newHabit.name.trim()) {
      await (supabase.from('habits' as any)).insert({
        user_id: user.id,
        name: newHabit.name.trim(),
        color: newHabit.color,
        streak: 0,
      } as any);
      setNewHabit({ name: '', color: '#3b82f6' });
      fetchEvents();
    }
    setShowAddDialog(false);
  };

  const startEdit = (ev: CalendarEvent) => {
    setEditingId(ev.id);
    setEditFields({ title: ev.title, description: ev.description || '', event_time: ev.event_time || '' });
  };

  const navigatePrev = () => {
    if (viewMode === 'month') setCurrentMonth(m => subMonths(m, 1));
    else if (viewMode === 'week') setCurrentWeekStart(w => subWeeks(w, 1));
    else setSelectedDate(d => subDays(d, 1));
  };

  const navigateNext = () => {
    if (viewMode === 'month') setCurrentMonth(m => addMonths(m, 1));
    else if (viewMode === 'week') setCurrentWeekStart(w => addWeeks(w, 1));
    else setSelectedDate(d => addDays(d, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setCurrentWeekStart(startOfWeek(new Date()));
    setSelectedDate(new Date());
  };

  const openItemDetail = (item: CalendarItem) => {
    setViewingItem(item);
    setShowDetailDialog(true);
  };

  /* ---------- loading ---------- */

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted/40 rounded-lg" />
        <div className="h-[360px] bg-muted/30 rounded-xl" />
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Sub-renders                                                        */
  /* ------------------------------------------------------------------ */

  const renderItemCard = (item: CalendarItem, compact = false) => {
    // Task items
    if (item.source_type === 'task' || item.source_type === 'task_done') {
      return (
        <div
          key={item.id}
          className={cn(
            "flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg border-l-[3px] transition-colors hover:bg-accent/30 cursor-pointer",
            SOURCE_BORDER_COLORS[item.source_type]
          )}
          onClick={() => openItemDetail(item)}
        >
          <Checkbox
            checked={item.source_type === 'task_done'}
            onCheckedChange={async (checked) => {
              if (!item.taskId) return;
              await supabase.from('project_tasks').update({
                status: checked ? 'done' : 'todo'
              }).eq('id', item.taskId);
              fetchEvents();
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Toggle task: ${item.title}`}
          />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium text-foreground truncate", item.source_type === 'task_done' && 'line-through opacity-60')}>
              {item.title}
            </p>
            {!compact && <span className="text-[10px] text-muted-foreground/60">Task</span>}
          </div>
        </div>
      );
    }

    // Habit items
    if (item.source_type === 'habit') {
      return (
        <div
          key={item.id}
          className={cn(
            "pl-3 pr-2 py-2 rounded-lg border-l-[3px] cursor-pointer hover:bg-accent/30 transition-colors",
            SOURCE_BORDER_COLORS['habit']
          )}
          onClick={() => openItemDetail(item)}
        >
          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
          {!compact && <span className="text-[10px] text-muted-foreground/60">Habit ✓</span>}
        </div>
      );
    }

    // Calendar event / appointment
    const ev = events.find(e => e.id === item.id);
    const isEditing = editingId === item.id;

    if (isEditing && ev) {
      return (
        <div key={ev.id} className="p-2.5 rounded-lg border border-border bg-muted/30 space-y-2">
          <Input
            value={editFields.title}
            onChange={e => setEditFields(f => ({ ...f, title: e.target.value }))}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') updateEvent(ev.id);
              if (e.key === 'Escape') setEditingId(null);
            }}
          />
          <Input
            type="time"
            value={editFields.event_time}
            onChange={e => setEditFields(f => ({ ...f, event_time: e.target.value }))}
            className="h-8 text-sm"
          />
          <Textarea
            value={editFields.description}
            onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))}
            className="text-sm min-h-[48px]"
            rows={2}
            placeholder="Description (optional)"
          />
          <div className="flex gap-1.5 justify-end">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditingId(null)}>
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" className="h-7 px-2" onClick={() => updateEvent(ev.id)}>
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={item.id}
        className={cn(
          "group relative pl-3 pr-2 py-2 rounded-lg border-l-[3px] transition-colors cursor-pointer",
          "hover:bg-accent/30",
          getCategoryBorderColor(item)
        )}
        onClick={() => openItemDetail(item)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className={cn(
                "text-sm font-medium text-foreground truncate",
                item.status === 'cancelled' && 'line-through opacity-60'
              )}>{item.title}</p>
              {item.status === 'pending' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {item.event_time && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formatTime(item.event_time)}
                  {item.end_time && ` – ${formatTime(item.end_time)}`}
                </span>
              )}
              {item.is_all_day && (
                <Badge variant="outline" className="text-[9px] h-4 px-1">All Day</Badge>
              )}
              <span className="text-[10px] text-muted-foreground/60">{getItemLabel(item)}</span>
            </div>
            {!compact && item.client_name && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <User className="h-2.5 w-2.5" />
                {item.client_name}
              </p>
            )}
            {!compact && item.location && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" />
                {item.location}
              </p>
            )}
            {!compact && item.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            )}
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}>
            <ReminderPicker
              compact
              itemType={item.source_type === 'task' ? 'task' : 'event'}
              itemId={item.id}
              itemTitle={item.title}
              eventTime={(() => {
                const d = parseISO(item.event_date);
                if (item.event_time) {
                  const [h, m] = item.event_time.split(':').map(Number);
                  d.setHours(h, m, 0, 0);
                }
                return d;
              })()}
            />
            {ev && ev.source_type === 'manual' && (
              <>
                <button onClick={() => startEdit(ev)} className="p-1 rounded hover:bg-accent" aria-label="Edit event">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <button onClick={() => duplicateEvent(item)} className="p-1 rounded hover:bg-accent" aria-label="Duplicate event">
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </button>
                <button onClick={() => deleteEvent(item.id)} className="p-1 rounded hover:bg-destructive/20" aria-label="Delete event">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ---- Month View ---- */
  const renderMonthView = () => (
    <div className={cn("widget-card p-3 sm:p-4", isMobile ? "w-full" : "flex-1 min-w-0")}>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {calendarDays.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = itemsByDate.get(key) || [];
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const dotTypes = [...new Set(dayEvents.map(e => getCategoryDotColor(e)))].slice(0, 4);

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(day)}
              onDoubleClick={() => { setSelectedDate(day); setShowAddDialog(true); }}
              className={cn(
                "relative flex flex-col items-center justify-start rounded-lg transition-all duration-150",
                "min-h-[44px] sm:min-h-[52px] py-1.5",
                "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !isCurrentMonth && "opacity-35",
                today && !isSelected && "bg-accent/60",
                isSelected && "ring-2 ring-primary bg-primary/10"
              )}
              aria-label={format(day, 'EEEE, MMMM d')}
            >
              <span className={cn(
                "text-sm tabular-nums leading-none",
                today && "font-bold text-primary",
                isSelected && "font-bold"
              )}>
                {format(day, 'd')}
              </span>
              {dotTypes.length > 0 && (
                <div className="flex items-center gap-[3px] mt-1">
                  {dotTypes.map((color, i) => (
                    <span key={i} className={cn("w-[5px] h-[5px] rounded-full", color)} />
                  ))}
                  {dayEvents.length > 4 && (
                    <span className="text-[8px] text-muted-foreground leading-none">+{dayEvents.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ---- Week View ---- */
  const renderWeekView = () => (
    <div className="widget-card p-3 sm:p-4 flex-1 min-w-0 overflow-hidden">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <button
            key={format(day, 'yyyy-MM-dd')}
            onClick={() => setSelectedDate(day)}
            className={cn(
              "text-center py-2 rounded-lg transition-colors",
              "hover:bg-accent/40",
              isSameDay(day, selectedDate) && "bg-primary/10 ring-2 ring-primary",
              isToday(day) && !isSameDay(day, selectedDate) && "bg-accent/60"
            )}
          >
            <p className="text-[10px] font-medium text-muted-foreground uppercase">{format(day, 'EEE')}</p>
            <p className={cn("text-lg font-semibold tabular-nums", isToday(day) && "text-primary")}>{format(day, 'd')}</p>
            <div className="flex justify-center gap-[2px] mt-1">
              {(itemsByDate.get(format(day, 'yyyy-MM-dd')) || []).slice(0, 3).map((item, i) => (
                <span key={i} className={cn("w-1 h-1 rounded-full", getCategoryDotColor(item))} />
              ))}
            </div>
          </button>
        ))}
      </div>
      <ScrollArea className="h-[320px]">
        <div className="space-y-1">
          {HOURS.filter(h => h >= 6 && h <= 22).map(hour => {
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
            const hourItems = selectedDayItems.filter(item => {
              if (!item.event_time) return false;
              const itemHour = parseInt(item.event_time.split(':')[0]);
              return itemHour === hour;
            });

            return (
              <div key={hour} className="flex gap-2 min-h-[40px]">
                <span className="text-[10px] text-muted-foreground w-12 shrink-0 pt-1 text-right tabular-nums">
                  {format(setHours(new Date(), hour), 'h a')}
                </span>
                <div className="flex-1 border-t border-border/30 pt-1 space-y-0.5">
                  {hourItems.map(item => (
                    <div key={item.id} className="text-xs">
                      {renderItemCard(item, true)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  /* ---- Day View ---- */
  const renderDayView = () => (
    <div className="widget-card p-3 sm:p-4 flex-1 min-w-0">
      <div className="mb-3 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{format(selectedDate, 'EEEE')}</p>
        <p className="text-3xl font-bold text-foreground tabular-nums">{format(selectedDate, 'd')}</p>
        <p className="text-sm text-muted-foreground">{format(selectedDate, 'MMMM yyyy')}</p>
      </div>
      <ScrollArea className="h-[400px]">
        {/* All-day events */}
        {selectedDayItems.filter(i => i.is_all_day).length > 0 && (
          <div className="mb-3 pb-3 border-b border-border/50">
            <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1.5">All Day</p>
            <div className="space-y-1">
              {selectedDayItems.filter(i => i.is_all_day).map(item => renderItemCard(item))}
            </div>
          </div>
        )}
        {/* Hourly timeline */}
        <div className="space-y-0">
          {HOURS.filter(h => h >= 6 && h <= 22).map(hour => {
            const hourItems = selectedDayItems.filter(item => {
              if (!item.event_time || item.is_all_day) return false;
              const itemHour = parseInt(item.event_time.split(':')[0]);
              return itemHour === hour;
            });

            return (
              <div key={hour} className="flex gap-3 min-h-[48px] group/hour">
                <span className="text-[11px] text-muted-foreground w-14 shrink-0 pt-1 text-right tabular-nums font-medium">
                  {format(setHours(new Date(), hour), 'h:mm a')}
                </span>
                <div className={cn(
                  "flex-1 border-t border-border/30 pt-1 space-y-1 min-h-[48px]",
                  "hover:bg-accent/10 rounded-r-lg transition-colors cursor-pointer"
                )}
                  onClick={() => {
                    setNewEvent(prev => ({ ...prev, event_time: `${hour.toString().padStart(2, '0')}:00` }));
                    setShowAddDialog(true);
                  }}
                >
                  {hourItems.map(item => renderItemCard(item))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  /* ---- Agenda View ---- */
  const renderAgendaView = () => (
    <div className="widget-card p-4 flex-1 min-w-0">
      {upcomingGrouped.length > 0 ? (
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {upcomingGrouped.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                  <span className="text-[10px] text-muted-foreground/60">{format(group.date, 'MMM d')}</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 ml-auto">
                    {group.events.length}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {group.events.map(ev => renderItemCard(ev))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarIcon className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No upcoming events</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add events to see your agenda</p>
        </div>
      )}
    </div>
  );

  /* ---- Day Detail Panel (sidebar) ---- */
  const renderDayDetailPanel = () => (
    <div className={cn(
      "widget-card p-4 flex flex-col",
      isMobile ? "w-full" : "w-[340px] shrink-0"
    )}>
      <div className="mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{format(selectedDate, 'EEEE')}</p>
        <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">{format(selectedDate, 'MMMM d')}</p>
        {selectedDayItems.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedDayItems.length} item{selectedDayItems.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[320px] sm:max-h-[400px]">
        {selectedDayItems.length > 0 ? selectedDayItems.map(item => renderItemCard(item)) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CalendarIcon className="h-8 w-8 text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">No events</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">Double-click a date or type below</p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border/50 flex gap-1.5">
        <Input
          ref={quickRef}
          value={quickTitle}
          onChange={e => setQuickTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
          placeholder="Quick add event…"
          className="h-8 text-sm flex-1"
        />
        <Button size="sm" variant="ghost" className="h-8 px-2 shrink-0" onClick={() => setShowAddDialog(true)} aria-label="Add with details">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  /* ---- Header / navigation title ---- */
  const getViewTitle = () => {
    if (viewMode === 'month') return format(currentMonth, 'MMMM yyyy');
    if (viewMode === 'week') return `${format(currentWeekStart, 'MMM d')} – ${format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}`;
    if (viewMode === 'day') return format(selectedDate, 'EEEE, MMMM d, yyyy');
    return 'Agenda';
  };

  /* ------------------------------------------------------------------ */
  /*  Main render                                                        */
  /* ------------------------------------------------------------------ */

  return (
    <div className="p-3 sm:p-4 space-y-4 animate-fade-in">
      {/* ===== STATS BAR ===== */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[
          { label: 'Today', value: todayCount, icon: CalendarIcon, accent: 'text-primary' },
          { label: 'This Week', value: weekCount, icon: LayoutGrid, accent: 'text-blue-500' },
          { label: 'Pending', value: pendingAppointments, icon: Clock, accent: 'text-amber-500' },
        ].map(stat => (
          <div key={stat.label} className="widget-card px-4 py-3 flex items-center gap-3 min-w-[140px]">
            <stat.icon className={cn("h-5 w-5 shrink-0", stat.accent)} />
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums leading-tight">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={navigatePrev} aria-label="Previous">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground tabular-nums min-w-[180px] text-center">
            {getViewTitle()}
          </h2>
          <Button variant="ghost" size="icon" onClick={navigateNext} aria-label="Next">
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="month" className="text-xs px-2.5 h-6"><LayoutGrid className="h-3 w-3 mr-1" />Month</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2.5 h-6"><Columns className="h-3 w-3 mr-1" />Week</TabsTrigger>
              <TabsTrigger value="day" className="text-xs px-2.5 h-6"><Eye className="h-3 w-3 mr-1" />Day</TabsTrigger>
              <TabsTrigger value="agenda" className="text-xs px-2.5 h-6"><List className="h-3 w-3 mr-1" />Agenda</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      {/* ===== SEARCH & FILTER ===== */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search events, appointments, tasks…"
            className="h-8 text-sm pl-8"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
            <SelectItem value="tasks">Tasks</SelectItem>
            <SelectItem value="habits">Habits</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ===== MAIN LAYOUT ===== */}
      <div className={cn("flex gap-4", isMobile ? "flex-col" : "flex-row")}>
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'agenda' && renderAgendaView()}
        {viewMode !== 'agenda' && renderDayDetailPanel()}
      </div>

      {/* ===== LEGEND ===== */}
      <div className="widget-card p-3">
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map(cat => (
            <div key={cat.value} className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", CATEGORY_COLORS[cat.value])} />
              <span className="text-[10px] text-muted-foreground">{cat.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[10px] text-muted-foreground">Task</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-muted-foreground">Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-[10px] text-muted-foreground">Habit</span>
          </div>
        </div>
      </div>

      {/* ===== DETAIL DIALOG ===== */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingItem && (
                <>
                  <span className={cn("w-3 h-3 rounded-full shrink-0", getCategoryDotColor(viewingItem!))} />
                  {viewingItem.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {viewingItem && getItemLabel(viewingItem)} — {viewingItem && format(parseISO(viewingItem.event_date), 'EEEE, MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {viewingItem && (
            <div className="space-y-3 pt-2">
              {/* Time */}
              {(viewingItem.event_time || viewingItem.is_all_day) && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>
                    {viewingItem.is_all_day ? 'All Day' : (
                      <>
                        {formatTime(viewingItem.event_time)}
                        {viewingItem.end_time && ` – ${formatTime(viewingItem.end_time)}`}
                        {viewingItem.duration_minutes && (
                          <span className="text-muted-foreground ml-1">({formatDuration(viewingItem.duration_minutes)})</span>
                        )}
                      </>
                    )}
                  </span>
                </div>
              )}

              {/* Status */}
              {viewingItem.status && viewingItem.source_type === 'manual' && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex gap-1.5">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => updateEventStatus(viewingItem.id, s.value)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs transition-colors",
                          viewingItem.status === s.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-accent text-muted-foreground"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Client */}
              {viewingItem.client_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{viewingItem.client_name}</span>
                  {viewingItem.client_email && (
                    <a href={`mailto:${viewingItem.client_email}`} className="text-primary text-xs hover:underline">
                      {viewingItem.client_email}
                    </a>
                  )}
                </div>
              )}

              {/* Location */}
              {viewingItem.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{viewingItem.location}</span>
                </div>
              )}

              {/* Description */}
              {viewingItem.description && (
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                  {viewingItem.description}
                </div>
              )}

              {/* Actions */}
              {viewingItem.source_type === 'manual' && (
                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                    const ev = events.find(e => e.id === viewingItem.id);
                    if (ev) { startEdit(ev); setShowDetailDialog(false); }
                  }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { duplicateEvent(viewingItem); setShowDetailDialog(false); }}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => { deleteEvent(viewingItem.id); setShowDetailDialog(false); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== FULL ADD DIALOG ===== */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              New Item — {format(selectedDate, 'MMM d')}
            </DialogTitle>
            <DialogDescription>Create an event, appointment, task, or habit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Type selector */}
            <div className="flex gap-2">
              {([
                { value: 'event' as const, label: 'Event', icon: CalendarIcon, color: 'bg-orange-500' },
                { value: 'task' as const, label: 'Task', icon: ListTodo, color: 'bg-rose-500' },
                { value: 'habit' as const, label: 'Habit', icon: Activity, color: 'bg-teal-500' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setNewItemType(opt.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
                    newItemType === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground/30 hover:bg-accent/30"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", opt.color)}>
                    <opt.icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Event fields */}
            {newItemType === 'event' && (
              <div className="space-y-3">
                {/* Category */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => setNewEvent(p => ({ ...p, event_category: cat.value }))}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all",
                          newEvent.event_category === cat.value
                            ? "border-primary bg-primary/10 font-medium"
                            : "border-border hover:bg-accent/30"
                        )}
                      >
                        <cat.icon className="h-3 w-3" />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  value={newEvent.title}
                  onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                  placeholder="Event title"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && newEvent.title.trim() && handleFullAdd()}
                />

                {/* All day toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground">All Day</label>
                  <Switch
                    checked={newEvent.is_all_day}
                    onCheckedChange={v => setNewEvent(p => ({ ...p, is_all_day: v }))}
                  />
                </div>

                {/* Time */}
                {!newEvent.is_all_day && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Time</label>
                      <Input
                        type="time"
                        value={newEvent.event_time}
                        onChange={e => setNewEvent(p => ({ ...p, event_time: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">End Time</label>
                      <Input
                        type="time"
                        value={newEvent.end_time}
                        onChange={e => setNewEvent(p => ({ ...p, end_time: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                  </div>
                )}

                {/* Duration */}
                {!newEvent.is_all_day && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Duration</label>
                    <Select
                      value={newEvent.duration_minutes.toString()}
                      onValueChange={v => setNewEvent(p => ({ ...p, duration_minutes: parseInt(v) }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(d => (
                          <SelectItem key={d} value={d.toString()}>{formatDuration(d)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Client info (for appointments) */}
                {(newEvent.event_category === 'appointment' || newEvent.event_category === 'meeting' || newEvent.event_category === 'call') && (
                  <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> Client / Contact Details
                    </p>
                    <Input
                      value={newEvent.client_name}
                      onChange={e => setNewEvent(p => ({ ...p, client_name: e.target.value }))}
                      placeholder="Client name"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={newEvent.client_email}
                      onChange={e => setNewEvent(p => ({ ...p, client_email: e.target.value }))}
                      placeholder="Client email"
                      type="email"
                      className="h-8 text-sm"
                    />
                  </div>
                )}

                {/* Location */}
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={newEvent.location}
                    onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
                    placeholder="Location (optional)"
                    className="pl-8"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                  <Select value={newEvent.status} onValueChange={v => setNewEvent(p => ({ ...p, status: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          <div className="flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full", s.color)} />
                            {s.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reminder - using new ReminderPicker */}
                <ReminderPicker
                  itemType="event"
                  itemId={`new-event-${format(selectedDate, 'yyyy-MM-dd')}`}
                  itemTitle={newEvent.title || 'Untitled Event'}
                  eventTime={(() => {
                    const d = new Date(selectedDate);
                    if (newEvent.event_time) {
                      const [h, m] = newEvent.event_time.split(':').map(Number);
                      d.setHours(h, m, 0, 0);
                    }
                    return d;
                  })()}
                />

                {/* Recurring */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground flex items-center gap-1.5">
                    <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                    Recurring
                  </label>
                  <Switch
                    checked={newEvent.is_recurring}
                    onCheckedChange={v => setNewEvent(p => ({ ...p, is_recurring: v }))}
                  />
                </div>
                {newEvent.is_recurring && (
                  <Select
                    value={newEvent.recurrence_rule}
                    onValueChange={v => setNewEvent(p => ({ ...p, recurrence_rule: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Repeat frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Every Day</SelectItem>
                      <SelectItem value="weekdays">Every Weekday</SelectItem>
                      <SelectItem value="weekly">Every Week</SelectItem>
                      <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                      <SelectItem value="monthly">Every Month</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Description */}
                <Textarea
                  value={newEvent.description}
                  onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                  placeholder="Notes or description (optional)"
                  rows={3}
                />
              </div>
            )}

            {/* Task fields */}
            {newItemType === 'task' && (
              <div className="space-y-3">
                <Input
                  value={newTask.name}
                  onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
                  placeholder="Task name"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && newTask.name.trim() && handleFullAdd()}
                />
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                  <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={newTask.notes}
                  onChange={e => setNewTask(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Notes (optional)"
                  rows={2}
                />
              </div>
            )}

            {/* Habit fields */}
            {newItemType === 'habit' && (
              <div className="space-y-3">
                <Input
                  value={newHabit.name}
                  onChange={e => setNewHabit(p => ({ ...p, name: e.target.value }))}
                  placeholder="Habit name (e.g. Meditate, Read)"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && newHabit.name.trim() && handleFullAdd()}
                />
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#64748b', '#ec4899', '#14b8a6', '#f97316'].map(c => (
                      <button
                        key={c}
                        onClick={() => setNewHabit(p => ({ ...p, color: c }))}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          newHabit.color === c ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "hover:scale-105"
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This creates a new recurring habit. Track it daily from the Habit Studio.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button
                onClick={handleFullAdd}
                disabled={
                  (newItemType === 'event' && !newEvent.title.trim()) ||
                  (newItemType === 'task' && !newTask.name.trim()) ||
                  (newItemType === 'habit' && !newHabit.name.trim())
                }
              >
                {newItemType === 'event'
                  ? (newEvent.event_category === 'appointment' ? 'Book Appointment' : 'Add Event')
                  : newItemType === 'task' ? 'Add Task' : 'Create Habit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
