import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Bot, 
  Plus, 
  LayoutDashboard, 
  Lightbulb, 
  Bell,
  GitBranch,
  Search,
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
import { Agent, AgentType } from '@/types/agents';

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

interface AgentsSidebarProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  onCreateAgent: () => void;
  currentView: string;
  onViewChange: (view: 'overview' | 'detail' | 'findings' | 'notifications' | 'pipelines') => void;
  unreadNotifications: number;
  unreadFindings: number;
}

export function AgentsSidebar({
  agents,
  selectedAgentId,
  onSelectAgent,
  onCreateAgent,
  currentView,
  onViewChange,
  unreadNotifications,
  unreadFindings
}: AgentsSidebarProps) {
  return (
    <aside className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Agents</h2>
        </div>
        <Button onClick={onCreateAgent} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Agent
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <Button
            variant={currentView === 'overview' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onViewChange('overview')}
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Overview
          </Button>
          
          <Button
            variant={currentView === 'findings' ? 'secondary' : 'ghost'}
            className="w-full justify-between"
            onClick={() => onViewChange('findings')}
          >
            <span className="flex items-center">
              <Lightbulb className="h-4 w-4 mr-2" />
              Discoveries
            </span>
            {unreadFindings > 0 && (
              <Badge variant="default" className="ml-2 h-5 px-1.5">
                {unreadFindings}
              </Badge>
            )}
          </Button>
          
          <Button
            variant={currentView === 'notifications' ? 'secondary' : 'ghost'}
            className="w-full justify-between"
            onClick={() => onViewChange('notifications')}
          >
            <span className="flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </span>
            {unreadNotifications > 0 && (
              <Badge variant="default" className="ml-2 h-5 px-1.5">
                {unreadNotifications}
              </Badge>
            )}
          </Button>

          <Button
            variant={currentView === 'pipelines' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onViewChange('pipelines')}
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Pipelines
          </Button>
        </div>

        <div className="p-2 pt-4">
          <p className="px-2 text-xs font-medium text-muted-foreground mb-2">
            Your Agents ({agents.length})
          </p>
          <div className="space-y-1">
            {agents.map(agent => {
              const Icon = AGENT_ICONS[agent.agent_type as AgentType] || Bot;
              return (
                <Button
                  key={agent.id}
                  variant={selectedAgentId === agent.id && currentView === 'detail' ? 'secondary' : 'ghost'}
                  className={cn(
                    "w-full justify-start",
                    !agent.is_enabled && "opacity-50"
                  )}
                  onClick={() => onSelectAgent(agent.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  <span className="truncate">{agent.name}</span>
                  {!agent.is_enabled && (
                    <span className="ml-auto text-xs text-muted-foreground">Off</span>
                  )}
                </Button>
              );
            })}
            
            {agents.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No agents created yet
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
