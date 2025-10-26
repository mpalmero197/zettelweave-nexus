import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, TrendingUp, Users, FileText, Database, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalUsers: number;
  totalCards: number;
  totalNotes: number;
  totalFiles: number;
  newUsersThisWeek: number;
  cardsThisWeek: number;
  notesThisWeek: number;
  storageUsed: number;
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalCards: 0,
    totalNotes: 0,
    totalFiles: 0,
    newUsersThisWeek: 0,
    cardsThisWeek: 0,
    notesThisWeek: 0,
    storageUsed: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get all counts in parallel
      const [
        { data: allUsers },
        { data: allCards },
        { data: allNotes },
        { data: allFiles },
        { data: newUsers },
        { data: newCards },
        { data: newNotes },
        { data: filesSize }
      ] = await Promise.all([
        supabase.rpc('get_all_users'),
        supabase.from('zettel_cards').select('id', { count: 'exact', head: true }),
        supabase.from('notes').select('id', { count: 'exact', head: true }),
        supabase.from('files').select('id', { count: 'exact', head: true }),
        supabase.rpc('get_all_users'),
        supabase.from('zettel_cards').select('id').gte('created_at', oneWeekAgo.toISOString()),
        supabase.from('notes').select('id').gte('created_at', oneWeekAgo.toISOString()),
        supabase.from('files').select('file_size')
      ]);

      // Calculate new users this week
      const newUsersCount = allUsers?.filter(user => {
        const created = new Date(user.created_at);
        return created >= oneWeekAgo;
      }).length || 0;

      // Calculate total storage
      const totalStorage = filesSize?.reduce((acc, file) => acc + (file.file_size || 0), 0) || 0;

      setAnalytics({
        totalUsers: allUsers?.length || 0,
        totalCards: allCards?.length || 0,
        totalNotes: allNotes?.length || 0,
        totalFiles: allFiles?.length || 0,
        newUsersThisWeek: newUsersCount,
        cardsThisWeek: newCards?.length || 0,
        notesThisWeek: newNotes?.length || 0,
        storageUsed: totalStorage,
      });
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{analytics.newUsersThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCards}</div>
            <p className="text-xs text-muted-foreground">
              +{analytics.cardsThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalNotes}</div>
            <p className="text-xs text-muted-foreground">
              +{analytics.notesThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(analytics.storageUsed)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalFiles} files
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Growth Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Growth Metrics (Last 7 Days)
          </CardTitle>
          <CardDescription>Platform activity and engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">New Users</span>
              <span className="text-2xl font-bold text-green-500">+{analytics.newUsersThisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cards Created</span>
              <span className="text-2xl font-bold text-blue-500">+{analytics.cardsThisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Notes Created</span>
              <span className="text-2xl font-bold text-purple-500">+{analytics.notesThisWeek}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
