import { useEffect, useMemo, useState } from "react";
import { useDecks, useDeckTiles, type DeckTile } from "@/hooks/useDecks";
import { runTile } from "@/lib/deckRuntime";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus, X, Grip, Plus, Minimize2 } from "lucide-react";

/**
 * FloatingDeck — draggable overlay that shows a chosen deck's tiles so users
 * can fire macros / prompts / hotkeys / URLs from anywhere in the app.
 *
 * Toggle via the global `deck:toggle-float` event or the launcher button.
 * Position, selected deck, folder stack, minimized, and size persist in
 * localStorage so it feels like a real floating window.
 */

const LS_POS = "float-deck-pos";
const LS_DECK = "float-deck-id";
const LS_MIN = "float-deck-min";
const LS_OPEN = "float-deck-open";
const LS_SIZE = "float-deck-size";

type Pos = { x: number; y: number };

function loadPos(): Pos {
  try { return JSON.parse(localStorage.getItem(LS_POS) || "") ?? { x: 24, y: 96 }; }
  catch { return { x: 24, y: 96 }; }
}

export function FloatingDeck() {
  const [open, setOpen] = useState<boolean>(() => localStorage.getItem(LS_OPEN) === "true");
  const [minimized, setMinimized] = useState<boolean>(() => localStorage.getItem(LS_MIN) === "true");
  const [pos, setPos] = useState<Pos>(loadPos);
  const [size, setSize] = useState<number>(() => Number(localStorage.getItem(LS_SIZE)) || 320);
  const [deckId, setDeckId] = useState<string | null>(() => localStorage.getItem(LS_DECK));
  const [folderStack, setFolderStack] = useState<Array<{ id: string; label: string }>>([]);
  const { decks } = useDecks();
  const { tiles } = useDeckTiles(deckId);

  // Persist
  useEffect(() => { localStorage.setItem(LS_OPEN, String(open)); }, [open]);
  useEffect(() => { localStorage.setItem(LS_MIN, String(minimized)); }, [minimized]);
  useEffect(() => { localStorage.setItem(LS_POS, JSON.stringify(pos)); }, [pos]);
  useEffect(() => { localStorage.setItem(LS_SIZE, String(size)); }, [size]);
  useEffect(() => { if (deckId) localStorage.setItem(LS_DECK, deckId); }, [deckId]);

  // Global toggle event (from launcher / hotkey).
  useEffect(() => {
    const onToggle = () => setOpen((v) => !v);
    const onOpen = () => setOpen(true);
    window.addEventListener("deck:toggle-float", onToggle);
    window.addEventListener("deck:open-float", onOpen);
    return () => {
      window.removeEventListener("deck:toggle-float", onToggle);
      window.removeEventListener("deck:open-float", onOpen);
    };
  }, []);

  // Default to the first (or default) deck on first open.
  useEffect(() => {
    if (!deckId && decks.length) {
      const def = decks.find((d) => d.is_default) ?? decks[0];
      setDeckId(def.id);
    }
  }, [decks, deckId]);

  const currentFolderId = folderStack.length ? folderStack[folderStack.length - 1].id : null;
  const visibleTiles = useMemo(
    () => tiles.filter((t) => (t.folder_id ?? null) === currentFolderId),
    [tiles, currentFolderId],
  );

  const deck = decks.find((d) => d.id === deckId) ?? null;
  const cols = Math.min(deck?.cols ?? 4, 6);

  const onTilePress = (tile: DeckTile) => {
    if (tile.kind === "folder" && tile.target_folder_id) {
      setFolderStack((s) => [...s, { id: tile.target_folder_id!, label: tile.label ?? "Folder" }]);
      return;
    }
    runTile(tile);
  };

  // Drag handling — simple pointer-based drag from the title bar / grip.
  const startDrag = (e: React.PointerEvent) => {
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;
    (e.target as Element).setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      const maxX = Math.max(0, window.innerWidth - 120);
      const maxY = Math.max(0, window.innerHeight - 40);
      setPos({
        x: Math.max(0, Math.min(maxX, ev.clientX - startX)),
        y: Math.max(0, Math.min(maxY, ev.clientY - startY)),
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (!open) return null;

  return (
    <div
      className="fixed z-[60] select-none rounded-xl border border-border/70 bg-background/95 shadow-[0_10px_40px_rgba(0,0,0,.35)] backdrop-blur"
      style={{ left: pos.x, top: pos.y, width: minimized ? 220 : size }}
      role="dialog"
      aria-label="Floating deck"
    >
      {/* Title bar */}
      <div
        className="flex cursor-grab items-center gap-1 rounded-t-xl border-b border-border/50 bg-muted/50 px-2 py-1.5 active:cursor-grabbing"
        onPointerDown={startDrag}
      >
        <Grip className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex-1 min-w-0" onPointerDown={(e) => e.stopPropagation()}>
          <Select value={deckId ?? ""} onValueChange={(v) => { setDeckId(v); setFolderStack([]); }}>
            <SelectTrigger className="h-6 border-none bg-transparent px-1 text-xs font-medium focus:ring-0">
              <SelectValue placeholder="Pick a deck" />
            </SelectTrigger>
            <SelectContent>
              {decks.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setMinimized((v) => !v)}
          aria-label={minimized ? "Expand" : "Minimize"}
        >
          {minimized ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!minimized && (
        <>
          {/* Breadcrumbs */}
          {folderStack.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 border-b border-border/40 px-2 py-1 text-[10px] text-muted-foreground">
              <button className="hover:text-foreground" onClick={() => setFolderStack([])}>Root</button>
              {folderStack.map((f, i) => (
                <span key={f.id} className="flex items-center gap-1">
                  <span>›</span>
                  <button className="hover:text-foreground" onClick={() => setFolderStack((s) => s.slice(0, i + 1))}>{f.label}</button>
                </span>
              ))}
            </div>
          )}

          {/* Tile grid */}
          <div className="p-2">
            {!deckId ? (
              <p className="p-3 text-center text-xs text-muted-foreground">Pick a deck above.</p>
            ) : visibleTiles.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">No tiles here yet.</p>
            ) : (
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {visibleTiles.map((tile) => (
                  <button
                    key={tile.id}
                    onClick={() => onTilePress(tile)}
                    className="aspect-square rounded-md border border-border/60 p-1.5 text-left text-[10px] transition active:scale-95 hover:border-primary/60"
                    style={{ background: tile.bg_color ?? "hsl(var(--muted))", color: tile.fg_color ?? undefined }}
                    title={tile.label ?? ""}
                  >
                    <div className="flex h-full flex-col justify-between">
                      <div className="text-base leading-none">{tile.icon ?? (tile.kind === "folder" ? "📁" : "•")}</div>
                      <div className="truncate font-medium">{tile.label ?? ""}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resize footer */}
          <div className="flex items-center justify-between border-t border-border/40 px-2 py-1 text-[10px] text-muted-foreground">
            <span>{visibleTiles.length} tiles</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setSize((s) => Math.max(220, s - 40))} aria-label="Shrink" className="hover:text-foreground">
                <Minimize2 className="h-3 w-3" />
              </button>
              <button onClick={() => setSize((s) => Math.min(520, s + 40))} aria-label="Enlarge" className="hover:text-foreground">
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
