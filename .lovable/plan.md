

## Plan: 4 Fixes

### 1. Mobile header — replace Focus with Toolbox button
**File:** `src/components/MobileNavigation.tsx`
- Remove the in-FAB-grid "Focus" item.
- Open the unified Toolbox sheet on mobile instead of the focus-only sheet.

**File:** `src/components/AppLayout.tsx`
- Add a Toolbox (Wrench) button to the mobile-visible header next to the existing right-side actions (where settings/user menu sits).
- Currently the toolbox button is `hidden md:flex` — change to always visible, sized for touch (44px min on mobile).

**File:** `src/components/toolbox/ToolboxSidebar.tsx`
- Currently returns `null` on mobile. Add a mobile branch that renders the same icon-rail + active-panel UI inside a full-height `Sheet` (slide from right) so all four tools are accessible on phones.

### 2. Knowledge Chat "couldn't fetch the AI assistant" error
**File:** `src/hooks/useKnowledgeChat.ts`
- Surface the real error message from `supabase.functions.invoke` instead of a generic toast. Read `error.message` and any `data?.error` and include in the toast + console.
- Guard against empty `data.response`: if the edge function returns 400/500, currently we throw but the user sees only the generic message. Show `data?.error || error?.message`.
- Also trim the chat payload: only include the last 8 messages (the function caps at 50 but very long histories risk 4000-char per-message validation failures since we currently send entire conversation context joined).

**File:** `supabase/functions/ai-assistant-chat/index.ts` (verification only — likely fine; LOVABLE_API_KEY missing would throw 500). If the surfaced error reveals a missing key, prompt the user to add it.

### 3. Loading-screen logo too large (only partial visible)
**File:** `index.html`
- Reduce `#app-loading-icon` from `36px` to `28px` and ensure it uses `display: block` with proper centering.
- Add `max-width: 100%` and a defined `aspect-ratio: 1` to the icon.
- Currently `#app-loading-title` uses `display: flex` with `gap: 8px` — verify icon and "PendragonX" text fit on small viewports (add `flex-wrap: wrap` and shrink the H1 to `24px` on mobile via a `@media (max-width: 480px)` rule).

### 4. Amber color on loading screen
**File:** `index.html`
- The loading spinner border-top and the "PendragonX" gradient currently use `hsl(36 72% 48%)` — that's the amber/gold accent.
- Replace with the Halcyon brand palette:
  - Light mode gradient: navy `hsl(220 40% 25%)` → charcoal `hsl(220 20% 35%)`
  - Dark mode gradient: ivory `hsl(40 20% 92%)` → soft purple accent `hsl(265 50% 70%)`
  - Spinner top-color: matching primary in each scheme.
- This aligns with the Halcyon aesthetic memory (navy/charcoal dark, ivory light, purple accent — no amber).

### Out of scope
- No schema changes.
- No new edge functions.
- No changes to the desktop toolbox layout (already correct).

