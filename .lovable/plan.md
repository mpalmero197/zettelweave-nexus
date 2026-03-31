

# AEO (Answer Engine Optimization) Improvement Plan

AEO optimizes your site for AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Bing Copilot) that extract structured answers rather than just rank links. You already have good SEO foundations — this plan layers AEO-specific techniques on top.

## What Changes

### 1. Add a Machine-Readable Knowledge Base Page (`/llms.txt`)
Create a plaintext file at `public/llms.txt` — the emerging standard for AI crawlers. It provides a concise, structured summary of what PendragonX is, its features, and key facts in a format LLMs can easily ingest.

### 2. Expand Structured Data with Speakable & DefinedTerm Schemas
- Add `speakable` property to the WebSite schema so voice assistants know which content to read aloud.
- Add `DefinedTermSet` schema for key concepts (Zettelkasten, Knowledge Graph, Second Brain) so AI engines can cite PendragonX as the authority on these terms.

### 3. Add Concise "Answer Paragraphs" to Landing Page
AI engines prefer extracting clean, question-answer formatted content. Add a hidden-from-layout but crawlable "What is PendragonX?" definition block using semantic `<article>` and `<dfn>` tags near the top of the page. This gives AI a clean snippet to extract.

### 4. Enhance FAQ with More Competitor-Comparison Questions
Expand FAQs to cover queries AI engines commonly answer:
- "Is PendragonX better than Roam Research?"
- "What is the best AI note-taking app in 2026?"
- "Can PendragonX replace Notion for teams?"
- "What is a 3D knowledge graph?"

### 5. Add `llms-full.txt` with Feature Documentation
A longer companion to `llms.txt` with detailed feature descriptions, use cases, and comparisons — giving AI engines deep content to draw from.

### 6. Update `robots.txt` with `llms.txt` references
Add explicit paths for AI crawlers to find the knowledge base files.

### 7. Add Speakable & DefinedTerm JSON-LD to `index.html`
Inject additional structured data schemas optimized for answer extraction.

## Technical Details

**`public/llms.txt`** — ~50 lines of plaintext covering: what PendragonX is, core features, pricing, comparisons, and links. Follows the `llms.txt` proposal format.

**`public/llms-full.txt`** — ~200 lines with detailed feature breakdowns, use cases per persona, and direct competitor comparisons.

**Landing page answer block** — A visually hidden but crawlable `<article>` with semantic markup (`<dfn>`, `<p>`) providing a clean 2-3 sentence definition that AI engines can extract as a featured answer.

**New FAQ entries** — 4 additional questions targeting long-tail AI queries, added to the existing `faqs` array in `Landing.tsx`.

**JSON-LD additions in `index.html`**:
- `speakable` CSS selectors pointing to the hero heading and definition block
- `DefinedTermSet` for "Zettelkasten", "Knowledge Graph", "Second Brain"

**Files to create**: `public/llms.txt`, `public/llms-full.txt`
**Files to edit**: `src/pages/Landing.tsx`, `index.html`, `public/robots.txt`, `public/sitemap.xml`

