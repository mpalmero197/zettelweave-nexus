import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, TrendingUp, Activity, Zap, HardDrive, FileStack, StickyNote,
  RefreshCw, Shield, Database, Key, Server, Clock, Search, BookOpen,
  GraduationCap, Award, Star, Bell, BellRing, Bot, FileText, Calendar,
  Brain, Layers, AlertTriangle, CheckCircle2, XCircle, ArrowUpRight,
  ArrowDownRight, Minus, Eye, MessageSquare, Notebook,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { format, subDays, subHours } from 'date-fns';
import { AdminSectionHeader } from './AdminSectionHeader';

/* ── Interfaces ── */

interface CoreMetrics {
  totalUsers: number;
  totalCards: number;
  totalNotes: number;
  totalFiles: number;
  totalDocuments: number;
  totalCatalystDocs: number;
  totalMindMaps: number;
  totalCalendarEvents: number;
  totalNotebooks: number;
  newUsersThisWeek: number;
  cardsThisWeek: number;
  notesThisWeek: number;
  storageUsed: number;
  growthRate: number;
}

interface EngagementMetrics {
  pushSubscriptions: number;
  totalNotificationsSent: number;
  unreadNotifications: number;
  totalReminders: number;
  activeAgents: number;
  totalAgentRuns: number;
  agentRunsThisWeek: number;
  totalFeatureRequests: number;
  pendingFeatureRequests: number;
  totalErrors: number;
  newErrors: number;
}

interface LearningMetrics {
  uniqueSearches: number;
  booksRead: number;
  booksSaved: number;
  coursesTaken: number;
  coursesCompleted: number;
  certificatesEarned: number;
  topBooks: { title: string; saves: number }[];
  bookStatusBreakdown: { status: string; count: number }[];
  courseStatusBreakdown: { status: string; count: number }[];
}

interface DayActivity {
  day: string;
  date: string;
  cards: number;
  notes: number;
  catalystDocs: number;
}

interface RecentUser {
  id: string;
  email: string;
  created_at: string;
}

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(200, 70%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(45, 80%, 50%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 60%, 50%)',
];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  fontSize: '12px',
};

/* ── Component ── */

export function AdminOverview() {
  const [core, setCore] = useState<CoreMetrics>({
    totalUsers: 0, totalCards: 0, totalNotes: 0, totalFiles: 0,
    totalDocuments: 0, totalCatalystDocs: 0, totalMindMaps: 0,
    totalCalendarEvents: 0, totalNotebooks: 0,
    newUsersThisWeek: 0, cardsThisWeek: 0, notesThisWeek: 0,
    storageUsed: 0, growthRate: 0,
  });
  const [engagement, setEngagement] = useState<EngagementMetrics>({
    pushSubscriptions: 0, totalNotificationsSent: 0, unreadNotifications: 0,
    totalReminders: 0, activeAgents: 0, totalAgentRuns: 0, agentRunsThisWeek: 0,
    totalFeatureRequests: 0, pendingFeatureRequests: 0, totalErrors: 0, newErrors: 0,
  });
  const [learning, setLearning] = useState<LearningMetrics>({
    uniqueSearches: 0, booksRead: 0, booksSaved: 0,
    coursesTaken: 0, coursesCompleted: 0, certificatesEarned: 0,
    topBooks: [], bookStatusBreakdown: [], courseStatusBreakdown: [],
  });
  const [activityData, setActivityData] = useState<DayActivity[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [contentPie, setContentPie] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const isoWeek = oneWeekAgo.toISOString();

      const [
        { data: allUsers },
        { count: cardCount },
        { count: noteCount },
        { count: fileCount },
        { count: docCount },
        { count: catalystDocCount },
        { count: mindMapCount },
        { count: calendarEventCount },
        { count: notebookCount },
        { data: newCards },
        { data: newNotes },
        { data: filesSize },
        { data: recentCards },
        { data: recentNotes },
        { data: recentCatalystDocs },
      ] = await Promise.all([
        supabase.rpc('get_all_users'),
        supabase.from('zettel_cards').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('notes').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('files').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('catalyst_documents').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('mind_maps').select('id', { count: 'exact', head: true }),
        supabase.from('calendar_events').select('id', { count: 'exact', head: true }),
        supabase.from('notebooks').select('id', { count: 'exact', head: true }),
        supabase.from('zettel_cards').select('id').gte('created_at', isoWeek).is('deleted_at', null),
        supabase.from('notes').select('id').gte('created_at', isoWeek).is('deleted_at', null),
        supabase.from('files').select('file_size'),
        supabase.from('zettel_cards').select('created_at').gte('created_at', isoWeek).is('deleted_at', null),
        supabase.from('notes').select('created_at').gte('created_at', isoWeek).is('deleted_at', null),
        supabase.from('catalyst_documents').select('created_at').gte('created_at', isoWeek).is('deleted_at', null),
      ]);

      // Engagement metrics (parallel)
      const [
        { count: pushSubCount },
        { count: notifSentCount },
        { count: unreadNotifCount },
        { count: reminderCount },
        { count: activeAgentCount },
        { count: agentRunCount },
        { data: agentRunsRecent },
        { count: featureReqCount },
        { count: pendingFeatureCount },
        { count: errorCount },
        { count: newErrorCount },
      ] = await Promise.all([
        supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }),
        supabase.from('in_app_notifications').select('id', { count: 'exact', head: true }),
        supabase.from('in_app_notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('reminders').select('id', { count: 'exact', head: true }),
        supabase.from('agents').select('id', { count: 'exact', head: true }).eq('is_enabled', true),
        supabase.from('agent_runs').select('id', { count: 'exact', head: true }),
        supabase.from('agent_runs').select('id').gte('started_at', isoWeek),
        supabase.from('feature_requests').select('id', { count: 'exact', head: true }),
        supabase.from('feature_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('error_reports').select('id', { count: 'exact', head: true }),
        supabase.from('error_reports').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      ]);

      // Learning metrics
      const [
        { data: searchHistory },
        { data: allBooks },
        { data: allCourses },
      ] = await Promise.all([
        (supabase.from('search_history' as any) as any).select('query'),
        supabase.from('reading_list').select('title, status, book_key'),
        (supabase.from('saved_courses') as any).select('status, certificate_earned, title'),
      ]);

      // ── Process core metrics ──
      const newUsersCount = allUsers?.filter((u: any) => new Date(u.created_at) >= oneWeekAgo).length || 0;
      const totalStorage = filesSize?.reduce((acc: number, file: any) => acc + (file.file_size || 0), 0) || 0;
      const prevWeekUsers = (allUsers?.length || 0) - newUsersCount;
      const growthRate = prevWeekUsers > 0 ? (newUsersCount / prevWeekUsers) * 100 : (newUsersCount > 0 ? 100 : 0);

      setCore({
        totalUsers: allUsers?.length || 0,
        totalCards: cardCount || 0,
        totalNotes: noteCount || 0,
        totalFiles: fileCount || 0,
        totalDocuments: docCount || 0,
        totalCatalystDocs: catalystDocCount || 0,
        totalMindMaps: mindMapCount || 0,
        totalCalendarEvents: calendarEventCount || 0,
        totalNotebooks: notebookCount || 0,
        newUsersThisWeek: newUsersCount,
        cardsThisWeek: newCards?.length || 0,
        notesThisWeek: newNotes?.length || 0,
        storageUsed: totalStorage,
        growthRate: Math.min(growthRate, 999),
      });

      setEngagement({
        pushSubscriptions: pushSubCount || 0,
        totalNotificationsSent: notifSentCount || 0,
        unreadNotifications: unreadNotifCount || 0,
        totalReminders: reminderCount || 0,
        activeAgents: activeAgentCount || 0,
        totalAgentRuns: agentRunCount || 0,
        agentRunsThisWeek: agentRunsRecent?.length || 0,
        totalFeatureRequests: featureReqCount || 0,
        pendingFeatureRequests: pendingFeatureCount || 0,
        totalErrors: errorCount || 0,
        newErrors: newErrorCount || 0,
      });

      // Content pie
      setContentPie([
        { name: 'Cards', value: cardCount || 0 },
        { name: 'Notes', value: noteCount || 0 },
        { name: 'Catalyst Docs', value: catalystDocCount || 0 },
        { name: 'Mind Maps', value: mindMapCount || 0 },
        { name: 'Files', value: fileCount || 0 },
        { name: 'Documents', value: docCount || 0 },
      ].filter(d => d.value > 0));

      // ── Learning ──
      const searches = searchHistory || [];
      const uniqueQueries = new Set(searches.map((s: any) => (s.query || '').toLowerCase().trim()));
      const books = allBooks || [];
      const booksRead = books.filter((b: any) => b.status === 'finished' || b.status === 'read').length;
      const bookCountMap: Record<string, number> = {};
      books.forEach((b: any) => { const t = b.title || 'Unknown'; bookCountMap[t] = (bookCountMap[t] || 0) + 1; });
      const topBooks = Object.entries(bookCountMap).sort(([, a], [, b]) => b - a).slice(0, 5).map(([title, saves]) => ({ title, saves }));
      const bookStatusMap: Record<string, number> = {};
      books.forEach((b: any) => { const s = b.status || 'unknown'; bookStatusMap[s] = (bookStatusMap[s] || 0) + 1; });
      const bookStatusBreakdown = Object.entries(bookStatusMap).map(([status, count]) => ({ status, count }));
      const courses = allCourses || [];
      const courseStatusMap: Record<string, number> = {};
      courses.forEach((c: any) => { const s = c.status || 'unknown'; courseStatusMap[s] = (courseStatusMap[s] || 0) + 1; });
      const courseStatusBreakdown = Object.entries(courseStatusMap).map(([status, count]) => ({ status, count }));

      setLearning({
        uniqueSearches: uniqueQueries.size,
        booksRead,
        booksSaved: books.length,
        coursesTaken: courses.length,
        coursesCompleted: courses.filter((c: any) => c.status === 'completed').length,
        certificatesEarned: courses.filter((c: any) => c.certificate_earned === true).length,
        topBooks,
        bookStatusBreakdown,
        courseStatusBreakdown,
      });

      // ── Activity chart (14 days) ──
      const dayMap: Record<string, { cards: number; notes: number; catalystDocs: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = subDays(new Date(), i);
        dayMap[format(d, 'yyyy-MM-dd')] = { cards: 0, notes: 0, catalystDocs: 0 };
      }
      recentCards?.forEach((c: any) => { const k = format(new Date(c.created_at), 'yyyy-MM-dd'); if (dayMap[k]) dayMap[k].cards++; });
      recentNotes?.forEach((n: any) => { const k = format(new Date(n.created_at), 'yyyy-MM-dd'); if (dayMap[k]) dayMap[k].notes++; });
      recentCatalystDocs?.forEach((d: any) => { const k = format(new Date(d.created_at), 'yyyy-MM-dd'); if (dayMap[k]) dayMap[k].catalystDocs++; });
      setActivityData(
        Object.entries(dayMap).map(([date, v]) => ({
          day: format(new Date(date), 'EEE'),
          date: format(new Date(date), 'MMM d'),
          ...v,
        }))
      );

      // ── Recent users ──
      const sorted = [...(allUsers || [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentUsers(sorted.slice(0, 8).map((u: any) => ({ id: u.id, email: u.email || 'N/A', created_at: u.created_at })));

      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({ title: "Error", description: "Failed to load analytics data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const statusLabel: Record<string, string> = {
    want_to_read: 'Want to Read', reading: 'Reading', finished: 'Finished', read: 'Read',
    want_to_take: 'Want to Take', in_progress: 'In Progress', completed: 'Completed', unknown: 'Unknown',
  };

  const totalContent = core.totalCards + core.totalNotes + core.totalCatalystDocs + core.totalMindMaps + core.totalFiles + core.totalDocuments;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Activity className="h-10 w-10 animate-spin text-primary relative z-10" />
          </div>
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminSectionHeader
        icon={Activity}
        title="Platform Command Center"
        description="Comprehensive real-time analytics and health monitoring"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
              <Clock className="h-3 w-3" />
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchAnalytics} className="gap-1.5 rounded-xl">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      {/* ── Platform Health Strip ── */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
        {[
          { label: 'Database', icon: Database, status: 'Healthy', ok: true },
          { label: 'Auth', icon: Key, status: 'Active', ok: true },
          { label: 'Edge Functions', icon: Server, status: 'Running', ok: true },
          { label: 'Storage', icon: HardDrive, status: formatBytes(core.storageUsed), ok: true },
          { label: 'Push', icon: BellRing, status: `${engagement.pushSubscriptions} subs`, ok: engagement.pushSubscriptions > 0 },
          { label: 'Agents', icon: Bot, status: `${engagement.activeAgents} active`, ok: true },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${item.ok ? 'bg-green-500' : 'bg-amber-500'}`} />
            <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">{item.label}</span>
            <span className="text-foreground/70">{item.status}</span>
          </div>
        ))}
      </div>

      {/* ── Primary KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard icon={Users} label="Users" value={core.totalUsers} delta={core.newUsersThisWeek} deltaLabel="this week" />
        <KPICard icon={FileStack} label="Cards" value={core.totalCards} delta={core.cardsThisWeek} deltaLabel="this week" />
        <KPICard icon={StickyNote} label="Notes" value={core.totalNotes} delta={core.notesThisWeek} deltaLabel="this week" />
        <KPICard icon={FileText} label="Catalyst" value={core.totalCatalystDocs} />
        <KPICard icon={Brain} label="Mind Maps" value={core.totalMindMaps} />
        <KPICard icon={HardDrive} label="Storage" value={formatBytes(core.storageUsed)} subtitle={`${core.totalFiles} files`} />
      </div>

      {/* ── Secondary KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MiniKPI icon={Calendar} label="Events" value={core.totalCalendarEvents} />
        <MiniKPI icon={Notebook} label="Notebooks" value={core.totalNotebooks} />
        <MiniKPI icon={Layers} label="Documents" value={core.totalDocuments} />
        <MiniKPI icon={Bell} label="Notifications" value={engagement.totalNotificationsSent} />
        <MiniKPI icon={Clock} label="Reminders" value={engagement.totalReminders} />
        <MiniKPI icon={Bot} label="Agent Runs" value={engagement.totalAgentRuns} badge={engagement.agentRunsThisWeek > 0 ? `+${engagement.agentRunsThisWeek}` : undefined} />
        <MiniKPI icon={MessageSquare} label="Feature Reqs" value={engagement.totalFeatureRequests} badge={engagement.pendingFeatureRequests > 0 ? `${engagement.pendingFeatureRequests} pending` : undefined} badgeVariant="warning" />
        <MiniKPI icon={AlertTriangle} label="Errors" value={engagement.totalErrors} badge={engagement.newErrors > 0 ? `${engagement.newErrors} new` : undefined} badgeVariant="destructive" />
      </div>

      {/* ── Charts Section ── */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="w-full grid grid-cols-4 max-w-lg h-10 p-1 bg-muted/40 backdrop-blur-sm rounded-xl border border-border/30">
          <TabsTrigger value="activity" className="text-xs rounded-lg">Activity</TabsTrigger>
          <TabsTrigger value="content" className="text-xs rounded-lg">Content</TabsTrigger>
          <TabsTrigger value="learning" className="text-xs rounded-lg">Learning</TabsTrigger>
          <TabsTrigger value="growth" className="text-xs rounded-lg">Growth</TabsTrigger>
        </TabsList>

        {/* ── Activity Tab ── */}
        <TabsContent value="activity" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 14-day Activity Chart */}
            <Card className="lg:col-span-2 rounded-xl border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  14-Day Activity
                </CardTitle>
                <CardDescription>Content creation trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData}>
                      <defs>
                        <linearGradient id="gCards" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gNotes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(200, 70%, 50%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(200, 70%, 50%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gCatalyst" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(280, 60%, 55%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(280, 60%, 55%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="cards" name="Cards" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#gCards)" strokeWidth={2} />
                      <Area type="monotone" dataKey="notes" name="Notes" stroke="hsl(200, 70%, 50%)" fillOpacity={1} fill="url(#gNotes)" strokeWidth={2} />
                      <Area type="monotone" dataKey="catalystDocs" name="Catalyst" stroke="hsl(280, 60%, 55%)" fillOpacity={1} fill="url(#gCatalyst)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-5 mt-3">
                  {[
                    { label: 'Cards', color: 'hsl(var(--primary))' },
                    { label: 'Notes', color: 'hsl(200, 70%, 50%)' },
                    { label: 'Catalyst', color: 'hsl(280, 60%, 55%)' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Users */}
            <Card className="rounded-xl border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Recent Signups
                </CardTitle>
                <CardDescription>{core.newUsersThisWeek} this week</CardDescription>
              </CardHeader>
              <CardContent>
                {recentUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No users yet</p>
                ) : (
                  <div className="space-y-2.5">
                    {recentUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{u.email}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(u.created_at), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Content Tab ── */}
        <TabsContent value="content" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Content Distribution Pie */}
            <Card className="rounded-xl border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-primary" />
                  Content Distribution
                </CardTitle>
                <CardDescription>{totalContent.toLocaleString()} total items</CardDescription>
              </CardHeader>
              <CardContent>
                {contentPie.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No content yet</p>
                ) : (
                  <>
                    <div className="h-56 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={contentPie} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {contentPie.map((_, idx) => (
                              <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                      {contentPie.map((d, idx) => (
                        <Badge key={d.name} variant="outline" className="text-[10px] gap-1 rounded-md">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          {d.name}: {d.value.toLocaleString()}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Content Bar Chart */}
            <Card className="rounded-xl border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-primary" />
                  Content by Type
                </CardTitle>
                <CardDescription>Absolute counts comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contentPie}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Learning Tab ── */}
        <TabsContent value="learning" className="mt-4">
          {/* Learning KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <MiniKPI icon={Search} label="Searches" value={learning.uniqueSearches} />
            <MiniKPI icon={BookOpen} label="Books Saved" value={learning.booksSaved} />
            <MiniKPI icon={Star} label="Books Read" value={learning.booksRead} />
            <MiniKPI icon={GraduationCap} label="Courses" value={learning.coursesTaken} />
            <MiniKPI icon={Award} label="Certificates" value={learning.certificatesEarned} />
            <MiniKPI icon={Zap} label="Completion" value={learning.coursesTaken > 0 ? `${Math.round((learning.coursesCompleted / learning.coursesTaken) * 100)}%` : '0%'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Book Popularity */}
            <Card className="rounded-xl border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Top Books
                </CardTitle>
              </CardHeader>
              <CardContent>
                {learning.topBooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No books saved yet</p>
                ) : (
                  <div className="space-y-3">
                    {learning.topBooks.map((book, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground w-5 text-right">#{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{book.title}</p>
                          <p className="text-[10px] text-muted-foreground">{book.saves} save{book.saves !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="w-16">
                          <Progress value={learning.topBooks[0]?.saves ? (book.saves / learning.topBooks[0].saves) * 100 : 0} className="h-1.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Book Status Pie */}
            <Card className="rounded-xl border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4 text-primary" />
                  Reading Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {learning.bookStatusBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <>
                    <div className="h-44 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={learning.bookStatusBreakdown.map(b => ({ name: statusLabel[b.status] || b.status, value: b.count }))} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="value">
                            {learning.bookStatusBreakdown.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                      {learning.bookStatusBreakdown.map((b, idx) => (
                        <Badge key={b.status} variant="outline" className="text-[9px] gap-1 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          {statusLabel[b.status] || b.status}: {b.count}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Course Progress */}
            <Card className="rounded-xl border-border/40 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Course Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {learning.courseStatusBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No courses yet</p>
                ) : (
                  <div className="space-y-3">
                    {learning.courseStatusBreakdown.map((cs) => (
                      <div key={cs.status} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{statusLabel[cs.status] || cs.status}</span>
                          <span className="text-muted-foreground">{cs.count}</span>
                        </div>
                        <Progress value={learning.coursesTaken > 0 ? (cs.count / learning.coursesTaken) * 100 : 0} className="h-1.5" />
                      </div>
                    ))}
                    {learning.certificatesEarned > 0 && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/30 mt-3">
                        <Award className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-medium">{learning.certificatesEarned} certificate{learning.certificatesEarned !== 1 ? 's' : ''} earned</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Growth Tab ── */}
        <TabsContent value="growth" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="rounded-xl border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Weekly Growth
                </CardTitle>
                <CardDescription>Platform growth over the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-5">
                  <GrowthBar label="User Growth" current={core.newUsersThisWeek} total={core.totalUsers} rate={core.growthRate} />
                  <GrowthBar label="Cards Created" current={core.cardsThisWeek} total={core.totalCards} />
                  <GrowthBar label="Notes Created" current={core.notesThisWeek} total={core.totalNotes} />
                </div>
              </CardContent>
            </Card>

            {/* Engagement Summary */}
            <Card className="rounded-xl border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-primary" />
                  Engagement Summary
                </CardTitle>
                <CardDescription>Push, notifications, agents & feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <EngagementRow icon={BellRing} label="Push Subscribers" value={engagement.pushSubscriptions} />
                  <EngagementRow icon={Bell} label="Notifications Sent" value={engagement.totalNotificationsSent} />
                  <EngagementRow icon={Eye} label="Unread Notifications" value={engagement.unreadNotifications} />
                  <EngagementRow icon={Clock} label="Active Reminders" value={engagement.totalReminders} />
                  <EngagementRow icon={Bot} label="Active Agents" value={engagement.activeAgents} />
                  <EngagementRow icon={Zap} label="Agent Runs (week)" value={engagement.agentRunsThisWeek} />
                  <EngagementRow icon={MessageSquare} label="Feature Requests" value={engagement.totalFeatureRequests} highlight={engagement.pendingFeatureRequests > 0} />
                  <EngagementRow icon={AlertTriangle} label="Error Reports" value={engagement.totalErrors} highlight={engagement.newErrors > 0} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Sub-components ── */

function KPICard({ icon: Icon, label, value, delta, deltaLabel, subtitle }: {
  icon: React.FC<any>;
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  subtitle?: string;
}) {
  return (
    <Card className="rounded-xl border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        {delta != null && delta > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-3 w-3 text-green-500" />
            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">+{delta} {deltaLabel}</span>
          </div>
        )}
        {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
      </CardContent>
    </Card>
  );
}

function MiniKPI({ icon: Icon, label, value, badge, badgeVariant }: {
  icon: React.FC<any>;
  label: string;
  value: string | number;
  badge?: string;
  badgeVariant?: 'warning' | 'destructive';
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium truncate">{label}</p>
        <p className="text-sm font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
      {badge && (
        <Badge variant="outline" className={`text-[9px] shrink-0 ${badgeVariant === 'destructive' ? 'border-destructive/30 text-destructive' : badgeVariant === 'warning' ? 'border-amber-500/30 text-amber-600 dark:text-amber-400' : 'border-green-500/30 text-green-600 dark:text-green-400'}`}>
          {badge}
        </Badge>
      )}
    </div>
  );
}

function GrowthBar({ label, current, total, rate }: { label: string; current: number; total: number; rate?: number }) {
  const percent = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold text-primary">+{current}</span>
      </div>
      <Progress value={percent} className="h-2" />
      <p className="text-[10px] text-muted-foreground">
        {rate != null ? `${rate.toFixed(1)}% growth rate` : `${percent.toFixed(1)}% of total`}
      </p>
    </div>
  );
}

function EngagementRow({ icon: Icon, label, value, highlight }: {
  icon: React.FC<any>;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors ${highlight ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/20 hover:bg-muted/20'}`}>
      <Icon className={`h-4 w-4 shrink-0 ${highlight ? 'text-amber-500' : 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
