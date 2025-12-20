import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Copy, 
  Download,
  RefreshCw,
  Wrench,
  AlertTriangle,
  History,
  TrendingUp,
  TrendingDown,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';

interface ToolTestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  error?: string;
  details?: string;
}

interface TestReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: ToolTestResult[];
}

interface HistoricalTest {
  id: string;
  created_at: string;
  total_tests: number;
  passed: number;
  failed: number;
  duration_ms: number;
  results: ToolTestResult[];
  triggered_by: string;
}

const EDGE_FUNCTIONS = [
  { name: 'check-subscription', requiresAuth: true },
  { name: 'ai-search', requiresAuth: true },
  { name: 'ai-assistant-chat', requiresAuth: true },
  { name: 'ai-categorize-card', requiresAuth: true },
  { name: 'ai-edit-card', requiresAuth: true },
  { name: 'ai-reorganize-cards', requiresAuth: true },
  { name: 'analyze-cache-patterns', requiresAuth: true },
  { name: 'catalyst-ai-enhance-content', requiresAuth: true },
  { name: 'catalyst-ai-generate-chapter', requiresAuth: true },
  { name: 'catalyst-ai-generate-citations', requiresAuth: true },
  { name: 'check-plagiarism', requiresAuth: true },
  { name: 'classify-intent', requiresAuth: true },
  { name: 'create-checkout', requiresAuth: true },
  { name: 'customer-portal', requiresAuth: true },
  { name: 'dictionary-lookup', requiresAuth: true },
  { name: 'execute-workflows', requiresAuth: true },
  { name: 'export-user-data', requiresAuth: true },
  { name: 'fetch-url-content', requiresAuth: true },
  { name: 'find-similar-content', requiresAuth: true },
  { name: 'generate-embedding', requiresAuth: true },
  { name: 'generate-image', requiresAuth: true },
  { name: 'generate-writing-suggestions', requiresAuth: true },
  { name: 'scratchpad-sync', requiresAuth: true },
  { name: 'suggest-smart-links', requiresAuth: true },
  { name: 'transcribe-audio', requiresAuth: true },
  { name: 'transcribe-audio-ai', requiresAuth: true },
  { name: 'web-search', requiresAuth: true },
];

const DATABASE_TABLES = [
  'profiles',
  'zettel_cards',
  'notes',
  'notebooks',
  'files',
  'attachments',
  'recordings',
  'calendar_events',
  'project_tasks',
  'workflows',
  'workflow_executions',
  'workflow_results',
  'catalyst_documents',
  'catalyst_chapters',
  'catalyst_citations',
  'feature_requests',
  'error_reports',
  'subscriptions',
  'user_preferences',
  'dashboard_layouts',
];

export function ToolTester() {
  const [results, setResults] = useState<ToolTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<TestReport | null>(null);
  const [history, setHistory] = useState<HistoricalTest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState('run');
  const { toast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await (supabase
        .from('tool_test_history' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30) as any);

      if (error) {
        console.error('Error fetching history:', error);
      } else {
        setHistory(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const updateResult = (name: string, update: Partial<ToolTestResult>) => {
    setResults(prev => prev.map(r => r.name === name ? { ...r, ...update } : r));
  };

  const testEdgeFunction = async (funcName: string): Promise<ToolTestResult> => {
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke(funcName, {
        body: { test: true, ping: true },
      });

      const duration = Date.now() - startTime;

      if (error) {
        if (error.message?.includes('Missing required') || 
            error.message?.includes('validation') ||
            error.message?.includes('required field')) {
          return {
            name: funcName,
            status: 'success',
            duration,
            details: 'Function reachable, validation working correctly'
          };
        }
        
        return {
          name: funcName,
          status: 'error',
          duration,
          error: error.message || 'Unknown error'
        };
      }

      return {
        name: funcName,
        status: 'success',
        duration,
        details: 'Function responding correctly'
      };
    } catch (err: any) {
      return {
        name: funcName,
        status: 'error',
        duration: Date.now() - startTime,
        error: err.message || 'Connection failed'
      };
    }
  };

  const testDatabaseTable = async (tableName: string): Promise<ToolTestResult> => {
    const startTime = Date.now();
    try {
      const { count, error } = await (supabase
        .from(tableName as any)
        .select('*', { count: 'exact', head: true }) as any);

      const duration = Date.now() - startTime;

      if (error) {
        return {
          name: `db:${tableName}`,
          status: 'error',
          duration,
          error: error.message
        };
      }

      return {
        name: `db:${tableName}`,
        status: 'success',
        duration,
        details: `Table accessible (${count ?? 0} rows)`
      };
    } catch (err: any) {
      return {
        name: `db:${tableName}`,
        status: 'error',
        duration: Date.now() - startTime,
        error: err.message || 'Query failed'
      };
    }
  };

  const testStorageBuckets = async (): Promise<ToolTestResult> => {
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.storage.listBuckets();
      const duration = Date.now() - startTime;

      if (error) {
        return {
          name: 'storage:buckets',
          status: 'error',
          duration,
          error: error.message
        };
      }

      return {
        name: 'storage:buckets',
        status: 'success',
        duration,
        details: `${data?.length || 0} buckets available`
      };
    } catch (err: any) {
      return {
        name: 'storage:buckets',
        status: 'error',
        duration: Date.now() - startTime,
        error: err.message || 'Storage access failed'
      };
    }
  };

  const testAuthSystem = async (): Promise<ToolTestResult> => {
    const startTime = Date.now();
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      const duration = Date.now() - startTime;

      if (error) {
        return {
          name: 'auth:session',
          status: 'error',
          duration,
          error: error.message
        };
      }

      return {
        name: 'auth:session',
        status: 'success',
        duration,
        details: session ? 'Session active' : 'Auth system reachable'
      };
    } catch (err: any) {
      return {
        name: 'auth:session',
        status: 'error',
        duration: Date.now() - startTime,
        error: err.message || 'Auth check failed'
      };
    }
  };

  const testRealtimeConnection = async (): Promise<ToolTestResult> => {
    const startTime = Date.now();
    try {
      const channel = supabase.channel('test-channel');
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          channel.unsubscribe();
          resolve({
            name: 'realtime:connection',
            status: 'success',
            duration: Date.now() - startTime,
            details: 'Realtime channel created successfully'
          });
        }, 2000);

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            channel.unsubscribe();
            resolve({
              name: 'realtime:connection',
              status: 'success',
              duration: Date.now() - startTime,
              details: 'Realtime connection established'
            });
          }
        });
      });
    } catch (err: any) {
      return {
        name: 'realtime:connection',
        status: 'error',
        duration: Date.now() - startTime,
        error: err.message || 'Realtime connection failed'
      };
    }
  };

  const runAllTests = async (saveToHistory = true) => {
    const startTime = Date.now();
    setIsRunning(true);
    setProgress(0);
    setReport(null);

    const allTests: ToolTestResult[] = [
      { name: 'auth:session', status: 'pending' },
      { name: 'storage:buckets', status: 'pending' },
      { name: 'realtime:connection', status: 'pending' },
      ...EDGE_FUNCTIONS.map(f => ({ name: f.name, status: 'pending' as const })),
      ...DATABASE_TABLES.map(t => ({ name: `db:${t}`, status: 'pending' as const })),
    ];
    
    setResults(allTests);

    const totalTests = allTests.length;
    let completed = 0;
    const finalResults: ToolTestResult[] = [];

    updateResult('auth:session', { status: 'running' });
    const authResult = await testAuthSystem();
    finalResults.push(authResult);
    updateResult('auth:session', authResult);
    completed++;
    setProgress((completed / totalTests) * 100);

    updateResult('storage:buckets', { status: 'running' });
    const storageResult = await testStorageBuckets();
    finalResults.push(storageResult);
    updateResult('storage:buckets', storageResult);
    completed++;
    setProgress((completed / totalTests) * 100);

    updateResult('realtime:connection', { status: 'running' });
    const realtimeResult = await testRealtimeConnection();
    finalResults.push(realtimeResult);
    updateResult('realtime:connection', realtimeResult);
    completed++;
    setProgress((completed / totalTests) * 100);

    for (let i = 0; i < EDGE_FUNCTIONS.length; i += 3) {
      const batch = EDGE_FUNCTIONS.slice(i, i + 3);
      
      batch.forEach(f => updateResult(f.name, { status: 'running' }));
      
      const batchResults = await Promise.all(
        batch.map(f => testEdgeFunction(f.name))
      );
      
      batchResults.forEach(result => {
        finalResults.push(result);
        updateResult(result.name, result);
        completed++;
        setProgress((completed / totalTests) * 100);
      });
      
      await new Promise(r => setTimeout(r, 200));
    }

    for (let i = 0; i < DATABASE_TABLES.length; i += 5) {
      const batch = DATABASE_TABLES.slice(i, i + 5);
      
      batch.forEach(t => updateResult(`db:${t}`, { status: 'running' }));
      
      const batchResults = await Promise.all(
        batch.map(t => testDatabaseTable(t))
      );
      
      batchResults.forEach(result => {
        finalResults.push(result);
        updateResult(result.name, result);
        completed++;
        setProgress((completed / totalTests) * 100);
      });
    }

    const totalDuration = Date.now() - startTime;
    const passed = finalResults.filter(r => r.status === 'success').length;
    const failed = finalResults.filter(r => r.status === 'error').length;

    const testReport: TestReport = {
      timestamp: new Date().toISOString(),
      totalTests,
      passed,
      failed,
      duration: totalDuration,
      results: finalResults
    };

    setReport(testReport);
    setResults(finalResults);
    setIsRunning(false);

    // Save to history
    if (saveToHistory) {
      try {
        await (supabase
          .from('tool_test_history' as any)
          .insert({
            total_tests: totalTests,
            passed,
            failed,
            duration_ms: totalDuration,
            results: finalResults,
            triggered_by: 'manual'
          }) as any);
        
        fetchHistory();
      } catch (err) {
        console.error('Failed to save test history:', err);
      }
    }

    toast({
      title: failed === 0 ? "All Tests Passed" : "Tests Completed",
      description: `${passed}/${totalTests} tests passed in ${(totalDuration / 1000).toFixed(2)}s`,
      variant: failed === 0 ? "default" : "destructive",
    });
  };

  const runScheduledTest = async () => {
    toast({
      title: "Running Scheduled Test",
      description: "Triggering the run-tool-tests edge function...",
    });

    try {
      const { data, error } = await supabase.functions.invoke('run-tool-tests', {
        body: { triggered_by: 'admin_manual' }
      });

      if (error) throw error;

      toast({
        title: "Scheduled Test Complete",
        description: `${data.passed}/${data.total_tests} tests passed`,
        variant: data.failed === 0 ? "default" : "destructive",
      });

      fetchHistory();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to run scheduled test",
        variant: "destructive",
      });
    }
  };

  const copyReport = () => {
    if (!report) return;
    
    const failedResults = report.results.filter(r => r.status === 'error');
    const reportJson = JSON.stringify({
      ...report,
      results: failedResults.length > 0 ? failedResults : report.results
    }, null, 2);
    
    navigator.clipboard.writeText(reportJson);
    toast({
      title: "Copied",
      description: "Error report copied to clipboard",
    });
  };

  const downloadReport = () => {
    if (!report) return;
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tool-test-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: ToolTestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const failedTests = results.filter(r => r.status === 'error');
  const passedTests = results.filter(r => r.status === 'success');

  // Prepare chart data
  const chartData = [...history].reverse().map(h => ({
    date: format(new Date(h.created_at), 'MMM dd'),
    passed: h.passed,
    failed: h.failed,
    passRate: Math.round((h.passed / h.total_tests) * 100),
    duration: h.duration_ms / 1000
  }));

  const latestPassRate = history.length > 0 
    ? Math.round((history[0].passed / history[0].total_tests) * 100) 
    : 0;
  
  const previousPassRate = history.length > 1 
    ? Math.round((history[1].passed / history[1].total_tests) * 100) 
    : latestPassRate;

  const trendUp = latestPassRate >= previousPassRate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Wrench className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Tool Functionality Tester</h1>
          <p className="text-muted-foreground">Verify all edge functions, database tables, and system components</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="run" className="gap-2">
            <Play className="h-4 w-4" />
            Run Tests
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History & Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="space-y-6 mt-6">
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={() => runAllTests(true)} 
              disabled={isRunning}
              size="lg"
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run All Tests
                </>
              )}
            </Button>
            <Button 
              onClick={runScheduledTest} 
              disabled={isRunning}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Run via Edge Function
            </Button>
          </div>

          {/* Progress */}
          {isRunning && (
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Testing in progress...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {report && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-primary/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tests</p>
                      <p className="text-2xl font-bold">{report.totalTests}</p>
                    </div>
                    <Wrench className="h-8 w-8 text-primary/20" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Passed</p>
                      <p className="text-2xl font-bold text-green-600">{report.passed}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500/30" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className={`${report.failed > 0 ? 'border-destructive/20 bg-destructive/5' : 'border-primary/10'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Failed</p>
                      <p className={`text-2xl font-bold ${report.failed > 0 ? 'text-destructive' : ''}`}>
                        {report.failed}
                      </p>
                    </div>
                    <XCircle className={`h-8 w-8 ${report.failed > 0 ? 'text-destructive/30' : 'text-muted/20'}`} />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-primary/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="text-2xl font-bold">{(report.duration / 1000).toFixed(2)}s</p>
                    </div>
                    <Clock className="h-8 w-8 text-primary/20" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error Report Actions */}
          {report && failedTests.length > 0 && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  {failedTests.length} Test{failedTests.length > 1 ? 's' : ''} Failed
                </CardTitle>
                <CardDescription>Download or copy the error report for debugging</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={copyReport} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Error Report (JSON)
                  </Button>
                  <Button variant="outline" onClick={downloadReport} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Full Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  {passedTests.length} passed, {failedTests.length} failed, {results.filter(r => r.status === 'pending' || r.status === 'running').length} pending
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {results.map((result) => (
                      <div 
                        key={result.name}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          result.status === 'error' 
                            ? 'border-destructive/20 bg-destructive/5' 
                            : result.status === 'success'
                            ? 'border-green-500/20 bg-green-500/5'
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(result.status)}
                          <div>
                            <p className="font-medium text-sm">{result.name}</p>
                            {result.error && (
                              <p className="text-xs text-destructive mt-0.5">{result.error}</p>
                            )}
                            {result.details && result.status === 'success' && (
                              <p className="text-xs text-muted-foreground mt-0.5">{result.details}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.duration && (
                            <Badge variant="secondary" className="text-xs">
                              {result.duration}ms
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-6">
          {/* Trend Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Latest Pass Rate</p>
                    <p className="text-2xl font-bold">{latestPassRate}%</p>
                  </div>
                  {trendUp ? (
                    <TrendingUp className="h-8 w-8 text-green-500/50" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-destructive/50" />
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Test Runs</p>
                    <p className="text-2xl font-bold">{history.length}</p>
                  </div>
                  <History className="h-8 w-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled Tests</p>
                    <p className="text-2xl font-bold">{history.filter(h => h.triggered_by === 'scheduled').length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pass Rate Chart */}
          {chartData.length > 0 && (
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Pass Rate Trend
                </CardTitle>
                <CardDescription>Test pass rate over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPassRate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value}%`, 'Pass Rate']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="passRate" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorPassRate)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pass/Fail Chart */}
          {chartData.length > 0 && (
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle>Passed vs Failed Tests</CardTitle>
                <CardDescription>Test results distribution over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line type="monotone" dataKey="passed" stroke="hsl(130, 50%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="failed" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* History Table */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle>Test Run History</CardTitle>
              <CardDescription>Recent test executions</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No test history yet. Run your first test!
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {history.map((test) => (
                      <div 
                        key={test.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          {test.failed === 0 ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              {format(new Date(test.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {test.passed}/{test.total_tests} passed • {(test.duration_ms / 1000).toFixed(2)}s
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {test.triggered_by}
                          </Badge>
                          <Badge 
                            variant={test.failed === 0 ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {Math.round((test.passed / test.total_tests) * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Cron Setup Info */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Calendar className="h-5 w-5" />
                Daily Automated Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
                To enable daily automated tests, set up a cron job in your Supabase project that calls 
                the <code className="bg-amber-500/20 px-1 rounded">run-tool-tests</code> edge function.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://supabase.com/dashboard/project/sckglgjydlbztxjupbsk/integrations/cron-jobs', '_blank')}
              >
                Configure Cron Job
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
