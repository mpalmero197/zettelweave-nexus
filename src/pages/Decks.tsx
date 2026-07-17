import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Download, Upload, Sparkles, ArrowLeft, LayoutGrid, Play } from "lucide-react";
import { useDecks, useDeckTiles, type Deck, type DeckTile } from "@/hooks/useDecks";
import { useDeckContextRules, type ContextMatchType } from "@/hooks/useDeckContextRules";
import { PREBUILT_MACROS } from "@/lib/macros/prebuilt";
import { useAuth } from "@/hooks/useAuth";
import { DeckTileWidget } from "@/components/deck/DeckTileWidget";


interface MacroLite { id: string; name: string }

const WIDGET_TYPES = [
  { id: "clock", label: "Clock" },
  { id: "counter", label: "Counter" },
  { id: "pomodoro", label: "Pomodoro" },
  { id: "stopwatch", label: "Stopwatch" },
  { id: "writing_streak", label: "Writing streak" },
  { id: "zettel_count", label: "Zettel count" },
  { id: "weather", label: "Weather" },
  { id: "alice_status", label: "ALICE status" },
];

export default function Decks() {
  const { decks, loading, createDeck, updateDeck, deleteDeck, refresh } = useDecks();
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeDeckId && decks.length) setActiveDeckId(decks[0].id);
  }, [decks, activeDeckId]);

  const activeDeck = decks.find((d) => d.id === activeDeckId) ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/app"><ArrowLeft className="mr-1 h-4 w-4" />Back</Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Deck Studio
            </h1>
            <p className="text-xs text-muted-foreground">Tap-tile control decks — Macro Deck for ALICE.</p>
          </div>
        </div>
        <Button onClick={() => createDeck()} size="sm"><Plus className="mr-1 h-4 w-4" />New deck</Button>
      </header>

      <div className="grid gap-0 md:grid-cols-[240px_1fr_320px]">
        {/* Deck list */}
        <aside className="border-r border-border/60 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Your decks</div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : decks.length === 0 ? (
            <div className="text-sm text-muted-foreground">No decks yet.</div>
          ) : (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-1">
                {decks.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setActiveDeckId(d.id)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                      d.id === activeDeckId ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <div className="truncate font-medium">{d.name}</div>
                    <div className="text-[10px] text-muted-foreground">{d.cols}×{d.rows}{d.is_default ? " · default" : ""}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </aside>

        {/* Editor */}
        <main className="p-4">
          {activeDeck ? (
            <DeckEditor deck={activeDeck} onDeckChange={(p) => updateDeck(activeDeck.id, p)} onDelete={async () => {
              await deleteDeck(activeDeck.id);
              setActiveDeckId(null);
            }} onDuplicate={async () => {
              await refresh();
            }} />
          ) : (
            <EmptyState onCreate={() => createDeck()} />
          )}
        </main>

        {/* Right rail rendered inside DeckEditor via portal-less state */}
        <div id="deck-inspector-slot" className="border-l border-border/60 p-4" />
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <Sparkles className="h-10 w-10 text-primary" />
      <h2 className="text-xl font-semibold">Build your first deck</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Decks turn one tap into anything: run a macro, open a chat with ALICE, fire a hotkey, or show a live widget.
      </p>
      <Button onClick={onCreate}><Plus className="mr-1 h-4 w-4" />New deck</Button>
    </div>
  );
}

function DeckEditor({ deck, onDeckChange, onDelete }: {
  deck: Deck;
  onDeckChange: (patch: Partial<Deck>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { tiles, createTile, updateTile, deleteTile } = useDeckTiles(deck.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [macros, setMacros] = useState<MacroLite[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshMacros = useCallback(async () => {
    const { data } = await supabase.from("alice_macros").select("id, name").order("name");
    setMacros((data as MacroLite[]) ?? []);
  }, []);
  useEffect(() => { refreshMacros(); }, [refreshMacros]);

  const selected = useMemo(() => tiles.find((t) => t.id === selectedId) ?? null, [tiles, selectedId]);

  const gridCells: (DeckTile | null)[] = useMemo(() => {
    const grid: (DeckTile | null)[] = Array(deck.cols * deck.rows).fill(null);
    for (const t of tiles) {
      const idx = t.y * deck.cols + t.x;
      if (idx >= 0 && idx < grid.length) grid[idx] = t;
    }
    return grid;
  }, [tiles, deck.cols, deck.rows]);

  const addTileAt = async (x: number, y: number) => {
    const t = await createTile({ x, y, w: 1, h: 1, kind: "noop", label: "New tile" });
    if (t) setSelectedId(t.id);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ deck, tiles }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${deck.name.replace(/\s+/g, "-").toLowerCase()}.deck.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const importedTiles: Partial<DeckTile>[] = parsed?.tiles ?? [];
      for (const t of importedTiles) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, deck_id: _dId, ...rest } = t as Record<string, unknown> & DeckTile;
        await createTile(rest as Partial<DeckTile>);
      }
      toast({ title: "Imported", description: `${importedTiles.length} tiles added.` });
    } catch (e) {
      toast({ title: "Import failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Deck toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={deck.name}
          onChange={(e) => onDeckChange({ name: e.target.value })}
          className="max-w-xs"
        />
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground">Cols</Label>
          <Input
            type="number"
            min={1}
            max={12}
            value={deck.cols}
            onChange={(e) => onDeckChange({ cols: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })}
            className="h-9 w-16"
          />
          <Label className="text-xs text-muted-foreground">Rows</Label>
          <Input
            type="number"
            min={1}
            max={12}
            value={deck.rows}
            onChange={(e) => onDeckChange({ rows: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })}
            className="h-9 w-16"
          />
        </div>
        <Badge variant="outline">{tiles.length} tiles</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" variant="default">
            <Link to={`/deck/${deck.id}`}><Play className="mr-1 h-4 w-4" />Run</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={exportJson}><Download className="mr-1 h-4 w-4" />Export</Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
          />
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="mr-1 h-4 w-4" />Delete
          </Button>
        </div>
      </div>

      {/* Grid canvas */}
      <div className="rounded-lg border border-border/60 bg-card/40 p-4">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${deck.cols}, minmax(0, 1fr))` }}
        >
          {gridCells.map((tile, idx) => {
            const x = idx % deck.cols;
            const y = Math.floor(idx / deck.cols);
            if (!tile) {
              return (
                <button
                  key={`empty-${idx}`}
                  onClick={() => addTileAt(x, y)}
                  className="aspect-square rounded-md border border-dashed border-border/60 text-muted-foreground/60 transition hover:border-primary/60 hover:text-primary"
                >
                  <Plus className="mx-auto h-4 w-4" />
                </button>
              );
            }
            const isSelected = tile.id === selectedId;
            return (
              <button
                key={tile.id}
                onClick={() => setSelectedId(tile.id)}
                className={`aspect-square rounded-md border p-2 text-left text-xs transition ${
                  isSelected ? "border-primary ring-2 ring-primary/40" : "border-border/60 hover:border-primary/60"
                }`}
                style={{
                  background: tile.bg_color ?? "hsl(var(--muted))",
                  color: tile.fg_color ?? undefined,
                }}
              >
                {tile.kind === "widget" ? (
                  <div className="h-full w-full overflow-hidden">
                    <DeckTileWidget type={tile.widget_type} label={tile.label} />
                  </div>
                ) : (
                  <div className="flex h-full flex-col justify-between">
                    <div className="text-lg leading-none">{tile.icon ?? "•"}</div>
                    <div className="truncate font-medium">{tile.label ?? "(untitled)"}</div>
                    <div className="text-[10px] uppercase opacity-60">{tile.kind}</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {selected ? (
        <TileInspector
          tile={selected}
          macros={macros}
          onMacrosChanged={refreshMacros}
          onChange={(patch) => updateTile(selected.id, patch)}
          onDelete={() => { deleteTile(selected.id); setSelectedId(null); }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Select a tile to edit — or tap a + slot to add one.</p>
      )}

      <ContextRulesPanel deckId={deck.id} />
    </div>
  );
}

function ContextRulesPanel({ deckId }: { deckId: string }) {
  const { rules, create, update, remove } = useDeckContextRules(deckId);
  const [draftType, setDraftType] = useState<ContextMatchType>("url_prefix");
  const [draftValue, setDraftValue] = useState("");

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="mb-2">
        <h3 className="text-sm font-semibold">Auto-switch rules</h3>
        <p className="text-xs text-muted-foreground">
          Open this deck automatically when the runtime detects matching context.
        </p>
      </div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Match</Label>
          <Select value={draftType} onValueChange={(v) => setDraftType(v as ContextMatchType)}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="url_prefix">URL prefix</SelectItem>
              <SelectItem value="tab">App tab</SelectItem>
              <SelectItem value="site_host">Site host</SelectItem>
              <SelectItem value="topic">Topic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px] space-y-1">
          <Label className="text-xs">Value</Label>
          <Input
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            placeholder={draftType === "url_prefix" ? "/app/catalyst" : draftType === "tab" ? "catalyst" : draftType === "site_host" ? "github.com" : "writing"}
          />
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (!draftValue.trim()) return;
            create({ match_type: draftType, match_value: draftValue.trim() });
            setDraftValue("");
          }}
        ><Plus className="mr-1 h-4 w-4" />Add</Button>
      </div>
      {rules.length === 0 ? (
        <p className="text-xs text-muted-foreground">No rules yet.</p>
      ) : (
        <div className="space-y-1">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-md border border-border/40 px-2 py-1.5 text-sm">
              <Badge variant="outline" className="text-[10px]">{r.match_type}</Badge>
              <Input
                value={r.match_value}
                onChange={(e) => update(r.id, { match_value: e.target.value })}
                className="h-8 flex-1"
              />
              <Input
                type="number"
                value={r.priority}
                onChange={(e) => update(r.id, { priority: Number(e.target.value) || 100 })}
                className="h-8 w-20"
                title="Priority (lower wins)"
              />
              <Button
                size="sm"
                variant={r.enabled ? "default" : "outline"}
                onClick={() => update(r.id, { enabled: !r.enabled })}
              >{r.enabled ? "On" : "Off"}</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function TileInspector({ tile, macros, onChange, onDelete, onMacrosChanged }: {
  tile: DeckTile;
  macros: MacroLite[];
  onChange: (patch: Partial<DeckTile>) => void;
  onDelete: () => void;
  onMacrosChanged?: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const installPrebuilt = async (slug: string) => {
    const pb = PREBUILT_MACROS.find((m) => m.slug === slug);
    if (!pb || !user) return;
    // Reuse an existing install if the same prebuilt was already added.
    const existing = macros.find((m) => m.name === pb.name);
    if (existing) { onChange({ macro_id: existing.id, label: tile.label ?? pb.name, icon: tile.icon ?? pb.icon }); return; }
    const { data, error } = await supabase.from("alice_macros").insert({
      user_id: user.id,
      name: pb.name,
      description: pb.description,
      start_url: pb.start_url || "",
      target_domain: pb.target_domain,
      tags: pb.tags,
      steps: pb.steps,
      source: "prebuilt",
    } as never).select("id").single();
    if (error || !data) return;
    await onMacrosChanged?.();
    onChange({ macro_id: (data as { id: string }).id, label: tile.label ?? pb.name, icon: tile.icon ?? pb.icon });
  };
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tile inspector</h3>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="mr-1 h-4 w-4" />Remove
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input value={tile.label ?? ""} onChange={(e) => onChange({ label: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Icon (emoji or single char)</Label>
          <Input value={tile.icon ?? ""} onChange={(e) => onChange({ icon: e.target.value })} placeholder="⚡" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Background</Label>
          <Input type="color" value={tile.bg_color ?? "#1a1428"} onChange={(e) => onChange({ bg_color: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Foreground</Label>
          <Input type="color" value={tile.fg_color ?? "#ffffff"} onChange={(e) => onChange({ fg_color: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Kind</Label>
          <Select value={tile.kind} onValueChange={(v) => onChange({ kind: v as DeckTile["kind"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="noop">Nothing (placeholder)</SelectItem>
              <SelectItem value="macro">Run macro</SelectItem>
              <SelectItem value="alice_chat">Send prompt to ALICE</SelectItem>
              <SelectItem value="hotkey">Fire hotkey</SelectItem>
              <SelectItem value="url">Open URL</SelectItem>
              <SelectItem value="widget">Live widget</SelectItem>
              <SelectItem value="folder">Enter folder</SelectItem>
              <SelectItem value="multi">Multi-action</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {tile.kind === "macro" && (
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Macro</Label>
            <Select
              value={tile.macro_id ?? ""}
              onValueChange={(v) => {
                if (v.startsWith("prebuilt:")) { installPrebuilt(v.slice("prebuilt:".length)); return; }
                onChange({ macro_id: v || null });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Pick a macro" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {macros.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Your macros</div>
                    {macros.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </>
                )}
                <div className="mt-1 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground border-t border-border/40">
                  Prebuilt (installs on select)
                </div>
                {PREBUILT_MACROS.map((p) => (
                  <SelectItem key={p.slug} value={`prebuilt:${p.slug}`}>
                    {p.icon} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {tile.kind === "widget" && (
          <div className="space-y-1">
            <Label className="text-xs">Widget type</Label>
            <Select value={tile.widget_type ?? ""} onValueChange={(v) => onChange({ widget_type: v })}>
              <SelectTrigger><SelectValue placeholder="Pick a widget" /></SelectTrigger>
              <SelectContent>
                {WIDGET_TYPES.map((w) => <SelectItem key={w.id} value={w.id}>{w.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {tile.kind === "hotkey" && (
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Hotkey</Label>
            <Input value={tile.hotkey ?? ""} onChange={(e) => onChange({ hotkey: e.target.value })} placeholder="Ctrl+Shift+M" />
          </div>
        )}
        {tile.kind === "url" && (
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">URL</Label>
            <Input
              value={(tile.config?.url as string) ?? ""}
              onChange={(e) => onChange({ config: { ...tile.config, url: e.target.value } })}
              placeholder="https://…"
            />
          </div>
        )}
        {tile.kind === "alice_chat" && (
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Prompt</Label>
            <Textarea
              value={(tile.config?.prompt as string) ?? ""}
              onChange={(e) => onChange({ config: { ...tile.config, prompt: e.target.value } })}
              rows={3}
            />
          </div>
        )}
        <div className="grid grid-cols-4 gap-2 md:col-span-2">
          <div className="space-y-1">
            <Label className="text-xs">X</Label>
            <Input type="number" min={0} value={tile.x} onChange={(e) => onChange({ x: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Y</Label>
            <Input type="number" min={0} value={tile.y} onChange={(e) => onChange({ y: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">W</Label>
            <Input type="number" min={1} max={12} value={tile.w} onChange={(e) => onChange({ w: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">H</Label>
            <Input type="number" min={1} max={12} value={tile.h} onChange={(e) => onChange({ h: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} />
          </div>
        </div>
      </div>
    </div>
  );
}
