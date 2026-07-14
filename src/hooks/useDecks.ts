import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Deck {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cols: number;
  rows: number;
  background: string | null;
  theme: string;
  is_default: boolean;
  updated_at: string;
}

export interface DeckTile {
  id: string;
  deck_id: string;
  folder_id: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "macro" | "folder" | "widget" | "multi" | "noop" | "alice_chat" | "hotkey" | "url";
  label: string | null;
  icon: string | null;
  bg_color: string | null;
  fg_color: string | null;
  macro_id: string | null;
  target_folder_id: string | null;
  widget_type: string | null;
  config: Record<string, unknown>;
  hotkey: string | null;
}

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("alice_decks")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast({ title: "Failed to load decks", description: error.message, variant: "destructive" });
    setDecks((data as Deck[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createDeck = useCallback(async (name = "New Deck") => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data, error } = await supabase
      .from("alice_decks")
      .insert({ user_id: u.user.id, name })
      .select("*")
      .single();
    if (error) { toast({ title: "Create failed", description: error.message, variant: "destructive" }); return null; }
    await refresh();
    return data as Deck;
  }, [refresh]);

  const updateDeck = useCallback(async (id: string, patch: Partial<Deck>) => {
    const { error } = await supabase.from("alice_decks").update(patch).eq("id", id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else await refresh();
  }, [refresh]);

  const deleteDeck = useCallback(async (id: string) => {
    const { error } = await supabase.from("alice_decks").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else await refresh();
  }, [refresh]);

  return { decks, loading, refresh, createDeck, updateDeck, deleteDeck };
}

export function useDeckTiles(deckId: string | null) {
  const [tiles, setTiles] = useState<DeckTile[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!deckId) { setTiles([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("alice_deck_tiles")
      .select("*")
      .eq("deck_id", deckId);
    if (error) toast({ title: "Failed to load tiles", description: error.message, variant: "destructive" });
    setTiles((data as DeckTile[]) ?? []);
    setLoading(false);
  }, [deckId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createTile = useCallback(async (tile: Partial<DeckTile>) => {
    if (!deckId) return null;
    const { data, error } = await supabase
      .from("alice_deck_tiles")
      .insert({ deck_id: deckId, ...tile })
      .select("*")
      .single();
    if (error) { toast({ title: "Add tile failed", description: error.message, variant: "destructive" }); return null; }
    await refresh();
    return data as DeckTile;
  }, [deckId, refresh]);

  const updateTile = useCallback(async (id: string, patch: Partial<DeckTile>) => {
    // Optimistic
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } as DeckTile : t)));
    const { error } = await supabase.from("alice_deck_tiles").update(patch).eq("id", id);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); refresh(); }
  }, [refresh]);

  const deleteTile = useCallback(async (id: string) => {
    setTiles((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("alice_deck_tiles").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); refresh(); }
  }, [refresh]);

  return { tiles, loading, refresh, createTile, updateTile, deleteTile };
}
