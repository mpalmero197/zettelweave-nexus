import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ShareableItemType } from "./useItemSharing";

export interface PresenceUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_editing: boolean;
  last_seen_at: string;
}

/**
 * Track live presence on a shared item. Heartbeats every 20s.
 */
export function useItemPresence(itemType: ShareableItemType, itemId: string | null, isEditing = false) {
  const [collaborators, setCollaborators] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    let heartbeat: number | undefined;
    let myUserId: string | null = null;

    const tick = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      myUserId = user.id;
      await supabase.from("item_presence").upsert({
        item_type: itemType,
        item_id: itemId,
        user_id: user.id,
        is_editing: isEditing,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "item_type,item_id,user_id" });
      await loadCollaborators(user.id);
    };

    const loadCollaborators = async (selfId: string) => {
      const cutoff = new Date(Date.now() - 60_000).toISOString();
      const { data: presence } = await supabase
        .from("item_presence")
        .select("user_id, is_editing, last_seen_at")
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .neq("user_id", selfId)
        .gte("last_seen_at", cutoff);
      if (cancelled || !presence) return;
      const ids = presence.map(p => p.user_id);
      if (ids.length === 0) { setCollaborators([]); return; }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);
      const merged = presence.map(p => {
        const prof = profiles?.find(pr => pr.user_id === p.user_id);
        return {
          user_id: p.user_id,
          display_name: prof?.display_name || null,
          avatar_url: prof?.avatar_url || null,
          is_editing: p.is_editing,
          last_seen_at: p.last_seen_at,
        };
      });
      setCollaborators(merged);
    };

    tick();
    heartbeat = window.setInterval(tick, 20000);

    const channel = supabase
      .channel(`presence-${itemType}-${itemId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "item_presence",
        filter: `item_id=eq.${itemId}`,
      }, () => { if (myUserId) loadCollaborators(myUserId); })
      .subscribe();

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      supabase.removeChannel(channel);
      if (myUserId) {
        supabase.from("item_presence").delete()
          .eq("user_id", myUserId)
          .eq("item_type", itemType)
          .eq("item_id", itemId);
      }
    };
  }, [itemType, itemId, isEditing]);

  return { collaborators };
}
