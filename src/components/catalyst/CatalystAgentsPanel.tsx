import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Bot,
  Play,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Search,
  Bell,
  Link,
  FileText,
  Pencil,
  HelpCircle,
  Calendar,
  Quote,
  CheckSquare,
  Brain,
  Wand2,
  BookOpen,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';
import { Agent, AgentType, AGENT_DEFINITIONS } from '@/types/agents';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { CreateAgentDialog } from '@/components/agents/CreateAgentDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AgentDetail } from '@/components/agents/AgentDetail';

const AGENT_ICONS: Record<AgentType, React.ElementType> = {
  research: Search,
  habit_reminder: Bell,
  smart_linking: Link,
  content_summarizer: FileText,
  writing_coach: Pencil,
  knowledge_gap: HelpCircle,
  daily_digest: Calendar,
  citation: Quote,
  task_extraction: CheckSquare,
  spaced_repetition: Brain,
  card_synthesizer: BookOpen,
  custom: Wand2,
};

interface ContentItem {
  id: string;
  title: string;
  content: string;
  type: 'card' | 'note' | 'scratchpad';
  tags?: string[];
}

interface CatalystAgentsPanelProps {
  cards: ContentItem[];
  notes: ContentItem[];
  scratchpadNotes: ContentItem[];
  onDocumentGenerated?: () => void;
  documentContent?: string;
  documentTitle?: string;
}

type WizardStep = 'topic' | 'sources' | 'focus' | 'generating';

export function CatalystAgentsPanel({ cards, notes, scratchpadNotes, onDocumentGenerated, documentContent, documentTitle }: CatalystAgentsPanelProps) {
  const { agents, findings, notifications, createAgent, triggerAgentRun, updateAgent } = useAgents();
  const [view, setView] = useState<'list' | 'author-wizard' | 'knowledge-gaps'>('list');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Author wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('topic');
  const [topicInput, setTopicInput] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [focusInstructions, setFocusInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);
  const [gapFindings, setGapFindings] = useState<any[]>([]);

  // All content items combined
  const allContent = useMemo(() => [
    ...cards.map(c => ({ ...c, type: 'card' as const })),
    ...notes.map(n => ({ ...n, type: 'note' as const })),
    ...scratchpadNotes.map(s => ({ ...s, type: 'scratchpad' as const })),
  ], [cards, notes, scratchpadNotes]);

  // Suggested items based on topic
  const suggestedItems = useMemo(() => {
    if (!topicInput.trim()) return [];
    const keywords = topicInput.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    return allContent
      .map(item => {
        const text = (item.title + ' ' + item.content + ' ' + (item.tags?.join(' ') || '')).toLowerCase();
        const score = keywords.filter(kw => text.includes(kw)).length;
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
  }, [topicInput, allContent]);

  // Filtered items for browsing
  const filteredItems = useMemo(() => {
    if (!sourceSearch.trim()) return allContent;
    const q = sourceSearch.toLowerCase();
    return allContent.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      item.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [sourceSearch, allContent]);

  const toggleSource = (id: string) => {
    setSelectedSourceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startAuthorWizard = () => {
    setView('author-wizard');
    setWizardStep('topic');
    setTopicInput('');
    setSelectedSourceIds(new Set());
    setFocusInstructions('');
    setSourceSearch('');
  };

  const startKnowledgeGapAnalysis = async () => {
    if (!documentContent || documentContent.length < 50) {
      toast.error('Document needs more content to analyze');
      return;
    }
    
    setView('knowledge-gaps');
    setIsAnalyzingGaps(true);
    setGapFindings([]);

    try {
      // Find or create the knowledge_gap agent
      let gapAgent = agents.find(a => a.agent_type === 'knowledge_gap');
      
      if (!gapAgent) {
        const created = await createAgent(
          'knowledge_gap',
          'Knowledge Gap Agent',
          'Identifies knowledge gaps within your documents',
          { analyze_cards: true, analyze_notes: true },
          60
        );
        if (!created) {
          toast.error('Failed to create Knowledge Gap Agent');
          setIsAnalyzingGaps(false);
          return;
        }
        gapAgent = created;
      }

      await triggerAgentRun(gapAgent.id, {
        documentContent,
        documentTitle: documentTitle || 'Untitled Document',
      });

      // Wait a moment then fetch findings
      await new Promise(r => setTimeout(r, 3000));
      
      // Fetch findings for this agent
      const { data: latestFindings } = await (await import('@/integrations/supabase/client')).supabase
        .from('agent_findings')
        .select('*')
        .eq('agent_id', gapAgent.id)
        .eq('finding_type', 'knowledge_gap')
        .order('created_at', { ascending: false })
        .limit(10) as any;

      setGapFindings(latestFindings || []);
    } catch (err) {
      console.error('Knowledge gap analysis failed:', err);
      toast.error('Knowledge gap analysis failed');
    } finally {
      setIsAnalyzingGaps(false);
    }
  };

  const handleGenerate = async () => {
    // Find or create the author agent
    let authorAgent = agents.find(a => a.agent_type === 'card_synthesizer');
    
    if (!authorAgent) {
      const created = await createAgent(
        'card_synthesizer',
        'Author Agent',
        'Autonomously writes comprehensive documents from your knowledge base',
        {
          synthesizer_title: topicInput || undefined,
          synthesizer_max_cards: 50,
          author_min_words: 10000,
        },
        60
      );
      if (!created) {
        toast.error('Failed to create Author Agent');
        return;
      }
      authorAgent = created;
    } else {
      // Update with user's topic and focus
      await updateAgent(authorAgent.id, {
        config: {
          ...authorAgent.config,
          synthesizer_title: topicInput || undefined,
          custom_instructions: focusInstructions || undefined,
          selected_source_ids: Array.from(selectedSourceIds),
        } as any,
      });
    }

    setWizardStep('generating');
    setIsGenerating(true);

    try {
      await triggerAgentRun(authorAgent.id);
      toast.success('Author Agent started! Your document will appear in Catalyst when ready.');
      onDocumentGenerated?.();
    } catch (err) {
      toast.error('Failed to start Author Agent');
    } finally {
      setIsGenerating(false);
      // Reset after a moment
      setTimeout(() => {
        setView('list');
        setWizardStep('topic');
      }, 3000);
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const authorAgent = agents.find(a => a.agent_type === 'card_synthesizer');

  const renderSourceItem = (item: ContentItem & { score?: number }, showScore = false) => (
    <div
      key={item.id}
      className="flex items-start gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => toggleSource(item.id)}
    >
      <Checkbox
        checked={selectedSourceIds.has(item.id)}
        onCheckedChange={() => toggleSource(item.id)}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] capitalize shrink-0">{item.type}</Badge>
          <p className="text-xs font-medium truncate">{item.title}</p>
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
          {item.content.substring(0, 100)}...
        </p>
        {showScore && (item as any).score > 0 && (
          <Badge variant="secondary" className="text-[10px] mt-1">
            {(item as any).score} keyword match{(item as any).score > 1 ? 'es' : ''}
          </Badge>
        )}
      </div>
    </div>
  );

  // Knowledge Gap View
  if (view === 'knowledge-gaps') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setView('list')}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <h3 className="text-sm font-semibold">Knowledge Gaps</h3>
        </div>

        {isAnalyzingGaps ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Analyzing document...</p>
            <p className="text-xs text-muted-foreground text-center">
              The AI is reviewing your document for knowledge gaps and areas that need more depth.
            </p>
          </div>
        ) : gapFindings.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-500px)] min-h-[300px]">
            <div className="space-y-2 pr-2">
              {gapFindings.map((finding: any) => {
                const severity = finding.metadata?.severity || 'medium';
                const severityColor = severity === 'high' ? 'border-destructive/50 bg-destructive/5' 
                  : severity === 'medium' ? 'border-yellow-500/50 bg-yellow-500/5' 
                  : 'border-green-500/50 bg-green-500/5';
                
                return (
                  <div key={finding.id} className={`p-3 rounded-lg border ${severityColor}`}>
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{finding.title}</p>
                        {finding.metadata?.section && (
                          <Badge variant="outline" className="text-[9px] mt-1 mb-1">
                            Section: {finding.metadata.section}
                          </Badge>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1">{finding.content}</p>
                        {finding.metadata?.suggestion && (
                          <div className="mt-2 p-2 rounded bg-muted/50">
                            <p className="text-[10px] font-medium text-primary">💡 Suggestion</p>
                            <p className="text-[11px] text-muted-foreground">{finding.metadata.suggestion}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 space-y-2">
            <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No knowledge gaps found. Your document looks comprehensive!</p>
          </div>
        )}

        <Button 
          size="sm" 
          variant="outline" 
          className="w-full" 
          onClick={startKnowledgeGapAnalysis}
          disabled={isAnalyzingGaps || !documentContent || documentContent.length < 50}
        >
          {isAnalyzingGaps ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <HelpCircle className="h-3.5 w-3.5 mr-1" />}
          Re-analyze Document
        </Button>
      </div>
    );
  }

  // Author Wizard View
  if (view === 'author-wizard') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setView('list')}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <h3 className="text-sm font-semibold">Author Agent</h3>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {(['topic', 'sources', 'focus'] as WizardStep[]).map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  wizardStep === step
                    ? 'bg-primary text-primary-foreground'
                    : wizardStep === 'generating' || (['topic', 'sources', 'focus'].indexOf(wizardStep) > i)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step: Topic */}
        {wizardStep === 'topic' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">What topic should the Author explore?</label>
              <Input
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Quantum Computing, Renaissance Art..."
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Leave blank to let AI choose from your content</p>
            </div>
            <Button
              className="w-full"
              size="sm"
              onClick={() => setWizardStep('sources')}
            >
              Next: Select Sources
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}

        {/* Step: Sources */}
        {wizardStep === 'sources' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Select source material ({selectedSourceIds.size} selected)
              </label>
              <Input
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                placeholder="Search cards, notes, scratchpad..."
                className="mt-1"
              />
            </div>

            {/* Suggested sources */}
            {topicInput.trim() && suggestedItems.length > 0 && !sourceSearch.trim() && (
              <div>
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1.5">
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  Suggested for "{topicInput}"
                </p>
                <ScrollArea className="h-[180px]">
                  <div className="space-y-1.5 pr-2">
                    {suggestedItems.map(item => renderSourceItem(item, true))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* All sources */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {sourceSearch.trim() ? 'Search Results' : 'All Content'}
                </p>
                {selectedSourceIds.size > 0 && (
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => setSelectedSourceIds(new Set())}>
                    Clear
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-1.5 pr-2">
                  {filteredItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No content found</p>
                  ) : (
                    filteredItems.map(item => renderSourceItem(item))
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setWizardStep('topic')}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </Button>
              <Button size="sm" className="flex-1" onClick={() => setWizardStep('focus')}>
                Next: Focus
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Focus */}
        {wizardStep === 'focus' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">What should the Author focus on?</label>
              <Textarea
                value={focusInstructions}
                onChange={(e) => setFocusInstructions(e.target.value)}
                placeholder="e.g. Focus on practical applications, compare different schools of thought, include historical context..."
                className="mt-1 min-h-[100px] text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Optional: provide specific research directions</p>
            </div>

            {/* Summary */}
            <Card className="p-3 bg-muted/30">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Generation Summary</p>
              <div className="space-y-1 text-xs">
                <p><strong>Topic:</strong> {topicInput || 'AI will choose'}</p>
                <p><strong>Sources:</strong> {selectedSourceIds.size || 'All available'} items</p>
                <p><strong>Focus:</strong> {focusInstructions || 'General exploration'}</p>
              </div>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setWizardStep('sources')}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </Button>
              <Button size="sm" className="flex-1" onClick={handleGenerate}>
                <BookOpen className="h-3.5 w-3.5 mr-1" />
                Generate Document
              </Button>
            </div>
          </div>
        )}

        {/* Step: Generating */}
        {wizardStep === 'generating' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Author Agent is writing...</p>
            <p className="text-xs text-muted-foreground text-center">
              This may take 30-60 seconds. Your document will appear in the Load menu when ready.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Agent List View
  return (
    <div className="space-y-3">
      {/* Author Agent CTA */}
      <Card
        className="p-3 border-primary/20 bg-primary/[0.03] cursor-pointer hover:bg-primary/[0.06] transition-colors"
        onClick={startAuthorWizard}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Author Agent</p>
            <p className="text-[10px] text-muted-foreground">Generate a full document from your knowledge base</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </Card>

      {/* Knowledge Gap Agent CTA */}
      <Card
        className={`p-3 border-yellow-500/20 bg-yellow-500/[0.03] cursor-pointer hover:bg-yellow-500/[0.06] transition-colors ${(!documentContent || documentContent.length < 50) ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={startKnowledgeGapAnalysis}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
            <HelpCircle className="h-4.5 w-4.5 text-yellow-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Knowledge Gap Agent</p>
            <p className="text-[10px] text-muted-foreground">
              {documentContent && documentContent.length >= 50 
                ? 'Analyze your open document for knowledge gaps' 
                : 'Open a document first to analyze'}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </Card>

      {/* Other Agents */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Your Agents</p>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-3 w-3 mr-1" />
            New
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-700px)] min-h-[200px]">
          <div className="space-y-1.5 pr-2">
            {agents.filter(a => a.agent_type !== 'card_synthesizer').length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No agents yet. Create one to automate tasks.
              </p>
            ) : (
              agents.filter(a => a.agent_type !== 'card_synthesizer').map(agent => {
                const Icon = AGENT_ICONS[agent.agent_type as AgentType] || Bot;
                return (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    Icon={Icon}
                    onSelect={() => { setSelectedAgentId(agent.id); setShowDetail(true); }}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Recent Findings Preview */}
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

      {/* Agent Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="sr-only">Agent Detail</SheetTitle>
          </SheetHeader>
          {selectedAgent && (
            <AgentDetail
              agent={selectedAgent}
              onBack={() => setShowDetail(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      <CreateAgentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        createAgent={createAgent}
      />
    </div>
  );
}

function AgentRow({ agent, Icon, onSelect }: { agent: Agent; Icon: React.ElementType; onSelect: () => void }) {
  const { triggerAgentRun, updateAgent } = useAgents();
  const [running, setRunning] = useState(false);

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRunning(true);
    await triggerAgentRun(agent.id);
    setRunning(false);
  };

  return (
    <div
      className="flex items-center gap-2.5 p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onSelect}
    >
      <Icon className={`h-4 w-4 shrink-0 ${agent.is_enabled ? 'text-foreground' : 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{agent.name}</p>
        <p className="text-[10px] text-muted-foreground">
          {agent.last_run_at
            ? formatDistanceToNow(new Date(agent.last_run_at), { addSuffix: true })
            : 'Never run'}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleRun}
          disabled={running}
        >
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
        </Button>
        <Switch
          checked={agent.is_enabled}
          className="scale-[0.65]"
          onClick={(e) => {
            e.stopPropagation();
            updateAgent(agent.id, { is_enabled: !agent.is_enabled });
          }}
        />
      </div>
    </div>
  );
}
