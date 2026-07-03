## Goal
Raise PendragonX's ranking signals for both traditional SEO (Google/Bing) and GEO/AEO (ChatGPT, Gemini, Claude, Perplexity) by shipping richer structured content, stronger schema coverage, freshness signals, and a citation-friendly answer layer.

## 1. Answer-First Content Layer (GEO)
- Add `AnswerBlock` (40–60 word TL;DR) to the top of Landing, About, Subscription, Install, Changelog, Scholar, Macros pages using the existing `src/components/seo/AnswerBlock.tsx`.
- Insert `FAQBlock` on Landing, Subscription, Macros, Install with 6–10 conversational Q&As each (auto-emits FAQPage JSON-LD).
- Add `HowToBlock` on Install ("How to install PendragonX"), Macros ("How to build a macro"), and Scholar ("How to study with ALICE").
- Add `LastUpdated` + `CitationBlock` to editorial pages so LLMs see freshness + sourcing.

## 2. Structured Data Expansion
- Sitewide in `index.html`: expand JSON-LD to include `Organization`, `WebSite` (with `SearchAction`), `SoftwareApplication` (with `aggregateRating` if available), and `BreadcrumbList`.
- Per-route JSON-LD via `SchemaInjector`:
  - Landing → `SoftwareApplication` + `FAQPage` + `Product` (pricing tiers as `Offer`s).
  - Subscription → `Product` w/ `PriceSpecification` for each tier.
  - About → `AboutPage` + `Organization`.
  - Changelog → `Article` per entry.
  - Scholar → `Course` / `EducationalOccupationalProgram`.

## 3. Crawler & Freshness Infrastructure
- Rebuild `public/sitemap.xml` via a `scripts/generate-sitemap.ts` (predev/prebuild) so `lastmod` is always current and every public route ships.
- `public/robots.txt`: keep AI crawlers allowed, add explicit `Allow` for `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`; remove overbroad `Disallow: /*?*` (blocks legitimate query URLs).
- Refresh `llms.txt` / `llms-full.txt` with current feature list, positioning as "AI-powered second brain for writers", and canonical answer snippets for common LLM prompts ("best knowledge management software", "Notion alternative", "Obsidian alternative", "AI second brain").

## 4. Topical Authority Pages (new SEO landing routes)
Create thin but high-quality comparison/answer pages under `/vs/*` and `/compare/*` (indexable, sitemap-listed):
- `/vs/notion`, `/vs/obsidian`, `/vs/onenote`, `/vs/roam`, `/vs/mem`
- `/compare/ai-second-brain`, `/compare/knowledge-graph-tools`, `/compare/writer-tools`
Each uses `AnswerBlock` + comparison table (`ScannableTable`) + FAQ + `TopicalCluster` linking back to Landing.

## 5. On-Page SEO Hygiene
- Audit every route to guarantee: one `<h1>`, meaningful `<title>` (<60 chars), `<meta description>` (<160 chars), self-referencing canonical, matching og:url — via `SEOHead`.
- Add descriptive `alt` text pass on all `<img>` in Landing / About / Install.
- Add internal linking blocks (`TopicalCluster`) on Landing → feature deep-dives.

## 6. Performance = Ranking
- Verify LCP element on Landing is server-rendered (already in `index.html` crawler HTML). Preload hero font.
- Add `fetchpriority="high"` to hero image, `loading="lazy"` + explicit width/height on below-fold images.

## 7. Verification
- Run `seo_chat--trigger_scan` after implementation.
- Validate JSON-LD via schema.org validator (spot-check output).
- Confirm sitemap builds and includes new `/vs/*` routes.

## Technical Notes
- Reuse existing `src/components/seo/*` primitives — no new dependencies.
- Comparison pages are static React routes registered in `src/App.tsx`, wrapped in `SEOHead` + `SchemaInjector`.
- Sitemap generator uses `tsx` (already in devDeps via `bunx`).
- `AutoSEOOverrides` remains authoritative for per-route dynamic tags; new JSON-LD is additive.

## Out of Scope
- Backlink acquisition, paid SEO tools, or content writing beyond templated comparison pages.
- SSR migration (current Vite SPA + static `index.html` crawler HTML is sufficient for the added surface).
