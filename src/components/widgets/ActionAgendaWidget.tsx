import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckSquare, Calendar, ChevronDown, ChevronRight, Clock, Timer } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInDays, isToday, isTomorrow, isBefore, startOfDay, addDays } from 'date-fns';
import { toast } from 'sonner';

interface AgendaItem {
  id: string;
  title: string;
  type: 'task' | 'event';
  date: string;
  time?: string;
  priority?: string;
  status?: string;
  daysLate?: number;
}

interface ActionAgendaWidgetProps {
  onNavigate?: (tab: string) => void;
}

type Section = 'overdue' | 'today' | 'tomorrow' | 'week';

const SECTION_CONFIG: Record<Section, { label: string; accent?: string }> = {
  overdue: { label: 'Overdue', accent: 'text-destructive' },
  today: { label: 'Today' },
  tomorrow: { label: 'Tomorrow' },
  week: { label: 'This Week' },
};

const MAX_PER_SECTION = 3;

export function ActionAgendaWidget({ onNavigate }: ActionAgendaWidgetProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<Record<Section, AgendaItem[]>>({
    overdue: [], today: [], tomorrow: [], week: [],
  });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<Section, boolean>>({
    overdue: false, today: false, tomorrow: false, week: false,
  });

  const fetchAgenda = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const weekEnd = format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd');

    const [tasksRes, eventsRes] = await Promise.all([
      supabase.from('project_tasks')
        .select('id, name, due_date, priority, status')
        .eq('user_id', user.id)
        .neq('status', 'done')
        .is('parent_task_id', null)
        .lte('due_date', weekEnd)
        .order('due_date', { ascending: true }),
      supabase.from('calendar_events')
        .select('id, title, event_date, event_time')
        .eq('user_id', user.id)
        .gte('event_date', format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd'))
        .lte('event_date', weekEnd)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true }),
    ]);

    const result: Record<Section, AgendaItem[]> = { overdue: [], today: [], tomorrow: [], week: [] };
    const todayStart = startOfDay(now);

    for (const t of (tasksRes.data || [])) {
      const d = parseISO(t.due_date);
      const item: AgendaItem = {
        id: t.id, title: t.name, type: 'task', date: t.due_date,
        priority: t.priority, status: t.status,
      };
      if (isBefore(d, todayStart)) {
        item.daysLate = differenceInDays(todayStart, d);
        result.overdue.push(item);
      } else if (isToday(d)) result.today.push(item);
      else if (isTomorrow(d)) result.tomorrow.push(item);
      else result.week.push(item);
    }

    for (const e of (eventsRes.data || [])) {
      const d = parseISO(e.event_date);
      const item: AgendaItem = {
        id: e.id, title: e.title, type: 'event', date: e.event_date, time: e.event_time || undefined,
      };
      if (isBefore(d, todayStart)) {
        item.daysLate = differenceInDays(todayStart, d);
        result.overdue.push(item);
      } else if (isToday(d)) result.today.push(item);
      else if (isTomorrow(d)) result.tomorrow.push(item);
      else result.week.push(item);
    }

    result.today.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

    setItems(result);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAgenda(); }, [fetchAgenda]);

  const toggleTaskDone = async (taskId: string) => {
    const { error } = await supabase.from('project_tasks').update({ status: 'done' }).eq('id', taskId);
    if (error) { toast.error('Failed to complete task'); return; }
    toast.success('Task completed');
    fetchAgenda();
  };

  const snoozeToTomorrow = async (taskId: string) => {
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const { error } = await supabase.from('project_tasks').update({ due_date: tomorrow }).eq('id', taskId);
    if (error) { toast.error('Failed to snooze'); return; }
    toast.success('Snoozed to tomorrow');
    fetchAgenda();
  };

  const totalItems = Object.values(items).reduce((s, arr) => s + arr.length, 0);
  const sections = (['overdue', 'today', 'tomorrow', 'week'] as Section[]).filter(s => items[s].length > 0);

  const formatTime = (t?: string) => {
    if (!t) return null;
    try { return format(new Date(`2000-01-01T${t}`), 'h:mm a'); } catch { return t; }
  };

  const renderItem = (item: AgendaItem) => (
    <div key={`${item.type}-${item.id}`} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent/50 transition-colors group">
      {item.type === 'task' ? (
        <Checkbox
          checked={false}
          onCheckedChange={() => toggleTaskDone(item.id)}
          className="shrink-0"
          aria-label={`Complete: ${item.title}`}
        />
      ) : (
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
      )}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onNavigate?.(item.type === 'task' ? 'tasks' : 'calendar')}
      >
        <p className="text-xs truncate text-foreground">{item.title}</p>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {item.time && <span>{formatTime(item.time)}</span>}
          {item.daysLate && (
            <span className="text-destructive font-medium">{item.daysLate}d late</span>
          )}
          {item.priority && !item.daysLate && (
            <span className={`capitalize ${item.priority === 'high' ? 'text-destructive' : ''}`}>{item.priority}</span>
          )}
        </div>
      </div>
      {/* Inline actions — visible on hover/focus */}
      {item.type === 'task' && (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); snoozeToTomorrow(item.id); }}
            title="Snooze to tomorrow"
          >
            <Clock className="h-2.5 w-2.5 mr-0.5" /> Tomorrow
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onNavigate?.('tasks'); }}
            title="Start focus session"
          >
            <Timer className="h-2.5 w-2.5 mr-0.5" /> Focus
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-header-left">
          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-medium text-foreground">Action Agenda</h3>
          {items.overdue.length > 0 && (
            <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
              {items.overdue.length} overdue
            </span>
          )}
        </div>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-muted/50 rounded-md animate-pulse" />)}
          </div>
        ) : totalItems === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">All clear — nothing due this week</p>
        ) : (
          <div className="space-y-2">
            {sections.map(section => {
              const sectionItems = items[section];
              const cfg = SECTION_CONFIG[section];
              const isExpand = expanded[section];
              const visibleItems = isExpand ? sectionItems : sectionItems.slice(0, MAX_PER_SECTION);
              const hasMore = sectionItems.length > MAX_PER_SECTION;

              return (
                <div key={section}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider px-1.5 pt-1 ${cfg.accent || 'text-muted-foreground'}`}>
                    {cfg.label} · {sectionItems.length}
                  </p>
                  {visibleItems.map(renderItem)}
                  {hasMore && (
                    <button
                      className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 flex items-center gap-0.5"
                      onClick={() => setExpanded(e => ({ ...e, [section]: !isExpand }))}
                    >
                      {isExpand ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                      {isExpand ? 'Show less' : `${sectionItems.length - MAX_PER_SECTION} more`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
