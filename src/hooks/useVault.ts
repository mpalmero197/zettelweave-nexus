import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  decryptPayload,
  encryptPayload,
  enrollPasskey,
  extractHost,
  listPasskeys,
  unlockVault,
  VaultItem,
  VaultItemPayload,
  VaultItemType,
  VaultPasskey,
} from "@/lib/vault/crypto";

const AUTO_LOCK_MS = 5 * 60 * 1000;

export function useVault() {
  const { user } = useAuth();
  const [keyState, setKeyState] = useState<CryptoKey | null>(null);
  const [passkeys, setPasskeys] = useState<VaultPasskey[]>([]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const lockTimer = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    if (lockTimer.current) window.clearTimeout(lockTimer.current);
    lockTimer.current = window.setTimeout(() => setKeyState(null), AUTO_LOCK_MS);
  }, []);

  // Load metadata (passkeys + ciphertext list) — never decrypted yet
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [pks, itm] = await Promise.all([
        listPasskeys(user.id),
        supabase
          .from("vault_items")
          .select("id,item_type,label,host,ciphertext,iv,updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
      ]);
      if (!active) return;
      setPasskeys(pks);
      setItems((itm.data || []) as VaultItem[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const enroll = useCallback(
    async (label?: string) => {
      if (!user) throw new Error("Not signed in");
      const pk = await enrollPasskey(user.id, user.email || "", label || "This device");
      setPasskeys((p) => [...p, pk]);
      return pk;
    },
    [user]
  );

  const unlock = useCallback(async () => {
    if (!user) throw new Error("Not signed in");
    setUnlocking(true);
    try {
      const k = await unlockVault(user.id);
      setKeyState(k);
      resetTimer();
      return k;
    } finally {
      setUnlocking(false);
    }
  }, [user, resetTimer]);

  const lock = useCallback(() => {
    setKeyState(null);
    if (lockTimer.current) window.clearTimeout(lockTimer.current);
  }, []);

  const saveItem = useCallback(
    async (
      type: VaultItemType,
      payload: VaultItemPayload,
      existingId?: string
    ) => {
      if (!user || !keyState) throw new Error("Vault is locked");
      const { iv, ciphertext } = await encryptPayload(keyState, payload);
      const label = payload.title || payload.username || payload.email || "Untitled";
      const host = extractHost(payload.url);
      if (existingId) {
        const { error } = await supabase
          .from("vault_items")
          .update({ ciphertext, iv, label, host, item_type: type })
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vault_items").insert({
          user_id: user.id,
          item_type: type,
          label,
          host,
          ciphertext,
          iv,
        });
        if (error) throw error;
      }
      const { data } = await supabase
        .from("vault_items")
        .select("id,item_type,label,host,ciphertext,iv,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setItems((data || []) as VaultItem[]);
      resetTimer();
    },
    [user, keyState, resetTimer]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("vault_items").delete().eq("id", id);
      if (error) throw error;
      setItems((arr) => arr.filter((i) => i.id !== id));
    },
    []
  );

  const decryptItem = useCallback(
    async (item: VaultItem): Promise<VaultItemPayload> => {
      if (!keyState) throw new Error("Vault is locked");
      resetTimer();
      return decryptPayload(keyState, item.ciphertext, item.iv);
    },
    [keyState, resetTimer]
  );

  return {
    user,
    loading,
    unlocking,
    passkeys,
    items,
    unlocked: !!keyState,
    enroll,
    unlock,
    lock,
    saveItem,
    deleteItem,
    decryptItem,
  };
}
