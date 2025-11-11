import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Bug, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, subDays, format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ErrorReport {
  id: string;
  error_type: string;
  error_message: string;
  stack_trace: string | null;
  filename: string | null;
  line_number: number | null;
  column_number: number | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  status: string;
  severity: string;
}

export function ErrorReportsPanel() {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<number>(7);

  useEffect(() => {
    fetchErrors();
  }, []);

  const fetchErrors = async () => {
    try {
      const { data, error } = await supabase
        .from("error_reports")
        .select("*")
        .order("last_seen_at", { ascending: false });

      if (error) throw error;
      setErrors(data || []);
    } catch (error) {
      console.error("Error fetching error reports:", error);
      toast.error("Failed to load error reports");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("error_reports")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success("Status updated");
      fetchErrors();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "warn":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Bug className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      error: "destructive",
      warn: "secondary",
      info: "default",
    };
    return <Badge variant={variants[severity] || "default"}>{severity}</Badge>;
  };

  // Analytics calculations
  const getErrorTrend = () => {
    const days = timeRange;
    const trendData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM dd');
      const dayErrors = errors.filter(e => {
        const errorDate = new Date(e.last_seen_at);
        return format(errorDate, 'MMM dd') === dateStr;
      });
      
      trendData.push({
        date: dateStr,
        count: dayErrors.reduce((sum, e) => sum + e.occurrence_count, 0),
        unique: dayErrors.length
      });
    }
    
    return trendData;
  };

  const getTopErrors = () => {
    return [...errors]
      .sort((a, b) => b.occurrence_count - a.occurrence_count)
      .slice(0, 5)
      .map(e => ({
        name: e.error_type.length > 30 ? e.error_type.substring(0, 30) + '...' : e.error_type,
        count: e.occurrence_count
      }));
  };

  const getSeverityDistribution = () => {
    const distribution = errors.reduce((acc, e) => {
      acc[e.severity] = (acc[e.severity] || 0) + e.occurrence_count;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([name, value]) => ({
      name: name.toUpperCase(),
      value
    }));
  };

  const getErrorsByLocation = () => {
    const locationMap = errors.reduce((acc, e) => {
      const location = e.filename || 'Unknown';
      if (!acc[location]) {
        acc[location] = { location, count: 0, errors: [] };
      }
      acc[location].count += e.occurrence_count;
      acc[location].errors.push(e);
      return acc;
    }, {} as Record<string, { location: string; count: number; errors: ErrorReport[] }>);

    return Object.values(locationMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const COLORS = ['hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Error Analytics</h3>
        </div>
        <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errors.filter((e) => e.status === "new").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Occurrences</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errors.reduce((sum, e) => sum + e.occurrence_count, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errors.filter((e) => e.status === "resolved").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Error Trend</CardTitle>
            <CardDescription>Error occurrences over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getErrorTrend()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--destructive))" name="Total Errors" strokeWidth={2} />
                <Line type="monotone" dataKey="unique" stroke="hsl(var(--primary))" name="Unique Errors" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Errors</CardTitle>
            <CardDescription>Most frequent errors by occurrence count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={getTopErrors()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" width={150} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
            <CardDescription>Errors grouped by severity level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={getSeverityDistribution()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {getSeverityDistribution().map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Patterns</CardTitle>
            <CardDescription>Key insights and statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Avg errors per day</span>
              <span className="font-semibold">
                {(errors.reduce((sum, e) => sum + e.occurrence_count, 0) / timeRange).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Most active error type</span>
              <span className="font-semibold text-sm">
                {getTopErrors()[0]?.name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Error resolution rate</span>
              <span className="font-semibold">
                {errors.length > 0 
                  ? `${((errors.filter(e => e.status === 'resolved').length / errors.length) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Needs attention</span>
              <Badge variant="destructive">
                {errors.filter(e => e.status === 'new' && e.severity === 'error').length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Location Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Errors by Location</CardTitle>
          <CardDescription>Component/file breakdown showing problematic areas of codebase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getErrorsByLocation().map((location, index) => (
              <Collapsible key={index}>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {location.location}
                        </code>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-muted-foreground">
                            {location.count} occurrence{location.count > 1 ? 's' : ''}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {location.errors.length} unique error{location.errors.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="ml-4 pl-4 mt-2 border-l-2 border-border space-y-2">
                    {location.errors.map((error) => (
                      <div key={error.id} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getSeverityIcon(error.severity)}
                              <span className="font-medium text-sm">{error.error_type}</span>
                              {getSeverityBadge(error.severity)}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {error.error_message}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>{error.occurrence_count} times</span>
                              <span>
                                {formatDistanceToNow(new Date(error.last_seen_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <Badge variant={error.status === 'resolved' ? 'default' : 'secondary'}>
                            {error.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
            {getErrorsByLocation().length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No error location data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Reports</CardTitle>
          <CardDescription>
            Automatically collected error reports with deduplication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {errors.map((error) => (
                <Collapsible key={error.id}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getSeverityIcon(error.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base">{error.error_type}</CardTitle>
                              {getSeverityBadge(error.severity)}
                            </div>
                            <CardDescription className="line-clamp-2">
                              {error.error_message}
                            </CardDescription>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>
                                Occurred {error.occurrence_count} time
                                {error.occurrence_count > 1 ? "s" : ""}
                              </span>
                              <span>
                                Last seen{" "}
                                {formatDistanceToNow(new Date(error.last_seen_at), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="space-y-3 border-t pt-4">
                        {error.filename && (
                          <div className="text-sm">
                            <span className="font-medium">Location: </span>
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {error.filename}
                              {error.line_number && `:${error.line_number}`}
                              {error.column_number && `:${error.column_number}`}
                            </code>
                          </div>
                        )}
                        {error.stack_trace && (
                          <div className="text-sm">
                            <span className="font-medium mb-2 block">Stack Trace:</span>
                            <ScrollArea className="h-32">
                              <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">
                                {error.stack_trace}
                              </pre>
                            </ScrollArea>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2">
                          <Select
                            value={error.status}
                            onValueChange={(value) => updateStatus(error.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="investigating">Investigating</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="ignored">Ignored</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
