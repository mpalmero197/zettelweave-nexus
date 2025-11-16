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
  Target,
  Sparkles,
  Edit3
} from 'lucide-react';
import { format, isToday, isYesterday, startOfDay, subDays } from 'date-fns';
import { ScratchPad } from './ScratchPad';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeBanner } from './UpgradeBanner';

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

interface DashboardProps {
  onCreateCard?: (card: any) => void;
  onEdit?: (item: any) => void;
  onOpenNote?: (note: Note) => void;
}

export function Dashboard({ onCreateCard, onEdit, onOpenNote }: DashboardProps = {}) {
  const { user } = useAuth();
  const { cards } = useZettelCards();
  const { hasPremium } = useSubscription();
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
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-8">
        {/* Upgrade Banner for Free Users */}
        {!hasPremium && <UpgradeBanner />}

        {/* Welcome Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 rounded-3xl blur-3xl opacity-30" />
          <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary rounded-2xl shadow-material-2">
                      <Sparkles className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h1 className="text-4xl font-bold text-foreground">
                      Welcome back!
                    </h1>
                  </div>
                  <p className="text-muted-foreground text-lg">Your knowledge universe awaits</p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    size="lg" 
                    variant="default"
                    className="shadow-material-2 hover:shadow-material-3 bg-primary text-primary-foreground"
                    onClick={onCreateCard}
                  >
                    <Plus className="h-5 w-5 md:mr-2" />
                    <span className="hidden md:inline">Quick Create</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview - Glassmorphic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
            <Card className="relative bg-card/70 backdrop-blur-xl border border-primary/20 hover:border-primary/40 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Zettel Cards</p>
                    <p className="text-3xl font-bold text-primary">{cards.length}</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <Brain className="h-7 w-7 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
            <Card className="relative bg-card/70 backdrop-blur-xl border border-blue-500/20 hover:border-blue-500/40 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-3xl font-bold text-blue-600">{notes.length}</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-7 w-7 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
            <Card className="relative bg-card/70 backdrop-blur-xl border border-green-500/20 hover:border-green-500/40 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Notebooks</p>
                    <p className="text-3xl font-bold text-green-600">{notebooks.length}</p>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="h-7 w-7 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-orange-500/10 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
            <Card className="relative bg-card/70 backdrop-blur-xl border border-orange-500/20 hover:border-orange-500/40 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent" />
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Today's Events</p>
                    <p className="text-3xl font-bold text-orange-600">{todaysEvents.length}</p>
                  </div>
                  <div className="p-4 bg-orange-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="h-7 w-7 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions & Scratchpad */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10 rounded-3xl blur-2xl opacity-40" />
              <Card className="relative bg-card/70 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-gradient-accent rounded-xl">
                      <Edit3 className="h-5 w-5 text-white" />
                    </div>
                    Quick Capture
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <ScratchPad onCreateCard={onCreateCard} />
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="space-y-6">
            <Card className="bg-card/70 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-primary" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <span className="text-sm font-semibold text-primary">+{Math.floor(Math.random() * 10)} cards</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Connections</span>
                  <span className="text-sm font-semibold text-green-600">{cards.reduce((acc, card) => acc + (card.linkedCards?.length || 0), 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Categories</span>
                  <span className="text-sm font-semibold text-blue-600">{new Set(cards.map(card => card.category)).size}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="recent" className="w-full">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20 rounded-2xl blur-xl" />
            <TabsList className="relative grid w-full grid-cols-4 bg-card/70 backdrop-blur-xl border border-border/50 rounded-2xl p-2 shadow-lg">
              <TabsTrigger 
                value="recent" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Recent</span>
              </TabsTrigger>
              <TabsTrigger 
                value="favorites" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300"
              >
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Favorites</span>
              </TabsTrigger>
              <TabsTrigger 
                value="notebooks" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300"
              >
                <Notebook className="h-4 w-4" />
                <span className="hidden sm:inline">Notebooks</span>
              </TabsTrigger>
              <TabsTrigger 
                value="calendar" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Upcoming</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="recent" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Cards */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl blur-xl opacity-50" />
                <Card className="relative bg-card/70 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                  <CardHeader className="relative">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <Brain className="h-5 w-5 text-primary" />
                      </div>
                      Recent Zettel Cards
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative space-y-3">
                    {recentCards.length > 0 ? (
                      recentCards.map((card) => (
                        <div 
                          key={card.id} 
                          className="group flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 rounded-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                          onClick={() => onEdit?.(card)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && onEdit?.(card)}
                          aria-label={`Open card: ${card.title}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm group-hover:text-primary transition-colors">{card.title}</p>
                            <p className="text-xs text-muted-foreground">{card.number} • {getTimeAgo(card.updated_at || card.modified)}</p>
                          </div>
                          {card.is_favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-sm text-muted-foreground">No cards yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Notes */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl blur-xl opacity-50" />
                <Card className="relative bg-card/70 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                  <CardHeader className="relative">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-xl">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      Recent Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative space-y-3">
                    {notes.length > 0 ? (
                      notes.map((note) => (
                        <div 
                          key={note.id} 
                          className="group flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 rounded-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                          onClick={() => onOpenNote?.(note)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && onOpenNote?.(note)}
                          aria-label={`Open note: ${note.title}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm group-hover:text-blue-600 transition-colors">{note.title}</p>
                            <p className="text-xs text-muted-foreground">{getTimeAgo(note.updated_at)}</p>
                          </div>
                          {note.is_favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-sm text-muted-foreground">No notes yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
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
    </div>
  );
}