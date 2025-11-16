import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Brain, FileText, Calendar, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'card_created' | 'note_created' | 'event_created' | 'card_updated' | 'note_updated';
  title: string;
  description?: string;
  timestamp: string;
  item_id: string;
}

const activityConfig = {
  card_created: { icon: Brain, color: 'text-primary', bg: 'bg-primary/10', label: 'Card Created' },
  note_created: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Note Created' },
  event_created: { icon: Calendar, color: 'text-green-600', bg: 'bg-green-100', label: 'Event Created' },
  card_updated: { icon: Brain, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Card Updated' },
  note_updated: { icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Note Updated' },
};

export function ActivityFeedWidget() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecentActivity();
    }
  }, [user]);

  const fetchRecentActivity = async () => {
    if (!user) return;

    try {
      // Fetch recent cards
      const { data: cards } = await supabase
        .from('zettel_cards')
        .select('id, title, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      // Fetch recent notes
      const { data: notes } = await supabase
        .from('notes')
        .select('id, title, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      // Combine and sort activities
      const cardActivities: ActivityItem[] = (cards || []).map(card => ({
        id: `card-${card.id}`,
        type: 'card_created' as const,
        title: card.title,
        timestamp: card.created_at,
        item_id: card.id
      }));

      const noteActivities: ActivityItem[] = (notes || []).map(note => ({
        id: `note-${note.id}`,
        type: 'note_created' as const,
        title: note.title,
        timestamp: note.created_at,
        item_id: note.id
      }));

      const allActivities = [...cardActivities, ...noteActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      setActivities(allActivities);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-full max-h-[300px]">
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.map((activity) => {
                const config = activityConfig[activity.type];
                const Icon = config.icon;

                return (
                  <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className={`p-1.5 rounded-lg ${config.bg}`}>
                      <Icon className={`h-3 w-3 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}