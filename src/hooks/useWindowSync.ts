import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Cross-window sync via BroadcastChannel.
 *
 * Any window can call `broadcast({ type: "invalidate", keys: [["cards"]] })`
 * after a mutation, and every other open Baku Scribe window will invalidate
 * the matching React Query caches and refetch — giving live multi-window sync
 * on top of the existing Supabase realtime layer.
 */

export type WindowSyncMessage =
  | { type: "invalidate"; keys: (string | readonly unknown[])[] }
  | { type: "tab-change"; tab: string; windowId: string }
  | { type: "ping"; windowId: string };

const CHANNEL_NAME = "pendragonx-sync";

// Stable per-tab id so we can ignore our own messages
const WINDOW_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function getWindowId() {
  return WINDOW_ID;
}

let sharedChannel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!sharedChannel) {
    try {
      sharedChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      sharedChannel = null;
    }
  }
  return sharedChannel;
}

/** Broadcast a message to every other Baku Scribe window. */
export function broadcast(message: WindowSyncMessage) {
  const ch = getChannel();
  if (!ch) return;
  try {
    ch.postMessage({ ...message, _from: WINDOW_ID });
  } catch {
    // ignore
  }
}

/** Convenience: tell other windows to refetch given query keys. */
export function broadcastInvalidate(keys: (string | readonly unknown[])[]) {
  broadcast({ type: "invalidate", keys });
}

/**
 * Mount once near the app root. Listens for messages from other windows and
 * invalidates the relevant React Query caches. Also auto-broadcasts whenever
 * a mutation succeeds in *this* window, so other windows refresh without any
 * per-hook changes.
 */
export function useWindowSync() {
  const qc = useQueryClient();
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const ch = getChannel();

    // 1) Receive: invalidate caches when other windows mutate
    const onMessage = (e: MessageEvent) => {
      const data = e.data as (WindowSyncMessage & { _from?: string }) | null;
      if (!data || data._from === WINDOW_ID) return;

      if (data.type === "invalidate") {
        for (const key of data.keys) {
          const queryKey = Array.isArray(key) ? key : [key];
          qc.invalidateQueries({ queryKey });
        }
      }
    };
    ch?.addEventListener("message", onMessage);

    // 2) Send: when a query is invalidated locally (typical post-mutation
    // pattern across our hooks), tell other windows to invalidate too.
    const queryUnsub = qc.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action?.type === "invalidate") {
        const key = event.query.queryKey;
        if (Array.isArray(key) && key.length > 0) {
          broadcast({ type: "invalidate", keys: [key] });
        }
      }
    });

    return () => {
      ch?.removeEventListener("message", onMessage);
      queryUnsub();
    };
  }, [qc]);
}
