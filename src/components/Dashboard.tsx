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
  Activity,
  Plus,
  Notebook,
  Sparkles,
  Edit3
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
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
      const { data: notesData } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      const { data: notebooksData } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

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
      <div className="p-4 space-y-4 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="p-4 space-y-6">
        {/* Upgrade Banner for Free Users */}
        {!hasPremium && <UpgradeBanner />}

        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Your knowledge at a glance</p>
          </div>
          <Button size="sm" onClick={onCreateCard} aria-label="Create new card">
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">New Card</span>
          </Button>
        </div>

        {/* Stats Overview - Clean, minimal */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="list" aria-label="Statistics overview">
          {[
            { label: 'Cards', value: cards.length, icon: Brain },
            { label: 'Notes', value: notes.length, icon: FileText },
            { label: 'Notebooks', value: notebooks.length, icon: BookOpen },
            { label: "Today's Events", value: todaysEvents.length, icon: Calendar },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card"
              role="listitem"
              aria-label={`${stat.label}: ${stat.value}`}
            >
              <stat.icon className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Capture & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Edit3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Quick Capture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScratchPad onCreateCard={onCreateCard} />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Connections</span>
                <span className="text-sm font-semibold text-foreground">
                  {cards.reduce((acc, card) => acc + (card.linkedCards?.length || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Categories</span>
                <span className="text-sm font-semibold text-foreground">
                  {new Set(cards.map(card => card.category)).size}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Favorites</span>
                <span className="text-sm font-semibold text-foreground">
                  {favoriteCards.length + favoriteNotes.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-lg p-1" aria-label="Dashboard sections">
            <TabsTrigger value="recent" className="flex items-center gap-1.5 text-sm rounded-md">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Recent</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-1.5 text-sm rounded-md">
              <Star className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Favorites</span>
            </TabsTrigger>
            <TabsTrigger value="notebooks" className="flex items-center gap-1.5 text-sm rounded-md">
              <Notebook className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Notebooks</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5 text-sm rounded-md">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Upcoming</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Cards */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Brain className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Recent Cards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {recentCards.length > 0 ? (
                    recentCards.map((card) => (
                      <div 
                        key={card.id} 
                        className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md transition-colors cursor-pointer"
                        onClick={() => onEdit?.(card)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onEdit?.(card)}
                        aria-label={`Open card: ${card.title}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{card.title}</p>
                          <p className="text-xs text-muted-foreground">{card.number} · {getTimeAgo(card.updated_at || card.modified)}</p>
                        </div>
                        {card.is_favorite && <Star className="h-3.5 w-3.5 text-foreground fill-foreground shrink-0 ml-2" aria-label="Favorited" />}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Brain className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-sm text-muted-foreground">No cards yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Recent Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <div 
                        key={note.id} 
                        className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md transition-colors cursor-pointer"
                        onClick={() => onOpenNote?.(note)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onOpenNote?.(note)}
                        aria-label={`Open note: ${note.title}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{note.title}</p>
                          <p className="text-xs text-muted-foreground">{getTimeAgo(note.updated_at)}</p>
                        </div>
                        {note.is_favorite && <Star className="h-3.5 w-3.5 text-foreground fill-foreground shrink-0 ml-2" aria-label="Favorited" />}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-sm text-muted-foreground">No notes yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Brain className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Favorite Cards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {favoriteCards.length > 0 ? (
                    favoriteCards.slice(0, 5).map((card) => (
                      <div key={card.id} className="p-3 rounded-md border border-border">
                        <p className="font-medium text-sm">{card.title}</p>
                        <p className="text-xs text-muted-foreground">{card.number}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No favorite cards</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Favorite Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {favoriteNotes.length > 0 ? (
                    favoriteNotes.slice(0, 5).map((note) => (
                      <div key={note.id} className="p-3 rounded-md border border-border">
                        <p className="font-medium text-sm">{note.title}</p>
                        <p className="text-xs text-muted-foreground">{getTimeAgo(note.updated_at)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No favorite notes</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Favorite Notebooks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {favoriteNotebooks.length > 0 ? (
                    favoriteNotebooks.slice(0, 5).map((notebook) => (
                      <div key={notebook.id} className="p-3 rounded-md border border-border">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: notebook.color }}
                            aria-hidden="true"
                          />
                          <p className="font-medium text-sm">{notebook.name}</p>
                        </div>
                        {notebook.description && (
                          <p className="text-xs text-muted-foreground mt-1">{notebook.description}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No favorite notebooks</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notebooks" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {notebooks.length > 0 ? (
                notebooks.map((notebook) => (
                  <Card key={notebook.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: notebook.color }}
                            aria-hidden="true"
                          />
                          <h3 className="font-semibold text-sm">{notebook.name}</h3>
                        </div>
                        {notebook.is_favorite && <Star className="h-3.5 w-3.5 text-foreground fill-foreground" aria-label="Favorited" />}
                      </div>
                      {notebook.description && (
                        <p className="text-xs text-muted-foreground mb-2">{notebook.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{getTimeAgo(notebook.created_at)}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm font-medium mb-1">No notebooks yet</p>
                  <p className="text-xs text-muted-foreground">Create your first notebook to organize your content</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {calendarEvents.length > 0 ? (
                  calendarEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.event_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {event.source_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">No upcoming events</p>
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
