import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowRight,
  Plus,
  Trash2,
  GitBranch,
  Bot,
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
  GripVertical,
  Save,
  Play
} from 'lucide-react';
import { Agent, AgentType, AGENT_DEFINITIONS } from '@/types/agents';
import { toast } from 'sonner';

const AGENT_ICONS: Record<string, React.ElementType> = {
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
  custom: Wand2,
};

export interface PipelineStep {
  id: string;
  agent_id: string;
  order: number;
  pass_output_as: 'context' | 'input' | 'filter';
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  is_enabled: boolean;
  created_at: string;
}

interface AgentPipelineBuilderProps {
  agents: Agent[];
  pipelines: Pipeline[];
  onCreatePipeline: (name: string, description: string, steps: Omit<PipelineStep, 'id'>[]) => Promise<void>;
  onDeletePipeline: (pipelineId: string) => Promise<void>;
  onRunPipeline: (pipelineId: string) => Promise<void>;
}

export function AgentPipelineBuilder({ agents, pipelines, onCreatePipeline, onDeletePipeline, onRunPipeline }: AgentPipelineBuilderProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<{ agent_id: string; pass_output_as: 'context' | 'input' | 'filter' }[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const addStep = () => {
    if (agents.length === 0) return;
    setSteps(prev => [...prev, { agent_id: agents[0].id, pass_output_as: 'context' }]);
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: string, value: string) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleCreate = async () => {
    if (!name || steps.length < 2) {
      toast.error('A pipeline needs a name and at least 2 agents');
      return;
    }
    setIsCreating(true);
    await onCreatePipeline(name, description, steps.map((s, i) => ({ ...s, order: i })));
    setIsCreating(false);
    setShowCreateDialog(false);
    setName('');
    setDescription('');
    setSteps([]);
  };

  const getAgentName = (agentId: string) => agents.find(a => a.id === agentId)?.name || 'Unknown';
  const getAgentIcon = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return AGENT_ICONS[agent?.agent_type || ''] || Bot;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Agent Pipelines
          </h2>
          <p className="text-sm text-muted-foreground">
            Chain agents together so one feeds into another
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} disabled={agents.length < 2}>
          <Plus className="h-4 w-4 mr-2" />
          New Pipeline
        </Button>
      </div>

      {agents.length < 2 && (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">You need at least 2 agents to create a pipeline.</p>
        </Card>
      )}

      {pipelines.length > 0 ? (
        <div className="space-y-3">
          {pipelines.map(pipeline => (
            <Card key={pipeline.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{pipeline.name}</CardTitle>
                    <CardDescription>{pipeline.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onRunPipeline(pipeline.id)}>
                      <Play className="h-3 w-3 mr-1" /> Run
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDeletePipeline(pipeline.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  {pipeline.steps.sort((a, b) => a.order - b.order).map((step, i) => {
                    const Icon = getAgentIcon(step.agent_id);
                    return (
                      <div key={step.id} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-muted/50">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{getAgentName(step.agent_id)}</span>
                        </div>
                        {i < pipeline.steps.length - 1 && (
                          <div className="flex flex-col items-center">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">{step.pass_output_as}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : agents.length >= 2 ? (
        <Card className="p-8 text-center">
          <GitBranch className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">No Pipelines Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a pipeline to chain agents together for complex workflows.
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Pipeline
          </Button>
        </Card>
      ) : null}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Create Pipeline
            </DialogTitle>
            <DialogDescription>
              Chain agents together. Each agent's output feeds into the next.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pipeline Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Research & Summarize" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this pipeline do?" rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Pipeline Steps</Label>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                    <Select value={step.agent_id} onValueChange={v => updateStep(i, 'agent_id', v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {i < steps.length - 1 && (
                      <Select value={step.pass_output_as} onValueChange={v => updateStep(i, 'pass_output_as', v)}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="context">As Context</SelectItem>
                          <SelectItem value="input">As Input</SelectItem>
                          <SelectItem value="filter">As Filter</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => removeStep(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addStep} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleCreate} disabled={!name || steps.length < 2 || isCreating}>
                {isCreating ? 'Creating...' : 'Create Pipeline'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
