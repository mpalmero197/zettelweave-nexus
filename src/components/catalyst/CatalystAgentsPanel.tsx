import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Bot, Play, Loader2, ChevronRight, ChevronLeft, Sparkles,
  Search, Bell, Link, FileText, Pencil, HelpCircle, Calendar,
  Quote, CheckSquare, Brain, Wand2, BookOpen, Plus, ArrowLeft,
  ExternalLink, Copy, Eye, FileDown, MapPin, Feather,
} from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';
import { Agent, AgentType, AGENT_DEFINITIONS } from '@/types/agents';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { CreateAgentDialog } from '@/components/agents/CreateAgentDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { AgentDetail } from '@/components/agents/AgentDetail';

const AGENT_ICONS: Record<AgentType, React.ElementType> = {
  research: Search, habit_reminder: Bell, smart_linking: Link,
  content_summarizer: FileText, writing_coach: Pencil, knowledge_gap: HelpCircle,
  daily_digest: Calendar, citation: Quote, task_extraction: CheckSquare,
  spaced_repetition: Brain, card_synthesizer: BookOpen, custom: Wand2,
};

interface ContentItem {
  id: string; title: string; content: string;
  type: 'card' | 'note' | 'scratchpad'; tags?: string[];
}

interface CatalystAgentsPanelProps {
  cards: ContentItem[]; notes: ContentItem[]; scratchpadNotes: ContentItem[];
  onDocumentGenerated?: () => void;
  documentContent?: string; documentTitle?: string;
  onInsertCitations?: (citations: any[]) => void;
  onInsertKnowledgeGap?: (gap: any, mode: 'inline' | 'section') => void;
}

type AgentView = 'list' | 'author-wizard' | 'knowledge-gaps' | 'citations' | 'research' | 'writing-coach' | 'summarizer' | 'task-extraction';
type WizardStep = 'topic' | 'sources' | 'focus' | 'generating';

export function CatalystAgentsPanel({ cards, notes, scratchpadNotes, onDocumentGenerated, documentContent, documentTitle, onInsertCitations, onInsertKnowledgeGap }: CatalystAgentsPanelProps) {
  const { agents, findings, createAgent, triggerAgentRun, updateAgent } = useAgents();
  const [view, setView] = useState<AgentView>('list');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Author wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('topic');
  const [topicInput, setTopicInput] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [focusInstructions, setFocusInstructions] = useState('');
  const [targetWords, setTargetWords] = useState<number>(8000);
  const [styleMimicry, setStyleMimicry] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runProgress, setRunProgress] = useState<{
    progress: number; stage: string; detail: string;
    sectionsDone: number; sectionsTotal: number;
    wordsDone: number; wordsTarget: number; status: string;
  }>({ progress: 0, stage: 'starting', detail: 'Preparing...', sectionsDone: 0, sectionsTotal: 0, wordsDone: 0, wordsTarget: 0, status: 'running' });
  const startTimeRef = useRef<number>(0);


  // Agent results state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [agentFindings, setAgentFindings] = useState<any[]>([]);

  // Knowledge Gap enhanced state
  const [selectedGapIds, setSelectedGapIds] = useState<Set<string>>(new Set());
  const [detailGap, setDetailGap] = useState<any | null>(null);
  const [showGapDetail, setShowGapDetail] = useState(false);

  const allContent = useMemo(() => [
    ...cards.map(c => ({ ...c, type: 'card' as const })),
    ...notes.map(n => ({ ...n, type: 'note' as const })),
    ...scratchpadNotes.map(s => ({ ...s, type: 'scratchpad' as const })),
  ], [cards, notes, scratchpadNotes]);

  const suggestedItems = useMemo(() => {
    if (!topicInput.trim()) return [];
    const keywords = topicInput.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    return allContent
      .map(item => { const text = (item.title + ' ' + item.content + ' ' + (item.tags?.join(' ') || '')).toLowerCase(); return { ...item, score: keywords.filter(kw => text.includes(kw)).length }; })
      .filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 15);
  }, [topicInput, allContent]);

  const filteredItems = useMemo(() => {
    if (!sourceSearch.trim()) return allContent;
    const q = sourceSearch.toLowerCase();
    return allContent.filter(item => item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q) || item.tags?.some(t => t.toLowerCase().includes(q)));
  }, [sourceSearch, allContent]);

  const toggleSource = (id: string) => {
    setSelectedSourceIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const hasDocument = documentContent && documentContent.length >= 50;

  // Generic agent runner
  const runDocumentAgent = async (agentType: AgentType, agentName: string, findingType: string, targetView: AgentView) => {
    if (!hasDocument) { toast.error('Open a document first'); return; }
    setView(targetView);
    setIsAnalyzing(true);
    setAgentFindings([]);

    try {
      let agent = agents.find(a => a.agent_type === agentType);
      if (!agent) {
        const def = AGENT_DEFINITIONS.find(d => d.type === agentType);
        const created = await createAgent(agentType, agentName, def?.description || '', def?.defaultConfig || {}, 60);
        if (!created) { toast.error(`Failed to create ${agentName}`); setIsAnalyzing(false); return; }
        agent = created;
      }
      await triggerAgentRun(agent.id, { documentContent, documentTitle: documentTitle || 'Untitled Document' });
      await new Promise(r => setTimeout(r, 4000));

      const { data: latestFindings } = await (await import('@/integrations/supabase/client')).supabase
        .from('agent_findings').select('*').eq('agent_id', agent.id).eq('finding_type', findingType)
        .order('created_at', { ascending: false }).limit(20) as any;

      setAgentFindings(latestFindings || []);
    } catch (err) {
      console.error(`${agentName} failed:`, err);
      toast.error(`${agentName} failed`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInsertCitations = () => {
    if (onInsertCitations && agentFindings.length > 0) {
      onInsertCitations(agentFindings);
      toast.success('Citations inserted into document');
    }
  };

  const startAuthorWizard = async () => {
    setView('author-wizard'); setWizardStep('topic'); setTopicInput(''); setSelectedSourceIds(new Set()); setFocusInstructions(''); setSourceSearch('');
    setTargetWords(8000); setActiveRunId(null);
    // Pull the user's default style-mimicry preference from their profile
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const { data } = await supabase.from('profiles').select('author_style_mimicry_enabled').eq('user_id', u.id).maybeSingle();
        if (data && typeof (data as any).author_style_mimicry_enabled === 'boolean') {
          setStyleMimicry((data as any).author_style_mimicry_enabled);
        }
      }
    } catch { /* ignore */ }
  };

  // Poll the active run for progress updates while generating
  useEffect(() => {
    if (!activeRunId || wizardStep !== 'generating') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await (supabase.from('agent_runs') as any)
          .select('progress, progress_stage, progress_detail, progress_sections_done, progress_sections_total, progress_words_done, progress_words_target, status')
          .eq('id', activeRunId).maybeSingle();
        if (!cancelled && data) {
          setRunProgress({
            progress: Number(data.progress) || 0,
            stage: data.progress_stage || 'working',
            detail: data.progress_detail || '',
            sectionsDone: data.progress_sections_done || 0,
            sectionsTotal: data.progress_sections_total || 0,
            wordsDone: data.progress_words_done || 0,
            wordsTarget: data.progress_words_target || 0,
            status: data.status || 'running',
          });
          if (data.status === 'completed' || data.status === 'failed') {
            return; // stop polling
          }
        }
      } catch (e) { console.error('progress poll failed', e); }
      if (!cancelled) setTimeout(tick, 2000);
    };
    tick();
    return () => { cancelled = true; };
  }, [activeRunId, wizardStep]);

  const handleGenerate = async () => {
    const configPayload = {
      synthesizer_title: topicInput || undefined,
      custom_instructions: focusInstructions || undefined,
      selected_source_ids: Array.from(selectedSourceIds),
      synthesizer_max_cards: 50,
      author_target_words: targetWords,
      author_style_mimicry: styleMimicry,
    };
    let authorAgent = agents.find(a => a.agent_type === 'card_synthesizer');
    if (!authorAgent) {
      const created = await createAgent('card_synthesizer', 'Author Agent', 'Writes comprehensive documents', configPayload as any, 60);
      if (!created) { toast.error('Failed to create Author Agent'); return; }
      authorAgent = created;
    } else {
      await updateAgent(authorAgent.id, { config: { ...authorAgent.config, ...configPayload } as any });
    }
    setWizardStep('generating');
    setIsGenerating(true);
    setRunProgress({ progress: 0, stage: 'starting', detail: 'Preparing...', sectionsDone: 0, sectionsTotal: 0, wordsDone: 0, wordsTarget: targetWords, status: 'running' });
    startTimeRef.current = Date.now();
    try {
      // Fire-and-forget: don't await — progress comes through agent_runs polling
      const runPromise = triggerAgentRun(authorAgent.id);
      runPromise.then(run => {
        if (run?.id) setActiveRunId(run.id);
      }).catch(() => toast.error('Failed to start Author Agent'));
      // Also poll for the latest run while waiting for the runId
      const { supabase } = await import('@/integrations/supabase/client');
      const findLatest = async () => {
        const { data } = await (supabase.from('agent_runs') as any)
          .select('id')
          .eq('agent_id', authorAgent!.id)
          .order('started_at', { ascending: false })
          .limit(1);
        if (data && data[0]?.id) setActiveRunId(data[0].id);
      };
      setTimeout(findLatest, 800);
      onDocumentGenerated?.();
    } catch {
      toast.error('Failed to start Author Agent');
      setIsGenerating(false);
    }
  };

  // ETA estimation: blends elapsed-vs-progress with a sensible minimum
  const eta = useMemo(() => {
    if (!startTimeRef.current || runProgress.progress < 3) return null;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const remainingPct = Math.max(0, 100 - runProgress.progress);
    const projected = (elapsed / runProgress.progress) * remainingPct;
    if (!isFinite(projected) || projected < 0) return null;
    const secs = Math.round(projected);
    if (secs < 60) return `~${secs}s left`;
    return `~${Math.ceil(secs / 60)} min left`;
  }, [runProgress.progress]);

  const STAGE_LABELS: Record<string, string> = {
    starting: 'Starting up', gathering: 'Reading your knowledge', style_analysis: 'Studying your voice',
    topic: 'Choosing topic', outline: 'Outlining', writing: 'Writing', polish: 'Polishing',
    saving: 'Saving', done: 'Complete', working: 'Working',
  };



  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const renderSourceItem = (item: ContentItem & { score?: number }, showScore = false) => (
    <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => toggleSource(item.id)}>
      <Checkbox checked={selectedSourceIds.has(item.id)} onCheckedChange={() => toggleSource(item.id)} onClick={(e) => e.stopPropagation()} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] capitalize shrink-0">{item.type}</Badge>
          <p className="text-xs font-medium truncate">{item.title}</p>
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.content.substring(0, 100)}...</p>
        {showScore && (item as any).score > 0 && <Badge variant="secondary" className="text-[10px] mt-1">{(item as any).score} match{(item as any).score > 1 ? 'es' : ''}</Badge>}
      </div>
    </div>
  );

  // ── Agent Results View (shared for Citation, Research, Writing Coach, Summarizer, Task Extraction) ──
  const renderAgentResultsView = (title: string, icon: React.ElementType, emptyMsg: string, renderItem: (f: any) => React.ReactNode, extraActions?: React.ReactNode) => {
    const Icon = icon;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setView('list')}><ArrowLeft className="h-3.5 w-3.5" /></Button>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Analyzing document...</p>
            <p className="text-xs text-muted-foreground text-center">This may take a few seconds.</p>
          </div>
        ) : agentFindings.length > 0 ? (
          <>
            {extraActions}
            <ScrollArea className="h-[calc(100vh-550px)] min-h-[250px]">
              <div className="space-y-2 pr-2">{agentFindings.map(renderItem)}</div>
            </ScrollArea>
          </>
        ) : (
          <div className="text-center py-8 space-y-2">
            <Icon className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{emptyMsg}</p>
          </div>
        )}
      </div>
    );
  };

  // ── Citations View ──
  if (view === 'citations') {
    return renderAgentResultsView('Citations', Quote, 'No citations found.', (f: any) => (
      <div key={f.id} className="p-3 rounded-lg border border-primary/20 bg-primary/[0.02]">
        <div className="flex items-start gap-2">
          <Badge className="shrink-0 text-[10px] mt-0.5">{f.metadata?.citation_number}</Badge>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">{f.metadata?.source_title}</p>
            <p className="text-[11px] text-muted-foreground mt-1 italic">"{f.metadata?.passage?.substring(0, 120)}..."</p>
            <p className="text-[11px] text-muted-foreground mt-1">{f.content}</p>
            {f.metadata?.source_url && (
              <a href={f.metadata.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary mt-1 hover:underline">
                <ExternalLink className="h-3 w-3" /> View Source
              </a>
            )}
          </div>
        </div>
      </div>
    ), onInsertCitations ? (
      <Button size="sm" className="w-full mb-2" onClick={handleInsertCitations}>
        <Copy className="h-3.5 w-3.5 mr-1" /> Insert All Citations into Document
      </Button>
    ) : undefined);
  }

  // ── Research View ──
  if (view === 'research') {
    return renderAgentResultsView('Research Findings', Search, 'No research findings.', (f: any) => (
      <div key={f.id} className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/[0.02]">
        <p className="text-xs font-semibold">{f.metadata?.source_title}</p>
        <Badge variant="outline" className="text-[9px] mt-1 mb-1">{f.metadata?.topic}</Badge>
        <blockquote className="border-l-2 border-primary/30 pl-2 mt-1.5">
          <p className="text-[11px] text-muted-foreground italic">"{f.metadata?.relevant_quote}"</p>
        </blockquote>
        <p className="text-[10px] text-muted-foreground mt-1.5">{f.metadata?.relevance_explanation}</p>
        {f.metadata?.source_url && (
          <a href={f.metadata.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary mt-1 hover:underline">
            <ExternalLink className="h-3 w-3" /> {f.metadata.source_url.substring(0, 50)}...
          </a>
        )}
      </div>
    ));
  }

  // ── Writing Coach View ──
  if (view === 'writing-coach') {
    return renderAgentResultsView('Writing Feedback', Pencil, 'No feedback — your writing looks great!', (f: any) => {
      const sev = f.metadata?.severity || 'medium';
      const color = sev === 'high' ? 'border-destructive/50 bg-destructive/5' : sev === 'medium' ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-green-500/50 bg-green-500/5';
      return (
        <div key={f.id} className={`p-3 rounded-lg border ${color}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="outline" className="text-[9px] capitalize">{f.metadata?.category}</Badge>
            <Badge variant={sev === 'high' ? 'destructive' : 'secondary'} className="text-[9px]">{sev}</Badge>
          </div>
          {f.metadata?.passage && <p className="text-[11px] text-muted-foreground italic mb-1">"{f.metadata.passage.substring(0, 100)}"</p>}
          <p className="text-[11px] font-medium">{f.metadata?.issue}</p>
          <p className="text-[11px] text-primary mt-1">💡 {f.content}</p>
        </div>
      );
    });
  }

  // ── Summarizer View ──
  if (view === 'summarizer') {
    return renderAgentResultsView('Document Summary', FileText, 'No summary generated.', (f: any) => (
      <div key={f.id} className="space-y-3">
        <Card className="p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Executive Summary</p>
          <p className="text-xs">{f.content}</p>
        </Card>
        {f.metadata?.key_points && (
          <Card className="p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Key Points</p>
            <ul className="space-y-1">{f.metadata.key_points.map((p: string, i: number) => <li key={i} className="text-xs flex gap-1.5"><span className="text-primary shrink-0">•</span>{p}</li>)}</ul>
          </Card>
        )}
        {f.metadata?.themes && (
          <div className="flex flex-wrap gap-1">{f.metadata.themes.map((t: string, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>
        )}
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span>📝 {f.metadata?.word_count_original?.toLocaleString()} words</span>
          <span>⏱ {f.metadata?.reading_time_minutes} min read</span>
        </div>
      </div>
    ));
  }

  // ── Task Extraction View ──
  if (view === 'task-extraction') {
    return renderAgentResultsView('Extracted Tasks', CheckSquare, 'No tasks found in the document.', (f: any) => (
      <div key={f.id} className="p-2.5 rounded-lg border border-border">
        <div className="flex items-start gap-2">
          <CheckSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">{f.metadata?.task}</p>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              <Badge variant={f.metadata?.priority === 'high' ? 'destructive' : 'secondary'} className="text-[9px]">{f.metadata?.priority}</Badge>
              {f.metadata?.context && <Badge variant="outline" className="text-[9px]">{f.metadata.context}</Badge>}
              {f.metadata?.deadline_hint && <Badge variant="outline" className="text-[9px]">📅 {f.metadata.deadline_hint}</Badge>}
            </div>
          </div>
        </div>
      </div>
    ));
  }

  // ── Knowledge Gaps View ──
  if (view === 'knowledge-gaps') {
    const toggleGapSelection = (id: string) => {
      setSelectedGapIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    };

    const handleInsertGap = (gap: any, mode: 'inline' | 'section') => {
      if (onInsertKnowledgeGap) {
        onInsertKnowledgeGap(gap, mode);
        toast.success(mode === 'inline' ? 'Gap inserted at relevant section' : 'Gap added to Knowledge Gaps section');
      }
    };

    const handleInsertSelected = (mode: 'inline' | 'section') => {
      const selected = agentFindings.filter(f => selectedGapIds.has(f.id));
      if (selected.length === 0) { toast.error('Select gaps to insert'); return; }
      selected.forEach(gap => onInsertKnowledgeGap?.(gap, mode));
      toast.success(`${selected.length} gap(s) inserted`);
      setSelectedGapIds(new Set());
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setView('list')}><ArrowLeft className="h-3.5 w-3.5" /></Button>
          <h3 className="text-sm font-semibold">Knowledge Gaps</h3>
        </div>

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Analyzing document...</p>
            <p className="text-xs text-muted-foreground text-center">This may take a few seconds.</p>
          </div>
        ) : agentFindings.length > 0 ? (
          <>
            {selectedGapIds.size > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-primary/30 bg-primary/5">
                <Badge variant="secondary" className="text-[10px]">{selectedGapIds.size} selected</Badge>
                <div className="flex-1" />
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleInsertSelected('inline')}>
                  <MapPin className="h-3 w-3 mr-1" /> Inline
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleInsertSelected('section')}>
                  <FileDown className="h-3 w-3 mr-1" /> To Section
                </Button>
              </div>
            )}

            <ScrollArea className="h-[calc(100vh-550px)] min-h-[250px]">
              <div className="space-y-2 pr-2">
                {agentFindings.map((f: any) => {
                  const severity = f.metadata?.severity || 'medium';
                  const color = severity === 'high' ? 'border-destructive/50 bg-destructive/5' : severity === 'medium' ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-green-500/50 bg-green-500/5';
                  return (
                    <div key={f.id} className={`p-3 rounded-lg border ${color} transition-all`}>
                      <div className="flex items-start gap-2">
                        <Checkbox checked={selectedGapIds.has(f.id)} onCheckedChange={() => toggleGapSelection(f.id)} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold flex-1">{f.title}</p>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => { setDetailGap(f); setShowGapDetail(true); }}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {f.metadata?.section && <Badge variant="outline" className="text-[9px] mt-1 mb-1">Section: {f.metadata.section}</Badge>}
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{f.content}</p>
                          <div className="flex gap-1.5 mt-2">
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleInsertGap(f, 'inline')}>
                              <MapPin className="h-3 w-3 mr-1" /> At Section
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleInsertGap(f, 'section')}>
                              <FileDown className="h-3 w-3 mr-1" /> To End
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Floating detail dialog */}
            <Dialog open={showGapDetail} onOpenChange={setShowGapDetail}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">{detailGap?.title}</DialogTitle>
                  <DialogDescription className="sr-only">Knowledge gap detail view</DialogDescription>
                  <div className="flex items-center gap-2 mt-1">
                    {detailGap?.metadata?.section && <Badge variant="outline" className="text-[10px]">Section: {detailGap.metadata.section}</Badge>}
                    {detailGap?.metadata?.severity && (
                      <Badge variant={detailGap.metadata.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">
                        {detailGap.metadata.severity}
                      </Badge>
                    )}
                  </div>
                </DialogHeader>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Gap Description</p>
                      <p className="text-sm leading-relaxed">{detailGap?.content}</p>
                    </div>
                    {detailGap?.metadata?.suggestion && (
                      <div className="p-3 rounded-lg bg-muted/50 border border-border">
                        <p className="text-[10px] font-semibold text-primary uppercase mb-1">💡 Suggested Content</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{detailGap.metadata.suggestion}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { handleInsertGap(detailGap, 'inline'); setShowGapDetail(false); }}>
                    <MapPin className="h-3.5 w-3.5 mr-1" /> Insert at Section
                  </Button>
                  <Button variant="default" size="sm" className="flex-1" onClick={() => { handleInsertGap(detailGap, 'section'); setShowGapDetail(false); }}>
                    <FileDown className="h-3.5 w-3.5 mr-1" /> Add to Knowledge Gaps
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <div className="text-center py-8 space-y-2">
            <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No knowledge gaps found — your document looks comprehensive!</p>
          </div>
        )}
      </div>
    );
  }

  // ── Author Wizard View ──
  if (view === 'author-wizard') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setView('list')}><ArrowLeft className="h-3.5 w-3.5" /></Button>
          <h3 className="text-sm font-semibold">Author Agent</h3>
        </div>
        <div className="flex items-center gap-1">
          {(['topic', 'sources', 'focus'] as WizardStep[]).map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${wizardStep === step ? 'bg-primary text-primary-foreground' : wizardStep === 'generating' || (['topic', 'sources', 'focus'].indexOf(wizardStep) > i) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
              {i < 2 && <div className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>

        {wizardStep === 'topic' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">What topic should the Author explore?</label>
              <Input value={topicInput} onChange={(e) => setTopicInput(e.target.value)} placeholder="e.g. Quantum Computing..." className="mt-1" />
            </div>
            <Button className="w-full" size="sm" onClick={() => setWizardStep('sources')}>Next: Select Sources <ChevronRight className="h-3.5 w-3.5 ml-1" /></Button>
          </div>
        )}
        {wizardStep === 'sources' && (
          <div className="space-y-3">
            <Input value={sourceSearch} onChange={(e) => setSourceSearch(e.target.value)} placeholder="Search cards, notes..." className="mt-1" />
            {topicInput.trim() && suggestedItems.length > 0 && !sourceSearch.trim() && (
              <ScrollArea className="h-[180px]"><div className="space-y-1.5 pr-2">{suggestedItems.map(item => renderSourceItem(item, true))}</div></ScrollArea>
            )}
            <ScrollArea className="h-[200px]"><div className="space-y-1.5 pr-2">{filteredItems.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No content</p> : filteredItems.map(item => renderSourceItem(item))}</div></ScrollArea>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setWizardStep('topic')}><ChevronLeft className="h-3.5 w-3.5 mr-1" />Back</Button>
              <Button size="sm" className="flex-1" onClick={() => setWizardStep('focus')}>Next<ChevronRight className="h-3.5 w-3.5 ml-1" /></Button>
            </div>
          </div>
        )}
        {wizardStep === 'focus' && (
          <div className="space-y-3">
            <Textarea value={focusInstructions} onChange={(e) => setFocusInstructions(e.target.value)} placeholder="e.g. Focus on practical applications..." className="mt-1 min-h-[80px] text-xs" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Target length</label>
                <span className="text-xs font-mono tabular-nums text-muted-foreground">{targetWords.toLocaleString()} words</span>
              </div>
              <Slider value={[targetWords]} min={1500} max={25000} step={500} onValueChange={(v) => setTargetWords(v[0])} />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>1.5k</span><span>25k</span></div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-muted/20">
              <Feather className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="style-mimicry" className="text-xs font-medium cursor-pointer">Write in my voice</label>
                  <Switch id="style-mimicry" checked={styleMimicry} onCheckedChange={setStyleMimicry} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Analyzes your notes to match your tone, rhythm, and vocabulary.</p>
              </div>
            </div>

            <Card className="p-3 bg-muted/30">
              <div className="space-y-1 text-xs">
                <p><strong>Topic:</strong> {topicInput || 'AI will choose'}</p>
                <p><strong>Sources:</strong> {selectedSourceIds.size || 'All'}</p>
                <p><strong>Length:</strong> ~{targetWords.toLocaleString()} words</p>
                <p><strong>Voice:</strong> {styleMimicry ? 'Your style' : 'Default'}</p>
              </div>
            </Card>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setWizardStep('sources')}><ChevronLeft className="h-3.5 w-3.5 mr-1" />Back</Button>
              <Button size="sm" className="flex-1" onClick={handleGenerate}><BookOpen className="h-3.5 w-3.5 mr-1" />Generate</Button>
            </div>
          </div>
        )}
        {wizardStep === 'generating' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{STAGE_LABELS[runProgress.stage] || 'Working'}</p>
                <p className="text-[11px] text-muted-foreground truncate">{runProgress.detail || 'Author Agent is writing...'}</p>
              </div>
              <span className="text-sm font-mono tabular-nums font-semibold shrink-0">{Math.round(runProgress.progress)}%</span>
            </div>
            <Progress value={runProgress.progress} className="h-2" />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {runProgress.sectionsTotal > 0
                  ? `Section ${runProgress.sectionsDone}/${runProgress.sectionsTotal}`
                  : 'Planning...'}
              </span>
              <span>{eta || ' '}</span>
            </div>
            {runProgress.wordsTarget > 0 && (
              <div className="text-[11px] text-muted-foreground text-center">
                {runProgress.wordsDone.toLocaleString()} / {runProgress.wordsTarget.toLocaleString()} words
              </div>
            )}
            {runProgress.status === 'completed' && (
              <div className="space-y-2">
                <p className="text-xs text-center text-green-600 font-medium">Document ready! Open Catalyst to view it.</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => { setView('list'); setWizardStep('topic'); setActiveRunId(null); setIsGenerating(false); }}>Done</Button>
              </div>
            )}
            {runProgress.status === 'failed' && (
              <div className="space-y-2">
                <p className="text-xs text-center text-destructive font-medium">Generation failed. Please try again.</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => { setView('list'); setWizardStep('topic'); setActiveRunId(null); setIsGenerating(false); }}>Back</Button>
              </div>
            )}
          </div>
        )}

      </div>
    );
  }

  // ── Agent List View ──
  const documentAgents: { type: AgentType; name: string; icon: React.ElementType; color: string; findingType: string; targetView: AgentView; description: string }[] = [
    { type: 'citation', name: 'Citation Agent', icon: Quote, color: 'primary', findingType: 'citation', targetView: 'citations', description: 'Add numbered citations & Sources section' },
    { type: 'research', name: 'Research Agent', icon: Search, color: 'blue-500', findingType: 'research_finding', targetView: 'research', description: 'Find relevant links & quotes' },
    { type: 'knowledge_gap', name: 'Knowledge Gap Agent', icon: HelpCircle, color: 'yellow-500', findingType: 'knowledge_gap', targetView: 'knowledge-gaps', description: 'Find knowledge gaps in your document' },
    { type: 'writing_coach', name: 'Writing Coach', icon: Pencil, color: 'purple-500', findingType: 'writing_feedback', targetView: 'writing-coach', description: 'Grammar, style & tone feedback' },
    { type: 'content_summarizer', name: 'Summarizer', icon: FileText, color: 'green-500', findingType: 'content_summary', targetView: 'summarizer', description: 'Generate executive summary & key points' },
    { type: 'task_extraction', name: 'Task Extractor', icon: CheckSquare, color: 'orange-500', findingType: 'extracted_task', targetView: 'task-extraction', description: 'Extract action items from document' },
  ];

  return (
    <div className="space-y-3">
      {/* Author Agent CTA */}
      <Card className="p-3 border-primary/20 bg-primary/[0.03] cursor-pointer hover:bg-primary/[0.06] transition-colors" onClick={startAuthorWizard}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><BookOpen className="h-4.5 w-4.5 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Author Agent</p>
            <p className="text-[10px] text-muted-foreground">Generate a full document from your knowledge base</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </Card>

      {/* Document-aware Agents */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Document Agents</p>
        <div className="space-y-1.5">
          {documentAgents.map(da => {
            const Icon = da.icon;
            return (
              <Card
                key={da.type}
                className={`p-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${!hasDocument ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => runDocumentAgent(da.type, da.name, da.findingType, da.targetView)}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{da.name}</p>
                    <p className="text-[10px] text-muted-foreground">{hasDocument ? da.description : 'Open a document first'}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Other user-created agents */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Custom Agents</p>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setShowCreateDialog(true)}><Plus className="h-3 w-3 mr-1" />New</Button>
        </div>
        <ScrollArea className="h-[calc(100vh-800px)] min-h-[100px]">
          <div className="space-y-1.5 pr-2">
            {agents.filter(a => !['card_synthesizer', 'citation', 'research', 'knowledge_gap', 'writing_coach', 'content_summarizer', 'task_extraction'].includes(a.agent_type)).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No custom agents yet.</p>
            ) : (
              agents.filter(a => !['card_synthesizer', 'citation', 'research', 'knowledge_gap', 'writing_coach', 'content_summarizer', 'task_extraction'].includes(a.agent_type)).map(agent => {
                const Icon = AGENT_ICONS[agent.agent_type as AgentType] || Bot;
                return <AgentRow key={agent.id} agent={agent} Icon={Icon} onSelect={() => { setSelectedAgentId(agent.id); setShowDetail(true); }} />;
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Recent Findings */}
      {findings.filter(f => !f.is_read).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Recent Findings</p>
          <div className="space-y-1">
            {findings.filter(f => !f.is_read).slice(0, 3).map(f => (
              <div key={f.id} className="p-2 rounded-lg border border-border text-xs">
                <p className="font-medium truncate">{f.title}</p>
                <p className="text-muted-foreground line-clamp-1 mt-0.5">{f.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle className="sr-only">Agent Detail</SheetTitle></SheetHeader>
          {selectedAgent && <AgentDetail agent={selectedAgent} onBack={() => setShowDetail(false)} />}
        </SheetContent>
      </Sheet>

      <CreateAgentDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} createAgent={createAgent} />
    </div>
  );
}

function AgentRow({ agent, Icon, onSelect }: { agent: Agent; Icon: React.ElementType; onSelect: () => void }) {
  const { triggerAgentRun, updateAgent } = useAgents();
  const [running, setRunning] = useState(false);
  const handleRun = async (e: React.MouseEvent) => { e.stopPropagation(); setRunning(true); await triggerAgentRun(agent.id); setRunning(false); };
  return (
    <div className="flex items-center gap-2.5 p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors" onClick={onSelect}>
      <Icon className={`h-4 w-4 shrink-0 ${agent.is_enabled ? 'text-foreground' : 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{agent.name}</p>
        <p className="text-[10px] text-muted-foreground">{agent.last_run_at ? formatDistanceToNow(new Date(agent.last_run_at), { addSuffix: true }) : 'Never run'}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRun} disabled={running}>
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
        </Button>
        <Switch checked={agent.is_enabled} className="scale-[0.65]" onClick={(e) => { e.stopPropagation(); updateAgent(agent.id, { is_enabled: !agent.is_enabled }); }} />
      </div>
    </div>
  );
}
