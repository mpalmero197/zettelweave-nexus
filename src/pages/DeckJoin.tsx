import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Smartphone, Wifi, WifiOff, LogIn, LogOut, RefreshCw } from "lucide-react";
import type { DeckTile, Deck } from "@/hooks/useDecks";
import { DeckTileWidget } from "@/components/deck/DeckTileWidget";
import bakuScribeLogoAsset from "@/assets/baku-scribe-logo.png.asset.json";

// Give a tile a meaningful label based on what it actually does, so users
// never see the placeholder "New tile" on the phone remote.
function tileDisplayLabel(t: DeckTile): string {
  const raw = (t.label ?? "").trim();
  if (raw && raw.toLowerCase() !== "new tile") return raw;
  if (t.kind === "widget") {
    const w = (t.widget_type ?? "").toLowerCase();
    if (w === "weather") return "Weather";
    if (w === "clock") return "Clock";
    if (w === "stopwatch") return "Stopwatch";
    return "Live widget";
  }
  if (t.kind === "folder") return "Folder";
  if (t.kind === "macro") return "Run macro";
  if (t.kind === "url") {
    const u = (t.config?.url as string | undefined) ?? "";
    if (u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "Open link"; } }
    return "Open link";
  }
  if (t.kind === "alice_chat") return "Ask ALICE";
  if (t.kind === "hotkey") return t.hotkey ?? "Hotkey";
  if (t.kind === "multi") return "Multi-action";
  return t.kind ?? "Tile";
}

const brandLogo = bakuScribeLogoAsset.url;

type Channel = ReturnType<typeof supabase.channel>;

export default function DeckJoin() {
  const [params] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [code, setCode] = useState(params.get("code")?.toUpperCase() ?? "");
  const [deckId, setDeckId] = useState<string | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [tiles, setTiles] = useState<DeckTile[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [connected, setConnected] = useState(false);
  const [pressingId, setPressingId] = useState<string | null>(null);
  const [lastAckId, setLastAckId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const join = async () => {
    if (!code) return;
    setJoining(true);
    const { data, error } = await supabase
      .from("alice_deck_shares")
      .select("deck_id, expires_at")
      .eq("code", code.toUpperCase())
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    setJoining(false);
    if (error || !data) {
      toast({ title: "Invalid or expired code", variant: "destructive" });
      return;
    }
    setDeckId(data.deck_id);
  };

  const loadDeck = async (id: string) => {
    const [{ data: d }, { data: t }] = await Promise.all([
      supabase.from("alice_decks").select("*").eq("id", id).maybeSingle(),
      supabase.from("alice_deck_tiles").select("*").eq("deck_id", id),
    ]);
    setDeck((d as Deck) ?? null);
    setTiles((t as DeckTile[]) ?? []);
  };

  useEffect(() => {
    if (!deckId) return;
    loadDeck(deckId);

    // Broadcast channel: presses out, acks in
    const ch = supabase.channel(`deck-press-${deckId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "ack" }, ({ payload }) => {
      setLastAckId(payload?.tileId ?? null);
      setTimeout(() => setLastAckId((cur) => (cur === payload?.tileId ? null : cur)), 700);
    });
    ch.subscribe((status) => setConnected(status === "SUBSCRIBED"));
    setChannel(ch);

    // Live tile updates so phone stays in sync with desktop edits
    const live = supabase
      .channel(`deck-live-${deckId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alice_deck_tiles", filter: `deck_id=eq.${deckId}` },
        () => loadDeck(deckId),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alice_decks", filter: `id=eq.${deckId}` },
        () => loadDeck(deckId),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(live);
      setChannel(null);
      setConnected(false);
    };
  }, [deckId]);

  const press = async (tile: DeckTile) => {
    if (!channel) return;
    if (navigator.vibrate) navigator.vibrate(25);
    setPressingId(tile.id);
    setTimeout(() => setPressingId((cur) => (cur === tile.id ? null : cur)), 200);
    await channel.send({ type: "broadcast", event: "press", payload: { tileId: tile.id, at: Date.now() } });
  };

  const disconnect = () => {
    setDeckId(null);
    setDeck(null);
    setTiles([]);
  };

  const grid = useMemo(() => {
    if (!deck) return [] as (DeckTile | null)[];
    const cells: (DeckTile | null)[] = Array(deck.cols * deck.rows).fill(null);
    for (const t of tiles) {
      const idx = t.y * deck.cols + t.x;
      if (idx >= 0 && idx < cells.length) cells[idx] = t;
    }
    return cells;
  }, [tiles, deck]);

  if (!authLoading && !user) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <img src={brandLogo} alt="Baku Scribe" className="h-14 w-14 object-contain" />
        <h1 className="text-lg font-semibold">Sign in to use the phone remote</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You need a Baku Scribe account so we know it's really you pressing tiles.
        </p>
        <Button asChild size="lg" className="min-h-[48px]">
          <Link to={`/auth?redirect=/deck/join?code=${code}`}><LogIn className="mr-1 h-4 w-4" />Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!deckId) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-sm flex-col items-center justify-center gap-4 bg-background p-6">
        <img src={brandLogo} alt="Baku Scribe" className="h-16 w-16 object-contain" />
        <div className="text-center">
          <h1 className="text-xl font-semibold">Baku Scribe Deck</h1>
          <p className="text-xs text-muted-foreground">Enter the 6-character pair code shown on your desktop.</p>
        </div>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABC123"
          className="text-center font-mono text-3xl tracking-widest h-16"
          maxLength={6}
          autoFocus
          inputMode="text"
          autoCapitalize="characters"
        />
        <Button className="w-full min-h-[52px] text-base" onClick={join} disabled={joining || code.length !== 6}>
          {joining ? "Joining…" : "Join deck"}
        </Button>
        <p className="text-[10px] text-muted-foreground">bakuscribe.com/deck/join</p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-sm text-muted-foreground">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />Loading deck…
      </div>
    );
  }

  // Compute tile size so the whole grid fills the phone viewport with generous tap targets.
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={brandLogo} alt="Baku Scribe" className="h-7 w-7 object-contain" />
          <div>
            <h1 className="text-sm font-semibold leading-tight">{deck.name}</h1>
            <p className="text-[10px] text-muted-foreground">Baku Scribe · Phone remote</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-xs ${connected ? "text-emerald-400" : "text-muted-foreground"}`}>
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connected ? "paired" : "connecting…"}
          </div>
          <Button size="sm" variant="ghost" onClick={disconnect} aria-label="Disconnect">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col p-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div
          className="grid flex-1 gap-3"
          style={{
            gridTemplateColumns: `repeat(${deck.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${deck.rows}, minmax(0, 1fr))`,
          }}
        >
          {grid.map((tile, idx) => {
            if (!tile) {
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-dashed border-border/30"
                />
              );
            }
            const isPressing = pressingId === tile.id;
            const isAcked = lastAckId === tile.id;
            const label = tileDisplayLabel(tile);
            const w = Math.max(1, tile.w ?? 1);
            const h = Math.max(1, tile.h ?? 1);
            return (
              <button
                key={tile.id}
                onClick={() => press(tile)}
                style={{
                  background: tile.bg_color ?? "hsl(var(--muted))",
                  color: tile.fg_color ?? undefined,
                  gridColumn: `span ${w} / span ${w}`,
                  gridRow: `span ${h} / span ${h}`,
                }}
                className={`relative flex min-h-[128px] flex-col overflow-hidden rounded-2xl border p-3 text-left transition-all touch-manipulation
                  ${isPressing ? "scale-95" : "scale-100"}
                  ${isAcked ? "border-primary shadow-[0_0_24px_hsl(var(--primary)/.5)]" : "border-border/60"}
                  active:scale-95 hover:border-primary/60`}
              >
                <div className="flex-1 min-h-0">
                  <DeckTileWidget tile={tile} label={label} fallbackType={tile.widget_type} />
                </div>
                {isAcked && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
