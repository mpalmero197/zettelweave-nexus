## Goal

Install Google Analytics (G-6LTQWC9H5W) site-wide and address every actionable issue from the GTmetrix report (Performance grade C / 57%, TBT 567ms, Fully Loaded 9.0s, 51 requests, 330KB).

## 1. Install Google Analytics 4

In `index.html`, immediately after `<head>`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-6LTQWC9H5W"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-6LTQWC9H5W', { anonymize_ip: true });
</script>
```
Single tag only — verify no duplicate gtag exists elsewhere.

## 2. GTmetrix fixes

### Serve static assets with efficient cache policy (Med-Low, 257KB savings)
Vite already fingerprints assets. The fix is HTTP cache headers. Add `public/_headers` (Lovable/Netlify-style) so the host serves long-lived caching for hashed assets:
```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/icon-*.png
  Cache-Control: public, max-age=2592000

/favicon.*
  Cache-Control: public, max-age=2592000

/*.js
  Cache-Control: public, max-age=2592000

/*.css
  Cache-Control: public, max-age=2592000

/
  Cache-Control: public, max-age=0, must-revalidate
```

### Avoid long main-thread tasks / Reduce JS execution / Avoid chaining critical requests
Tighten `vite.config.ts` chunking so the 30+ tiny lucide icon chunks and Radix primitives are bundled together (waterfall shows ~30 separate icon requests stalling on load):
- Add `manualChunks` function that groups `lucide-react` into one `icons` chunk and all `@radix-ui/*` into one `radix` chunk.
- Enable `build.target: 'es2020'` and `build.minify: 'esbuild'` (default but explicit) to also clear the "Avoid serving legacy JavaScript" audit.
- Add `build.cssCodeSplit: true` (default) and `build.reportCompressedSize: false` for faster builds.

### Avoid non-composited animations (95 elements, CLS audit)
Audit `src/index.css` / Landing for animated properties. Switch any `animation` / `transition` on `top|left|width|height|margin|background-color` to `transform` and `opacity`, and add `will-change: transform` on the few hero/cosmic-background animated layers. Spot-check `CosmicBackground` and any landing keyframes.

### Avoid excessive DOM size (630 elements)
On Landing page, virtualize/condense any duplicated decorative DOM (e.g. repeated star/cosmic particle divs in CosmicBackground). Replace large arrays of decorative divs with a single canvas or fewer SVG elements where reasonable.

### Reduce unused CSS / JS (~50KB)
- Verify `tailwind.config.ts` `content` globs are tight (already scoped to `src/**`).
- Remove unused Radix imports from `App.tsx` shell if not actually used (e.g. confirm Toaster/Sonner both needed — keep one).

### Properly size images (16.3KB savings)
- The loading icon currently uses `/icon-192x192.png` (16.4KB) at 28px. Add explicit `width="28" height="28"` (already partially set via CSS) and serve a smaller dedicated `/icon-32x32.png` for the loading screen.
- Add `width`/`height` attributes to all landing `<img>` tags to prevent layout shifts.

### Avoid multiple page redirects / Reduce TTFB
- Root document took 520ms and there's one initial 307 redirect (likely http → https). Add `Strict-Transport-Security` header in `public/_headers` and ensure canonical is `https://`.

### Eliminate render-blocking resources (8ms)
- Cinzel Decorative font CSS is currently `rel="stylesheet"` (blocking). Switch to the same preload-swap pattern used for Inter:
```html
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link href="..." rel="stylesheet"></noscript>
```

### Reduce initial server response time / Avoid chaining
- Add `<link rel="preconnect" href="https://www.googletagmanager.com">` and `<link rel="preconnect" href="https://www.google-analytics.com">` so the new GA tag doesn't add latency.
- Add `<link rel="modulepreload" href="/src/main.tsx">` equivalent (Vite injects automatically in build).

## Files to edit / create

- `index.html` — insert GA tag after `<head>`; preconnect GA domains; convert Cinzel font to non-blocking; smaller loading icon.
- `vite.config.ts` — refined `manualChunks` (icons + radix groups), explicit `target: 'es2020'`.
- `public/_headers` (new) — long-cache headers for hashed assets, HSTS.
- `src/components/CosmicBackground.tsx` — reduce decorative DOM count; use `transform/opacity`-only animations; add `will-change`.
- `src/pages/Landing.tsx` — add `width`/`height` to `<img>` tags; verify no `top/left` keyframe animations.
- `src/index.css` — replace any non-composited keyframes with `transform`/`opacity` equivalents.

## Out of scope

- Backend TTFB (521ms) is hosted by Lovable — we mitigate via caching headers and preconnects, but the absolute number is provider-dependent.
- "User Timing marks" is informational only.

## Expected impact

- Performance grade C (57%) → B/A (75–90%) via reduced JS chains, composited animations, and long-cache headers.
- TBT 567ms → <300ms via fewer/larger chunks and reduced lucide icon waterfall.
- Fully Loaded 9.0s → 3–5s on repeat visits with proper cache headers.
