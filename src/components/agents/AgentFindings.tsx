import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Lightbulb, 
  ExternalLink, 
  X, 
  Check,
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
import { Agent, AgentFinding, AgentType } from '@/types/agents';
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

interface AgentFindingsProps {
  findings: AgentFinding[];
  agents: Agent[];
}

export function AgentFindings({ findings, agents }: AgentFindingsProps) {
  const { markFindingRead, dismissFinding } = useAgents();

  const getAgentForFinding = (finding: AgentFinding) => {
    return agents.find(a => a.id === finding.agent_id);
  };

  const handleAction = async (finding: AgentFinding) => {
    await markFindingRead(finding.id);
    
    // Navigate based on finding type
    if (finding.source_type && finding.source_id) {
      const url = finding.metadata?.action_url as string;
      if (url) {
        window.location.hash = url;
      }
    }
  };

  const unreadFindings = findings.filter(f => !f.is_read);
  const readFindings = findings.filter(f => f.is_read);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-yellow-500" />
          Discoveries
        </h1>
        <p className="text-muted-foreground">
          Insights and findings from your agents
        </p>
      </div>

      {findings.length === 0 ? (
        <Card className="p-12 text-center">
          <Lightbulb className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Discoveries Yet</h3>
          <p className="text-muted-foreground">
            Your agents haven't found anything yet. Run an agent to start discovering insights.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {unreadFindings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                New Discoveries
                <Badge>{unreadFindings.length}</Badge>
              </h2>
              <div className="space-y-3">
                {unreadFindings.map(finding => {
                  const agent = getAgentForFinding(finding);
                  const Icon = agent ? AGENT_ICONS[agent.agent_type as AgentType] || Bot : Bot;
                  
                  return (
                    <Card key={finding.id} className="border-primary/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded bg-primary/10">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{finding.title}</CardTitle>
                              <CardDescription className="text-xs">
                                {agent?.name} • {formatDistanceToNow(new Date(finding.created_at), { addSuffix: true })}
                              </CardDescription>
                            </div>
                          </div>
                          {finding.relevance_score && (
                            <Badge variant="outline">
                              {Math.round(finding.relevance_score * 100)}% match
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {finding.content && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                            {finding.content}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAction(finding)}>
                            <Check className="h-3 w-3 mr-1" />
                            Take Action
                          </Button>
                          {finding.metadata?.source_url && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={finding.metadata.source_url as string} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View Source
                              </a>
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => dismissFinding(finding.id)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {readFindings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                Previous Discoveries
              </h2>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {readFindings.map(finding => {
                    const agent = getAgentForFinding(finding);
                    const Icon = agent ? AGENT_ICONS[agent.agent_type as AgentType] || Bot : Bot;
                    
                    return (
                      <Card key={finding.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{finding.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {agent?.name} • {formatDistanceToNow(new Date(finding.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => dismissFinding(finding.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
