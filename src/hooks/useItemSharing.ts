import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ShareableItemType =
  | "zettel_card"
  | "note"
  | "file"
  | "mind_map"
  | "catalyst_document"
  | "sticky_note"
  | "scratchpad";

export type SharePermission = "view" | "edit";
export type ShareMode = "copy" | "collaborate";

export interface SharedItemRecord {
  id: string;
  owner_id: string;
  recipient_id: string;
  item_type: ShareableItemType;
  item_id: string;
  permission: SharePermission;
  share_mode: ShareMode;
  status: string;
  message: string | null;
  cloned_item_id: string | null;
  created_at: string;
  last_viewed_at: string | null;
}

export function useItemSharing() {
  const [sharing, setSharing] = useState(false);

  const shareItem = useCallback(async (params: {
    recipient_ids: string[];
    item_type: ShareableItemType;
    item_id: string;
    permission: SharePermission;
    share_mode: ShareMode;
    message?: string;
  }) => {
    setSharing(true);
    try {
      const { data, error } = await supabase.functions.invoke("share-item", { body: params });
      if (error) throw error;
      const errs = (data as any)?.errors || [];
      const ok = (data as any)?.shared || [];
      if (ok.length > 0) {
        toast.success(`Shared with ${ok.length} ${ok.length === 1 ? "person" : "people"}`);
      }
      if (errs.length > 0) {
        toast.error(`${errs.length} share(s) failed: ${errs[0].error}`);
      }
      return data;
    } catch (err: any) {
      toast.error(err.message || "Failed to share");
      throw err;
    } finally {
      setSharing(false);
    }
  }, []);

  const unshareItem = useCallback(async (shareId: string) => {
    const { error } = await supabase.from("shared_items").delete().eq("id", shareId);
    if (error) {
      toast.error("Failed to remove share");
      return false;
    }
    toast.success("Share removed");
    return true;
  }, []);

  return { sharing, shareItem, unshareItem };
}

export function useSharedWithMe() {
  const [items, setItems] = useState<SharedItemRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("shared_items")
      .select("*")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data || []) as SharedItemRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("shared-items-rx")
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_items" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  return { items, loading, refresh };
}

export function useSharesForItem(itemType: ShareableItemType, itemId: string | null) {
  const [shares, setShares] = useState<SharedItemRecord[]>([]);

  const refresh = useCallback(async () => {
    if (!itemId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("shared_items")
      .select("*")
      .eq("owner_id", user.id)
      .eq("item_type", itemType)
      .eq("item_id", itemId);
    setShares((data || []) as SharedItemRecord[]);
  }, [itemType, itemId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { shares, refresh };
}
