import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ContextMatchType = "url_prefix" | "tab" | "site_host" | "topic";

export interface DeckContextRule {
  id: string;
  user_id: string;
  deck_id: string;
  match_type: ContextMatchType;
  match_value: string;
  priority: number;
  enabled: boolean;
}

/** Rules for one deck (used in the editor). */
export function useDeckContextRules(deckId: string | null) {
  const [rules, setRules] = useState<DeckContextRule[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!deckId) { setRules([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("alice_deck_context_rules")
      .select("*")
      .eq("deck_id", deckId)
      .order("priority", { ascending: true });
    if (error) toast({ title: "Failed to load rules", description: error.message, variant: "destructive" });
    setRules((data as DeckContextRule[]) ?? []);
    setLoading(false);
  }, [deckId]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (patch: Partial<DeckContextRule>) => {
    if (!deckId) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("alice_deck_context_rules").insert({
      deck_id: deckId,
      user_id: u.user.id,
      match_type: patch.match_type ?? "url_prefix",
      match_value: patch.match_value ?? "",
      priority: patch.priority ?? 100,
      enabled: patch.enabled ?? true,
    });
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else refresh();
  }, [deckId, refresh]);

  const update = useCallback(async (id: string, patch: Partial<DeckContextRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from("alice_deck_context_rules").update(patch).eq("id", id);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); refresh(); }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from("alice_deck_context_rules").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); refresh(); }
  }, [refresh]);

  return { rules, loading, refresh, create, update, remove };
}

/** Resolve which deck should be active for the current context. */
export function matchRules(
  rules: DeckContextRule[],
  ctx: { path: string; tab: string; host?: string; topic?: string },
): DeckContextRule | null {
  const enabled = rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
  for (const r of enabled) {
    const v = r.match_value.trim().toLowerCase();
    if (!v) continue;
    switch (r.match_type) {
      case "url_prefix":
        if (ctx.path.toLowerCase().startsWith(v)) return r;
        break;
      case "tab":
        if (ctx.tab.toLowerCase() === v) return r;
        break;
      case "site_host":
        if (ctx.host && ctx.host.toLowerCase().includes(v)) return r;
        break;
      case "topic":
        if (ctx.topic && ctx.topic.toLowerCase().includes(v)) return r;
        break;
    }
  }
  return null;
}

/** Load all rules for the signed-in user (used by the runtime auto-switcher). */
export function useAllUserContextRules() {
  const [rules, setRules] = useState<DeckContextRule[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("alice_deck_context_rules")
        .select("*")
        .eq("enabled", true)
        .order("priority", { ascending: true });
      if (!cancelled) setRules((data as DeckContextRule[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  return rules;
}
