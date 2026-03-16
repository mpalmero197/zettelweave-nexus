import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, AreaChart, Area 
} from 'recharts';
import { Cookie, Users, TrendingUp, Monitor, Globe, Smartphone, Laptop, TabletSmartphone, ShieldCheck, ShieldX, SlidersHorizontal } from 'lucide-react';
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

interface ConsentVariation {
  label: string;
  key: string;
  count: number;
  percentage: number;
  categories: { analytics: boolean; functional: boolean; marketing: boolean };
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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const VARIATION_COLORS: Record<string, string> = {
  'accept-all': 'hsl(var(--chart-2))',
  'reject-all': 'hsl(var(--destructive))',
  'analytics-only': 'hsl(var(--primary))',
  'functional-only': 'hsl(var(--chart-3))',
  'marketing-only': 'hsl(var(--chart-4))',
  'analytics-functional': 'hsl(var(--chart-5))',
  'analytics-marketing': 'hsl(var(--chart-2))',
  'functional-marketing': 'hsl(var(--chart-3))',
};

function getVariationKey(r: ConsentRecord): string {
  if (r.analytics && r.functional && r.marketing) return 'accept-all';
  if (!r.analytics && !r.functional && !r.marketing) return 'reject-all';
  const parts: string[] = [];
  if (r.analytics) parts.push('analytics');
  if (r.functional) parts.push('functional');
  if (r.marketing) parts.push('marketing');
  return parts.join('-');
}

function getVariationLabel(key: string): string {
  const labels: Record<string, string> = {
    'accept-all': 'Accept All',
    'reject-all': 'Necessary Only',
    'analytics': 'Analytics Only',
    'functional': 'Functional Only',
    'marketing': 'Marketing Only',
    'analytics-functional': 'Analytics + Functional',
    'analytics-marketing': 'Analytics + Marketing',
    'functional-marketing': 'Functional + Marketing',
  };
  return labels[key] || key;
}

export function CookieAnalytics() {
  const [loading, setLoading] = useState(true);
  const [consentData, setConsentData] = useState<ConsentRecord[]>([]);
  const [stats, setStats] = useState<ConsentStats | null>(null);
  const [variations, setVariations] = useState<ConsentVariation[]>([]);
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
      calculateVariations(records);
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
      total, analytics, functional, marketing,
      analyticsRate: Math.round((analytics / total) * 100),
      functionalRate: Math.round((functional / total) * 100),
      marketingRate: Math.round((marketing / total) * 100),
    });
  };

  const calculateVariations = (records: ConsentRecord[]) => {
    const total = records.length || 1;
    const counts: Record<string, { count: number; categories: { analytics: boolean; functional: boolean; marketing: boolean } }> = {};

    records.forEach(r => {
      const key = getVariationKey(r);
      if (!counts[key]) {
        counts[key] = { count: 0, categories: { analytics: r.analytics, functional: r.functional, marketing: r.marketing } };
      }
      counts[key].count++;
    });

    const vars = Object.entries(counts)
      .map(([key, val]) => ({
        label: getVariationLabel(key),
        key,
        count: val.count,
        percentage: Math.round((val.count / total) * 100),
        categories: val.categories,
      }))
      .sort((a, b) => b.count - a.count);

    setVariations(vars);
  };

  const calculateDeviceStats = (records: ConsentRecord[]) => {
    const deviceCounts: Record<string, number> = {};
    records.forEach(r => {
      const device = r.device_type || 'Unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    const total = records.length || 1;
    setDeviceStats(Object.entries(deviceCounts).map(([name, value]) => ({
      name, value, percentage: Math.round((value / total) * 100),
    })));
  };

  const calculateBrowserStats = (records: ConsentRecord[]) => {
    const browserCounts: Record<string, number> = {};
    records.forEach(r => {
      const browser = r.browser || 'Unknown';
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });
    const total = records.length || 1;
    setBrowserStats(
      Object.entries(browserCounts)
        .map(([name, value]) => ({ name, value, percentage: Math.round((value / total) * 100) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    );
  };

  const calculateTrendData = (records: ConsentRecord[]) => {
    const last7Days: Record<string, TrendData> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days[dateStr] = { date: dateStr, total: 0, analytics: 0, functional: 0, marketing: 0 };
    }
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

  const consentBarData = stats ? [
    { name: 'Necessary', accepted: stats.total, rate: 100 },
    { name: 'Analytics', accepted: stats.analytics, rate: stats.analyticsRate },
    { name: 'Functional', accepted: stats.functional, rate: stats.functionalRate },
    { name: 'Marketing', accepted: stats.marketing, rate: stats.marketingRate },
  ] : [];

  const variationPieData = variations.map(v => ({ name: v.label, value: v.count }));

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
            <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>
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

      <Tabs defaultValue="variations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="variations">Consent Variations</TabsTrigger>
          <TabsTrigger value="overview">Category Rates</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="segments">User Segments</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* ── NEW: Consent Variations Tab ── */}
        <TabsContent value="variations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Variation Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Consent Combinations
                </CardTitle>
                <CardDescription>Which cookie policies users actually chose</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {variationPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={variationPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {variationPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value} users`, 'Count']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-16">No consent data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Variation Breakdown List */}
            <Card>
              <CardHeader>
                <CardTitle>Variation Breakdown</CardTitle>
                <CardDescription>Detailed view of each consent combination</CardDescription>
              </CardHeader>
              <CardContent>
                {variations.length > 0 ? (
                  <div className="space-y-3">
                    {variations.map((v) => (
                      <div key={v.key} className="p-3 rounded-lg border border-border/60 bg-muted/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {v.key === 'accept-all' ? (
                              <ShieldCheck className="h-4 w-4 text-chart-2" />
                            ) : v.key === 'reject-all' ? (
                              <ShieldX className="h-4 w-4 text-destructive" />
                            ) : (
                              <SlidersHorizontal className="h-4 w-4 text-primary" />
                            )}
                            <span className="font-medium text-sm">{v.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold tabular-nums">{v.count}</span>
                            <Badge variant="secondary" className="text-[10px]">{v.percentage}%</Badge>
                          </div>
                        </div>
                        {/* Category pills */}
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            ✓ Necessary
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${v.categories.analytics ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground/40 line-through'}`}>
                            {v.categories.analytics ? '✓' : '✕'} Analytics
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${v.categories.functional ? 'bg-chart-2/15 text-chart-2' : 'bg-muted/50 text-muted-foreground/40 line-through'}`}>
                            {v.categories.functional ? '✓' : '✕'} Functional
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${v.categories.marketing ? 'bg-chart-3/15 text-chart-3' : 'bg-muted/50 text-muted-foreground/40 line-through'}`}>
                            {v.categories.marketing ? '✓' : '✕'} Marketing
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${v.percentage}%`,
                              backgroundColor: v.key === 'accept-all' ? 'hsl(var(--chart-2))' : v.key === 'reject-all' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No consent data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Acceptance %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Accept All vs Necessary Only vs Custom */}
            <Card>
              <CardHeader>
                <CardTitle>Decision Distribution</CardTitle>
                <CardDescription>Accept All vs Necessary Only vs Custom</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {(() => {
                  const acceptAll = variations.find(v => v.key === 'accept-all')?.count || 0;
                  const rejectAll = variations.find(v => v.key === 'reject-all')?.count || 0;
                  const custom = (stats?.total || 0) - acceptAll - rejectAll;
                  const pieData = [
                    { name: 'Accept All', value: acceptAll },
                    { name: 'Necessary Only', value: rejectAll },
                    { name: 'Custom', value: custom },
                  ].filter(d => d.value > 0);
                  return pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={['hsl(var(--chart-2))', 'hsl(var(--destructive))', 'hsl(var(--primary))'][i]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-16">No data</p>
                  );
                })()}
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
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
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
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${device.percentage}%` }} />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">{device.percentage}%</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-4">No device data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

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
                          <div className="h-full bg-chart-2 rounded-full transition-all" style={{ width: `${browser.percentage}%` }} />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">{browser.percentage}%</span>
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
                    {(() => {
                      const rejectAllPct = variations.find(v => v.key === 'reject-all')?.percentage || 0;
                      return rejectAllPct > 50 ? (
                        <div className="p-4 rounded-lg border border-red-500/50 bg-red-500/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-red-600">High Rejection Rate</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {rejectAllPct}% of users reject all optional cookies. Review your cookie descriptions
                            and consider reducing cookie categories to build trust.
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Not enough data to generate insights.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Behavior Summary</CardTitle>
                <CardDescription>Common consent patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats && stats.total > 0 ? (
                  <>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-1 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-chart-2" /> Full Consent Users
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {variations.find(v => v.key === 'accept-all')?.count || 0} users ({variations.find(v => v.key === 'accept-all')?.percentage || 0}%) accepted all cookies — your most engaged segment.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-1 flex items-center gap-2">
                        <ShieldX className="h-4 w-4 text-destructive" /> Privacy-Conscious Users
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {variations.find(v => v.key === 'reject-all')?.count || 0} users ({variations.find(v => v.key === 'reject-all')?.percentage || 0}%) accept only necessary cookies.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-1 flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-primary" /> Selective Users
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const acceptAll = variations.find(v => v.key === 'accept-all')?.count || 0;
                          const rejectAll = variations.find(v => v.key === 'reject-all')?.count || 0;
                          const custom = stats.total - acceptAll - rejectAll;
                          return `${custom} users (${Math.round((custom / stats.total) * 100)}%) customized their cookie preferences — they want control over specific categories.`;
                        })()}
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
