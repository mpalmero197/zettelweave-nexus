import { useState, useEffect } from 'react';
import { CheckSquare, Calendar, Flame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInMinutes, differenceInHours } from 'date-fns';

interface TodayData {
  tasksDue: number;
  taskNames: string[];
  eventsToday: number;
  nextEventTime: string | null;
  nextEventTitle: string | null;
}

export function TodayStripWidget() {
  const { user } = useAuth();
  const [data, setData] = useState<TodayData>({
    tasksDue: 0, taskNames: [], eventsToday: 0,
    nextEventTime: null, nextEventTitle: null,
  });

  useEffect(() => {
    if (user) fetchToday();
  }, [user]);

  const fetchToday = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const [tasksRes, eventsRes] = await Promise.all([
      supabase.from('project_tasks').select('name').eq('user_id', user.id).eq('due_date', today).neq('status', 'done').limit(3),
      supabase.from('calendar_events').select('title, event_time').eq('user_id', user.id).eq('event_date', today).order('event_time', { ascending: true }).limit(5),
    ]);

    const tasks = tasksRes.data || [];
    const events = eventsRes.data || [];

    // Find next event (with time in the future)
    const now = new Date();
    let nextEvent: { title: string; time: string } | null = null;
    for (const e of events) {
      if (e.event_time) {
        const eventDate = new Date(`${today}T${e.event_time}`);
        if (eventDate > now) {
          nextEvent = { title: e.title, time: e.event_time };
          break;
        }
      }
    }

    setData({
      tasksDue: tasks.length,
      taskNames: tasks.map(t => t.name),
      eventsToday: events.length,
      nextEventTime: nextEvent?.time || null,
      nextEventTitle: nextEvent?.title || null,
    });
  };

  const getProximity = (time: string) => {
    const eventDate = new Date(`${new Date().toISOString().split('T')[0]}T${time}`);
    const mins = differenceInMinutes(eventDate, new Date());
    if (mins < 60) return `in ${mins}m`;
    const hrs = differenceInHours(eventDate, new Date());
    return `in ${hrs}h`;
  };

  const hasContent = data.tasksDue > 0 || data.eventsToday > 0;
  if (!hasContent) return null;

  return (
    <div className="today-strip">
      {/* Tasks due today */}
      {data.tasksDue > 0 && (
        <div className="today-strip-card">
          <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground tabular-nums">
              {data.tasksDue} due today
            </p>
            {data.taskNames.length > 0 && (
              <p className="text-[11px] text-muted-foreground truncate">
                {data.taskNames[0]}{data.taskNames.length > 1 ? ` +${data.taskNames.length - 1}` : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Next event */}
      {data.eventsToday > 0 && (
        <div className="today-strip-card">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground tabular-nums">
              {data.eventsToday} event{data.eventsToday !== 1 ? 's' : ''} today
            </p>
            {data.nextEventTitle && data.nextEventTime && (
              <p className="text-[11px] text-muted-foreground truncate">
                {data.nextEventTitle} · {getProximity(data.nextEventTime)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
