import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { Cookie, Users, TrendingUp, Monitor, Globe, Smartphone, Laptop, TabletSmartphone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ConsentRecord {
  id: string;
  session_id: string;
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
  device_type: string | null;
  browser: string | null;
  created_at: string;
}

interface ConsentStats {
  total: number;
  analytics: number;
  functional: number;
  marketing: number;
  analyticsRate: number;
  functionalRate: number;
  marketingRate: number;
}

interface DeviceStats {
  name: string;
  value: number;
  percentage: number;
}

interface BrowserStats {
  name: string;
  value: number;
  percentage: number;
}

interface TrendData {
  date: string;
  total: number;
  analytics: number;
  functional: number;
  marketing: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export function CookieAnalytics() {
  const [loading, setLoading] = useState(true);
  const [consentData, setConsentData] = useState<ConsentRecord[]>([]);
  const [stats, setStats] = useState<ConsentStats | null>(null);
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
  const [browserStats, setBrowserStats] = useState<BrowserStats[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  useEffect(() => {
    fetchCookieData();
  }, []);

  const fetchCookieData = async () => {
    try {
      const { data, error } = await supabase
        .from('cookie_consent_analytics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const records = (data || []) as ConsentRecord[];
      setConsentData(records);
      calculateStats(records);
      calculateDeviceStats(records);
      calculateBrowserStats(records);
      calculateTrendData(records);
    } catch (error) {
      console.error('Error fetching cookie data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records: ConsentRecord[]) => {
    const total = records.length;
    if (total === 0) {
      setStats({ total: 0, analytics: 0, functional: 0, marketing: 0, analyticsRate: 0, functionalRate: 0, marketingRate: 0 });
      return;
    }

    const analytics = records.filter(r => r.analytics).length;
    const functional = records.filter(r => r.functional).length;
    const marketing = records.filter(r => r.marketing).length;

    setStats({
      total,
      analytics,
      functional,
      marketing,
      analyticsRate: Math.round((analytics / total) * 100),
      functionalRate: Math.round((functional / total) * 100),
      marketingRate: Math.round((marketing / total) * 100),
    });
  };

  const calculateDeviceStats = (records: ConsentRecord[]) => {
    const deviceCounts: Record<string, number> = {};
    records.forEach(r => {
      const device = r.device_type || 'Unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });

    const total = records.length || 1;
    const stats = Object.entries(deviceCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100),
    }));

    setDeviceStats(stats);
  };

  const calculateBrowserStats = (records: ConsentRecord[]) => {
    const browserCounts: Record<string, number> = {};
    records.forEach(r => {
      const browser = r.browser || 'Unknown';
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });

    const total = records.length || 1;
    const stats = Object.entries(browserCounts)
      .map(([name, value]) => ({
        name,
        value,
        percentage: Math.round((value / total) * 100),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    setBrowserStats(stats);
  };

  const calculateTrendData = (records: ConsentRecord[]) => {
    const last7Days: Record<string, TrendData> = {};
    const now = new Date();

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days[dateStr] = { date: dateStr, total: 0, analytics: 0, functional: 0, marketing: 0 };
    }

    // Count records per day
    records.forEach(r => {
      const dateStr = r.created_at.split('T')[0];
      if (last7Days[dateStr]) {
        last7Days[dateStr].total++;
        if (r.analytics) last7Days[dateStr].analytics++;
        if (r.functional) last7Days[dateStr].functional++;
        if (r.marketing) last7Days[dateStr].marketing++;
      }
    });

    setTrendData(Object.values(last7Days));
  };

  const consentPieData = stats ? [
    { name: 'Analytics Accepted', value: stats.analytics },
    { name: 'Analytics Rejected', value: stats.total - stats.analytics },
  ] : [];

  const consentBarData = stats ? [
    { name: 'Necessary', accepted: stats.total, rate: 100 },
    { name: 'Analytics', accepted: stats.analytics, rate: stats.analyticsRate },
    { name: 'Functional', accepted: stats.functional, rate: stats.functionalRate },
    { name: 'Marketing', accepted: stats.marketing, rate: stats.marketingRate },
  ] : [];

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <TabletSmartphone className="h-4 w-4" />;
      case 'desktop': return <Laptop className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Consents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Unique consent records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Analytics Consent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.analyticsRate || 0}%</div>
            <p className="text-xs text-muted-foreground">{stats?.analytics || 0} users accepted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Functional Consent</CardTitle>
            <Cookie className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-2">{stats?.functionalRate || 0}%</div>
            <p className="text-xs text-muted-foreground">{stats?.functional || 0} users accepted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Marketing Consent</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-3">{stats?.marketingRate || 0}%</div>
            <p className="text-xs text-muted-foreground">{stats?.marketing || 0} users accepted</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Consent Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="segments">User Segments</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Consent Rates Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Consent Rates by Category</CardTitle>
                <CardDescription>Acceptance rates for each cookie type</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consentBarData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Analytics Consent Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Analytics Cookie Breakdown</CardTitle>
                <CardDescription>Users who accept vs reject analytics</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={consentPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {consentPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consent Trends (Last 7 Days)</CardTitle>
              <CardDescription>Daily consent activity and acceptance patterns</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="total" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Total Consents" />
                  <Area type="monotone" dataKey="analytics" stackId="2" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} name="Analytics" />
                  <Area type="monotone" dataKey="marketing" stackId="3" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.3} name="Marketing" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Device Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Device Distribution</CardTitle>
                <CardDescription>Consent by device type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deviceStats.length > 0 ? deviceStats.map((device) => (
                    <div key={device.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(device.name)}
                        <span className="font-medium capitalize">{device.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${device.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {device.percentage}%
                        </span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-4">No device data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Browser Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Browser Distribution</CardTitle>
                <CardDescription>Top browsers by consent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {browserStats.length > 0 ? browserStats.map((browser) => (
                    <div key={browser.name} className="flex items-center justify-between">
                      <span className="font-medium">{browser.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-chart-2 rounded-full transition-all"
                            style={{ width: `${browser.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {browser.percentage}%
                        </span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-4">No browser data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Actionable Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Actionable Insights</CardTitle>
                <CardDescription>Recommendations based on consent data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats && stats.total > 0 ? (
                  <>
                    {stats.marketingRate < 30 && (
                      <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-yellow-600">Low Marketing Consent</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Only {stats.marketingRate}% of users accept marketing cookies. Consider improving the value proposition
                          or offering incentives for opting in.
                        </p>
                      </div>
                    )}
                    {stats.analyticsRate > 60 && (
                      <div className="p-4 rounded-lg border border-green-500/50 bg-green-500/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-green-600">High Analytics Consent</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {stats.analyticsRate}% of users trust you with analytics data. Leverage this for better 
                          product insights and user experience optimization.
                        </p>
                      </div>
                    )}
                    {stats.functionalRate < stats.analyticsRate && (
                      <div className="p-4 rounded-lg border border-blue-500/50 bg-blue-500/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-blue-600">Opportunity</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Functional cookies have lower acceptance than analytics. Clarify their benefits 
                          (saved preferences, better UX) to increase opt-in rates.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Not enough data to generate insights. Insights will appear once you have more consent records.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* User Behavior Summary */}
            <Card>
              <CardHeader>
                <CardTitle>User Behavior Summary</CardTitle>
                <CardDescription>Common consent patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats && stats.total > 0 ? (
                  <>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">Privacy-Conscious Users</h4>
                      <p className="text-sm text-muted-foreground">
                        {stats.total - stats.analytics} users ({100 - stats.analyticsRate}%) reject analytics, 
                        indicating privacy awareness. Consider privacy-first features to build trust.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">Full Consent Users</h4>
                      <p className="text-sm text-muted-foreground">
                        Users accepting all cookies are your most engaged segment. Target them with 
                        personalized experiences and premium features.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">Partial Consent Users</h4>
                      <p className="text-sm text-muted-foreground">
                        Users with selective consent want control. Offer granular privacy settings
                        and transparent data usage policies.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Collect more consent data to see user behavior patterns.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
