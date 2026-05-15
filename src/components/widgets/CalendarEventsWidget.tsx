import { useState, useEffect } from 'react';
import { Calendar, Plus, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time?: string;
}

interface CalendarEventsWidgetProps {
  onNavigate?: (tab: string) => void;
}

export function CalendarEventsWidget({ onNavigate }: CalendarEventsWidgetProps = {}) {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEventTitle, setNewEventTitle] = useState('');

  const addEvent = async () => {
    if (!user || !newEventTitle.trim()) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const { error } = await supabase.from('calendar_events').insert({
      user_id: user.id, title: newEventTitle.trim(), event_date: today,
      source_type: 'manual', source_id: crypto.randomUUID(),
    });
    if (error) { toast.error('Failed to add event'); return; }
    toast.success('Event added');
    setNewEventTitle('');
    fetchUpcomingEvents();
  };

  useEffect(() => {
    if (user) fetchUpcomingEvents();
  }, [user]);

  const fetchUpcomingEvents = async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data } = await supabase
        .from('calendar_events')
        .select('id, title, event_date, event_time')
        .eq('user_id', user.id)
        .gte('event_date', today)
        .lte('event_date', nextWeek)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true })
        .limit(4);
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLabel = (event: CalendarEvent) => {
    const date = parseISO(event.event_date);
    if (isToday(date)) {
      if (event.event_time) {
        const eventDate = new Date(`${event.event_date}T${event.event_time}`);
        const now = new Date();
        if (eventDate > now) {
          const mins = differenceInMinutes(eventDate, now);
          if (mins < 60) return `in ${mins}m`;
          return `in ${differenceInHours(eventDate, now)}h`;
        }
        try { return format(eventDate, 'h:mm a'); } catch { return 'Today'; }
      }
      return 'Today';
    }
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE');
  };

  const getTime = (t?: string) => {
    if (!t) return null;
    try { return format(new Date(`2000-01-01T${t}`), 'h:mm a'); }
    catch { return t; }
  };

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-header-left">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-medium text-foreground">Upcoming</h3>
        </div>
        {onNavigate && (
          <button className="widget-header-link" onClick={() => onNavigate('calendar')}>
            View all →
          </button>
        )}
      </div>
      <div className="widget-body">
        <div className="flex gap-2 px-1.5 pb-1">
          <Input
            value={newEventTitle}
            onChange={e => setNewEventTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addEvent(); }}
            placeholder="Add event (today)…"
            className="text-xs h-8"
            aria-label="New event title"
          />
          <Button onClick={addEvent} disabled={!newEventTitle.trim()} size="sm" className="h-8 w-8 p-0 shrink-0" aria-label="Add event">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted/50 rounded-md animate-pulse" />)}
          </div>
        ) : events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
              <div className="w-8 h-8 rounded-md bg-muted flex flex-col items-center justify-center shrink-0">
                <span className="text-[8px] text-muted-foreground uppercase leading-none">{format(parseISO(event.event_date), 'MMM')}</span>
                <span className="text-xs font-bold text-foreground leading-none">{format(parseISO(event.event_date), 'd')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{event.title}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{getLabel(event)}</span>
                  {event.event_time && !isToday(parseISO(event.event_date)) && (
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
          <p className="text-xs text-muted-foreground py-6 text-center">No upcoming events</p>
        )}
      </div>
    </div>
  );
}
