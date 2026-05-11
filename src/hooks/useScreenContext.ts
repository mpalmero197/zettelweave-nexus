import { useEffect } from "react";

/**
 * Lightweight global registry of "what's currently on the user's screen".
 * Any view/component can describe a visible region (e.g. the Catalyst editor,
 * an open document, the active note, the dashboard) and ALICE can read this
 * snapshot to ground her answers in what the user is actually looking at.
 *
 * This is intentionally module-level (not React context) so non-React code
 * (hooks, edge-function callers) can read it without prop drilling.
 */
export type ScreenRegion = {
  /** Stable id, e.g. "catalyst.document", "notes.active", "dashboard". */
  id: string;
  /** Human-readable label shown to ALICE, e.g. "Catalyst document window". */
  label: string;
  /** Free-form structured data describing what's in this region. */
  data: Record<string, unknown>;
};

const regions = new Map<string, ScreenRegion>();

export function registerScreenRegion(region: ScreenRegion) {
  regions.set(region.id, region);
}

export function unregisterScreenRegion(id: string) {
  regions.delete(id);
}

export function getScreenContext(): {
  route: string;
  regions: ScreenRegion[];
} {
  let route = "";
  try {
    route = window.location.pathname + window.location.search;
  } catch { /* ignore */ }
  return { route, regions: Array.from(regions.values()) };
}

/**
 * Convenience hook: register a screen region for the lifetime of the
 * component, with automatic cleanup. Pass `undefined`/null data to skip.
 */
export function useScreenRegion(
  id: string,
  label: string,
  data: Record<string, unknown> | null | undefined,
) {
  useEffect(() => {
    if (!data) {
      unregisterScreenRegion(id);
      return;
    }
    registerScreenRegion({ id, label, data });
    return () => unregisterScreenRegion(id);
  }, [id, label, JSON.stringify(data)]);
}
