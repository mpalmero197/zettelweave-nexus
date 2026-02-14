import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Bot,
  Plus,
  Play,
  Clock,
  CheckCircle2,
  Zap,
  TrendingUp,
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
  Loader2
} from 'lucide-react';
import { Agent, AgentType, AgentFinding, AgentNotification, AGENT_DEFINITIONS } from '@/types/agents';
import { AgentActivityFeed } from './AgentActivityFeed';
import { useAgents } from '@/hooks/useAgents';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

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

// SVG ring component showing agent "health" / activity
function AgentRing({ agent, isSelected, onClick }: { agent: Agent; isSelected: boolean; onClick: () => void }) {
  const { updateAgent, triggerAgentRun } = useAgents();
  const [isRunning, setIsRunning] = useState(false);
  const Icon = AGENT_ICONS[agent.agent_type as AgentType] || Bot;

  // Compute a "freshness" score: how recently the agent ran (0 to 1)
  const getFreshness = () => {
    if (!agent.last_run_at) return 0;
    const hoursSinceRun = (Date.now() - new Date(agent.last_run_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceRun < 1) return 1;
    if (hoursSinceRun < 6) return 0.75;
    if (hoursSinceRun < 24) return 0.5;
    return 0.2;
  };

  const freshness = agent.is_enabled ? getFreshness() : 0;
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference - (freshness * circumference);

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(true);
    await triggerAgentRun(agent.id);
    setIsRunning(false);
  };

  return (
    <div
      className={`agent-fleet-card group cursor-pointer flex flex-col items-center p-4 rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'border-primary bg-primary/[0.04] shadow-[var(--shadow-material-3)]'
          : 'border-border hover:border-primary/40 hover:shadow-[var(--shadow-material-2)]'
      }`}
      onClick={onClick}
    >
      {/* Ring + Icon */}
      <div className="relative w-16 h-16 mb-2.5">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="3"
          />
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke={agent.is_enabled ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="agent-ring-progress"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={`h-6 w-6 ${agent.is_enabled ? 'text-foreground' : 'text-muted-foreground'}`} />
        </div>
        {/* Status dot */}
        <div className={`absolute -bottom-0.5 right-1 w-3 h-3 rounded-full border-2 border-background ${
          agent.is_enabled ? 'bg-green-500' : 'bg-muted-foreground/40'
        }`} />
      </div>

      {/* Name */}
      <span className="text-sm font-medium text-center leading-tight truncate w-full">{agent.name}</span>
      <span className="text-[11px] text-muted-foreground mt-0.5">
        {agent.last_run_at
          ? formatDistanceToNow(new Date(agent.last_run_at), { addSuffix: true })
          : 'Never run'}
      </span>

      {/* Quick actions - visible on hover */}
      <div className="flex items-center gap-1.5 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs px-2"
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
        </Button>
        <Switch
          checked={agent.is_enabled}
          className="scale-75"
          onClick={(e) => {
            e.stopPropagation();
            updateAgent(agent.id, { is_enabled: !agent.is_enabled });
          }}
        />
      </div>
    </div>
  );
}

interface AgentsOverviewProps {
  agents: Agent[];
  findings: AgentFinding[];
  notifications: AgentNotification[];
  onSelectAgent: (agentId: string) => void;
  onCreateAgent: () => void;
  selectedAgentId: string | null;
}

export function AgentsOverview({ agents, findings, notifications, onSelectAgent, onCreateAgent, selectedAgentId }: AgentsOverviewProps) {
  const enabledAgents = agents.filter(a => a.is_enabled);
  const recentRuns = agents.filter(a => a.last_run_at).length;
  const unreadFindings = findings.filter(f => !f.is_read).length;
  const totalCapabilities = agents.reduce((sum, a) => {
    const def = AGENT_DEFINITIONS.find(d => d.type === a.agent_type);
    return sum + (def?.capabilities.length || 0);
  }, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Fleet Size', value: agents.length, icon: Bot, accent: 'border-l-foreground' },
          { label: 'Active', value: enabledAgents.length, icon: Zap, accent: 'border-l-green-500' },
          { label: 'Discoveries', value: unreadFindings, icon: TrendingUp, accent: 'border-l-blue-500' },
          { label: 'Capabilities', value: totalCapabilities, icon: CheckCircle2, accent: 'border-l-purple-500' },
        ].map(stat => (
          <div
            key={stat.label}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-lg bg-card border border-border border-l-[3px] ${stat.accent}`}
          >
            <stat.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Fleet */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Agent Fleet</h2>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCreateAgent}>
            <Plus className="h-3 w-3 mr-1" />
            New Agent
          </Button>
        </div>

        {agents.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {agents.map(agent => (
              <AgentRing
                key={agent.id}
                agent={agent}
                isSelected={selectedAgentId === agent.id}
                onClick={() => onSelectAgent(agent.id)}
              />
            ))}
            {/* Create new agent card */}
            <div
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors min-h-[140px]"
              onClick={onCreateAgent}
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Add Agent</span>
            </div>
          </div>
        ) : (
          <Card className="p-10 text-center border-dashed">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bot className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No Agents Yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-[300px] mx-auto">
              Create AI agents to automate research, linking, reminders, and more.
            </p>
            <Button onClick={onCreateAgent}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Agent
            </Button>
          </Card>
        )}
      </div>

      {/* Available Types - Compact */}
      {agents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Available Types</h2>
          <div className="flex flex-wrap gap-2">
            {AGENT_DEFINITIONS.map(def => {
              const Icon = AGENT_ICONS[def.type] || Bot;
              const isCreated = agents.some(a => a.agent_type === def.type);
              return (
                <div
                  key={def.type}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                    isCreated
                      ? 'bg-primary/[0.05] border-primary/20 text-foreground'
                      : 'border-border text-muted-foreground hover:border-primary/30 cursor-pointer'
                  }`}
                  onClick={() => !isCreated && onCreateAgent()}
                  title={def.description}
                >
                  <Icon className="h-3 w-3" />
                  <span>{def.name.replace(' Agent', '')}</span>
                  {isCreated && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Activity Feed</h2>
        <Card className="p-4">
          <AgentActivityFeed
            findings={findings}
            notifications={notifications}
            agents={agents}
          />
        </Card>
      </div>
    </div>
  );
}
