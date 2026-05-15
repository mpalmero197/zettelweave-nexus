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
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [dupConfirm, setDupConfirm] = useState<{
    matches: CalendarEvent[];
    onChoice: (c: 'cancel' | 'replace' | 'keep') => void;
  } | null>(null);

  const findDuplicates = async (date: string, time: string | null, excludeId?: string) => {
    if (!user || !date) return [] as CalendarEvent[];
    let q = supabase.from('calendar_events').select('id,title,event_date,event_time').eq('user_id', user.id).eq('event_date', date);
    q = time ? q.eq('event_time', time) : q.is('event_time', null);
    const { data } = await q;
    return (data || []).filter(d => d.id !== excludeId);
  };

  const askDuplicate = (matches: CalendarEvent[]) =>
    new Promise<'cancel' | 'replace' | 'keep'>((resolve) => {
      setDupConfirm({ matches, onChoice: (c) => { setDupConfirm(null); resolve(c); } });
    });

  const addEvent = async () => {
    if (!user || !newEventTitle.trim()) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const dup = await findDuplicates(today, null);
    if (dup.length) {
      const choice = await askDuplicate(dup);
      if (choice === 'cancel') return;
      if (choice === 'replace') {
        await supabase.from('calendar_events').delete().in('id', dup.map(d => d.id));
      }
    }
    const { error } = await supabase.from('calendar_events').insert({
      user_id: user.id, title: newEventTitle.trim(), event_date: today,
      source_type: 'manual', source_id: crypto.randomUUID(),
    });
    if (error) { toast.error('Failed to add event'); return; }
    toast.success('Event added');
    setNewEventTitle('');
    fetchUpcomingEvents();
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    fetchUpcomingEvents();
  };

  const startEdit = (ev: CalendarEvent) => {
    setEditing(ev);
    setEditDate(ev.event_date);
    setEditTime((ev.event_time || '').slice(0, 5));
  };

  const saveEdit = async () => {
    if (!editing) return;
    const time = editTime ? (editTime.length === 5 ? editTime + ':00' : editTime) : null;
    const dup = await findDuplicates(editDate, time, editing.id);
    if (dup.length) {
      const choice = await askDuplicate(dup);
      if (choice === 'cancel') return;
      if (choice === 'replace') {
        await supabase.from('calendar_events').delete().in('id', dup.map(d => d.id));
      }
    }
    const { error } = await supabase.from('calendar_events')
      .update({ event_date: editDate, event_time: time })
      .eq('id', editing.id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success('Updated');
    setEditing(null);
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
            <div key={event.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors group">
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
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <Popover open={editing?.id === event.id} onOpenChange={(o) => { if (!o) setEditing(null); else startEdit(event); }}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Edit event">
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 space-y-2" align="end">
                    <p className="text-xs font-medium">Move event</p>
                    <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-8 text-xs" />
                    <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="h-8 text-xs" />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(null)}>Cancel</Button>
                      <Button size="sm" className="h-7 text-xs" onClick={saveEdit}>Save</Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-destructive" onClick={() => deleteEvent(event.id)} aria-label="Delete event">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground py-6 text-center">No upcoming events</p>
        )}
      </div>
      <ConfirmDialog
        isOpen={!!dupConfirm}
        onClose={() => dupConfirm?.onChoice('cancel')}
        onConfirm={() => dupConfirm?.onChoice('keep')}
        title="Time conflict"
        description={`Another event already exists at this time: ${dupConfirm?.matches.map(m => m.title).join(', ')}. Keep both, replace existing, or cancel?`}
        cancelText="Cancel"
        confirmText="Keep both"
        customContent={
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => dupConfirm?.onChoice('cancel')}>Cancel</Button>
            <Button variant="outline" onClick={() => dupConfirm?.onChoice('replace')}>Replace existing</Button>
            <Button onClick={() => dupConfirm?.onChoice('keep')}>Keep both</Button>
          </div>
        }
      />
    </div>
  );
}
