import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Star, Download, Share2, Trash2, Play, ChevronRight, Sparkles, Search, Pencil, GraduationCap } from "lucide-react";
import MacroEditor, { type MacroEditable } from "@/components/macros/MacroEditor";
import AskAliceMacro from "@/components/macros/AskAliceMacro";
import PrebuiltMacroGallery from "@/components/macros/PrebuiltMacroGallery";

interface Macro {
  id: string;
  name: string;
  description: string | null;
  start_url: string;
  target_domain: string | null;
  tags: string[] | null;
  steps: any[];
  source: string | null;
  run_count: number | null;
}

interface PublicMacro {
  id: string;
  macro_id: string;
  author_id: string;
  title: string;
  description: string | null;
  tags: string[];
  start_url: string;
  target_domain: string | null;
  steps_snapshot: any[];
  submitted_at: string;
  avg_rating: number;
  rating_count: number;
  install_count: number;
  step_count: number;
}

export default function Macros() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("mine");

  // My macros
  const [macros, setMacros] = useState<Macro[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [shareTarget, setShareTarget] = useState<Macro | null>(null);
  const [shareTitle, setShareTitle] = useState("");
  const [shareDesc, setShareDesc] = useState("");
  const [shareTags, setShareTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<MacroEditable | null>(null);

  // Marketplace
  const [market, setMarket] = useState<PublicMacro[]>([]);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<PublicMacro | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [myRating, setMyRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");

  const loadMine = async () => {
    if (!user) return;
    setLoadingMine(true);
    const { data } = await supabase
      .from("alice_macros")
      .select("id, name, description, start_url, target_domain, tags, steps, source, run_count")
      .order("updated_at", { ascending: false });
    setMacros((data as Macro[]) || []);
    setLoadingMine(false);
  };

  const loadMarket = async () => {
    setLoadingMarket(true);
    const { data } = await supabase
      .from("macro_marketplace_public" as any)
      .select("*")
      .order("install_count", { ascending: false })
      .limit(100);
    setMarket(((data as unknown) as PublicMacro[]) || []);
    setLoadingMarket(false);
  };

  useEffect(() => { loadMine(); loadMarket(); /* eslint-disable-next-line */ }, [user?.id]);

  const filteredMarket = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return market;
    return market.filter((m) =>
      m.title.toLowerCase().includes(q) ||
      (m.description || "").toLowerCase().includes(q) ||
      (m.tags || []).some((t) => t.toLowerCase().includes(q)) ||
      (m.target_domain || "").toLowerCase().includes(q)
    );
  }, [market, search]);

  // ── Actions ───────────────────────────────────────────────────────
  const runMacro = (m: Macro) => {
    window.dispatchEvent(new CustomEvent("alice:run-macro", { detail: { macroId: m.id } }));
    toast({ title: "Open the Toolbox to run the macro on a real browser tab." });
  };

  const deleteMacro = async (m: Macro) => {
    if (!confirm(`Delete macro "${m.name}"?`)) return;
    await supabase.from("alice_macros").delete().eq("id", m.id);
    setMacros((prev) => prev.filter((x) => x.id !== m.id));
  };

  const openShare = (m: Macro) => {
    setShareTarget(m);
    setShareTitle(m.name);
    setShareDesc(m.description || "");
    setShareTags((m.tags || []).join(", "));
  };

  const submitShare = async () => {
    if (!shareTarget) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("macro-marketplace-submit", {
        body: {
          macro_id: shareTarget.id,
          title: shareTitle,
          description: shareDesc,
          tags: shareTags.split(",").map((t) => t.trim()).filter(Boolean),
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast({ title: "Submitted!", description: "An admin will review your macro before it appears publicly." });
      setShareTarget(null);
    } catch (e: any) {
      toast({ title: "Could not submit", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const installMacro = async (sub: PublicMacro) => {
    setInstalling(sub.id);
    try {
      const { data, error } = await supabase.functions.invoke("macro-marketplace-install", {
        body: { submission_id: sub.id },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast({ title: "Installed to your macros!", description: sub.title });
      await loadMine();
      await loadMarket();
    } catch (e: any) {
      toast({ title: "Install failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setInstalling(null);
    }
  };

  const openPreview = async (sub: PublicMacro) => {
    setPreview(sub);
    setMyRating(0);
    setReviewText("");
    if (!user) return;
    const { data } = await supabase
      .from("macro_marketplace_ratings")
      .select("stars, review")
      .eq("submission_id", sub.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) { setMyRating(data.stars || 0); setReviewText(data.review || ""); }
  };

  const saveRating = async () => {
    if (!preview || !user || !myRating) return;
    const { error } = await supabase.from("macro_marketplace_ratings").upsert({
      submission_id: preview.id,
      user_id: user.id,
      stars: myRating,
      review: reviewText || null,
    }, { onConflict: "submission_id,user_id" });
    if (error) {
      toast({ title: "Could not save rating", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Thanks for rating!" });
      await loadMarket();
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">ALICE Macros</h1>
          <p className="text-muted-foreground">Teach ALICE repeatable browser tasks, then share or borrow them.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() =>
              setEditTarget({
                id: "__new__",
                name: "",
                description: "",
                start_url: "",
                target_domain: "",
                tags: [],
                steps: [],
              })
            }
          >
            <Sparkles className="h-4 w-4 mr-2" /> Build Macro
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("alice:start-teach"));
              toast({
                title: "Recording mode",
                description:
                  "Open the PendragonX Toolbox on the page you want to teach, then click '🎓 Teach ALICE' in the Macros tab. Steps you take in that tab are saved into a new macro.",
              });
            }}
          >
            <GraduationCap className="h-4 w-4 mr-2" /> Teach ALICE
          </Button>
          <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("alice:open-routine-builder"))}>
            <Sparkles className="h-4 w-4 mr-2" /> New Routine
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="mine">My Macros ({macros.length})</TabsTrigger>
          <TabsTrigger value="prebuilt">Prebuilt</TabsTrigger>
          <TabsTrigger value="market">Marketplace</TabsTrigger>
          <TabsTrigger value="ask">Ask ALICE</TabsTrigger>
        </TabsList>

        {/* ──────── Prebuilt ──────── */}
        <TabsContent value="prebuilt" className="space-y-3">
          <PrebuiltMacroGallery onInstalled={loadMine} />
        </TabsContent>

        {/* ──────── Ask ALICE ──────── */}
        <TabsContent value="ask" className="space-y-3">
          <AskAliceMacro onCreated={loadMine} onEdit={(m) => setEditTarget(m as MacroEditable)} />
        </TabsContent>



        {/* ──────── My Macros ──────── */}
        <TabsContent value="mine" className="space-y-3">
          {loadingMine ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : macros.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              No macros yet. Use the Toolbox extension to teach ALICE a task, or click "New Routine" above.
            </CardContent></Card>
          ) : (
            macros.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4 flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{m.name}</h3>
                      {m.source && <Badge variant="secondary" className="text-xs">{m.source}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{m.description || m.start_url}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(m.steps || []).length} steps
                      {m.run_count ? ` · ran ${m.run_count}×` : ""}
                      {m.target_domain ? ` · ${m.target_domain}` : ""}
                    </p>
                    {(m.tags || []).length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {(m.tags || []).map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => runMacro(m)}><Play className="h-4 w-4 mr-1" />Run</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditTarget(m as MacroEditable)}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => openShare(m)}><Share2 className="h-4 w-4 mr-1" />Share</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMacro(m)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ──────── Marketplace ──────── */}
        <TabsContent value="market" className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search macros by name, tag, or domain…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loadingMarket ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filteredMarket.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              No community macros yet. Be the first — share one from "My Macros"!
            </CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {filteredMarket.map((sub) => (
                <Card key={sub.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openPreview(sub)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="truncate">{sub.title}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                    <CardDescription className="line-clamp-2">{sub.description || sub.start_url}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {sub.avg_rating.toFixed(1)} ({sub.rating_count})
                      </span>
                      <span className="flex items-center gap-1"><Download className="h-3 w-3" />{sub.install_count}</span>
                      <span>{sub.step_count} steps</span>
                      {sub.target_domain && <span>· {sub.target_domain}</span>}
                    </div>
                    {(sub.tags || []).length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {(sub.tags || []).slice(0, 4).map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ──────── Share dialog ──────── */}
      <Dialog open={!!shareTarget} onOpenChange={(o) => !o && setShareTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share to Marketplace</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            An admin will review your macro before it appears publicly. Credentials are auto-replaced with <code>{`{{vault.*}}`}</code> tokens.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={shareTitle} onChange={(e) => setShareTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={shareDesc} onChange={(e) => setShareDesc(e.target.value)} rows={3} placeholder="What does this macro do? What should users have ready?" />
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input value={shareTags} onChange={(e) => setShareTags(e.target.value)} placeholder="banking, signup, productivity" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareTarget(null)}>Cancel</Button>
            <Button onClick={submitShare} disabled={submitting || !shareTitle.trim()}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit for review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────── Preview dialog ──────── */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.title}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{preview.description}</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {preview.avg_rating.toFixed(1)} ({preview.rating_count} ratings)
                </span>
                <span className="flex items-center gap-1"><Download className="h-4 w-4" />{preview.install_count} installs</span>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Steps ({preview.step_count})</h4>
                <ol className="space-y-1.5 text-sm border rounded-md p-3 max-h-64 overflow-y-auto">
                  {(preview.steps_snapshot as any[]).map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground tabular-nums w-6 flex-shrink-0">{i + 1}.</span>
                      <span>
                        <Badge variant="outline" className="mr-1 text-xs">{s.action}</Badge>
                        {s.url || s.selector || s.prompt || s.text || s.note || ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {user && (
                <div className="space-y-2 border-t pt-3">
                  <h4 className="font-semibold text-sm">Rate this macro</h4>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} onClick={() => setMyRating(n)} type="button">
                        <Star className={`h-6 w-6 ${n <= myRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Optional review…" rows={2} />
                  <Button size="sm" variant="outline" onClick={saveRating} disabled={!myRating}>Save rating</Button>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
                <Button onClick={() => installMacro(preview)} disabled={installing === preview.id}>
                  {installing === preview.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Install to my macros
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <MacroEditor macro={editTarget} onClose={() => setEditTarget(null)} onSaved={loadMine} />
    </div>
  );
}
