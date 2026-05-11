import { useCallback, useEffect, useState } from "react";

/**
 * Lightweight client-side log of ALICE actions that can be undone.
 * Each entry records an inverse instruction we can ship back to ALICE
 * (e.g. "Delete the note you just created with id X") so the user can
 * roll back the most recent action with one tap.
 *
 * Stored in localStorage keyed by user (the auth layer scopes the
 * browser session already). Capped to the last 25 entries.
 */
export interface AliceActionLogEntry {
  id: string;
  /** Human label shown in the undo banner. */
  label: string;
  /** Tool that performed the original action (for icon/grouping). */
  tool: string;
  /** Natural-language instruction sent back to ALICE to reverse it. */
  inverseInstruction: string;
  /** Optional structured payload (id of created entity, etc.). */
  payload?: Record<string, unknown>;
  createdAt: number;
  /** True once we've issued the undo so it doesn't show again. */
  undone?: boolean;
}

const STORAGE_KEY = "alice.action-log.v1";
const MAX_ENTRIES = 25;
const CHANNEL = "alice-action-log-changed";

function read(): AliceActionLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AliceActionLogEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: AliceActionLogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  window.dispatchEvent(new CustomEvent(CHANNEL));
}

export function useAliceActionLog() {
  const [entries, setEntries] = useState<AliceActionLogEntry[]>(() => read());

  useEffect(() => {
    const sync = () => setEntries(read());
    window.addEventListener(CHANNEL, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANNEL, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const record = useCallback((entry: Omit<AliceActionLogEntry, "id" | "createdAt">) => {
    const next: AliceActionLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    write([next, ...read()]);
  }, []);

  const markUndone = useCallback((id: string) => {
    write(read().map((e) => (e.id === id ? { ...e, undone: true } : e)));
  }, []);

  const clear = useCallback(() => write([]), []);

  const lastUndoable = entries.find((e) => !e.undone) || null;

  return { entries, lastUndoable, record, markUndone, clear };
}
