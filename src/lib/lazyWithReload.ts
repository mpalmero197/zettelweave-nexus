import { lazy, ComponentType } from "react";

/**
 * lazy() wrapper that survives stale-chunk errors after a redeploy.
 *
 * When the app is redeployed, users with the previous index.html cached in
 * memory still reference the old hashed chunk filenames. Any lazy() import
 * then throws "Failed to fetch dynamically imported module". We retry once
 * (in case of a transient network blip) and, if that still fails, force a
 * hard reload so the browser pulls the new index.html + new chunk hashes.
 */
const RELOAD_KEY = "__lovable_chunk_reload_at";

export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      const msg = String((err as Error)?.message || err);
      const isChunkError =
        /Failed to fetch dynamically imported module/i.test(msg) ||
        /Importing a module script failed/i.test(msg) ||
        /error loading dynamically imported module/i.test(msg);
      if (!isChunkError) throw err;

      // Retry once — transient network hiccup.
      try {
        return await factory();
      } catch {
        // Guard against reload loops: only reload once per minute.
        try {
          const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
          if (Date.now() - last > 60_000) {
            sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
            window.location.reload();
          }
        } catch {
          window.location.reload();
        }
        // Return a placeholder to satisfy the Promise type while reload runs.
        return { default: (() => null) as unknown as T };
      }
    }
  });
}
