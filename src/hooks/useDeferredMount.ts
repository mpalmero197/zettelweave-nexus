import { useEffect, useState } from "react";

/**
 * Delays mounting non-critical children until after the browser is idle,
 * or after a hard fallback timeout. Use for always-on background components
 * (offline sync, wake-word, notification prompts, ALICE bridges) so they
 * don't compete with the initial paint / route transition.
 */
export function useDeferredMount(fallbackMs = 800): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const done = () => {
      if (cancelled) return;
      setReady(true);
    };

    const ric: any = (window as any).requestIdleCallback;
    if (typeof ric === "function") {
      idleHandle = ric(done, { timeout: fallbackMs });
    } else {
      timeoutHandle = window.setTimeout(done, fallbackMs);
    }

    return () => {
      cancelled = true;
      const cic: any = (window as any).cancelIdleCallback;
      if (idleHandle !== null && typeof cic === "function") cic(idleHandle);
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
    };
  }, [fallbackMs]);

  return ready;
}

/**
 * Convenience component: renders children only after idle/fallback.
 * Safe to nest a Suspense inside for lazy-loaded modules.
 */
export function DeferredMount({
  children,
  fallbackMs = 800,
}: {
  children: React.ReactNode;
  fallbackMs?: number;
}) {
  const ready = useDeferredMount(fallbackMs);
  return ready ? <>{children}</> : null;
}
