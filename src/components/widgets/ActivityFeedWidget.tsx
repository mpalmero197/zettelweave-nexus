import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity, Brain, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'card' | 'note';
  title: string;
  timestamp: string;
}

export function ActivityFeedWidget() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchRecentActivity();
  }, [user]);

  const fetchRecentActivity = async () => {
    if (!user) return;
    try {
      const [{ data: cards }, { data: notes }] = await Promise.all([
        supabase.from('zettel_cards').select('id, title, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('notes').select('id, title, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);

      const all: ActivityItem[] = [
        ...(cards || []).map(c => ({ id: `c-${c.id}`, type: 'card' as const, title: c.title, timestamp: c.created_at })),
        ...(notes || []).map(n => ({ id: `n-${n.id}`, type: 'note' as const, title: n.title, timestamp: n.created_at })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

      setActivities(all);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="widget-card widget-accent-activity p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-medium text-foreground">Activity</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted/50 rounded-md animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-0.5 max-h-72 overflow-y-auto">
          {activities.length > 0 ? (
            activities.map((item) => {
              const Icon = item.type === 'card' ? Brain : FileText;
              return (
                <div key={item.id} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent/50 transition-colors">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {item.type === 'card' ? 'Card' : 'Note'}
                  </Badge>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Activity className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
              <p className="text-xs text-muted-foreground">No recent activity</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
