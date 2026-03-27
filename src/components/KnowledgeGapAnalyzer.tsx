import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  AlertTriangle,
  Info,
  Zap,
  FileText,
  StickyNote,
  Plus,
  Star,
  HelpCircle,
  XCircle,
  ThumbsUp,
} from 'lucide-react';

interface SourceMaterial {
  title: string;
  type: 'card' | 'note';
}

interface KnowledgeGap {
  topic: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  sourceMaterials: SourceMaterial[];
  relatedNotes?: string[];
  resources: {
    videos: string[];
    books: string[];
    courses: string[];
    articles: string[];
    quotes: string[];
  };
}

type InterestLevel = 'interested' | 'unsure' | 'uninterested';
type GapStatus = 'new' | 'studying' | 'resolved';

interface GapState {
  status: GapStatus;
  interest: InterestLevel;
}

interface GapStates {
  [topic: string]: GapState;
}

const STORAGE_KEY = 'pendragonx-knowledge-gap-states-v2';
const CACHE_KEY = 'pendragonx-knowledge-gaps-cache-v2';

export function KnowledgeGapAnalyzer() {
  const { user } = useAuth();
  const { cards, createCard } = useZettelCards();
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [gapStates, setGapStates] = useState<GapStates>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'interested' | 'unsure' | 'uninterested'>('all');
  const [createDialog, setCreateDialog] = useState<{ open: boolean; gap: KnowledgeGap | null; mode: 'card' | 'note' }>({ open: false, gap: null, mode: 'card' });
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setGapStates(JSON.parse(saved));
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setGaps(JSON.parse(cached));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gapStates));
  }, [gapStates]);

  const getState = (topic: string): GapState => gapStates[topic] || { status: 'new', interest: 'unsure' };

  const setInterest = (topic: string, interest: InterestLevel) => {
    setGapStates(prev => ({
      ...prev,
      [topic]: { ...getState(topic), interest },
    }));
  };

  const setStatus = (topic: string, status: GapStatus) => {
    setGapStates(prev => ({
      ...prev,
      [topic]: { ...getState(topic), status },
    }));
  };

  const analyzeKnowledge = async () => {
    if (!user) { toast.error('Sign in to analyze your knowledge'); return; }
    setAnalyzing(true);
    try {
      const { data: notes } = await supabase
        .from('notes')
        .select('title, content')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(30);

      const cardData = cards.map(c => ({ title: c.title, content: c.content }));

      if (cardData.length === 0 && (!notes || notes.length === 0)) {
        toast.error('Add some cards or notes first');
        setAnalyzing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-knowledge-gaps', {
        body: { cards: cardData, notes: notes || [] },
      });

      if (error) {
        if (error.message?.includes('429')) toast.error('Rate limited — try again shortly');
        else if (error.message?.includes('402')) toast.error('AI credits exhausted');
        else throw error;
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

  const openCreateDialog = (gap: KnowledgeGap, mode: 'card' | 'note') => {
    const resourceList = [
      ...gap.resources.books.map(b => `📚 ${b}`),
      ...gap.resources.articles.map(a => `📄 ${a}`),
      ...gap.resources.courses.map(c => `🎓 ${c}`),
    ].join('\n');

    setCreateTitle(`Knowledge Gap: ${gap.topic}`);
    setCreateContent(`${gap.description}\n\n--- Recommended Resources ---\n${resourceList}`);
    setCreateDialog({ open: true, gap, mode });
  };

  const handleCreate = async () => {
    if (!user || !createDialog.gap) return;
    setCreating(true);
    try {
      if (createDialog.mode === 'card') {
        await createCard({
          title: createTitle,
          content: createContent,
          number: '',
          description: createDialog.gap.description,
          category: 'knowledge-gap',
          tags: ['knowledge-gap', createDialog.gap.severity],
          linkedCards: [],
        });
        toast.success('Card created from knowledge gap');
      } else {
        const { error } = await supabase.from('notes').insert({
          user_id: user.id,
          title: createTitle,
          content: createContent,
          tags: ['knowledge-gap', createDialog.gap.severity],
        });
        if (error) throw error;
        toast.success('Note created from knowledge gap');
      }
      setStatus(createDialog.gap.topic, 'studying');
      setCreateDialog({ open: false, gap: null, mode: 'card' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const severityConfig = {
    high: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: AlertTriangle, label: 'Critical' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Info, label: 'Moderate' },
    low: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Zap, label: 'Minor' },
  };

  const interestConfig = {
    interested: { icon: ThumbsUp, label: 'Interested', className: 'bg-green-500/10 border-green-500/30 text-green-400' },
    unsure: { icon: HelpCircle, label: 'Unsure', className: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
    uninterested: { icon: XCircle, label: 'Not Interested', className: 'bg-muted/50 border-border text-muted-foreground' },
  };

  const filteredGaps = gaps.filter(gap => {
    if (filter === 'all') return true;
    return getState(gap.topic).interest === filter;
  });

  const stats = {
    total: gaps.length,
    interested: gaps.filter(g => getState(g.topic).interest === 'interested').length,
    unsure: gaps.filter(g => getState(g.topic).interest === 'unsure').length,
    uninterested: gaps.filter(g => getState(g.topic).interest === 'uninterested').length,
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
        <Button onClick={analyzeKnowledge} disabled={analyzing} size="sm" className="shrink-0">
          {analyzing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          {analyzing ? 'Scanning...' : 'Scan My Knowledge'}
        </Button>
      </div>

      {/* Filter stats */}
      {gaps.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {([
            { label: 'All', value: stats.total, key: 'all' as const },
            { label: 'Interested', value: stats.interested, key: 'interested' as const },
            { label: 'Unsure', value: stats.unsure, key: 'unsure' as const },
            { label: 'Skip', value: stats.uninterested, key: 'uninterested' as const },
          ]).map(stat => (
            <button
              key={stat.key}
              onClick={() => setFilter(stat.key)}
              className={`p-3 rounded-lg border transition-colors text-center ${
                filter === stat.key
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
            const state = getState(gap.topic);
            const severity = severityConfig[gap.severity];
            const SeverityIcon = severity.icon;
            const interest = interestConfig[state.interest];
            const InterestIcon = interest.icon;
            const isOpen = expandedGap === gap.topic;

            return (
              <Collapsible key={gap.topic} open={isOpen} onOpenChange={() => setExpandedGap(isOpen ? null : gap.topic)}>
                <Card className={`border transition-colors ${state.interest === 'uninterested' ? 'opacity-50' : ''}`}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors pb-3">
                      <div className="flex items-start gap-3">
                        <SeverityIcon className={`h-4 w-4 mt-0.5 shrink-0 ${severity.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-sm font-medium">{gap.topic}</CardTitle>
                            <Badge variant="outline" className={`text-[10px] ${severity.bg}`}>{severity.label}</Badge>
                            <Badge variant="outline" className={`text-[10px] ${interest.className}`}>
                              <InterestIcon className="h-2.5 w-2.5 mr-1" />{interest.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gap.description}</p>
                        </div>
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* Interest buttons */}
                      <div className="flex flex-wrap gap-2">
                        {(['interested', 'unsure', 'uninterested'] as InterestLevel[]).map(level => {
                          const cfg = interestConfig[level];
                          const Icon = cfg.icon;
                          const isActive = state.interest === level;
                          return (
                            <Button
                              key={level}
                              variant={isActive ? 'default' : 'outline'}
                              size="sm"
                              className={`text-xs h-7 ${isActive ? '' : 'text-muted-foreground'}`}
                              onClick={(e) => { e.stopPropagation(); setInterest(gap.topic, level); }}
                            >
                              <Icon className="h-3 w-3 mr-1" />{cfg.label}
                            </Button>
                          );
                        })}
                      </div>

                      {/* Create card/note actions */}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); openCreateDialog(gap, 'card'); }}>
                          <FileText className="h-3 w-3 mr-1" />Create Card
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); openCreateDialog(gap, 'note'); }}>
                          <StickyNote className="h-3 w-3 mr-1" />Create Note
                        </Button>
                      </div>

                      {/* Source materials */}
                      {gap.sourceMaterials && gap.sourceMaterials.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 font-medium">Based on your content</p>
                          <div className="flex flex-wrap gap-1.5">
                            {gap.sourceMaterials.map((src, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                                {src.type === 'card' ? <FileText className="h-2.5 w-2.5" /> : <BookOpen className="h-2.5 w-2.5" />}
                                {src.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fallback: relatedNotes from legacy data */}
                      {(!gap.sourceMaterials || gap.sourceMaterials.length === 0) && gap.relatedNotes && gap.relatedNotes.length > 0 && (
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

                        {gap.resources.videos.length > 0 && (
                          <ResourceSection icon={Video} label="Videos" items={gap.resources.videos} urlFn={(q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`} />
                        )}
                        {gap.resources.books.length > 0 && (
                          <ResourceSection icon={BookOpen} label="Books" items={gap.resources.books} urlFn={(b) => `https://openlibrary.org/search?q=${encodeURIComponent(b)}`} />
                        )}
                        {gap.resources.courses.length > 0 && (
                          <ResourceSection icon={GraduationCap} label="Free Courses" items={gap.resources.courses} urlFn={(c) => `https://www.classcentral.com/search?q=${encodeURIComponent(c)}`} />
                        )}
                        {gap.resources.articles.length > 0 && (
                          <ResourceSection icon={Globe} label="Articles" items={gap.resources.articles} urlFn={(a) => `https://en.wikipedia.org/wiki/${encodeURIComponent(a.replace(/ /g, '_'))}`} />
                        )}
                        {gap.resources.quotes.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Quote className="h-3 w-3" /> Quotes</p>
                            {gap.resources.quotes.map((quote, i) => (
                              <p key={i} className="text-xs italic text-muted-foreground p-2 rounded-md bg-muted/30 border-l-2 border-primary/30">"{quote}"</p>
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
            <p className="text-xs text-muted-foreground/60 mb-4">Click "Scan My Knowledge" to analyze your cards and notes</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No gaps match the "{filter}" filter</p>
          </CardContent>
        </Card>
      )}

      {/* Create Card/Note Dialog */}
      <Dialog open={createDialog.open} onOpenChange={(open) => !open && setCreateDialog({ open: false, gap: null, mode: 'card' })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {createDialog.mode === 'card' ? <FileText className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
              Create {createDialog.mode === 'card' ? 'Card' : 'Note'} from Gap
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Title" />
            <Textarea value={createContent} onChange={(e) => setCreateContent(e.target.value)} placeholder="Content" rows={8} className="text-sm" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog({ open: false, gap: null, mode: 'card' })}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !createTitle.trim()}>
              {creating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Create {createDialog.mode === 'card' ? 'Card' : 'Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResourceSection({ icon: Icon, label, items, urlFn }: { icon: any; label: string; items: string[]; urlFn: (item: string) => string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Icon className="h-3 w-3" /> {label}</p>
      {items.map((item, i) => (
        <a key={i} href={urlFn(item)} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-foreground hover:text-primary transition-colors p-2 rounded-md hover:bg-accent/50">
          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />{item}
        </a>
      ))}
    </div>
  );
}
