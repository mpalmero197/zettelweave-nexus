import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useZettelCards } from '@/hooks/useZettelCards';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Brain,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Video,
  GraduationCap,
  Globe,
  Quote,
  Loader2,
  Sparkles,
  CheckCircle2,
  BookMarked,
  AlertTriangle,
  Info,
  Zap,
} from 'lucide-react';

interface KnowledgeGap {
  topic: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  relatedNotes: string[];
  resources: {
    videos: string[];
    books: string[];
    courses: string[];
    articles: string[];
    quotes: string[];
  };
}

type GapStatus = 'new' | 'studying' | 'resolved';

interface GapState {
  [topic: string]: GapStatus;
}

const STORAGE_KEY = 'pendragonx-knowledge-gap-states';
const CACHE_KEY = 'pendragonx-knowledge-gaps-cache';

export function KnowledgeGapAnalyzer() {
  const { user } = useAuth();
  const { cards } = useZettelCards();
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [gapStates, setGapStates] = useState<GapState>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'studying' | 'resolved'>('all');

  // Load persisted state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setGapStates(JSON.parse(saved));
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setGaps(JSON.parse(cached));
    } catch {}
  }, []);

  // Save state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gapStates));
  }, [gapStates]);

  const analyzeKnowledge = async () => {
    if (!user) {
      toast.error('Sign in to analyze your knowledge');
      return;
    }

    setAnalyzing(true);
    try {
      // Fetch notes
      const { data: notes } = await supabase
        .from('notes')
        .select('title, content')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(30);

      const cardData = cards.map(c => ({
        title: c.title,
        content: c.content,
      }));

      if (cardData.length === 0 && (!notes || notes.length === 0)) {
        toast.error('Add some cards or notes first to analyze knowledge gaps');
        setAnalyzing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-knowledge-gaps', {
        body: { cards: cardData, notes: notes || [] },
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Rate limited — please try again in a moment');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits exhausted. Add funds in Settings > Workspace > Usage.');
        } else {
          throw error;
        }
        return;
      }

      if (data?.gaps) {
        setGaps(data.gaps);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data.gaps));
        toast.success(`Found ${data.gaps.length} knowledge gaps`);
      }
    } catch (err: any) {
      console.error('Knowledge gap analysis error:', err);
      toast.error('Failed to analyze knowledge gaps');
    } finally {
      setAnalyzing(false);
    }
  };

  const setGapStatus = (topic: string, status: GapStatus) => {
    setGapStates(prev => ({ ...prev, [topic]: status }));
  };

  const getGapStatus = (topic: string): GapStatus => gapStates[topic] || 'new';

  const severityConfig = {
    high: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: AlertTriangle, label: 'Critical Gap' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Info, label: 'Moderate Gap' },
    low: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Zap, label: 'Minor Gap' },
  };

  const filteredGaps = gaps.filter(gap => {
    if (filter === 'all') return true;
    return getGapStatus(gap.topic) === filter;
  });

  const stats = {
    total: gaps.length,
    new: gaps.filter(g => getGapStatus(g.topic) === 'new').length,
    studying: gaps.filter(g => getGapStatus(g.topic) === 'studying').length,
    resolved: gaps.filter(g => getGapStatus(g.topic) === 'resolved').length,
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Knowledge Gaps
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover what you haven't mastered yet and find resources to fill the gaps.
          </p>
        </div>
        <Button
          onClick={analyzeKnowledge}
          disabled={analyzing}
          size="sm"
          className="shrink-0"
        >
          {analyzing ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1.5" />
          )}
          {analyzing ? 'Scanning...' : 'Scan My Knowledge'}
        </Button>
      </div>

      {/* Stats */}
      {gaps.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: stats.total, active: filter === 'all', onClick: () => setFilter('all') },
            { label: 'New', value: stats.new, active: filter === 'new', onClick: () => setFilter('new') },
            { label: 'Studying', value: stats.studying, active: filter === 'studying', onClick: () => setFilter('studying') },
            { label: 'Resolved', value: stats.resolved, active: filter === 'resolved', onClick: () => setFilter('resolved') },
          ].map(stat => (
            <button
              key={stat.label}
              onClick={stat.onClick}
              className={`p-3 rounded-lg border transition-colors text-center ${
                stat.active
                  ? 'bg-primary/10 border-primary/30 text-foreground'
                  : 'border-border bg-card hover:bg-accent/50 text-muted-foreground'
              }`}
            >
              <p className="text-lg font-bold tabular-nums">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wide">{stat.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Gap List */}
      {filteredGaps.length > 0 ? (
        <div className="space-y-3">
          {filteredGaps.map((gap) => {
            const status = getGapStatus(gap.topic);
            const severity = severityConfig[gap.severity];
            const SeverityIcon = severity.icon;
            const isOpen = expandedGap === gap.topic;

            return (
              <Collapsible
                key={gap.topic}
                open={isOpen}
                onOpenChange={() => setExpandedGap(isOpen ? null : gap.topic)}
              >
                <Card className={`border transition-colors ${status === 'resolved' ? 'opacity-60' : ''}`}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors pb-3">
                      <div className="flex items-start gap-3">
                        <SeverityIcon className={`h-4 w-4 mt-0.5 shrink-0 ${severity.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-sm font-medium">{gap.topic}</CardTitle>
                            <Badge variant="outline" className={`text-[10px] ${severity.bg}`}>
                              {severity.label}
                            </Badge>
                            {status === 'studying' && (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/20 text-amber-400">
                                <BookMarked className="h-2.5 w-2.5 mr-1" />Studying
                              </Badge>
                            )}
                            {status === 'resolved' && (
                              <Badge variant="outline" className="text-[10px] bg-green-500/10 border-green-500/20 text-green-400">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {gap.description}
                          </p>
                        </div>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* Status actions */}
                      <div className="flex gap-2">
                        {status !== 'studying' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={(e) => { e.stopPropagation(); setGapStatus(gap.topic, 'studying'); }}
                          >
                            <BookMarked className="h-3 w-3 mr-1" />
                            Mark as Studying
                          </Button>
                        )}
                        {status !== 'resolved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={(e) => { e.stopPropagation(); setGapStatus(gap.topic, 'resolved'); }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Mark Resolved
                          </Button>
                        )}
                        {status !== 'new' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-muted-foreground"
                            onClick={(e) => { e.stopPropagation(); setGapStatus(gap.topic, 'new'); }}
                          >
                            Reset
                          </Button>
                        )}
                      </div>

                      {/* Related notes */}
                      {gap.relatedNotes.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 font-medium">Related Content</p>
                          <div className="flex flex-wrap gap-1.5">
                            {gap.relatedNotes.map((note, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">{note}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resources */}
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Learning Resources</p>

                        {/* Videos */}
                        {gap.resources.videos.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Video className="h-3 w-3" /> Videos
                            </p>
                            {gap.resources.videos.map((q, i) => (
                              <a
                                key={i}
                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors p-2 rounded-md hover:bg-accent/50"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                                {q}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Books */}
                        {gap.resources.books.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <BookOpen className="h-3 w-3" /> Books
                            </p>
                            {gap.resources.books.map((book, i) => (
                              <a
                                key={i}
                                href={`https://openlibrary.org/search?q=${encodeURIComponent(book)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors p-2 rounded-md hover:bg-accent/50"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                                {book}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Courses */}
                        {gap.resources.courses.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <GraduationCap className="h-3 w-3" /> Free Courses
                            </p>
                            {gap.resources.courses.map((course, i) => (
                              <a
                                key={i}
                                href={`https://www.classcentral.com/search?q=${encodeURIComponent(course)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors p-2 rounded-md hover:bg-accent/50"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                                {course}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Articles */}
                        {gap.resources.articles.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Globe className="h-3 w-3" /> Articles
                            </p>
                            {gap.resources.articles.map((article, i) => (
                              <a
                                key={i}
                                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(article.replace(/ /g, '_'))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors p-2 rounded-md hover:bg-accent/50"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                                {article}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Quotes */}
                        {gap.resources.quotes.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Quote className="h-3 w-3" /> Quotes
                            </p>
                            {gap.resources.quotes.map((quote, i) => (
                              <p
                                key={i}
                                className="text-xs italic text-muted-foreground p-2 rounded-md bg-muted/30 border-l-2 border-primary/30"
                              >
                                "{quote}"
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      ) : gaps.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Brain className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground mb-1">No knowledge gaps analyzed yet</p>
            <p className="text-xs text-muted-foreground/60 mb-4">
              Click "Scan My Knowledge" to analyze your cards and notes
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No gaps match the "{filter}" filter</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
