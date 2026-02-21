import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Check,
  X,
  ExternalLink,
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
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
  Wand2
} from 'lucide-react';
import { Agent, AgentFinding, AgentNotification, AgentType, NotificationType } from '@/types/agents';
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
  card_synthesizer: FileText,
  custom: Wand2
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  info: 'border-l-blue-500',
  success: 'border-l-green-500',
  warning: 'border-l-yellow-500',
  action_required: 'border-l-red-500'
};

interface AgentActivityFeedProps {
  findings: AgentFinding[];
  notifications: AgentNotification[];
  agents: Agent[];
}

type FeedItem = 
  | { type: 'finding'; data: AgentFinding; timestamp: string }
  | { type: 'notification'; data: AgentNotification; timestamp: string };

export function AgentActivityFeed({ findings, notifications, agents }: AgentActivityFeedProps) {
  const { markFindingRead, dismissFinding, markNotificationRead, markAllNotificationsRead } = useAgents();

  // Merge and sort chronologically
  const feedItems: FeedItem[] = [
    ...findings.map(f => ({ type: 'finding' as const, data: f, timestamp: f.created_at })),
    ...notifications.map(n => ({ type: 'notification' as const, data: n, timestamp: n.created_at }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const unreadCount = findings.filter(f => !f.is_read).length + notifications.filter(n => !n.is_read).length;

  const getAgentIcon = (agentId?: string | null) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return Bot;
    return AGENT_ICONS[agent.agent_type as AgentType] || Bot;
  };

  const getAgentName = (agentId?: string | null) => {
    return agents.find(a => a.id === agentId)?.name || 'System';
  };

  if (feedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lightbulb className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">No Activity Yet</h3>
        <p className="text-sm text-muted-foreground max-w-[280px]">
          Run an agent to start seeing discoveries and notifications here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Feed header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Activity</span>
          {unreadCount > 0 && (
            <Badge variant="default" className="h-5 px-1.5 text-xs">{unreadCount} new</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllNotificationsRead}>
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[500px]">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
          
          <div className="space-y-1">
            {feedItems.map((item) => {
              if (item.type === 'finding') {
                const finding = item.data;
                const Icon = getAgentIcon(finding.agent_id);
                const isUnread = !finding.is_read;

                return (
                  <div
                    key={`f-${finding.id}`}
                    className={`relative pl-9 pr-2 py-2.5 rounded-lg transition-colors ${
                      isUnread ? 'bg-primary/[0.03]' : ''
                    } hover:bg-accent/50`}
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-2 top-3.5 w-[14px] h-[14px] rounded-full border-2 flex items-center justify-center ${
                      isUnread ? 'border-primary bg-primary' : 'border-border bg-background'
                    }`}>
                      {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground">{getAgentName(finding.agent_id)}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(finding.created_at), { addSuffix: true })}
                          </span>
                          {finding.relevance_score && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 ml-auto">
                              {Math.round(finding.relevance_score * 100)}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium leading-snug">{finding.title}</p>
                        {finding.content && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{finding.content}</p>
                        )}
                        <div className="flex gap-1.5 mt-2">
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => markFindingRead(finding.id)}>
                            <Check className="h-3 w-3 mr-1" />
                            Acknowledge
                          </Button>
                          {finding.metadata?.source_url && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" asChild>
                              <a href={finding.metadata.source_url as string} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Source
                              </a>
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => dismissFinding(finding.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Notification
              const notification = item.data;
              const Icon = getAgentIcon(notification.agent_id);
              const isUnread = !notification.is_read;
              const borderColor = NOTIFICATION_COLORS[notification.notification_type as NotificationType] || '';

              return (
                <div
                  key={`n-${notification.id}`}
                  className={`relative pl-9 pr-2 py-2.5 rounded-lg transition-colors cursor-pointer border-l-2 ${borderColor} ${
                    isUnread ? 'bg-primary/[0.03]' : 'opacity-70'
                  } hover:bg-accent/50`}
                  onClick={() => !notification.is_read && markNotificationRead(notification.id)}
                >
                  <div className={`absolute left-[6px] top-3.5 w-[14px] h-[14px] rounded-full border-2 flex items-center justify-center ${
                    isUnread ? 'border-primary bg-primary' : 'border-border bg-background'
                  }`}>
                    {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{getAgentName(notification.agent_id)}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      {isUnread && <Badge className="h-4 px-1 text-[10px] ml-auto">New</Badge>}
                    </div>
                    <p className="text-sm font-medium leading-snug">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                    {notification.action_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 mt-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.hash = notification.action_url!;
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
