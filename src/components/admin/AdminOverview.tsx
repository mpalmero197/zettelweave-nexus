import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Users,
  TrendingUp,
  Activity,
  Zap,
  HardDrive,
  FileStack,
  StickyNote,
  RefreshCw,
  Shield,
  Database,
  Key,
  Server,
  Clock,
  Search,
  BookOpen,
  GraduationCap,
  Award,
  Star,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import { AdminSectionHeader } from './AdminSectionHeader';

interface AnalyticsData {
  totalUsers: number;
  totalCards: number;
  totalNotes: number;
  totalFiles: number;
  newUsersThisWeek: number;
  cardsThisWeek: number;
  notesThisWeek: number;
  storageUsed: number;
  growthRate: number;
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
  cards: number;
  notes: number;
}

const PIE_COLORS = [
  'hsl(200, 70%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(45, 80%, 50%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 60%, 50%)',
];

export function AdminOverview() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0, totalCards: 0, totalNotes: 0, totalFiles: 0,
    newUsersThisWeek: 0, cardsThisWeek: 0, notesThisWeek: 0,
    storageUsed: 0, growthRate: 0,
  });
  const [learning, setLearning] = useState<LearningMetrics>({
    uniqueSearches: 0, booksRead: 0, booksSaved: 0,
    coursesTaken: 0, coursesCompleted: 0, certificatesEarned: 0,
    topBooks: [], bookStatusBreakdown: [], courseStatusBreakdown: [],
  });
  const [activityData, setActivityData] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
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
        { data: filesSize },
        { data: recentCards },
        { data: recentNotes },
        { data: searchHistory },
        { data: allBooks },
        { data: allCourses },
      ] = await Promise.all([
        supabase.rpc('get_all_users'),
        supabase.from('zettel_cards').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('notes').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('files').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('zettel_cards').select('id').gte('created_at', oneWeekAgo.toISOString()).is('deleted_at', null),
        supabase.from('notes').select('id').gte('created_at', oneWeekAgo.toISOString()).is('deleted_at', null),
        supabase.from('files').select('file_size'),
        supabase.from('zettel_cards').select('created_at').gte('created_at', oneWeekAgo.toISOString()).is('deleted_at', null),
        supabase.from('notes').select('created_at').gte('created_at', oneWeekAgo.toISOString()).is('deleted_at', null),
        (supabase.from('search_history' as any) as any).select('query'),
        supabase.from('reading_list').select('title, status, book_key'),
        (supabase.from('saved_courses') as any).select('status, certificate_earned, title'),
      ]);

      // Core analytics
      const newUsersCount = allUsers?.filter(u => new Date(u.created_at) >= oneWeekAgo).length || 0;
      const totalStorage = filesSize?.reduce((acc, file) => acc + (file.file_size || 0), 0) || 0;
      const prevWeekUsers = (allUsers?.length || 0) - newUsersCount;
      const growthRate = prevWeekUsers > 0 ? (newUsersCount / prevWeekUsers) * 100 : 100;

      setAnalytics({
        totalUsers: allUsers?.length || 0,
        totalCards: cardCount || 0,
        totalNotes: noteCount || 0,
        totalFiles: fileCount || 0,
        newUsersThisWeek: newUsersCount,
        cardsThisWeek: newCards?.length || 0,
        notesThisWeek: newNotes?.length || 0,
        storageUsed: totalStorage,
        growthRate: Math.min(growthRate, 999),
      });

      // Learning metrics
      const searches = searchHistory || [];
      const uniqueQueries = new Set(searches.map((s: any) => (s.query || '').toLowerCase().trim()));

      const books = allBooks || [];
      const booksRead = books.filter((b: any) => b.status === 'finished' || b.status === 'read').length;
      const booksSaved = books.length;

      // Book popularity (most saved titles)
      const bookCountMap: Record<string, number> = {};
      books.forEach((b: any) => {
        const t = b.title || 'Unknown';
        bookCountMap[t] = (bookCountMap[t] || 0) + 1;
      });
      const topBooks = Object.entries(bookCountMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([title, saves]) => ({ title, saves }));

      // Book status breakdown
      const bookStatusMap: Record<string, number> = {};
      books.forEach((b: any) => {
        const s = b.status || 'unknown';
        bookStatusMap[s] = (bookStatusMap[s] || 0) + 1;
      });
      const bookStatusBreakdown = Object.entries(bookStatusMap).map(([status, count]) => ({ status, count }));

      const courses = allCourses || [];
      const coursesTaken = courses.length;
      const coursesCompleted = courses.filter((c: any) => c.status === 'completed').length;
      const certificatesEarned = courses.filter((c: any) => c.certificate_earned === true).length;

      // Course status breakdown
      const courseStatusMap: Record<string, number> = {};
      courses.forEach((c: any) => {
        const s = c.status || 'unknown';
        courseStatusMap[s] = (courseStatusMap[s] || 0) + 1;
      });
      const courseStatusBreakdown = Object.entries(courseStatusMap).map(([status, count]) => ({ status, count }));

      setLearning({
        uniqueSearches: uniqueQueries.size,
        booksRead,
        booksSaved,
        coursesTaken,
        coursesCompleted,
        certificatesEarned,
        topBooks,
        bookStatusBreakdown,
        courseStatusBreakdown,
      });

      // Build real activity data grouped by day
      const dayMap: Record<string, { cards: number; notes: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const key = format(d, 'yyyy-MM-dd');
        dayMap[key] = { cards: 0, notes: 0 };
      }
      recentCards?.forEach(c => {
        const key = format(new Date(c.created_at), 'yyyy-MM-dd');
        if (dayMap[key]) dayMap[key].cards++;
      });
      recentNotes?.forEach(n => {
        const key = format(new Date(n.created_at), 'yyyy-MM-dd');
        if (dayMap[key]) dayMap[key].notes++;
      });
      setActivityData(
        Object.entries(dayMap).map(([date, v]) => ({
          day: format(new Date(date), 'EEE'),
          cards: v.cards,
          notes: v.notes,
        }))
      );

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
    want_to_read: 'Want to Read',
    reading: 'Reading',
    finished: 'Finished',
    read: 'Read',
    want_to_take: 'Want to Take',
    in_progress: 'In Progress',
    completed: 'Completed',
    unknown: 'Unknown',
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
      {/* Header */}
      <AdminSectionHeader
        icon={Activity}
        title="Platform Overview"
        description="Real-time platform analytics and health"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              <Clock className="h-3 w-3 inline mr-1" />
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <Button variant="outline" size="sm" onClick={fetchAnalytics} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      {/* Platform Health Strip */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-card">
        {[
          { label: 'Database', icon: Database, status: 'Healthy' },
          { label: 'Auth', icon: Key, status: 'Active' },
          { label: 'Edge Functions', icon: Server, status: 'Running' },
          { label: 'Storage', icon: HardDrive, status: 'OK' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <item.icon className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers.toLocaleString()}</div>
            <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-0 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />+{analytics.newUsersThisWeek} this week
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cards</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <FileStack className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCards.toLocaleString()}</div>
            <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-0 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />+{analytics.cardsThisWeek} this week
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10">
              <StickyNote className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalNotes.toLocaleString()}</div>
            <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-0 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />+{analytics.notesThisWeek} this week
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Storage</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <HardDrive className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(analytics.storageUsed)}</div>
            <span className="text-xs text-muted-foreground">{analytics.totalFiles} files</span>
          </CardContent>
        </Card>
      </div>

      {/* Learning & Engagement Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Unique Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{learning.uniqueSearches.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Books Saved</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{learning.booksSaved.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Books Read</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{learning.booksRead.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Courses Taken</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{learning.coursesTaken.toLocaleString()}</div>
            <span className="text-xs text-muted-foreground">{learning.coursesCompleted} completed</span>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Certificates</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{learning.certificatesEarned.toLocaleString()}</div>
            <span className="text-xs text-muted-foreground">earned</span>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Completion Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {learning.coursesTaken > 0
                ? Math.round((learning.coursesCompleted / learning.coursesTaken) * 100)
                : 0}%
            </div>
            <span className="text-xs text-muted-foreground">courses</span>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Weekly Activity
            </CardTitle>
            <CardDescription>Real content creation over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorCards" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNotes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area type="monotone" dataKey="cards" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCards)" />
                  <Area type="monotone" dataKey="notes" stroke="hsl(var(--secondary))" fillOpacity={1} fill="url(#colorNotes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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
                <BarChart
                  data={[
                    { name: 'Cards', value: analytics.totalCards, fill: 'hsl(var(--primary))' },
                    { name: 'Notes', value: analytics.totalNotes, fill: 'hsl(var(--secondary))' },
                    { name: 'Files', value: analytics.totalFiles, fill: 'hsl(130, 50%, 45%)' },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Book Popularity Ranking */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              Book Popularity
            </CardTitle>
            <CardDescription>Most saved books across all users</CardDescription>
          </CardHeader>
          <CardContent>
            {learning.topBooks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No books saved yet</p>
            ) : (
              <div className="space-y-3">
                {learning.topBooks.map((book, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6 text-right">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{book.title}</p>
                      <p className="text-xs text-muted-foreground">{book.saves} save{book.saves !== 1 ? 's' : ''}</p>
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

        {/* Book Status Breakdown */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-primary" />
              Reading Status
            </CardTitle>
            <CardDescription>Distribution of book statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {learning.bookStatusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data</p>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={learning.bookStatusBreakdown.map(b => ({ name: statusLabel[b.status] || b.status, value: b.count }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {learning.bookStatusBreakdown.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {learning.bookStatusBreakdown.map((b, idx) => (
                <Badge key={b.status} variant="outline" className="text-[10px] gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  {statusLabel[b.status] || b.status}: {b.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Course Status Breakdown */}
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
              Course Progress
            </CardTitle>
            <CardDescription>Status and certificates overview</CardDescription>
          </CardHeader>
          <CardContent>
            {learning.courseStatusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No courses yet</p>
            ) : (
              <div className="space-y-3">
                {learning.courseStatusBreakdown.map((cs) => (
                  <div key={cs.status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{statusLabel[cs.status] || cs.status}</span>
                      <span className="text-muted-foreground">{cs.count}</span>
                    </div>
                    <Progress value={learning.coursesTaken > 0 ? (cs.count / learning.coursesTaken) * 100 : 0} className="h-1.5" />
                  </div>
                ))}
                {learning.certificatesEarned > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border mt-3">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">{learning.certificatesEarned} certificate{learning.certificatesEarned !== 1 ? 's' : ''} earned</span>
                  </div>
                )}
              </div>
            )}
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
              <p className="text-xs text-muted-foreground">{analytics.growthRate.toFixed(1)}% growth rate</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cards Created</span>
                <span className="text-sm text-purple-500">+{analytics.cardsThisWeek}</span>
              </div>
              <Progress value={Math.min((analytics.cardsThisWeek / Math.max(analytics.totalCards, 1)) * 100, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">{((analytics.cardsThisWeek / Math.max(analytics.totalCards, 1)) * 100).toFixed(1)}% of total</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Notes Created</span>
                <span className="text-sm text-amber-500">+{analytics.notesThisWeek}</span>
              </div>
              <Progress value={Math.min((analytics.notesThisWeek / Math.max(analytics.totalNotes, 1)) * 100, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">{((analytics.notesThisWeek / Math.max(analytics.totalNotes, 1)) * 100).toFixed(1)}% of total</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}