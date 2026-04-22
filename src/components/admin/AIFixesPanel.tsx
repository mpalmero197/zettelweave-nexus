import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bot, Loader2, GitPullRequest, GitCommit, AlertCircle, Sparkles, FileCode, ExternalLink } from "lucide-react";

interface ErrorReport {
  id: string;
  error_type: string;
  error_message: string;
  filename: string | null;
  line_number: number | null;
  occurrence_count: number;
  status: string;
  severity: string;
  last_seen_at: string;
}

interface Patch {
  id: string;
  error_report_id: string | null;
  file_path: string;
  original_content: string | null;
  new_content: string;
  explanation: string;
  status: string;
  branch_name: string | null;
  pr_url: string | null;
  commit_sha: string | null;
  apply_error: string | null;
  created_at: string;
}

export function AIFixesPanel() {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposingFor, setProposingFor] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [hintMap, setHintMap] = useState<Record<string, string>>({});
  const [activePatch, setActivePatch] = useState<Patch | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: errs }, { data: pats }] = await Promise.all([
      supabase.from("error_reports").select("*").neq("status", "resolved").order("last_seen_at", { ascending: false }).limit(30),
      supabase.from("ai_code_patches").select("*").order("created_at", { ascending: false }).limit(30),
    ]);
    setErrors((errs as ErrorReport[]) ?? []);
    setPatches((pats as Patch[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const propose = async (errorId: string) => {
    setProposingFor(errorId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("propose-code-fix", {
        body: { error_report_id: errorId, hint: hintMap[errorId] || undefined },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success("Patch proposed — review below");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to propose fix");
    } finally {
      setProposingFor(null);
    }
  };

  const apply = async (patchId: string, mode: "pr" | "direct" = "pr") => {
    if (mode === "direct" && !confirm("Commit directly to main? This bypasses review.")) return;
    setApplying(patchId);
    try {
      const { data, error } = await supabase.functions.invoke("apply-code-fix", {
        body: { patch_id: patchId, mode },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(mode === "pr" ? `PR opened${data?.pr_url ? "" : " (check repo)"}` : "Committed to main");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to apply");
    } finally {
      setApplying(null);
    }
  };

  const reject = async (patchId: string) => {
    await supabase.from("ai_code_patches").update({ status: "rejected" }).eq("id", patchId);
    toast.success("Rejected");
    load();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      proposed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      applied: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      rejected: "bg-muted text-muted-foreground",
      failed: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return <Badge variant="outline" className={map[s] || ""}>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Frontend Fixer
          </CardTitle>
          <CardDescription>
            Pick a frontend error → AI reads the source file from GitHub → proposes a complete file replacement → you review the diff → apply via PR or direct commit.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="errors">
        <TabsList>
          <TabsTrigger value="errors">Open Errors ({errors.length})</TabsTrigger>
          <TabsTrigger value="patches">Staged Patches ({patches.filter(p => p.status === "proposed").length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && errors.length === 0 && (
            <p className="text-sm text-muted-foreground">No open errors. 🎉</p>
          )}
          {errors.map(e => {
            const hasPatch = patches.some(p => p.error_report_id === e.id && p.status === "proposed");
            return (
              <Card key={e.id} className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{e.error_type}: {e.error_message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {e.filename || "?"}{e.line_number ? `:${e.line_number}` : ""} · seen {e.occurrence_count}× · {e.severity}
                      </p>
                    </div>
                    {hasPatch && <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Patch ready</Badge>}
                  </div>
                  <Textarea
                    placeholder="Optional hint to the AI (e.g. 'happens when user clicks Save with empty title')"
                    value={hintMap[e.id] || ""}
                    onChange={ev => setHintMap(m => ({ ...m, [e.id]: ev.target.value }))}
                    className="text-xs"
                    rows={2}
                  />
                  <Button
                    size="sm"
                    onClick={() => propose(e.id)}
                    disabled={proposingFor === e.id}
                    className="gap-2"
                  >
                    {proposingFor === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Propose AI fix
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="patches" className="space-y-3">
          {patches.filter(p => p.status === "proposed").length === 0 && (
            <p className="text-sm text-muted-foreground">No patches awaiting review.</p>
          )}
          {patches.filter(p => p.status === "proposed").map(p => (
            <PatchCard
              key={p.id}
              patch={p}
              onView={() => setActivePatch(p)}
              onApply={(mode) => apply(p.id, mode)}
              onReject={() => reject(p.id)}
              applying={applying === p.id}
              statusBadge={statusBadge}
            />
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {patches.filter(p => p.status !== "proposed").map(p => (
            <Card key={p.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm font-medium truncate">{p.file_path}</p>
                      {statusBadge(p.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.explanation}</p>
                    {p.apply_error && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {p.apply_error}</p>
                    )}
                  </div>
                  {p.pr_url && (
                    <a href={p.pr_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      PR <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Diff viewer */}
      {activePatch && (
        <Card className="fixed inset-4 z-50 flex flex-col shadow-2xl border-primary/30 bg-background">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b">
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCode className="h-4 w-4" /> {activePatch.file_path}
              </CardTitle>
              <CardDescription className="line-clamp-2">{activePatch.explanation}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActivePatch(null)}>Close</Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="grid grid-cols-2 h-full">
              <ScrollArea className="border-r">
                <div className="p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Original</p>
                  <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono">{activePatch.original_content}</pre>
                </div>
              </ScrollArea>
              <ScrollArea>
                <div className="p-3">
                  <p className="text-xs font-medium text-emerald-500 mb-2">Proposed</p>
                  <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono">{activePatch.new_content}</pre>
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PatchCard({
  patch, onView, onApply, onReject, applying, statusBadge,
}: {
  patch: Patch;
  onView: () => void;
  onApply: (mode: "pr" | "direct") => void;
  onReject: () => void;
  applying: boolean;
  statusBadge: (s: string) => JSX.Element;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-sm font-medium truncate">{patch.file_path}</p>
              {statusBadge(patch.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{patch.explanation}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onView}>View diff</Button>
          <Button size="sm" onClick={() => onApply("pr")} disabled={applying} className="gap-1.5">
            {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitPullRequest className="h-3 w-3" />}
            Open PR
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onApply("direct")} disabled={applying} className="gap-1.5">
            <GitCommit className="h-3 w-3" /> Commit to main
          </Button>
          <Button size="sm" variant="ghost" onClick={onReject} disabled={applying}>Reject</Button>
        </div>
      </CardContent>
    </Card>
  );
}
