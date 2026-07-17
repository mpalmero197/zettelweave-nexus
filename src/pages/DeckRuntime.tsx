import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useDeckTiles, type Deck, type DeckTile } from "@/hooks/useDecks";
import { useAllUserContextRules, matchRules } from "@/hooks/useDeckContextRules";
import { runTile, generatePairCode } from "@/lib/deckRuntime";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Smartphone, Maximize2, X, ChevronRight, Home, Zap } from "lucide-react";
import { DeckTileWidget } from "@/components/deck/DeckTileWidget";


export default function DeckRuntime() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const { tiles } = useDeckTiles(id ?? null);
  const [pairing, setPairing] = useState<{ code: string; url: string } | null>(null);
  const [pairOpen, setPairOpen] = useState(false);
  const [folderStack, setFolderStack] = useState<Array<{ id: string; label: string }>>([]);
  const [autoSwitch, setAutoSwitch] = useState<boolean>(() => localStorage.getItem("deck-auto-switch") !== "false");
  const contextRules = useAllUserContextRules();


  useEffect(() => {
    if (!id) return;
    supabase.from("alice_decks").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setDeck((data as Deck) ?? null);
    });
  }, [id]);

  // Live tile updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`deck-runtime-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "alice_deck_tiles", filter: `deck_id=eq.${id}` }, () => {
        // useDeckTiles doesn't auto-refresh on realtime; force reload via visibility ping
        window.dispatchEvent(new Event("deck:tiles-refresh"));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Phone companion press broadcast listener
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`deck-press-${id}`, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "press" }, ({ payload }) => {
        const tile = tiles.find((t) => t.id === payload?.tileId);
        if (tile) {
          toast({ title: "📱 Phone press", description: tile.label ?? "" });
          runTile(tile);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, tiles]);

  // Filter tiles to the current folder (null = root).
  const currentFolderId = folderStack.length ? folderStack[folderStack.length - 1].id : null;
  const visibleTiles = useMemo(
    () => tiles.filter((t) => (t.folder_id ?? null) === currentFolderId),
    [tiles, currentFolderId],
  );

  const grid = useMemo(() => {
    if (!deck) return [] as (DeckTile | null)[];
    const cells: (DeckTile | null)[] = Array(deck.cols * deck.rows).fill(null);
    for (const t of visibleTiles) {
      const idx = t.y * deck.cols + t.x;
      if (idx >= 0 && idx < cells.length) cells[idx] = t;
    }
    return cells;
  }, [visibleTiles, deck]);

  const onTilePress = (tile: DeckTile) => {
    if (tile.kind === "folder" && tile.target_folder_id) {
      setFolderStack((s) => [...s, { id: tile.target_folder_id!, label: tile.label ?? "Folder" }]);
      return;
    }
    runTile(tile);
  };

  // Context auto-switch: watch location + app tab, resolve rules, navigate.
  useEffect(() => {
    if (!autoSwitch || !id) return;
    localStorage.setItem("deck-auto-switch", "true");
    const resolve = (tab: string) => {
      const match = matchRules(contextRules, {
        path: window.location.pathname,
        tab,
        host: window.location.host,
      });
      if (match && match.deck_id !== id) {
        toast({ title: "Deck switched", description: "Matched a context rule." });
        navigate(`/deck/${match.deck_id}`);
      }
    };
    const onTab = (e: Event) => resolve((e as CustomEvent).detail ?? "");
    window.addEventListener("app-tab-change", onTab);
    // Also try once on mount using current path.
    resolve("");
    return () => window.removeEventListener("app-tab-change", onTab);
  }, [autoSwitch, contextRules, id, navigate]);

  useEffect(() => {
    if (!autoSwitch) localStorage.setItem("deck-auto-switch", "false");
  }, [autoSwitch]);


  const startPair = async () => {
    if (!id) return;
    const code = generatePairCode();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("alice_deck_shares").insert({
      deck_id: id,
      owner_id: u.user.id,
      code,
    });
    if (error) { toast({ title: "Pair failed", description: error.message, variant: "destructive" }); return; }
    const url = `${window.location.origin}/deck/join?code=${code}`;
    setPairing({ code, url });
    setPairOpen(true);
  };

  const goFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  if (!deck) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading deck…</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/decks"><ArrowLeft className="mr-1 h-4 w-4" />Studio</Link>
          </Button>
          <h1 className="text-sm font-semibold">{deck.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={autoSwitch ? "default" : "outline"}
            onClick={() => setAutoSwitch((v) => !v)}
            title="Auto-switch deck when your context changes"
          >
            <Zap className="mr-1 h-4 w-4" />Auto
          </Button>
          <Button size="sm" variant="outline" onClick={startPair}>
            <Smartphone className="mr-1 h-4 w-4" />Pair phone
          </Button>
          <Button size="sm" variant="ghost" onClick={goFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Folder breadcrumbs */}
      {folderStack.length > 0 && (
        <div className="flex items-center gap-1 border-b border-border/40 px-4 py-1.5 text-xs text-muted-foreground">
          <button className="flex items-center gap-1 hover:text-foreground" onClick={() => setFolderStack([])}>
            <Home className="h-3 w-3" />Root
          </button>
          {folderStack.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              <button
                className="hover:text-foreground"
                onClick={() => setFolderStack((s) => s.slice(0, i + 1))}
              >
                {f.label}
              </button>
            </span>
          ))}
        </div>
      )}

      <main className="flex flex-1 items-center justify-center p-6">
        <div
          className="grid w-full max-w-6xl gap-3"
          style={{ gridTemplateColumns: `repeat(${deck.cols}, minmax(0, 1fr))` }}
        >
          {grid.map((tile, idx) => {
            if (!tile) return <div key={idx} className="aspect-square rounded-lg border border-dashed border-border/30" />;
            const style = { background: tile.bg_color ?? "hsl(var(--muted))", color: tile.fg_color ?? undefined };
            if (tile.kind === "widget") {
              const span = {
                gridColumn: `span ${Math.max(1, tile.w)} / span ${Math.max(1, tile.w)}`,
                gridRow: `span ${Math.max(1, tile.h)} / span ${Math.max(1, tile.h)}`,
                minHeight: `${Math.max(1, tile.h) * 8}rem`,
              };
              return (
                <div
                  key={tile.id}
                  className="overflow-hidden rounded-lg border border-border/60 p-2"
                  style={{ ...style, ...span }}
                >
                  <DeckTileWidget type={tile.widget_type} label={tile.label} />
                </div>
              );
            }
            return (
              <button
                key={tile.id}
                onClick={() => onTilePress(tile)}
                className="group aspect-square rounded-lg border border-border/60 p-3 text-left transition active:scale-95 hover:border-primary/60 hover:shadow-[0_0_20px_hsl(var(--primary)/.25)]"
                style={style}
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="text-3xl leading-none">{tile.icon ?? (tile.kind === "folder" ? "📁" : "•")}</div>
                  <div className="truncate text-sm font-semibold">{tile.label ?? ""}</div>
                </div>
              </button>
            );
          })}
        </div>
      </main>


      <Dialog open={pairOpen} onOpenChange={setPairOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Smartphone className="h-4 w-4" />Pair a phone</DialogTitle>
          </DialogHeader>
          {pairing ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="rounded-lg bg-white p-4">
                <QRCodeSVG value={pairing.url} size={192} />
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Or enter code</div>
                <div className="mt-1 font-mono text-2xl tracking-widest">{pairing.code}</div>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                Open <span className="font-mono">{new URL(pairing.url).host}/deck/join</span> on your phone.
                Code expires in 10 minutes.
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPairOpen(false)}>
                <X className="mr-1 h-4 w-4" />Close
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
