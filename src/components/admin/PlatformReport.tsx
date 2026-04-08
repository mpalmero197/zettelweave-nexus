import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminSectionHeader } from './AdminSectionHeader';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileSearch, Play, Clock, Copy, FileJson, Loader2 } from 'lucide-react';

interface ReportData {
  text: string;
  json: Record<string, unknown> | null;
  telemetry: Record<string, unknown>;
  generated_at: string;
}

export function PlatformReport() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduleTime, setScheduleTime] = useState(
    () => localStorage.getItem('platform-report-schedule') || '18:00'
  );
  const { toast } = useToast();

  const runReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('platform-report');
      if (error) throw error;
      setReport(data as ReportData);
      toast({ title: 'Report generated', description: 'Platform analysis complete.' });
    } catch (err: any) {
      toast({
        title: 'Report failed',
        description: err.message || 'Could not generate platform report.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyText = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report.text);
    toast({ title: 'Copied', description: 'Report copied as text.' });
  };

  const copyJson = async () => {
    if (!report?.json) {
      toast({ title: 'No JSON', description: 'JSON summary not available in this report.', variant: 'destructive' });
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(report.json, null, 2));
    toast({ title: 'Copied', description: 'Report copied as JSON.' });
  };

  const saveSchedule = () => {
    localStorage.setItem('platform-report-schedule', scheduleTime);
    toast({ title: 'Schedule saved', description: `Report scheduled for ${scheduleTime} CT (visual only — cron job runs at preset time).` });
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={FileSearch}
        title="Platform Report"
        description="AI-powered analysis of Pendragon's features, gaps, and improvement recommendations"
        actions={
          <Button onClick={runReport} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? 'Analyzing…' : 'Run Report'}
          </Button>
        }
      />

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Auto-Run Schedule
          </CardTitle>
          <CardDescription>Set when the platform report runs automatically (Central Time)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-time">Time (CT)</Label>
              <Input
                id="schedule-time"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-36"
              />
            </div>
            <Button variant="outline" size="sm" onClick={saveSchedule}>
              Save Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Output */}
      {loading && (
        <Card className="border-primary/20">
          <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing platform features, telemetry, and architecture…</p>
          </CardContent>
        </Card>
      )}

      {report && !loading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm">Report — {new Date(report.generated_at).toLocaleDateString('en-US')}</CardTitle>
                <CardDescription>Generated {new Date(report.generated_at).toLocaleTimeString()}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyText} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  Copy Text
                </Button>
                <Button variant="outline" size="sm" onClick={copyJson} className="gap-1.5">
                  <FileJson className="h-3.5 w-3.5" />
                  Copy JSON
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={report.text}
              className="min-h-[400px] font-mono text-xs leading-relaxed resize-y"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
