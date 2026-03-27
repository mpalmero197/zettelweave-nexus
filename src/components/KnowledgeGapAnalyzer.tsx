import { useState, useEffect, useCallback } from 'react';
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
  Brain, ChevronDown, ChevronRight, ExternalLink, BookOpen, Video,
  GraduationCap, Globe, Quote, Loader2, Sparkles, AlertTriangle,
  Info, Zap, FileText, StickyNote, Plus, HelpCircle, XCircle,
  ThumbsUp, Save, Trash2, Eye, BookMarked, Lightbulb, Target,
} from 'lucide-react';

interface SourceMaterial {
  title: string;
  type: 'card' | 'note';
}

interface KnowledgeGap {
  id?: string;
  topic: string;
  description: string;
  detailed_explanation?: string;
  what_you_know?: string;
  what_you_need_to_learn?: string;
  severity: 'high' | 'medium' | 'low';
  interest: 'interested' | 'unsure' | 'uninterested';
  status: 'new' | 'studying' | 'resolved';
  sourceMaterials: SourceMaterial[];
  resources: {
    videos: string[];
    books: string[];
    courses: string[];
    articles: string[];
    quotes: string[];
  };
  saved?: boolean;
}

type InterestLevel = 'interested' | 'unsure' | 'uninterested';

export function KnowledgeGapAnalyzer() {
  const { user } = useAuth();
  const { cards, createCard } = useZettelCards();
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [savedGaps, setSavedGaps] = useState<KnowledgeGap[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'saved' | 'interested' | 'unsure' | 'uninterested'>('all');
  const [viewMode, setViewMode] = useState<'scan' | 'saved'>('saved');
  const [createDialog, setCreateDialog] = useState<{ open: boolean; gap: KnowledgeGap | null; mode: 'card' | 'note' }>({ open: false, gap: null, mode: 'card' });
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // Load saved gaps from Supabase
  const loadSavedGaps = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('knowledge_gaps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: KnowledgeGap[] = (data || []).map((row: any) => ({
        id: row.id,
        topic: row.topic,
        description: row.description,
        detailed_explanation: row.detailed_explanation,
        what_you_know: row.what_you_know,
        what_you_need_to_learn: row.what_you_need_to_learn,
        severity: row.severity as 'high' | 'medium' | 'low',
        interest: row.interest as InterestLevel,
        status: row.status as 'new' | 'studying' | 'resolved',
        sourceMaterials: (row.source_materials as any) || [],
        resources: (row.resources as any) || { videos: [], books: [], courses: [], articles: [], quotes: [] },
        saved: true,
      }));
      setSavedGaps(mapped);
    } catch (err) {
      console.error('Failed to load saved gaps:', err);
    } finally {
      setLoadingSaved(false);
    }
  }, [user]);

  useEffect(() => { loadSavedGaps(); }, [loadSavedGaps]);

  const saveGap = async (gap: KnowledgeGap) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('knowledge_gaps').insert({
        user_id: user.id,
        topic: gap.topic,
        description: gap.description,
        detailed_explanation: gap.detailed_explanation || null,
        what_you_know: gap.what_you_know || null,
        what_you_need_to_learn: gap.what_you_need_to_learn || null,
        severity: gap.severity,
        interest: gap.interest || 'unsure',
        status: gap.status || 'new',
        source_materials: gap.sourceMaterials as any,
        resources: gap.resources as any,
      }).select().single();

      if (error) throw error;
      toast.success(`Saved "${gap.topic}" to your knowledge gaps`);
      // Update scan results to mark as saved
      setGaps(prev => prev.map(g => g.topic === gap.topic ? { ...g, saved: true, id: data.id } : g));
      await loadSavedGaps();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save gap');
    }
  };

  const deleteGap = async (gap: KnowledgeGap) => {
    if (!user || !gap.id) return;
    try {
      const { error } = await supabase.from('knowledge_gaps').delete().eq('id', gap.id);
      if (error) throw error;
      toast.success(`Removed "${gap.topic}"`);
      setSavedGaps(prev => prev.filter(g => g.id !== gap.id));
      setGaps(prev => prev.map(g => g.topic === gap.topic ? { ...g, saved: false, id: undefined } : g));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const updateGapField = async (gap: KnowledgeGap, field: string, value: string) => {
    if (!user || !gap.id) return;
    try {
      const { error } = await supabase.from('knowledge_gaps')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', gap.id);
      if (error) throw error;
      setSavedGaps(prev => prev.map(g => g.id === gap.id ? { ...g, [field]: value } : g));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const analyzeKnowledge = async () => {
    if (!user) { toast.error('Sign in to analyze your knowledge'); return; }
    setAnalyzing(true);
    try {
      const { data: notes } = await supabase
        .from('notes').select('title, content')
        .eq('user_id', user.id).is('deleted_at', null)
        .order('updated_at', { ascending: false }).limit(30);

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
        const savedTopics = new Set(savedGaps.map(g => g.topic));
        const enrichedGaps: KnowledgeGap[] = data.gaps.map((g: any) => ({
          ...g,
          interest: 'unsure' as InterestLevel,
          status: 'new' as const,
          saved: savedTopics.has(g.topic),
        }));
        setGaps(enrichedGaps);
        setViewMode('scan');
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
    const sections = [
      gap.detailed_explanation && `## About This Topic\n${gap.detailed_explanation}`,
      gap.what_you_know && `## What You Already Know\n${gap.what_you_know}`,
      gap.what_you_need_to_learn && `## What You Need to Learn\n${gap.what_you_need_to_learn}`,
      `## Recommended Resources`,
      ...gap.resources.books.map(b => `📚 ${b}`),
      ...gap.resources.articles.map(a => `📄 ${a}`),
      ...gap.resources.courses.map(c => `🎓 ${c}`),
    ].filter(Boolean).join('\n\n');

    setCreateTitle(`Knowledge Gap: ${gap.topic}`);
    setCreateContent(`${gap.description}\n\n${sections}`);
    setCreateDialog({ open: true, gap, mode });
  };

  const handleCreate = async () => {
    if (!user || !createDialog.gap) return;
    setCreating(true);
    try {
      if (createDialog.mode === 'card') {
        await createCard({
          title: createTitle, content: createContent, number: '',
          description: createDialog.gap.description, category: 'knowledge-gap',
          tags: ['knowledge-gap', createDialog.gap.severity], linkedCards: [],
        });
        toast.success('Card created from knowledge gap');
      } else {
        const { error } = await supabase.from('notes').insert({
          user_id: user.id, title: createTitle, content: createContent,
          tags: ['knowledge-gap', createDialog.gap.severity],
        });
        if (error) throw error;
        toast.success('Note created from knowledge gap');
      }
      if (createDialog.gap.id) {
        await updateGapField(createDialog.gap, 'status', 'studying');
      }
      setCreateDialog({ open: false, gap: null, mode: 'card' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const severityConfig = {
    high: { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', icon: AlertTriangle, label: 'Critical' },
    medium: { color: 'text-warning', bg: 'bg-warning/10 border-warning/20', icon: Info, label: 'Moderate' },
    low: { color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: Zap, label: 'Minor' },
  };

  const interestConfig = {
    interested: { icon: ThumbsUp, label: 'Interested', className: 'bg-primary/10 border-primary/30 text-primary' },
    unsure: { icon: HelpCircle, label: 'Unsure', className: 'bg-warning/10 border-warning/30 text-warning' },
    uninterested: { icon: XCircle, label: 'Not Interested', className: 'bg-muted/50 border-border text-muted-foreground' },
  };

  const displayGaps = viewMode === 'saved' ? savedGaps : gaps;
  const filteredGaps = displayGaps.filter(gap => {
    if (filter === 'all') return true;
    if (filter === 'saved') return gap.saved;
    return gap.interest === filter;
  });

  const stats = {
    total: displayGaps.length,
    saved: viewMode === 'scan' ? gaps.filter(g => g.saved).length : savedGaps.length,
    interested: displayGaps.filter(g => g.interest === 'interested').length,
    unsure: displayGaps.filter(g => g.interest === 'unsure').length,
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
            Discover what you haven't mastered yet and save gaps to study.
          </p>
        </div>
        <Button onClick={analyzeKnowledge} disabled={analyzing} size="sm" className="shrink-0">
          {analyzing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          {analyzing ? 'Scanning...' : 'Scan My Knowledge'}
        </Button>
      </div>

      {/* View mode tabs */}
      <div className="flex gap-2">
        <Button variant={viewMode === 'saved' ? 'default' : 'outline'} size="sm"
          onClick={() => { setViewMode('saved'); setFilter('all'); }}>
          <BookMarked className="h-3.5 w-3.5 mr-1.5" />Saved Gaps ({savedGaps.length})
        </Button>
        {gaps.length > 0 && (
          <Button variant={viewMode === 'scan' ? 'default' : 'outline'} size="sm"
            onClick={() => { setViewMode('scan'); setFilter('all'); }}>
            <Eye className="h-3.5 w-3.5 mr-1.5" />Scan Results ({gaps.length})
          </Button>
        )}
      </div>

      {/* Filter stats */}
      {displayGaps.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {([
            { label: 'All', value: stats.total, key: 'all' as const },
            { label: viewMode === 'scan' ? 'Saved' : 'Total', value: stats.saved, key: 'saved' as const },
            { label: 'Interested', value: stats.interested, key: 'interested' as const },
            { label: 'Unsure', value: stats.unsure, key: 'unsure' as const },
          ]).map(stat => (
            <button key={stat.key} onClick={() => setFilter(stat.key)}
              className={`p-3 rounded-lg border transition-colors text-center ${
                filter === stat.key
                  ? 'bg-primary/10 border-primary/30 text-foreground'
                  : 'border-border bg-card hover:bg-accent/50 text-muted-foreground'
              }`}>
              <p className="text-lg font-bold tabular-nums">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wide">{stat.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Gap List */}
      {filteredGaps.length > 0 ? (
        <div className="space-y-3">
          {filteredGaps.map((gap) => (
            <GapCard
              key={gap.id || gap.topic}
              gap={gap}
              isOpen={expandedGap === (gap.id || gap.topic)}
              onToggle={() => setExpandedGap(expandedGap === (gap.id || gap.topic) ? null : (gap.id || gap.topic))}
              severityConfig={severityConfig}
              interestConfig={interestConfig}
              onSave={() => saveGap(gap)}
              onDelete={() => deleteGap(gap)}
              onInterestChange={(interest) => {
                if (gap.id) updateGapField(gap, 'interest', interest);
                else setGaps(prev => prev.map(g => g.topic === gap.topic ? { ...g, interest } : g));
              }}
              onStatusChange={(status) => {
                if (gap.id) updateGapField(gap, 'status', status);
              }}
              onCreateCard={() => openCreateDialog(gap, 'card')}
              onCreateNote={() => openCreateDialog(gap, 'note')}
            />
          ))}
        </div>
      ) : loadingSaved ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-6 w-6 mx-auto mb-3 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading saved gaps...</p>
          </CardContent>
        </Card>
      ) : displayGaps.length === 0 && viewMode === 'saved' ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Brain className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground mb-1">No saved knowledge gaps yet</p>
            <p className="text-xs text-muted-foreground/60 mb-4">Click "Scan My Knowledge" to find gaps, then save the ones you want to study</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No gaps match the current filter</p>
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
            <Textarea value={createContent} onChange={(e) => setCreateContent(e.target.value)} placeholder="Content" rows={10} className="text-sm" />
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

function GapCard({ gap, isOpen, onToggle, severityConfig, interestConfig, onSave, onDelete, onInterestChange, onStatusChange, onCreateCard, onCreateNote }: {
  gap: KnowledgeGap;
  isOpen: boolean;
  onToggle: () => void;
  severityConfig: any;
  interestConfig: any;
  onSave: () => void;
  onDelete: () => void;
  onInterestChange: (interest: InterestLevel) => void;
  onStatusChange: (status: string) => void;
  onCreateCard: () => void;
  onCreateNote: () => void;
}) {
  const severity = severityConfig[gap.severity];
  const SeverityIcon = severity.icon;
  const interest = interestConfig[gap.interest || 'unsure'];
  const InterestIcon = interest.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className={`border transition-colors ${gap.interest === 'uninterested' ? 'opacity-50' : ''}`}>
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
                  {gap.saved && <Badge variant="secondary" className="text-[10px]"><Save className="h-2.5 w-2.5 mr-1" />Saved</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gap.description}</p>
              </div>
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {!gap.saved ? (
                <Button variant="default" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); onSave(); }}>
                  <Save className="h-3 w-3 mr-1" />Save Gap
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="text-xs h-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                  <Trash2 className="h-3 w-3 mr-1" />Remove
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); onCreateCard(); }}>
                <FileText className="h-3 w-3 mr-1" />Create Card
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); onCreateNote(); }}>
                <StickyNote className="h-3 w-3 mr-1" />Create Note
              </Button>
            </div>

            {/* Interest buttons */}
            <div className="flex flex-wrap gap-2">
              {(['interested', 'unsure', 'uninterested'] as InterestLevel[]).map(level => {
                const cfg = interestConfig[level];
                const Icon = cfg.icon;
                const isActive = gap.interest === level;
                return (
                  <Button key={level} variant={isActive ? 'default' : 'outline'} size="sm"
                    className={`text-xs h-7 ${isActive ? '' : 'text-muted-foreground'}`}
                    onClick={(e) => { e.stopPropagation(); onInterestChange(level); }}>
                    <Icon className="h-3 w-3 mr-1" />{cfg.label}
                  </Button>
                );
              })}
            </div>

            {/* Detailed explanation */}
            {gap.detailed_explanation && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
                  <Lightbulb className="h-3 w-3" /> About This Topic
                </p>
                <div className="text-xs text-foreground/90 leading-relaxed p-3 rounded-md bg-muted/30 border border-border whitespace-pre-line">
                  {gap.detailed_explanation}
                </div>
              </div>
            )}

            {/* What you know */}
            {gap.what_you_know && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" /> What You Already Know
                </p>
                <div className="text-xs text-foreground/80 leading-relaxed p-3 rounded-md bg-primary/5 border border-primary/10">
                  {gap.what_you_know}
                </div>
              </div>
            )}

            {/* What you need to learn */}
            {gap.what_you_need_to_learn && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
                  <Target className="h-3 w-3" /> What You Need to Learn
                </p>
                <div className="text-xs text-foreground/80 leading-relaxed p-3 rounded-md bg-accent/30 border border-accent/20">
                  {gap.what_you_need_to_learn}
                </div>
              </div>
            )}

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
