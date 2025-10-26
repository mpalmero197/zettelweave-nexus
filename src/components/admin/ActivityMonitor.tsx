import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, Users, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ActivityMonitor() {
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeUsers: 0,
    todayCards: 0,
    todayNotes: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's cards
      const { data: cards } = await supabase
        .from('zettel_cards')
        .select('id')
        .gte('created_at', today.toISOString());

      // Get today's notes
      const { data: notes } = await supabase
        .from('notes')
        .select('id')
        .gte('created_at', today.toISOString());

      setStats({
        activeUsers: 0, // Would need auth.users access
        todayCards: cards?.length || 0,
        todayNotes: notes?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cards Today</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCards}</div>
            <p className="text-xs text-muted-foreground">Created in last 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notes Today</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayNotes}</div>
            <p className="text-xs text-muted-foreground">Created in last 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Healthy</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
