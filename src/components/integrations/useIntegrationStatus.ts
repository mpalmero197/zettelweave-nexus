import { useState, useCallback, useEffect } from "react";
import type { ConnectionMeta, IntegrationHealth } from "./types";

const STORAGE_KEY = "pendragon:integrations-meta";

function loadMeta(): Record<string, ConnectionMeta> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveMeta(meta: Record<string, ConnectionMeta>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

/**
 * Manages integration connection state, health, and sync metadata.
 */
export function useIntegrationStatus() {
  const [meta, setMeta] = useState<Record<string, ConnectionMeta>>(loadMeta);

  useEffect(() => { saveMeta(meta); }, [meta]);

  const connectedIds = new Set(Object.keys(meta));

  const connect = useCallback((id: string, itemsSynced?: number) => {
    setMeta((prev) => ({
      ...prev,
      [id]: {
        connectedAt: prev[id]?.connectedAt || Date.now(),
        lastSyncAt: Date.now(),
        itemsSynced: (prev[id]?.itemsSynced || 0) + (itemsSynced || 0),
        health: "healthy",
      },
    }));
  }, []);

  const disconnect = useCallback((id: string) => {
    setMeta((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    // Also clean up legacy keys
    const legacyKeys: Record<string, string[]> = {
      slack: ["pendragon:slack-webhook"],
      webhooks: ["pendragon:zapier-webhook"],
      todoist: ["pendragon:todoist-token"],
      "google-calendar": ["pendragon:gcal-api-key", "pendragon:gcal-calendar-id"],
      "google-drive": ["pendragon:gdrive-client-id", "pendragon:gdrive-api-key"],
    };
    legacyKeys[id]?.forEach((k) => localStorage.removeItem(k));
  }, []);

  const setHealth = useCallback((id: string, health: IntegrationHealth, error?: string) => {
    setMeta((prev) => {
      if (!prev[id]) return prev;
      return { ...prev, [id]: { ...prev[id], health, error } };
    });
  }, []);

  const recordSync = useCallback((id: string, itemsSynced: number) => {
    setMeta((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          lastSyncAt: Date.now(),
          itemsSynced: (prev[id].itemsSynced || 0) + itemsSynced,
          health: "healthy",
          error: undefined,
        },
      };
    });
  }, []);

  const getMeta = useCallback((id: string): ConnectionMeta | undefined => meta[id], [meta]);

  // Health check: validate stored credentials still exist
  const runHealthChecks = useCallback(() => {
    const credentialKeys: Record<string, string> = {
      slack: "pendragon:slack-webhook",
      webhooks: "pendragon:zapier-webhook",
      todoist: "pendragon:todoist-token",
      "google-calendar": "pendragon:gcal-api-key",
      "google-drive": "pendragon:gdrive-client-id",
    };

    setMeta((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(next)) {
        const key = credentialKeys[id];
        if (key && !localStorage.getItem(key)) {
          next[id] = { ...next[id], health: "error", error: "Credentials missing" };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  // Run health checks on mount
  useEffect(() => { runHealthChecks(); }, [runHealthChecks]);

  return { connectedIds, meta, connect, disconnect, setHealth, recordSync, getMeta, runHealthChecks };
}
