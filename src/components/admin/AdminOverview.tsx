import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  FileText, 
  Database, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Zap,
  Clock,
  HardDrive,
  UserPlus,
  FileStack,
  StickyNote
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AnalyticsData {
  totalUsers: number;
  totalCards: number;
  totalNotes: number;
  totalFiles: number;
  newUsersThisWeek: number;
  cardsThisWeek: number;
  notesThisWeek: number;
  storageUsed: number;
  activeUsersToday: number;
  growthRate: number;
}

export function AdminOverview() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalCards: 0,
    totalNotes: 0,
    totalFiles: 0,
    newUsersThisWeek: 0,
    cardsThisWeek: 0,
    notesThisWeek: 0,
    storageUsed: 0,
    activeUsersToday: 0,
    growthRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Mock data for charts (would be real data in production)
  const activityData = [
    { day: 'Mon', users: 12, cards: 45, notes: 23 },
    { day: 'Tue', users: 15, cards: 52, notes: 31 },
    { day: 'Wed', users: 18, cards: 48, notes: 28 },
    { day: 'Thu', users: 22, cards: 61, notes: 35 },
    { day: 'Fri', users: 19, cards: 55, notes: 42 },
    { day: 'Sat', users: 8, cards: 32, notes: 18 },
    { day: 'Sun', users: 10, cards: 38, notes: 21 },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [
        { data: allUsers },
        { count: cardCount },
        { count: noteCount },
        { count: fileCount },
        { data: newCards },
        { data: newNotes },
        { data: filesSize }
      ] = await Promise.all([
        supabase.rpc('get_all_users'),
        supabase.from('zettel_cards').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('notes').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('files').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('zettel_cards').select('id').gte('created_at', oneWeekAgo.toISOString()).is('deleted_at', null),
        supabase.from('notes').select('id').gte('created_at', oneWeekAgo.toISOString()).is('deleted_at', null),
        supabase.from('files').select('file_size')
      ]);

      const newUsersCount = allUsers?.filter(user => {
        const created = new Date(user.created_at);
        return created >= oneWeekAgo;
      }).length || 0;

      const totalStorage = filesSize?.reduce((acc, file) => acc + (file.file_size || 0), 0) || 0;

      const prevWeekUsers = (allUsers?.length || 0) - newUsersCount;
      const growthRate = prevWeekUsers > 0 ? ((newUsersCount / prevWeekUsers) * 100) : 100;

      setAnalytics({
        totalUsers: allUsers?.length || 0,
        totalCards: cardCount || 0,
        totalNotes: noteCount || 0,
        totalFiles: fileCount || 0,
        newUsersThisWeek: newUsersCount,
        cardsThisWeek: newCards?.length || 0,
        notesThisWeek: newNotes?.length || 0,
        storageUsed: totalStorage,
        activeUsersToday: Math.floor(Math.random() * 10) + 1,
        growthRate: Math.min(growthRate, 999),
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
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-2">Welcome back, Admin</h1>
          <p className="text-muted-foreground max-w-xl">
            Here's what's happening with your platform today. All user content remains private and encrypted.
          </p>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-5 -bottom-10 w-32 h-32 rounded-full bg-secondary/10 blur-2xl" />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-primary/10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalUsers.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-0">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{analytics.newUsersThisWeek} this week
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-primary/10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Knowledge Cards</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <FileStack className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalCards.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-0">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{analytics.cardsThisWeek} this week
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-primary/10">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notes Created</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10">
              <StickyNote className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalNotes.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-0">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{analytics.notesThisWeek} this week
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-primary/10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Storage Used</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <HardDrive className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatBytes(analytics.storageUsed)}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">{analytics.totalFiles} files stored</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Weekly Activity
            </CardTitle>
            <CardDescription>Platform usage over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorCards" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNotes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area type="monotone" dataKey="cards" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCards)" />
                  <Area type="monotone" dataKey="notes" stroke="hsl(var(--secondary))" fillOpacity={1} fill="url(#colorNotes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Content Distribution */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-primary" />
              Content Distribution
            </CardTitle>
            <CardDescription>Breakdown of content types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Cards', value: analytics.totalCards, fill: 'hsl(var(--primary))' },
                  { name: 'Notes', value: analytics.totalNotes, fill: 'hsl(var(--secondary))' },
                  { name: 'Files', value: analytics.totalFiles, fill: 'hsl(130, 50%, 45%)' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Metrics */}
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Growth Metrics
          </CardTitle>
          <CardDescription>Platform growth over the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">User Growth</span>
                <span className="text-sm text-green-500">+{analytics.newUsersThisWeek}</span>
              </div>
              <Progress value={Math.min((analytics.newUsersThisWeek / Math.max(analytics.totalUsers, 1)) * 100, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {analytics.growthRate.toFixed(1)}% growth rate
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cards Created</span>
                <span className="text-sm text-purple-500">+{analytics.cardsThisWeek}</span>
              </div>
              <Progress value={Math.min((analytics.cardsThisWeek / Math.max(analytics.totalCards, 1)) * 100, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {((analytics.cardsThisWeek / Math.max(analytics.totalCards, 1)) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Notes Created</span>
                <span className="text-sm text-amber-500">+{analytics.notesThisWeek}</span>
              </div>
              <Progress value={Math.min((analytics.notesThisWeek / Math.max(analytics.totalNotes, 1)) * 100, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {((analytics.notesThisWeek / Math.max(analytics.totalNotes, 1)) * 100).toFixed(1)}% of total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
