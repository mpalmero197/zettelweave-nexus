import { useCallback, useRef } from "react";
import { prefetchRoute } from "@/lib/routePrefetch";

/**
 * Returns handlers that warm a route's code-split chunk when the user hovers
 * or focuses a link, on a short debounce so brief mouse fly-throughs don't
 * kick off a bunch of imports.
 *
 * Spread the result onto any anchor/button:
 *
 *   const prefetch = usePrefetchOnHover("/settings");
 *   <Link to="/settings" {...prefetch}>Settings</Link>
 */
export function usePrefetchOnHover(path: string | null | undefined, delayMs = 150) {
  const timer = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    if (!path) return;
    cancel();
    timer.current = window.setTimeout(() => {
      prefetchRoute(path);
      timer.current = null;
    }, delayMs);
  }, [path, delayMs, cancel]);

  return {
    onMouseEnter: schedule,
    onFocus: schedule,
    onMouseLeave: cancel,
    onBlur: cancel,
    // Touchstart triggers slightly before click on mobile — worth a tiny head start.
    onTouchStart: () => path && prefetchRoute(path),
  };
}
