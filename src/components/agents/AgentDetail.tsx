import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AgentConfigFields } from './AgentConfigFields';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Play, 
  Settings, 
  History, 
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Save
} from 'lucide-react';
import { Agent, AgentRun, AGENT_DEFINITIONS } from '@/types/agents';
import { useAgents } from '@/hooks/useAgents';
import { formatDistanceToNow, format } from 'date-fns';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface AgentDetailProps {
  agent: Agent;
  onBack: () => void;
}

export function AgentDetail({ agent, onBack }: AgentDetailProps) {
  const { updateAgent, deleteAgent, triggerAgentRun, runs } = useAgents();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  const [editedName, setEditedName] = useState(agent.name);
  const [editedDescription, setEditedDescription] = useState(agent.description || '');
  const [editedFrequency, setEditedFrequency] = useState(agent.run_frequency_minutes.toString());
  const [editedConfig, setEditedConfig] = useState(agent.config);

  const definition = AGENT_DEFINITIONS.find(d => d.type === agent.agent_type);
  const agentRuns = runs.filter(r => r.agent_id === agent.id);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <p className="text-muted-foreground">{definition?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={agent.is_enabled}
            onCheckedChange={(enabled) => updateAgent(agent.id, { is_enabled: enabled })}
          />
          <span className="text-sm">{agent.is_enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleRun} disabled={isRunning}>
          {isRunning ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Run Now
        </Button>
        <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
          <Settings className="h-4 w-4 mr-2" />
          Configure
        </Button>
        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="history">Run History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Status</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant={agent.is_enabled ? 'default' : 'secondary'}>
                  {agent.is_enabled ? 'Active' : 'Paused'}
                </Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Last Run</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">
                  {agent.last_run_at 
                    ? formatDistanceToNow(new Date(agent.last_run_at), { addSuffix: true })
                    : 'Never'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Next Run</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">
                  {agent.next_run_at 
                    ? formatDistanceToNow(new Date(agent.next_run_at), { addSuffix: true })
                    : 'Not scheduled'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>About This Agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {agent.description || definition?.description}
              </p>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Capabilities</h4>
                <div className="flex flex-wrap gap-2">
                  {definition?.capabilities.map(cap => (
                    <Badge key={cap} variant="outline">{cap}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Settings</CardTitle>
              <CardDescription>Configure how this agent operates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  disabled={!isEditing}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="frequency">Run Frequency</Label>
                <Select
                  value={editedFrequency}
                  onValueChange={setEditedFrequency}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">Every 15 minutes</SelectItem>
                    <SelectItem value="30">Every 30 minutes</SelectItem>
                    <SelectItem value="60">Every hour</SelectItem>
                    <SelectItem value="180">Every 3 hours</SelectItem>
                    <SelectItem value="360">Every 6 hours</SelectItem>
                    <SelectItem value="720">Every 12 hours</SelectItem>
                    <SelectItem value="1440">Once daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Agent-Specific Settings</CardTitle>
                  <CardDescription className="text-xs">Fine-tune how this agent behaves</CardDescription>
                </CardHeader>
                <CardContent>
                  <AgentConfigFields
                    agentType={agent.agent_type as any}
                    config={editedConfig}
                    onChange={setEditedConfig}
                    disabled={!isEditing}
                  />
                </CardContent>
              </Card>

              {isEditing && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Run History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentRuns.length > 0 ? (
                <div className="space-y-3">
                  {agentRuns.map(run => (
                    <div 
                      key={run.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(run.status)}
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(run.started_at), 'MMM d, yyyy h:mm a')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {run.items_found} items found • {run.items_processed} processed
                          </p>
                        </div>
                      </div>
                      <Badge variant={run.status === 'completed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                        {run.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No runs yet. Click "Run Now" to start.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Agent"
        description={`Are you sure you want to delete "${agent.name}"? This will also delete all findings and run history.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        onClose={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
