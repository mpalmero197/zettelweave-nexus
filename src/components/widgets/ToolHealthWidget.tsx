import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface LatestTest {
  id: string;
  created_at: string;
  total_tests: number;
  passed: number;
  failed: number;
  duration_ms: number;
  triggered_by: string;
}

export function ToolHealthWidget() {
  const [latestTest, setLatestTest] = useState<LatestTest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestTest();
  }, []);

  const fetchLatestTest = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('tool_test_history' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single() as any);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching latest test:', error);
      } else {
        setLatestTest(data);
      }
    } catch (err) {
      console.error('Failed to fetch latest test:', err);
    } finally {
      setLoading(false);
    }
  };

  const passRate = latestTest 
    ? Math.round((latestTest.passed / latestTest.total_tests) * 100) 
    : 0;

  const getHealthStatus = () => {
    if (!latestTest) return { label: 'No Data', color: 'secondary' as const };
    if (latestTest.failed === 0) return { label: 'Healthy', color: 'default' as const };
    if (passRate >= 90) return { label: 'Minor Issues', color: 'outline' as const };
    if (passRate >= 70) return { label: 'Degraded', color: 'secondary' as const };
    return { label: 'Critical', color: 'destructive' as const };
  };

  const status = getHealthStatus();

  if (loading) {
    return (
      <Card className="glass-card shadow-material-2">
        <CardContent className="p-6 flex items-center justify-center h-[180px]">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            System Health
          </CardTitle>
          <Badge variant={status.color}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {latestTest ? (
          <div className="space-y-4">
            {/* Pass Rate Circle */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted/30"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${passRate * 0.94} 100`}
                    strokeLinecap="round"
                    className={latestTest.failed === 0 ? 'text-green-500' : passRate >= 90 ? 'text-yellow-500' : 'text-destructive'}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                  {passRate}%
                </span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Passed:</span>
                  <span className="font-semibold">{latestTest.passed}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-semibold">{latestTest.failed}</span>
                </div>
              </div>
            </div>

            {/* Last Test Info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(latestTest.created_at), 'MMM d, h:mm a')}
              </div>
              <div>
                {latestTest.duration_ms}ms
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No test results yet</p>
            <p className="text-xs mt-1">Run a system test from Admin &gt; Tools</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
