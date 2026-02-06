import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Bot
} from 'lucide-react';
import { Agent, AgentNotification, NotificationType } from '@/types/agents';
import { useAgents } from '@/hooks/useAgents';
import { formatDistanceToNow } from 'date-fns';

interface AgentNotificationsProps {
  notifications: AgentNotification[];
  agents: Agent[];
}

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  action_required: AlertCircle
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  info: 'text-blue-500',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  action_required: 'text-red-500'
};

export function AgentNotifications({ notifications, agents }: AgentNotificationsProps) {
  const { markNotificationRead, markAllNotificationsRead } = useAgents();

  const getAgentForNotification = (notification: AgentNotification) => {
    return agents.find(a => a.id === notification.agent_id);
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            Alerts and updates from your agents
          </p>
        </div>
        {unreadNotifications.length > 0 && (
          <Button variant="outline" onClick={markAllNotificationsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
          <p className="text-muted-foreground">
            You'll receive notifications when your agents find something important.
          </p>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {[...unreadNotifications, ...readNotifications].map(notification => {
              const agent = getAgentForNotification(notification);
              const Icon = NOTIFICATION_ICONS[notification.notification_type as NotificationType] || Info;
              const colorClass = NOTIFICATION_COLORS[notification.notification_type as NotificationType] || 'text-muted-foreground';
              
              return (
                <Card 
                  key={notification.id} 
                  className={notification.is_read ? 'opacity-60' : 'border-primary/30'}
                  onClick={() => !notification.is_read && markNotificationRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full bg-muted ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <Badge className="shrink-0">New</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {agent && (
                            <span className="flex items-center gap-1">
                              <Bot className="h-3 w-3" />
                              {agent.name}
                            </span>
                          )}
                          <span>
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {notification.action_url && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.hash = notification.action_url!;
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
