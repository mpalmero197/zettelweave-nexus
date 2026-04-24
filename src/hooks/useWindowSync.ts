import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Cross-window sync via BroadcastChannel.
 *
 * Any window can call `broadcast({ type: "invalidate", keys: [["cards"]] })`
 * after a mutation, and every other open PendragonX window will invalidate
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

/** Broadcast a message to every other PendragonX window. */
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
 * invalidates the relevant React Query caches.
 */
export function useWindowSync() {
  const qc = useQueryClient();
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const ch = getChannel();
    if (!ch) return;

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

    ch.addEventListener("message", onMessage);
    return () => {
      ch.removeEventListener("message", onMessage);
    };
  }, [qc]);
}
