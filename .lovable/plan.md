

# Landing Page Rewrite — Conversion-Optimized Structure

## Overview
Complete rewrite of `src/pages/Landing.tsx` based on the teardown, restructuring from a feature-listing page to a conversion-focused narrative: Problem → Solution → How It Works → Outcome-Based Features → Social Proof → Audience → Pricing → FAQ → Final CTA.

## New Page Structure

### 1. Hero (Above the Fold)
- **Headline**: "Build a second brain that actually thinks with you"
- **Subheadline**: "PendragonX connects your ideas, surfaces insights, and lets you ask your knowledge anything — powered by AI."
- **CTA**: Primary "Try it free" + Secondary "See how it works"
- **Trust signals**: "No credit card required" + "Free forever plan"

### 2. Problem Section (NEW)
Emotional hook — three short pain statements:
- "Your ideas are scattered."
- "Your notes don't connect."
- "Your knowledge sits there — but never works for you."

### 3. Solution Section (NEW)
Three-column grid reframing PendragonX as the answer:
- "Automatically connects related ideas"
- "Shows patterns you didn't see"
- "Lets you ask your notes questions"

### 4. How It Works — 3 Steps (SIMPLIFIED from 5)
1. **Capture anything** — Write notes, import content, or think freely
2. **AI connects everything** — Related ideas link automatically into a knowledge graph
3. **Ask your knowledge** — Query your notes like ChatGPT and get real insights

### 5. Features (OUTCOME-BASED rewrite)
Four cards with benefit-first language:
- "Never lose an idea" — Notes link themselves automatically
- "Discover hidden patterns" — AI surfaces connections across your thinking
- "See your mind in 3D" — Visual knowledge graph shows how ideas evolve
- "Ask your notes anything" — Chat with your knowledge base like ChatGPT

### 6. Built For Section (NEW — Target Audience)
Horizontal badges/cards: Writers, Researchers, Founders, Students, Deep Thinkers

### 7. Screenshots (KEPT, minor copy update)

### 8. Pricing (KEPT, copy refined)

### 9. FAQ (KEPT)

### 10. Final CTA
- "Stop storing ideas. Start thinking with them."

## Technical Details

### Files Changed

| File | Changes |
|------|---------|
| `src/pages/Landing.tsx` | Full rewrite of section order, copy, and structure. Add Problem, Solution, and Audience sections. Simplify How It Works to 3 steps. Rewrite all feature copy to outcome-based. Update hero headline/subheadline. |
| `src/components/SEOHead.tsx` | Update `defaultTitle` and `defaultDescription` to match new positioning |

### SEO Updates
- New title: "PendragonX — A Second Brain That Actually Thinks With You"
- New description: "Connect your ideas, surface insights, and ask your knowledge anything. AI-powered Zettelkasten for writers, researchers, and deep thinkers."
- HowTo schema updated to 3 steps
- FAQ schema unchanged

### No new dependencies. No new files. Halcyon aesthetic preserved throughout.

