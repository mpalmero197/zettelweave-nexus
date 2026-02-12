import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  source_type: string;
}

export function CalendarEventsWidget() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchUpcomingEvents();
  }, [user]);

  const fetchUpcomingEvents = async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', today)
        .lte('event_date', nextWeek)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true })
        .limit(5);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateLabel = (eventDate: string) => {
    const date = parseISO(eventDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisWeek(date)) return format(date, 'EEEE');
    return format(date, 'MMM d');
  };

  const getTime = (eventTime?: string) => {
    if (!eventTime) return null;
    try { return format(new Date(`2000-01-01T${eventTime}`), 'h:mm a'); }
    catch { return eventTime; }
  };

  return (
    <div className="widget-card widget-accent-events p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-medium text-foreground">Upcoming</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted/50 rounded-md animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="flex items-center gap-3 p-2.5 rounded-md hover:bg-accent/50 transition-colors">
                <div className="w-9 h-9 rounded-md bg-muted flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] text-muted-foreground uppercase leading-none">{format(parseISO(event.event_date), 'MMM')}</span>
                  <span className="text-sm font-bold text-foreground leading-none">{format(parseISO(event.event_date), 'd')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{event.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{getDateLabel(event.event_date)}</span>
                    {event.event_time && (
                      <>
                        <span>·</span>
                        <span>{getTime(event.event_time)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
              <p className="text-xs text-muted-foreground">No upcoming events</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
