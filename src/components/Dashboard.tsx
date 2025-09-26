import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useZettelCards } from '@/hooks/useZettelCards';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Star, 
  Clock, 
  BookOpen, 
  FileText, 
  Brain, 
  Calendar,
  TrendingUp,
  Activity,
  Plus,
  Notebook,
  Lightbulb,
  Target
} from 'lucide-react';
import { format, isToday, isYesterday, startOfDay, subDays } from 'date-fns';

interface Note {
  id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

interface Notebook {
  id: string;
  name: string;
  description: string;
  color: string;
  is_favorite: boolean;
  created_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  source_type: string;
  created_at: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const { cards } = useZettelCards();
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch notes
      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      // Fetch notebooks
      const { data: notebooksData } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      // Fetch calendar events
      const { data: eventsData } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', format(new Date(), 'yyyy-MM-dd'))
        .order('event_date', { ascending: true })
        .limit(10);

      setNotes(notesData || []);
      setNotebooks(notebooksData || []);
      setCalendarEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const favoriteCards = cards.filter(card => card.is_favorite);
  const favoriteNotes = notes.filter(note => note.is_favorite);
  const favoriteNotebooks = notebooks.filter(notebook => notebook.is_favorite);

  const recentCards = cards
    .sort((a, b) => {
      const aDate = new Date(a.updated_at || a.modified).getTime();
      const bDate = new Date(b.updated_at || b.modified).getTime();
      return bDate - aDate;
    })
    .slice(0, 5);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const todaysEvents = calendarEvents.filter(event => 
    isToday(new Date(event.event_date))
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground">Here's what's happening in your knowledge base</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Quick Add
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Zettel Cards</p>
                <p className="text-2xl font-bold text-primary">{cards.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Brain className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-2xl font-bold text-blue-600">{notes.length}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notebooks</p>
                <p className="text-2xl font-bold text-green-600">{notebooks.length}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Events</p>
                <p className="text-2xl font-bold text-orange-600">{todaysEvents.length}</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/30">
          <TabsTrigger value="recent" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="notebooks" className="flex items-center gap-2">
            <Notebook className="h-4 w-4" />
            Notebooks
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Recent Zettel Cards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentCards.length > 0 ? (
                  recentCards.map((card) => (
                    <div key={card.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{card.title}</p>
                        <p className="text-xs text-muted-foreground">{card.number} • {getTimeAgo(card.updated_at || card.modified)}</p>
                      </div>
                      {card.is_favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No cards yet</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Recent Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {notes.length > 0 ? (
                  notes.map((note) => (
                    <div key={note.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{note.title}</p>
                        <p className="text-xs text-muted-foreground">{getTimeAgo(note.updated_at)}</p>
                      </div>
                      {note.is_favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No notes yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Favorite Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Favorite Cards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {favoriteCards.length > 0 ? (
                  favoriteCards.slice(0, 5).map((card) => (
                    <div key={card.id} className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="font-medium text-sm">{card.title}</p>
                      <p className="text-xs text-muted-foreground">{card.number}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No favorite cards</p>
                )}
              </CardContent>
            </Card>

            {/* Favorite Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Favorite Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {favoriteNotes.length > 0 ? (
                  favoriteNotes.slice(0, 5).map((note) => (
                    <div key={note.id} className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                      <p className="font-medium text-sm">{note.title}</p>
                      <p className="text-xs text-muted-foreground">{getTimeAgo(note.updated_at)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No favorite notes</p>
                )}
              </CardContent>
            </Card>

            {/* Favorite Notebooks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Favorite Notebooks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {favoriteNotebooks.length > 0 ? (
                  favoriteNotebooks.slice(0, 5).map((notebook) => (
                    <div key={notebook.id} className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: notebook.color }}
                        />
                        <p className="font-medium text-sm">{notebook.name}</p>
                      </div>
                      {notebook.description && (
                        <p className="text-xs text-muted-foreground mt-1">{notebook.description}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No favorite notebooks</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notebooks" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notebooks.length > 0 ? (
              notebooks.map((notebook) => (
                <Card key={notebook.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: notebook.color }}
                        />
                        <h3 className="font-semibold">{notebook.name}</h3>
                      </div>
                      {notebook.is_favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                    </div>
                    {notebook.description && (
                      <p className="text-sm text-muted-foreground mb-3">{notebook.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Created {getTimeAgo(notebook.created_at)}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No notebooks yet</p>
                <p className="text-muted-foreground">Create your first notebook to organize your content</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                Upcoming Events & Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {calendarEvents.length > 0 ? (
                calendarEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Calendar className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.event_date), 'MMM d, yyyy')} • From {event.source_type.replace('_', ' ')}
                      </p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.source_type.replace('_', ' ')}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No upcoming events</p>
                  <p className="text-muted-foreground">Events from your notes and cards will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}