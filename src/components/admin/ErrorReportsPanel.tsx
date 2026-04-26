import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Bug, AlertCircle, Clock, TrendingUp, Download, Copy, Check, Sparkles, Loader2, X, Wand2, GitPullRequest, GitCommit, Undo2, FileCode, SkipForward, Filter } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, subDays, format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import ReactMarkdown from 'react-markdown';

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
  const [copied, setCopied] = useState(false);
  const [diagnosingId, setDiagnosingId] = useState<string | null>(null);
  const [diagnoses, setDiagnoses] = useState<Record<string, string>>({});
  const [autoFixing, setAutoFixing] = useState(false);
  const [autoFixProgress, setAutoFixProgress] = useState<{ current: number; total: number; log: string[] }>({ current: 0, total: 0, log: [] });
  const [fixMode, setFixMode] = useState<'pr' | 'direct'>('pr');
  // Track applied patches per error to enable undo
  const [appliedPatches, setAppliedPatches] = useState<Record<string, { patch_id: string; pr_url?: string | null; commit_sha?: string | null; mode: 'pr' | 'direct' }>>({});
  const [undoingId, setUndoingId] = useState<string | null>(null);
  // Per-error live status during Auto-Fix All
  type FixStatus = 'waiting' | 'proposing' | 'awaiting-approval' | 'applying' | 'succeeded' | 'failed' | 'skipped';
  const [fixStatuses, setFixStatuses] = useState<Record<string, { status: FixStatus; message?: string; pr_url?: string | null; commit_sha?: string | null }>>({});
  const setErrorStatus = (id: string, status: FixStatus, extra?: { message?: string; pr_url?: string | null; commit_sha?: string | null }) =>
    setFixStatuses(prev => ({ ...prev, [id]: { status, ...extra } }));

  // Auto-Fix target filters
  const [fixTypeFilter, setFixTypeFilter] = useState<string>('');
  const [fixSeverity, setFixSeverity] = useState<Record<string, boolean>>({
    critical: true, error: true, warning: true, info: false,
  });
  const [fixFilenamePattern, setFixFilenamePattern] = useState<string>('');

  const getAutoFixTargets = () => {
    const typeQ = fixTypeFilter.trim().toLowerCase();
    const fileQ = fixFilenamePattern.trim().toLowerCase();
    let fileRegex: RegExp | null = null;
    if (fileQ.startsWith('/') && fileQ.lastIndexOf('/') > 0) {
      try {
        const last = fileQ.lastIndexOf('/');
        fileRegex = new RegExp(fileQ.slice(1, last), fileQ.slice(last + 1) || 'i');
      } catch { fileRegex = null; }
    }
    return errors.filter(e => {
      if (e.status === 'resolved' || e.status === 'ignored') return false;
      if (!e.filename) return false;
      if (!fixSeverity[e.severity?.toLowerCase()]) return false;
      if (typeQ && !e.error_type.toLowerCase().includes(typeQ)) return false;
      if (fileQ) {
        const fn = e.filename.toLowerCase();
        if (fileRegex ? !fileRegex.test(fn) : !fn.includes(fileQ)) return false;
      }
      return true;
    });
  };
  // Per-patch approval prompt
  const [requireApproval, setRequireApproval] = useState(true);
  const [pendingPatch, setPendingPatch] = useState<null | {
    patch: { id: string; file_path: string; explanation: string; original_content: string | null; new_content: string };
    errorLabel: string;
    index: number;
    total: number;
  }>(null);
  const approvalResolverRef = useRef<((decision: 'approve' | 'skip' | 'abort') => void) | null>(null);

  const requestApproval = (info: NonNullable<typeof pendingPatch>) =>
    new Promise<'approve' | 'skip' | 'abort'>((resolve) => {
      approvalResolverRef.current = resolve;
      setPendingPatch(info);
    });

  const resolveApproval = (decision: 'approve' | 'skip' | 'abort') => {
    approvalResolverRef.current?.(decision);
    approvalResolverRef.current = null;
    setPendingPatch(null);
  };

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

  const diagnoseError = async (error: ErrorReport) => {
    setDiagnosingId(error.id);
    let content = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode: 'diagnose',
            errorContext: {
              error_type: error.error_type,
              error_message: error.error_message,
              stack_trace: error.stack_trace,
              filename: error.filename,
              line_number: error.line_number,
              column_number: error.column_number,
              occurrence_count: error.occurrence_count,
              severity: error.severity,
            },
            messages: [{ role: 'user', content: `Diagnose this error and suggest a fix: ${error.error_type}: ${error.error_message}` }],
          }),
        }
      );

      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const payload = await resp.json().catch(() => ({ error: 'Unknown error' }));
        if (payload?.error || payload?.ok === false) {
          throw new Error(payload.error || 'Failed to diagnose error');
        }
      }
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              setDiagnoses(prev => ({ ...prev, [error.id]: content }));
            }
          } catch { /* partial */ }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to diagnose error');
    } finally {
      setDiagnosingId(null);
    }
  };

  const autoFixAll = async () => {
    const targets = getAutoFixTargets();
    if (targets.length === 0) {
      toast.info('No errors match the current Auto-Fix filters.');
      return;
    }
    const modeLabel = fixMode === 'pr' ? 'open a PR' : 'commit directly to main';
    if (!confirm(`Auto-fix ${targets.length} error(s)? AI will ${modeLabel} for each.`)) return;

    setAutoFixing(true);
    setAutoFixProgress({ current: 0, total: targets.length, log: [] });

    let fixed = 0;
    let failed = 0;
    const append = (line: string) =>
      setAutoFixProgress(p => ({ ...p, log: [...p.log, line] }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      for (let i = 0; i < targets.length; i++) {
        const err = targets[i];
        setAutoFixProgress(p => ({ ...p, current: i + 1 }));
        const label = `${err.error_type}: ${err.error_message.slice(0, 60)}`;
        append(`▶ [${i + 1}/${targets.length}] ${label}`);

        try {
          const propRes = await supabase.functions.invoke('propose-code-fix', {
            body: { error_report_id: err.id },
          });
          if (propRes.error || propRes.data?.ok === false) {
            const msg = propRes.data?.error || propRes.error?.message || 'propose failed';
            append(`  ✗ propose: ${msg}`);
            failed++;
            continue;
          }
          const patchId = propRes.data?.patch?.id;
          if (!patchId) {
            append(`  ✗ no patch returned`);
            failed++;
            continue;
          }
          append(`  • proposed patch ${patchId.slice(0, 8)} → ${propRes.data.patch.file_path}`);

          if (requireApproval) {
            const decision = await requestApproval({
              patch: propRes.data.patch,
              errorLabel: label,
              index: i + 1,
              total: targets.length,
            });
            if (decision === 'skip') {
              append(`  ⊘ skipped by admin`);
              await supabase.from('ai_code_patches').update({ status: 'rejected' }).eq('id', patchId);
              continue;
            }
            if (decision === 'abort') {
              append(`  ■ aborted by admin`);
              await supabase.from('ai_code_patches').update({ status: 'rejected' }).eq('id', patchId);
              break;
            }
          }

          const applyRes = await supabase.functions.invoke('apply-code-fix', {
            body: { patch_id: patchId, mode: fixMode },
          });
          if (applyRes.error || applyRes.data?.ok === false) {
            const msg = applyRes.data?.error || applyRes.error?.message || 'apply failed';
            append(`  ✗ apply: ${msg}`);
            failed++;
            continue;
          }
          const result = fixMode === 'pr'
            ? `PR: ${applyRes.data?.pr_url || applyRes.data?.branch || 'opened'}`
            : `committed to main (${applyRes.data?.commit_sha?.slice(0, 7) || 'ok'})`;
          append(`  ✓ ${result}`);
          setAppliedPatches(prev => ({
            ...prev,
            [err.id]: {
              patch_id: patchId,
              pr_url: applyRes.data?.pr_url ?? null,
              commit_sha: applyRes.data?.commit_sha ?? null,
              mode: fixMode,
            },
          }));
          fixed++;
        } catch (e: any) {
          append(`  ✗ ${e.message || 'unknown error'}`);
          failed++;
        }
      }
      toast.success(`Auto-fix complete: ${fixed} fixed, ${failed} failed`);
      fetchErrors();
    } catch (e: any) {
      toast.error(e.message || 'Auto-fix aborted');
    } finally {
      setAutoFixing(false);
    }
  };

  /**
   * Undo a previously applied AI fix.
   * - PR mode: closes the PR and deletes the feature branch.
   * - Direct mode: writes a revert commit on main restoring original_content.
   * If we don't have an in-memory record of the patch, we look up the most
   * recent applied patch for this error_report_id.
   */
  const undoFix = async (errorId: string) => {
    setUndoingId(errorId);
    try {
      let patchId = appliedPatches[errorId]?.patch_id;
      if (!patchId) {
        const { data, error } = await supabase
          .from('ai_code_patches')
          .select('id')
          .eq('error_report_id', errorId)
          .eq('status', 'applied')
          .order('applied_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        patchId = data?.id;
      }
      if (!patchId) {
        toast.error('No applied AI fix found for this error.');
        return;
      }
      if (!confirm('Undo this AI fix? This will close the PR/delete branch (PR mode) or commit a revert to main (direct mode).')) return;

      const res = await supabase.functions.invoke('undo-code-fix', { body: { patch_id: patchId } });
      if (res.error || res.data?.ok === false) {
        throw new Error(res.data?.error || res.error?.message || 'Undo failed');
      }
      toast.success(res.data?.summary || 'Fix undone');
      setAppliedPatches(prev => {
        const next = { ...prev };
        delete next[errorId];
        return next;
      });
      fetchErrors();
    } catch (e: any) {
      toast.error(e.message || 'Failed to undo fix');
    } finally {
      setUndoingId(null);
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

  const handleCopyToClipboard = async () => {
    try {
      const exportData = {
        exported_at: new Date().toISOString(),
        total_errors: errors.length,
        total_occurrences: errors.reduce((sum, e) => sum + e.occurrence_count, 0),
        errors: errors.map(error => ({
          id: error.id,
          type: error.error_type,
          message: error.error_message,
          severity: error.severity,
          status: error.status,
          filename: error.filename,
          line_number: error.line_number,
          column_number: error.column_number,
          occurrence_count: error.occurrence_count,
          first_seen: error.first_seen_at,
          last_seen: error.last_seen_at,
          stack_trace: error.stack_trace,
        })),
      };

      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopied(true);
      toast.success("Error reports copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownloadJSON = () => {
    try {
      const exportData = {
        exported_at: new Date().toISOString(),
        total_errors: errors.length,
        total_occurrences: errors.reduce((sum, e) => sum + e.occurrence_count, 0),
        time_range: `Last ${timeRange} days`,
        errors: errors.map(error => ({
          id: error.id,
          type: error.error_type,
          message: error.error_message,
          severity: error.severity,
          status: error.status,
          filename: error.filename,
          line_number: error.line_number,
          column_number: error.column_number,
          occurrence_count: error.occurrence_count,
          first_seen: error.first_seen_at,
          last_seen: error.last_seen_at,
          stack_trace: error.stack_trace,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `error-reports-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Error reports downloaded!");
    } catch (error) {
      console.error("Failed to download:", error);
      toast.error("Failed to download error reports");
    }
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
        <div className="flex items-center gap-2">
          <Select value={fixMode} onValueChange={(v) => setFixMode(v as 'pr' | 'direct')} disabled={autoFixing}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pr">
                <span className="flex items-center gap-2"><GitPullRequest className="h-3.5 w-3.5" /> Open PR</span>
              </SelectItem>
              <SelectItem value="direct">
                <span className="flex items-center gap-2"><GitCommit className="h-3.5 w-3.5" /> Commit to main</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-background">
            <Switch
              id="require-approval"
              checked={requireApproval}
              onCheckedChange={setRequireApproval}
              disabled={autoFixing}
            />
            <Label htmlFor="require-approval" className="text-xs cursor-pointer whitespace-nowrap">
              Approve each fix
            </Label>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={autoFixing} className="gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Filters
                {(() => {
                  const matched = getAutoFixTargets().length;
                  return <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{matched}</Badge>;
                })()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-1">Auto-Fix target filters</p>
                  <p className="text-xs text-muted-foreground">Limit which unresolved errors get auto-fixed.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fix-type" className="text-xs">Error type contains</Label>
                  <Input
                    id="fix-type"
                    placeholder="e.g. TypeError, RUNTIME_ERROR"
                    value={fixTypeFilter}
                    onChange={(e) => setFixTypeFilter(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Severity</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['critical', 'error', 'warning', 'info'] as const).map(sev => (
                      <label key={sev} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={!!fixSeverity[sev]}
                          onCheckedChange={(v) => setFixSeverity(s => ({ ...s, [sev]: !!v }))}
                        />
                        <span className="capitalize">{sev}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fix-file" className="text-xs">
                    Filename pattern <span className="text-muted-foreground">(substring or /regex/i)</span>
                  </Label>
                  <Input
                    id="fix-file"
                    placeholder="e.g. components/admin or /\.tsx$/i"
                    value={fixFilenamePattern}
                    onChange={(e) => setFixFilenamePattern(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setFixTypeFilter('');
                      setFixFilenamePattern('');
                      setFixSeverity({ critical: true, error: true, warning: true, info: false });
                    }}
                  >
                    Reset
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {getAutoFixTargets().length} match{getAutoFixTargets().length === 1 ? '' : 'es'}
                  </span>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="default"
            size="sm"
            onClick={autoFixAll}
            disabled={autoFixing}
            className="gap-2"
          >
            {autoFixing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fixing {autoFixProgress.current}/{autoFixProgress.total}
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Auto-Fix All
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyToClipboard}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy JSON
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJSON}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download JSON
          </Button>
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
      </div>

      {(autoFixing || autoFixProgress.log.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Auto-Fix Progress ({autoFixProgress.current}/{autoFixProgress.total}) — {fixMode === 'pr' ? 'PR mode' : 'Direct commit to main'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 rounded border bg-muted/30 p-3">
              <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {autoFixProgress.log.join('\n') || 'Starting…'}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

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
                        {/* AI Diagnosis */}
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={diagnosingId === error.id}
                            onClick={() => diagnoseError(error)}
                          >
                            {diagnosingId === error.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                            )}
                            {diagnosingId === error.id ? 'Diagnosing…' : 'AI Diagnose'}
                          </Button>
                          {(appliedPatches[error.id] || error.status === 'resolved') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              disabled={undoingId === error.id}
                              onClick={() => undoFix(error.id)}
                              title="Undo the most recent AI fix for this error"
                            >
                              {undoingId === error.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Undo2 className="h-3.5 w-3.5" />
                              )}
                              {undoingId === error.id ? 'Undoing…' : 'Undo AI Fix'}
                            </Button>
                          )}
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

                        {/* Diagnosis result */}
                        {diagnoses[error.id] && (
                          <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => setDiagnoses(prev => {
                                const next = { ...prev };
                                delete next[error.id];
                                return next;
                              })}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <div className="flex items-center gap-1.5 mb-2">
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI Diagnosis</span>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&_pre]:bg-background [&_pre]:border [&_pre]:text-xs [&_code]:text-xs">
                              <ReactMarkdown>{diagnoses[error.id]}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog
        open={!!pendingPatch}
        onOpenChange={(open) => { if (!open) resolveApproval('skip'); }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-primary" />
              Approve AI fix {pendingPatch ? `(${pendingPatch.index}/${pendingPatch.total})` : ''}
            </DialogTitle>
            <DialogDescription className="line-clamp-2">
              {pendingPatch?.errorLabel}
            </DialogDescription>
          </DialogHeader>

          {pendingPatch && (() => {
            const { patch } = pendingPatch;
            const oldLines = (patch.original_content ?? '').split('\n').length;
            const newLines = patch.new_content.split('\n').length;
            const delta = newLines - oldLines;
            return (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="font-mono">{patch.file_path}</Badge>
                  <Badge variant="outline">{oldLines} → {newLines} lines</Badge>
                  <Badge
                    variant="outline"
                    className={delta > 0 ? 'text-emerald-500 border-emerald-500/30' : delta < 0 ? 'text-red-500 border-red-500/30' : ''}
                  >
                    {delta > 0 ? `+${delta}` : delta} net
                  </Badge>
                  <Badge variant="outline">
                    Will {fixMode === 'pr' ? 'open PR' : 'commit to main'}
                  </Badge>
                </div>

                <div className="rounded-md border bg-muted/30 p-3 max-h-32 overflow-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Explanation</p>
                  <p className="text-xs whitespace-pre-wrap">{patch.explanation}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[300px]">
                  <ScrollArea className="border rounded-md">
                    <div className="p-2">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase">Original</p>
                      <pre className="text-[10px] leading-relaxed whitespace-pre-wrap font-mono">
                        {patch.original_content || '(no original snapshot)'}
                      </pre>
                    </div>
                  </ScrollArea>
                  <ScrollArea className="border rounded-md border-emerald-500/30">
                    <div className="p-2">
                      <p className="text-[10px] font-semibold text-emerald-500 mb-1 uppercase">Proposed</p>
                      <pre className="text-[10px] leading-relaxed whitespace-pre-wrap font-mono">
                        {patch.new_content}
                      </pre>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => resolveApproval('abort')}>
              Abort all
            </Button>
            <Button variant="outline" onClick={() => resolveApproval('skip')} className="gap-1.5">
              <SkipForward className="h-3.5 w-3.5" /> Skip
            </Button>
            <Button onClick={() => resolveApproval('approve')} className="gap-1.5">
              <Check className="h-3.5 w-3.5" /> Approve & apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
