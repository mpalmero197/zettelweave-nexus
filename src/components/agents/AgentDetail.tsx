import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AgentConfigFields } from './AgentConfigFields';
import {
  Play,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  Settings,
  History,
  Zap,
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
  Bot,
  Wand2
} from 'lucide-react';
import { Agent, AgentRun, AgentType, AGENT_DEFINITIONS } from '@/types/agents';
import { useAgents } from '@/hooks/useAgents';
import { formatDistanceToNow, format } from 'date-fns';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  custom: Wand2
};

interface AgentDetailProps {
  agent: Agent;
  onBack: () => void;
}

export function AgentDetail({ agent, onBack }: AgentDetailProps) {
  const { updateAgent, deleteAgent, triggerAgentRun, runs } = useAgents();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [editedName, setEditedName] = useState(agent.name);
  const [editedDescription, setEditedDescription] = useState(agent.description || '');
  const [editedFrequency, setEditedFrequency] = useState(agent.run_frequency_minutes.toString());
  const [editedConfig, setEditedConfig] = useState(agent.config);

  const definition = AGENT_DEFINITIONS.find(d => d.type === agent.agent_type);
  const agentRuns = runs.filter(r => r.agent_id === agent.id);
  const Icon = AGENT_ICONS[agent.agent_type as AgentType] || Bot;

  const handleSave = async () => {
    await updateAgent(agent.id, {
      name: editedName,
      description: editedDescription,
      run_frequency_minutes: parseInt(editedFrequency) || 60,
      config: editedConfig
    });
    setIsEditing(false);
  };

  const handleRun = async () => {
    setIsRunning(true);
    await triggerAgentRun(agent.id);
    setIsRunning(false);
  };

  const handleDelete = async () => {
    await deleteAgent(agent.id);
    onBack();
  };

  return (
    <div className="space-y-5 pt-2">
      {/* Agent hero */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/[0.07] flex items-center justify-center shrink-0">
          <Icon className="h-7 w-7 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold leading-tight">{agent.name}</h2>
          <p className="text-xs text-muted-foreground">{definition?.name}</p>
        </div>
        <Switch
          checked={agent.is_enabled}
          onCheckedChange={(enabled) => updateAgent(agent.id, { is_enabled: enabled })}
        />
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: 'Status',
            value: agent.is_enabled ? 'Active' : 'Paused',
            color: agent.is_enabled ? 'text-green-500' : 'text-muted-foreground'
          },
          {
            label: 'Last Run',
            value: agent.last_run_at
              ? formatDistanceToNow(new Date(agent.last_run_at), { addSuffix: true })
              : 'Never',
            color: 'text-foreground'
          },
          {
            label: 'Frequency',
            value: agent.run_frequency_minutes >= 1440
              ? 'Daily'
              : agent.run_frequency_minutes >= 60
                ? `${agent.run_frequency_minutes / 60}h`
                : `${agent.run_frequency_minutes}m`,
            color: 'text-foreground'
          }
        ].map(item => (
          <div key={item.label} className="px-3 py-2 rounded-lg bg-muted/50 text-center">
            <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleRun} disabled={isRunning} size="sm">
          {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Run Now
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setIsEditing(!isEditing); setShowConfig(true); }}>
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteDialog(true)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Description & Capabilities */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{agent.description || definition?.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {definition?.capabilities.map(cap => (
            <Badge key={cap} variant="outline" className="text-xs">{cap}</Badge>
          ))}
        </div>
      </div>

      {/* Configuration - Collapsible */}
      <Collapsible open={showConfig} onOpenChange={setShowConfig}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-9 text-sm font-medium">
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </span>
            <span className="text-xs text-muted-foreground">{showConfig ? 'Hide' : 'Show'}</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Name</Label>
            <Input value={editedName} onChange={e => setEditedName(e.target.value)} disabled={!isEditing} className="h-8 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Description</Label>
            <Textarea value={editedDescription} onChange={e => setEditedDescription(e.target.value)} disabled={!isEditing} rows={2} className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Frequency</Label>
            <Select value={editedFrequency} onValueChange={setEditedFrequency} disabled={!isEditing}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Every 15 min</SelectItem>
                <SelectItem value="30">Every 30 min</SelectItem>
                <SelectItem value="60">Hourly</SelectItem>
                <SelectItem value="180">Every 3h</SelectItem>
                <SelectItem value="360">Every 6h</SelectItem>
                <SelectItem value="720">Every 12h</SelectItem>
                <SelectItem value="1440">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Agent Settings</p>
            <AgentConfigFields
              agentType={agent.agent_type as any}
              config={editedConfig}
              onChange={setEditedConfig}
              disabled={!isEditing}
            />
          </div>

          {isEditing ? (
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} className="flex-1">
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit Configuration
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Run History - Collapsible */}
      <Collapsible open={showHistory} onOpenChange={setShowHistory}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-9 text-sm font-medium">
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Run History
              {agentRuns.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">{agentRuns.length}</Badge>
              )}
            </span>
            <span className="text-xs text-muted-foreground">{showHistory ? 'Hide' : 'Show'}</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          {agentRuns.length > 0 ? (
            <div className="space-y-1.5">
              {agentRuns.slice(0, 10).map(run => (
                <div key={run.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 text-sm">
                  {run.status === 'completed' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : run.status === 'failed' ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  ) : run.status === 'running' ? (
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="flex-1 text-xs">
                    {format(new Date(run.started_at), 'MMM d, h:mm a')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {run.items_found} found
                  </span>
                  <Badge
                    variant={run.status === 'completed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}
                    className="text-[10px] h-4 px-1"
                  >
                    {run.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">No runs yet</p>
          )}
        </CollapsibleContent>
      </Collapsible>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Agent"
        description={`Delete "${agent.name}" and all its findings and history?`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        onClose={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
