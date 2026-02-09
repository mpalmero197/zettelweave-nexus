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
  Edit3,
  ArrowUpRight
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

interface DashboardNotebook {
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
  const [notebooks, setNotebooks] = useState<DashboardNotebook[]>([]);
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
        .is('deleted_at', null)
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

  const totalConnections = cards.reduce((acc, card) => acc + (card.linkedCards?.length || 0), 0);
  const totalCategories = new Set(cards.map(card => card.category)).size;

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-48 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-[calc(100vh-3rem)]">
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Upgrade Banner */}
        {!hasPremium && <UpgradeBanner />}

        {/* Welcome + Action */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
          <Button 
            size="sm" 
            onClick={onCreateCard} 
            aria-label="Create new card"
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">New Card</span>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="list" aria-label="Statistics">
          {[
            { label: 'Cards', value: cards.length, icon: Brain, sub: `${totalConnections} connections` },
            { label: 'Notes', value: notes.length, icon: FileText, sub: `${favoriteNotes.length} starred` },
            { label: 'Notebooks', value: notebooks.length, icon: BookOpen, sub: `${totalCategories} categories` },
            { label: 'Events', value: todaysEvents.length, icon: Calendar, sub: 'today' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="group p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              role="listitem"
              aria-label={`${stat.label}: ${stat.value}`}
            >
              <div className="flex items-start justify-between mb-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick Capture + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
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
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Connections</span>
                  <span className="font-medium text-foreground tabular-nums">{totalConnections}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Categories</span>
                  <span className="font-medium text-foreground tabular-nums">{totalCategories}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Favorites</span>
                  <span className="font-medium text-foreground tabular-nums">{favoriteCards.length + favoriteNotes.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none p-0 h-auto" aria-label="Dashboard sections">
            {[
              { value: 'recent', icon: Clock, label: 'Recent' },
              { value: 'favorites', icon: Star, label: 'Favorites' },
              { value: 'notebooks', icon: Notebook, label: 'Notebooks' },
              { value: 'calendar', icon: Calendar, label: 'Upcoming' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-muted-foreground data-[state=active]:text-foreground"
              >
                <tab.icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="recent" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Cards */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-1">
                  Recent Cards
                </h3>
                <div className="space-y-0.5">
                  {recentCards.length > 0 ? (
                    recentCards.map((card) => (
                      <button
                        key={card.id} 
                        className="w-full flex items-center justify-between p-3 hover:bg-accent/50 rounded-md transition-colors text-left group"
                        onClick={() => onEdit?.(card)}
                        aria-label={`Open card: ${card.title}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-foreground">{card.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{card.number} · {getTimeAgo(card.updated_at || card.modified)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {card.is_favorite && <Star className="h-3 w-3 text-foreground fill-foreground" aria-label="Favorited" />}
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <Brain className="h-6 w-6 mx-auto mb-2 opacity-30" aria-hidden="true" />
                      <p className="text-sm">No cards yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Notes */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-1">
                  Recent Notes
                </h3>
                <div className="space-y-0.5">
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <button
                        key={note.id} 
                        className="w-full flex items-center justify-between p-3 hover:bg-accent/50 rounded-md transition-colors text-left group"
                        onClick={() => onOpenNote?.(note)}
                        aria-label={`Open note: ${note.title}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-foreground">{note.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(note.updated_at)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {note.is_favorite && <Star className="h-3 w-3 text-foreground fill-foreground" aria-label="Favorited" />}
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <FileText className="h-6 w-6 mx-auto mb-2 opacity-30" aria-hidden="true" />
                      <p className="text-sm">No notes yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Favorite Cards */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-1">Cards</h3>
                <div className="space-y-2">
                  {favoriteCards.length > 0 ? (
                    favoriteCards.slice(0, 5).map((card) => (
                      <div key={card.id} className="p-3 rounded-md border border-border hover:bg-accent/50 transition-colors">
                        <p className="font-medium text-sm">{card.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{card.number}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No favorites</p>
                  )}
                </div>
              </div>

              {/* Favorite Notes */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-1">Notes</h3>
                <div className="space-y-2">
                  {favoriteNotes.length > 0 ? (
                    favoriteNotes.slice(0, 5).map((note) => (
                      <div key={note.id} className="p-3 rounded-md border border-border hover:bg-accent/50 transition-colors">
                        <p className="font-medium text-sm">{note.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(note.updated_at)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No favorites</p>
                  )}
                </div>
              </div>

              {/* Favorite Notebooks */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-1">Notebooks</h3>
                <div className="space-y-2">
                  {favoriteNotebooks.length > 0 ? (
                    favoriteNotebooks.slice(0, 5).map((notebook) => (
                      <div key={notebook.id} className="p-3 rounded-md border border-border hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
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
                    <p className="text-sm text-muted-foreground text-center py-6">No favorites</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notebooks" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {notebooks.length > 0 ? (
                notebooks.map((notebook) => (
                  <div key={notebook.id} className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: notebook.color }}
                          aria-hidden="true"
                        />
                        <h3 className="font-medium text-sm">{notebook.name}</h3>
                      </div>
                      {notebook.is_favorite && <Star className="h-3 w-3 text-foreground fill-foreground" aria-label="Favorited" />}
                    </div>
                    {notebook.description && (
                      <p className="text-xs text-muted-foreground mb-1.5">{notebook.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60">{getTimeAgo(notebook.created_at)}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-10">
                  <BookOpen className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">No notebooks yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <div className="space-y-1">
              {calendarEvents.length > 0 ? (
                calendarEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-accent/50 transition-colors">
                    <div className="w-10 h-10 rounded-md bg-muted flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] text-muted-foreground uppercase">{format(new Date(event.event_date), 'MMM')}</span>
                      <span className="text-sm font-bold text-foreground leading-none">{format(new Date(event.event_date), 'd')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{event.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {event.source_type.replace('_', ' ')}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <Calendar className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
