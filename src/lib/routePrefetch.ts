// Route prefetch registry — mirrors the lazy() imports in App.tsx so we can
// warm the route chunk on hover/focus before the user actually navigates.
//
// Keep in sync with App.tsx: any route that's lazy() there should have a
// matching entry here for hover prefetch to have any effect.
//
// Unknown paths are a no-op — this is a pure perceived-latency optimization,
// never a correctness dependency.

type Loader = () => Promise<unknown>;

const loaders: Record<string, Loader> = {
  "/auth": () => import("@/pages/Auth"),
  "/": () => import("@/pages/Landing"),
  "/app": () => import("@/pages/Index"),
  "/admin": () => import("@/pages/Admin"),
  "/install": () => import("@/pages/Install"),
  "/subscription": () => import("@/pages/Subscription"),
  "/settings": () => import("@/pages/Settings"),
  "/alice": () => import("@/pages/Jarvis"),
  "/alice-app": () => import("@/pages/AliceStandalone"),
  "/vault": () => import("@/pages/Vault"),
  "/scholar": () => import("@/pages/Scholar"),
  "/scholar/sandbox": () => import("@/pages/ScholarSandbox"),
  "/scholar/alice": () => import("@/pages/ScholarAlice"),
  "/macros": () => import("@/pages/Macros"),
  "/terms": () => import("@/pages/TermsOfService"),
  "/privacy": () => import("@/pages/PrivacyPolicy"),
  "/changelog": () => import("@/pages/Changelog"),
  "/shared": () => import("@/pages/SharedWithMe"),
  "/sitemap": () => import("@/pages/Sitemap"),
  "/about": () => import("@/pages/About"),
  "/contact": () => import("@/pages/Contact"),
  "/editorial-policy": () => import("@/pages/EditorialPolicy"),
  "/unsubscribe": () => import("@/pages/Unsubscribe"),
};

const started = new Set<string>();

export function prefetchRoute(path: string): void {
  if (!path) return;
  // Normalize trailing slash and querystring/hash for lookup.
  const clean = path.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  if (started.has(clean)) return;
  const loader = loaders[clean];
  if (!loader) return;
  started.add(clean);
  // Fire and forget. Swallow errors — a failed prefetch shouldn't spam logs
  // or affect the real navigation attempt that follows.
  try {
    void loader().catch(() => { started.delete(clean); });
  } catch {
    started.delete(clean);
  }
}
