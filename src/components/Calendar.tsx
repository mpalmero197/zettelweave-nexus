import { useState, useEffect } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Clock, FileText, Brain, StickyNote, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time?: string;
  source_type: string; // Keep as string for more flexibility
  source_id: string;
  created_at: string;
}

const sourceTypeConfig = {
  zettel_card: { icon: Brain, color: 'text-primary', bg: 'bg-primary/10', label: 'Zettel Card' },
  note: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Note' },
  scratch_pad: { icon: Lightbulb, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Scratch Pad' },
  sticky_note: { icon: StickyNote, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Sticky Note' },
  manual: { icon: CalendarIcon, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Manual Event' }
};

export function Calendar() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_time: ''
  });

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  useEffect(() => {
    // Filter events for selected date
    const dayEvents = events.filter(event => 
      isSameDay(parseISO(event.event_date), selectedDate)
    );
    setSelectedEvents(dayEvents);
  }, [selectedDate, events]);

  const fetchEvents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async () => {
    if (!user || !newEvent.title.trim()) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: user.id,
          title: newEvent.title,
          description: newEvent.description,
          event_date: format(selectedDate, 'yyyy-MM-dd'),
          event_time: newEvent.event_time || null,
          source_type: 'manual',
          source_id: crypto.randomUUID()
        });

      if (error) throw error;

      setNewEvent({ title: '', description: '', event_time: '' });
      setShowAddEvent(false);
      fetchEvents();
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Get dates that have events
  const eventDates = events.map(event => parseISO(event.event_date));

  const modifiers = {
    hasEvents: eventDates
  };

  const modifiersStyles = {
    hasEvents: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'white',
      fontWeight: 'bold'
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="h-80 bg-muted/30 rounded-lg animate-pulse" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground">Track events and reminders from your knowledge base</p>
        </div>
        <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Calendar Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Event description (optional)"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Time (optional)</label>
                <Input
                  type="time"
                  value={newEvent.event_time}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, event_time: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddEvent(false)}>
                  Cancel
                </Button>
                <Button onClick={addEvent} disabled={!newEvent.title.trim()}>
                  Add Event
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {format(selectedDate, 'MMMM yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                className={cn("w-full pointer-events-auto")}
              />
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  Dates with events are highlighted in blue
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events for Selected Date */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {format(selectedDate, 'MMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedEvents.length > 0 ? (
              selectedEvents.map((event) => {
                const config = sourceTypeConfig[event.source_type];
                const Icon = config.icon;

                return (
                  <div key={event.id} className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", config.bg)}>
                          <Icon className={cn("h-4 w-4", config.color)} />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{event.title}</h4>
                          {event.event_time && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(`2000-01-01T${event.event_time}`), 'h:mm a')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                    </div>
                    
                    {event.description && (
                      <p className="text-xs text-muted-foreground mb-2">{event.description}</p>
                    )}

                    {event.source_type === 'manual' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEvent(event.id)}
                        className="text-destructive hover:text-destructive h-6 px-2 text-xs"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-medium mb-2">No events this day</p>
                <p className="text-xs text-muted-foreground">
                  Add events manually or they'll appear automatically from your notes and cards
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>All Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events
              .filter(event => new Date(event.event_date) >= new Date())
              .slice(0, 10)
              .map((event) => {
                const config = sourceTypeConfig[event.source_type];
                const Icon = config.icon;

                return (
                  <div key={event.id} className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg">
                    <div className={cn("p-2 rounded-lg", config.bg)}>
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(event.event_date), 'MMM d, yyyy')}
                        {event.event_time && ` at ${format(new Date(`2000-01-01T${event.event_time}`), 'h:mm a')}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                );
              })}
            
            {events.filter(event => new Date(event.event_date) >= new Date()).length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}