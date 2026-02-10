import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, 
  Plus, 
  Play, 
  Clock, 
  CheckCircle2,
  AlertCircle,
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
  Wand2
} from 'lucide-react';
import { Agent, AgentType, AGENT_DEFINITIONS } from '@/types/agents';
import { useAgents } from '@/hooks/useAgents';
import { formatDistanceToNow } from 'date-fns';

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

interface AgentsOverviewProps {
  agents: Agent[];
  onSelectAgent: (agentId: string) => void;
  onCreateAgent: () => void;
}

export function AgentsOverview({ agents, onSelectAgent, onCreateAgent }: AgentsOverviewProps) {
  const { updateAgent, triggerAgentRun } = useAgents();

  const enabledAgents = agents.filter(a => a.is_enabled);
  const totalRuns = agents.reduce((sum, a) => sum + (a.last_run_at ? 1 : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your AI agents that work in the background
          </p>
        </div>
        <Button onClick={onCreateAgent}>
          <Plus className="h-4 w-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{agents.length}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{enabledAgents.length}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Runs Today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{totalRuns}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available Types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{AGENT_DEFINITIONS.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Cards */}
      {agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => {
            const Icon = AGENT_ICONS[agent.agent_type as AgentType] || Bot;
            const definition = AGENT_DEFINITIONS.find(d => d.type === agent.agent_type);
            
            return (
              <Card 
                key={agent.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => onSelectAgent(agent.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {definition?.name || agent.agent_type}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={agent.is_enabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateAgent(agent.id, { is_enabled: !agent.is_enabled });
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {agent.description || definition?.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {agent.last_run_at 
                        ? formatDistanceToNow(new Date(agent.last_run_at), { addSuffix: true })
                        : 'Never run'}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Every {agent.run_frequency_minutes}m
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerAgentRun(agent.id);
                    }}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Run Now
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Agents Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first AI agent to automate tasks like research, reminders, and content linking.
          </p>
          <Button onClick={onCreateAgent}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Agent
          </Button>
        </Card>
      )}

      {/* Available Agent Types */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Agent Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {AGENT_DEFINITIONS.map(def => {
            const Icon = AGENT_ICONS[def.type] || Bot;
            const isCreated = agents.some(a => a.agent_type === def.type);
            
            return (
              <Card key={def.type} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{def.name}</h4>
                      {isCreated && (
                        <Badge variant="secondary" className="text-xs">Created</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {def.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {def.capabilities.slice(0, 3).map(cap => (
                        <Badge key={cap} variant="outline" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
