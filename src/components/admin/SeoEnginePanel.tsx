import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Sparkles,
  Play,
  RotateCcw,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Settings {
  enabled: boolean;
  categories: Record<string, boolean>;
  max_auto_per_run: number;
  max_queued_per_run: number;
  last_run_at: string | null;
  next_scheduled_at: string | null;
}

interface Run {
  id: string;
  started_at: string;
  finished_at: string | null;
  techniques_found: number;
  applied_count: number;
  queued_count: number;
  skipped_count: number;
  status: string;
  error: string | null;
  triggered_by: string;
}

interface Technique {
  id: string;
  title: string;
  description: string;
  source_url: string | null;
  category: string;
  classification: string;
  confidence: number | null;
  applied_at: string;
}

interface ChangeLog {
  id: string;
  applied_technique_id: string | null;
  table_name: string;
  row_id: string | null;
  before_data: any;
  after_data: any;
  reverted_at: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  meta_tags: "Meta tags",
  jsonld: "JSON-LD schemas",
  llms_txt: "llms.txt content",
  sitemap: "Sitemap entries",
  faq: "FAQ entries",
  robots: "Robots directives",
};

export function SeoEnginePanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [changes, setChanges] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, t, c] = await Promise.all([
        supabase.from("seo_engine_settings").select("*").eq("id", 1).single(),
        supabase.from("seo_improvement_runs").select("*").order("started_at", { ascending: false }).limit(20),
        supabase.from("seo_applied_techniques").select("*").order("applied_at", { ascending: false }).limit(50),
        supabase.from("seo_change_log").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      setSettings(s.data as Settings);
      setRuns((r.data ?? []) as Run[]);
      setTechniques((t.data ?? []) as Technique[]);
      setChanges((c.data ?? []) as ChangeLog[]);
    } catch (e) {
      toast.error("Failed to load engine data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateSettings = async (patch: Partial<Settings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error } = await supabase.from("seo_engine_settings").update(patch).eq("id", 1);
    if (error) {
      toast.error("Failed to save settings");
      load();
    }
  };

  const toggleCategory = (key: string, value: boolean) => {
    if (!settings) return;
    updateSettings({ categories: { ...settings.categories, [key]: value } });
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-aeo-self-improve", {
        headers: { "x-triggered-by": "manual" },
      });
      if (error) {
        // Try to surface upstream details from the function response body
        const detail = (data as any)?.error || (data as any)?.detail || error.message;
        throw new Error(detail);
      }
      if ((data as any)?.error) {
        throw new Error((data as any).error + ((data as any).detail ? ` — ${(data as any).detail}` : ""));
      }
      toast.success(
        `Run complete — found ${data?.techniques_found ?? 0}, applied ${data?.applied ?? 0}, queued ${data?.queued ?? 0}`,
      );
      load();
    } catch (e: any) {
      toast.error(`Run failed: ${e?.message ?? e}`);
    } finally {
      setRunning(false);
    }
  };

  const revertChange = async (change: ChangeLog) => {
    try {
      if (!change.row_id) {
        toast.error("Cannot revert: no row reference");
        return;
      }
      if (change.before_data === null) {
        // It was an insert — delete the row
        await supabase.from(change.table_name as any).delete().eq("id", change.row_id);
      } else {
        // Restore previous state
        await supabase.from(change.table_name as any).update(change.before_data).eq("id", change.row_id);
      }
      await supabase
        .from("seo_change_log")
        .update({ reverted_at: new Date().toISOString() })
        .eq("id", change.id);
      toast.success("Change reverted");
      load();
    } catch (e: any) {
      toast.error(`Revert failed: ${e?.message ?? e}`);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Autonomous SEO/AEO Engine</CardTitle>
                <CardDescription className="mt-1">
                  Researches the latest SEO/AEO techniques every 24 hours and auto-applies safe data-only
                  improvements. Code changes are queued for your review.
                </CardDescription>
              </div>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(v) => updateSettings({ enabled: v })} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-card/50 p-3">
              <div className="text-xs text-muted-foreground">Last run</div>
              <div className="font-medium">
                {settings.last_run_at ? new Date(settings.last_run_at).toLocaleString() : "Never"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card/50 p-3">
              <div className="text-xs text-muted-foreground">Next scheduled</div>
              <div className="font-medium">
                {settings.next_scheduled_at
                  ? new Date(settings.next_scheduled_at).toLocaleString()
                  : "Daily 3 AM UTC"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card/50 p-3">
              <div className="text-xs text-muted-foreground">Auto-applied (last 30)</div>
              <div className="font-medium text-emerald-500">
                {techniques.filter((t) => t.classification === "safe_data").length}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card/50 p-3">
              <div className="text-xs text-muted-foreground">Queued for review</div>
              <div className="font-medium text-amber-500">
                {techniques.filter((t) => t.classification === "code_change").length}
              </div>
            </div>
          </div>
          <Button onClick={runNow} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run now
          </Button>
        </CardContent>
      </Card>

      {/* Per-category toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What can be auto-applied</CardTitle>
          <CardDescription>
            Disable any category to require manual review for that type of change.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/30 transition-colors"
            >
              <span className="text-sm font-medium">{label}</span>
              <Switch
                checked={settings.categories[key] ?? false}
                onCheckedChange={(v) => toggleCategory(key, v)}
              />
            </label>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Runs ({runs.length})</TabsTrigger>
          <TabsTrigger value="techniques">Discovered ({techniques.length})</TabsTrigger>
          <TabsTrigger value="changes">Change log ({changes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="space-y-2">
          {runs.length === 0 && (
            <p className="text-sm text-muted-foreground p-4">No runs yet. Click "Run now" to test.</p>
          )}
          {runs.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
              {r.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : r.status === "failed" ? (
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium">{new Date(r.started_at).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  {r.techniques_found} found · {r.applied_count} applied · {r.queued_count} queued ·{" "}
                  {r.skipped_count} skipped · {r.triggered_by}
                </div>
                {r.error && <div className="text-xs text-destructive mt-1">{r.error}</div>}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="techniques" className="space-y-2">
          {techniques.length === 0 && (
            <p className="text-sm text-muted-foreground p-4">No techniques discovered yet.</p>
          )}
          {techniques.map((t) => (
            <div key={t.id} className="rounded-lg border border-border p-3 text-sm space-y-1">
              <div className="flex items-start gap-2">
                <Badge variant={t.classification === "safe_data" ? "default" : t.classification === "code_change" ? "secondary" : "outline"}>
                  {t.classification}
                </Badge>
                <Badge variant="outline">{t.category}</Badge>
                {t.confidence != null && (
                  <span className="text-xs text-muted-foreground">conf {t.confidence.toFixed(2)}</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(t.applied_at).toLocaleDateString()}
                </span>
              </div>
              <div className="font-medium">{t.title}</div>
              <p className="text-xs text-muted-foreground">{t.description}</p>
              {t.source_url && (
                <a
                  href={t.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="changes" className="space-y-2">
          {changes.length === 0 && (
            <p className="text-sm text-muted-foreground p-4">No auto-applied changes yet.</p>
          )}
          {changes.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {c.table_name}
                  {c.reverted_at && (
                    <Badge variant="outline" className="ml-2 text-xs">reverted</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleString()}
                </div>
              </div>
              {!c.reverted_at && (
                <Button size="sm" variant="ghost" onClick={() => revertChange(c)} className="gap-1">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Revert
                </Button>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
