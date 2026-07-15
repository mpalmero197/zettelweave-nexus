import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Smartphone, Wifi, LogIn } from "lucide-react";
import type { DeckTile, Deck } from "@/hooks/useDecks";

type Channel = ReturnType<typeof supabase.channel>;

export default function DeckJoin() {
  const [params] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [code, setCode] = useState(params.get("code")?.toUpperCase() ?? "");
  const [deckId, setDeckId] = useState<string | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [tiles, setTiles] = useState<DeckTile[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
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

  useEffect(() => {
    if (!deckId) return;
    (async () => {
      const [{ data: d }, { data: t }] = await Promise.all([
        supabase.from("alice_decks").select("*").eq("id", deckId).maybeSingle(),
        supabase.from("alice_deck_tiles").select("*").eq("deck_id", deckId),
      ]);
      setDeck((d as Deck) ?? null);
      setTiles((t as DeckTile[]) ?? []);
    })();
    const ch = supabase.channel(`deck-press-${deckId}`, { config: { broadcast: { self: false } } });
    ch.subscribe();
    setChannel(ch);
    return () => { supabase.removeChannel(ch); setChannel(null); };
  }, [deckId]);

  const press = async (tile: DeckTile) => {
    if (!channel) return;
    if (navigator.vibrate) navigator.vibrate(20);
    await channel.send({ type: "broadcast", event: "press", payload: { tileId: tile.id } });
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <Smartphone className="h-10 w-10 text-primary" />
        <h1 className="text-lg font-semibold">Sign in to use the phone remote</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You need an ALICE account so we know it's really you pressing tiles.
        </p>
        <Button asChild><Link to={`/auth?redirect=/deck/join?code=${code}`}><LogIn className="mr-1 h-4 w-4" />Sign in</Link></Button>
      </div>
    );
  }

  if (!deckId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6">
        <Smartphone className="h-10 w-10 text-primary" />
        <h1 className="text-lg font-semibold">Enter pair code</h1>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABC123"
          className="text-center font-mono text-2xl tracking-widest"
          maxLength={6}
        />
        <Button className="w-full" onClick={join} disabled={joining || code.length !== 6}>
          {joining ? "Joining…" : "Join deck"}
        </Button>
      </div>
    );
  }

  if (!deck) return <div className="p-6 text-sm text-muted-foreground">Loading deck…</div>;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-2">
        <div>
          <h1 className="text-sm font-semibold">{deck.name}</h1>
          <p className="text-[10px] text-muted-foreground">Phone remote</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-emerald-400">
          <Wifi className="h-3 w-3" />paired
        </div>
      </header>
      <main className="flex-1 p-3">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${deck.cols}, minmax(0, 1fr))` }}>
          {grid.map((tile, idx) => {
            if (!tile) return <div key={idx} className="aspect-square rounded-md border border-dashed border-border/30" />;
            return (
              <button
                key={tile.id}
                onClick={() => press(tile)}
                className="aspect-square rounded-md border border-border/60 p-2 text-left transition active:scale-90"
                style={{ background: tile.bg_color ?? "hsl(var(--muted))", color: tile.fg_color ?? undefined }}
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="text-2xl leading-none">{tile.icon ?? "•"}</div>
                  <div className="truncate text-xs font-semibold">{tile.label ?? ""}</div>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
