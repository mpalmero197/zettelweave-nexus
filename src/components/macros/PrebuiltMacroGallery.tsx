import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download, Play, Search, Loader2 } from "lucide-react";
import { PREBUILT_MACROS, PREBUILT_CATEGORIES, type PrebuiltMacro } from "@/lib/macros/prebuilt";

interface Props {
  onInstalled?: () => void;
}

export default function PrebuiltMacroGallery({ onInstalled }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [preview, setPreview] = useState<PrebuiltMacro | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PREBUILT_MACROS.filter((m) => {
      if (activeCat !== "All" && m.category !== activeCat) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q)) ||
        (m.target_domain || "").toLowerCase().includes(q)
      );
    });
  }, [search, activeCat]);

  const install = async (m: PrebuiltMacro) => {
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    setInstalling(m.slug);
    try {
      const { error } = await supabase.from("alice_macros").insert({
        user_id: user.id,
        name: m.name,
        description: m.description,
        start_url: m.start_url || "",
        target_domain: m.target_domain,
        tags: m.tags,
        steps: m.steps,
        source: "prebuilt",
      } as any);
      if (error) throw error;
      toast({ title: "Installed!", description: `"${m.name}" is now in your macros.` });
      onInstalled?.();
      setPreview(null);
    } catch (e: any) {
      toast({ title: "Install failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setInstalling(null);
    }
  };

  const run = (m: PrebuiltMacro) => {
    window.dispatchEvent(new CustomEvent("alice:run-prebuilt-macro", { detail: { slug: m.slug, macro: m } }));
    toast({ title: "Open the Toolbox to run this macro on a real tab." });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prebuilt macros…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {["All", ...PREBUILT_CATEGORIES].map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={activeCat === cat ? "default" : "outline"}
            onClick={() => setActiveCat(cat)}
            className="h-7 text-xs"
          >
            {cat}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No prebuilt macros match.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((m) => (
            <Card
              key={m.slug}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setPreview(m)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="text-2xl leading-none">{m.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{m.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">{m.category}</Badge>
                  <span>{m.steps.length} steps</span>
                  {m.target_domain && <span className="truncate">· {m.target_domain}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{preview.icon}</span> {preview.name}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{preview.description}</p>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Badge variant="outline">{preview.category}</Badge>
                {preview.target_domain && <Badge variant="secondary">{preview.target_domain}</Badge>}
                {preview.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                ))}
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Steps ({preview.steps.length})</h4>
                <ol className="space-y-1 text-xs border rounded-md p-3 max-h-60 overflow-y-auto">
                  {preview.steps.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground tabular-nums w-5">{i + 1}.</span>
                      <span>
                        <Badge variant="outline" className="mr-1 text-[10px]">{s.action}</Badge>
                        {s.url || s.selector || s.prompt || s.text || s.note || ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => run(preview)}>
                  <Play className="h-4 w-4 mr-1" /> Run in Toolbox
                </Button>
                <Button onClick={() => install(preview)} disabled={installing === preview.slug}>
                  {installing === preview.slug ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Install to My Macros
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
