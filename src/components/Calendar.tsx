import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import {
  format, isSameDay, isSameMonth, parseISO, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths,
  isToday, isTomorrow, isThisWeek, isBefore, startOfDay
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Pencil, X, Check,
  Calendar as CalendarIcon, ListTodo, Activity, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time?: string;
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
  source_type: string;
  // For tasks
  taskStatus?: string;
  taskId?: string;
}

const SOURCE_DOT_COLORS: Record<string, string> = {
  zettel_card: 'bg-primary',
  note: 'bg-blue-500',
  scratch_pad: 'bg-purple-500',
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

/* ------------------------------------------------------------------ */
/*  Helper: format event time                                          */
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Calendar() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allItems, setAllItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick-add
  const [quickTitle, setQuickTitle] = useState('');
  const quickRef = useRef<HTMLInputElement>(null);

  // Full add dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItemType, setNewItemType] = useState<'event' | 'task' | 'habit'>('event');
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_time: '' });
  const [newTask, setNewTask] = useState({ name: '', priority: 'medium', notes: '' });
  const [newHabit, setNewHabit] = useState({ name: '', color: '#3b82f6' });

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ title: '', description: '', event_time: '' });

  /* ---------- data ---------- */

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      // Fetch calendar events
      const { data: evData } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });
      const calEvents: CalendarEvent[] = evData || [];
      setEvents(calEvents);

      // Fetch tasks
      const { data: taskData } = await supabase
        .from('project_tasks')
        .select('id, name, status, due_date')
        .eq('user_id', user.id);

      const taskItems: CalendarItem[] = (taskData || []).map((t: any) => ({
        id: `task-${t.id}`,
        title: t.name,
        event_date: t.due_date,
        source_type: t.status === 'done' ? 'task_done' : 'task',
        taskStatus: t.status,
        taskId: t.id,
      }));

      // Read habits from Supabase
      const habitItems: CalendarItem[] = [];
      if (user) {
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
      }

      // Merge all items
      const calItems: CalendarItem[] = [
        ...calEvents.map(ev => ({
          id: ev.id,
          title: ev.title,
          description: ev.description,
          event_date: ev.event_date,
          event_time: ev.event_time,
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

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of allItems) {
      const key = item.event_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [allItems]);

  // Keep eventsByDate for backward compat with edit/delete actions (only calendar_events)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = ev.event_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedDayItems = useMemo(
    () => allItems
      .filter(item => isSameDay(parseISO(item.event_date), selectedDate))
      .sort((a, b) => (a.event_time || '').localeCompare(b.event_time || '')),
    [allItems, selectedDate]
  );

  // Keep old selectedDayEvents for edit/delete (only calendar_events)
  const selectedDayEvents = useMemo(
    () => events.filter(ev => isSameDay(parseISO(ev.event_date), selectedDate))
      .sort((a, b) => (a.event_time || '').localeCompare(b.event_time || '')),
    [events, selectedDate]
  );

  const upcomingGrouped = useMemo(() => {
    const today = startOfDay(new Date());
    const upcoming = allItems
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
    return groups.slice(0, 7);
  }, [allItems]);

  /* ---------- actions ---------- */

  const addEvent = async (title: string, description = '', event_time = '') => {
    if (!user || !title.trim()) return;
    try {
      await supabase.from('calendar_events').insert({
        user_id: user.id,
        title: title.trim(),
        description,
        event_date: format(selectedDate, 'yyyy-MM-dd'),
        event_time: event_time || null,
        source_type: 'manual',
        source_id: crypto.randomUUID(),
      });
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

  const handleFullAdd = () => {
    addEvent(newEvent.title, newEvent.description, newEvent.event_time);
    setNewEvent({ title: '', description: '', event_time: '' });
    setShowAddDialog(false);
  };

  const startEdit = (ev: CalendarEvent) => {
    setEditingId(ev.id);
    setEditFields({ title: ev.title, description: ev.description || '', event_time: ev.event_time || '' });
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

  /* ---------- render ---------- */

  return (
    <div className="p-3 sm:p-4 space-y-4 animate-fade-in">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))} aria-label="Previous month">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground tabular-nums min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))} aria-label="Next month">
            <ChevronRight className="h-5 w-5" />
          </Button>
          {!isSameMonth(currentMonth, new Date()) && (
            <Button variant="outline" size="sm" className="ml-1 text-xs h-7"
              onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
              Today
            </Button>
          )}
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Event</span>
        </Button>
      </div>

      {/* ===== MAIN LAYOUT ===== */}
      <div className={cn(
        "flex gap-4",
        isMobile ? "flex-col" : "flex-row"
      )}>
        {/* ---- MONTH GRID ---- */}
        <div className={cn(
          "widget-card p-3 sm:p-4",
          isMobile ? "w-full" : "flex-1 min-w-0"
        )}>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px">
            {calendarDays.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              const dayEvents = itemsByDate.get(key) || [];
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              // unique source types for dots (max 3)
              const dotTypes = [...new Set(dayEvents.map(e => e.source_type))].slice(0, 3);
              const extraCount = dayEvents.length > 3 ? dayEvents.length - 3 : 0;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative flex flex-col items-center justify-start rounded-lg transition-all duration-150",
                    "min-h-[44px] sm:min-h-[52px] py-1.5",
                    "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !isCurrentMonth && "opacity-35",
                    today && !isSelected && "bg-accent/60",
                    isSelected && "ring-2 ring-primary bg-primary/10"
                  )}
                  aria-label={format(day, 'EEEE, MMMM d')}
                  aria-pressed={isSelected}
                >
                  <span className={cn(
                    "text-sm tabular-nums leading-none",
                    today && "font-bold text-primary",
                    isSelected && "font-bold"
                  )}>
                    {format(day, 'd')}
                  </span>

                  {/* Event dots */}
                  {dotTypes.length > 0 && (
                    <div className="flex items-center gap-[3px] mt-1">
                      {dotTypes.map(type => (
                        <span key={type} className={cn(
                          "w-[5px] h-[5px] rounded-full",
                          SOURCE_DOT_COLORS[type] || 'bg-muted-foreground'
                        )} />
                      ))}
                      {extraCount > 0 && (
                        <span className="text-[8px] text-muted-foreground leading-none">+{extraCount}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dot legend */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border/50">
            {Object.entries(SOURCE_DOT_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", color)} />
                <span className="text-[10px] text-muted-foreground">{SOURCE_LABELS[type]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- DAY DETAIL PANEL ---- */}
        <div className={cn(
          "widget-card p-4 flex flex-col",
          isMobile ? "w-full" : "w-[320px] shrink-0"
        )}>
          {/* Date header */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {format(selectedDate, 'EEEE')}
            </p>
            <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">
              {format(selectedDate, 'MMMM d')}
            </p>
          </div>

          {/* Items list (events + tasks + habits) */}
          <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[320px] sm:max-h-[400px]">
            {selectedDayItems.length > 0 ? selectedDayItems.map(item => {
              // Task items
              if (item.source_type === 'task' || item.source_type === 'task_done') {
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg border-l-[3px] transition-colors hover:bg-accent/30",
                      SOURCE_BORDER_COLORS[item.source_type]
                    )}
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
                      aria-label={`Toggle task: ${item.title}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium text-foreground truncate", item.source_type === 'task_done' && 'line-through opacity-60')}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground/60">Task</span>
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
                      "pl-3 pr-2 py-2 rounded-lg border-l-[3px]",
                      SOURCE_BORDER_COLORS['habit']
                    )}
                  >
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <span className="text-[10px] text-muted-foreground/60">Habit ✓</span>
                  </div>
                );
              }

              // Regular calendar event
              const ev = events.find(e => e.id === item.id);
              if (!ev) return null;
              const isEditing = editingId === ev.id;

              if (isEditing) {
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
                  key={ev.id}
                  className={cn(
                    "group relative pl-3 pr-2 py-2 rounded-lg border-l-[3px] transition-colors",
                    "hover:bg-accent/30",
                    SOURCE_BORDER_COLORS[ev.source_type] || 'border-l-muted-foreground'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {ev.event_time && (
                          <span className="text-xs text-muted-foreground">{formatTime(ev.event_time)}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">{SOURCE_LABELS[ev.source_type]}</span>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                      )}
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {ev.source_type === 'manual' && (
                        <>
                          <button onClick={() => startEdit(ev)} className="p-1 rounded hover:bg-accent" aria-label="Edit event">
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button onClick={() => deleteEvent(ev.id)} className="p-1 rounded hover:bg-destructive/20" aria-label="Delete event">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarIcon className="h-8 w-8 text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">No events</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Type below to add one</p>
              </div>
            )}
          </div>

          {/* Quick-add input */}
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
      </div>

      {/* ===== UPCOMING AGENDA ===== */}
      {upcomingGrouped.length > 0 && (
        <div className="widget-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming</h3>
          <div className="space-y-3">
            {upcomingGrouped.map(group => (
              <div key={group.label}>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.events.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => { setSelectedDate(parseISO(ev.event_date)); setCurrentMonth(parseISO(ev.event_date)); }}
                      className={cn(
                        "w-full flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg text-left transition-colors",
                        "hover:bg-accent/30 border-l-[3px]",
                        SOURCE_BORDER_COLORS[ev.source_type] || 'border-l-muted-foreground'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                        {ev.event_time && (
                          <span className="text-xs text-muted-foreground">{formatTime(ev.event_time)}</span>
                        )}
                      </div>
                      <span className={cn("w-2 h-2 rounded-full shrink-0", SOURCE_DOT_COLORS[ev.source_type] || 'bg-muted-foreground')} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== FULL ADD DIALOG ===== */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Event — {format(selectedDate, 'MMM d')}</DialogTitle>
            <DialogDescription>Add a calendar event with optional time and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Input
              value={newEvent.title}
              onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
              placeholder="Event title"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && newEvent.title.trim() && handleFullAdd()}
            />
            <Input
              type="time"
              value={newEvent.event_time}
              onChange={e => setNewEvent(p => ({ ...p, event_time: e.target.value }))}
            />
            <Textarea
              value={newEvent.description}
              onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)"
              rows={3}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleFullAdd} disabled={!newEvent.title.trim()}>Add Event</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
