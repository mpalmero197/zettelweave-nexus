import { useSandbox, SandboxProvider } from "@/contexts/SandboxContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, RotateCcw, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function SandboxInner() {
  const { reseed, reseeding } = useSandbox();
  const navigate = useNavigate();
  const [items, setItems] = useState<{ notebooks: any[]; notes: any[]; cards: any[] }>({ notebooks: [], notes: [], cards: [] });

  const load = async () => {
    const [nb, n, c] = await Promise.all([
      (supabase as any).from("sandbox_notebooks").select("*"),
      (supabase as any).from("sandbox_notes").select("*"),
      (supabase as any).from("sandbox_zettel_cards").select("*"),
    ]);
    setItems({ notebooks: nb.data ?? [], notes: n.data ?? [], cards: c.data ?? [] });
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/scholar")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Scholar
      </Button>

      <Card className="p-4 border-primary/40 bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">You are in the Scholar sandbox</div>
            <div className="text-xs text-muted-foreground">Nothing here affects your real knowledge base.</div>
          </div>
        </div>
        <Button size="sm" variant="outline" disabled={reseeding} onClick={async () => { await reseed(); await load(); }}>
          <RotateCcw className="mr-2 h-3 w-3" /> {reseeding ? "Resetting…" : "Reset sandbox"}
        </Button>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 space-y-2">
          <h3 className="font-semibold flex items-center justify-between">Notebooks <Badge variant="secondary">{items.notebooks.length}</Badge></h3>
          <ul className="text-sm space-y-1">
            {items.notebooks.map((nb: any) => <li key={nb.id} className="truncate">📓 {nb.name}</li>)}
          </ul>
        </Card>
        <Card className="p-5 space-y-2">
          <h3 className="font-semibold flex items-center justify-between">Notes <Badge variant="secondary">{items.notes.length}</Badge></h3>
          <ul className="text-sm space-y-1">
            {items.notes.map((n: any) => <li key={n.id} className="truncate">📝 {n.title}</li>)}
          </ul>
        </Card>
        <Card className="p-5 space-y-2">
          <h3 className="font-semibold flex items-center justify-between">Cards <Badge variant="secondary">{items.cards.length}</Badge></h3>
          <ul className="text-sm space-y-1">
            {items.cards.map((c: any) => <li key={c.id} className="truncate">🃏 {c.title}</li>)}
          </ul>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        This is a preview of your sandbox starter content. Full sandbox-mode editing across Notes, Cards, and Catalyst is rolling out feature-by-feature — each new lesson includes a "Try it" button that drops you into the matching sandbox surface.
      </p>
    </div>
  );
}

export default function ScholarSandbox() {
  return (
    <SandboxProvider initialSource="sandbox">
      <SandboxInner />
    </SandboxProvider>
  );
}
