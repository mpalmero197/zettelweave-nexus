

# Landing Page & Site-Wide Design Enhancement

## Goal
Elevate the visual design from "clean and functional" to "modern, beautiful, and memorable" — without being flashy. Focus on typographic refinement, spatial rhythm, subtle depth, and micro-interactions that feel polished.

## Key Design Principles
- **Typographic hierarchy**: Use the Cinzel Decorative brand font for the logo, and tighten heading letter-spacing for a premium editorial feel
- **Spatial rhythm**: Consistent section cadence with generous whitespace between sections but tight internal grouping
- **Subtle depth**: Refined glassmorphism on the header, gentle gradient backgrounds for alternating sections instead of flat `bg-muted/30`
- **Micro-interactions**: Smooth hover lifts on cards, border glow on focus, elegant link underlines
- **Visual anchors**: A subtle radial gradient or grain texture on the hero for depth

---

## Changes

### 1. `src/index.css` — Design System Polish
- Add a subtle noise/grain texture utility class for hero backgrounds
- Add a `.section-gradient` class using a soft radial gradient (instead of flat muted backgrounds) for alternating sections
- Refine card hover states with a subtle border-color transition + translateY lift
- Add a `.text-balance` utility for headings (CSS `text-wrap: balance`)
- Add smooth gradient divider utility between sections (replaces hard `border-y`)

### 2. `src/pages/Landing.tsx` — Visual Overhaul

**Header**: Add subtle `shadow-sm` on scroll, increase logo size slightly, use Cinzel Decorative for brand name

**Hero section**:
- Add a subtle radial gradient overlay behind the hero (dark mode: warm dark center fade, light mode: soft warm glow)
- Increase heading size on large screens, apply `text-balance` for better line breaks
- Upgrade CTA button with a subtle glow/shadow effect
- Add a soft animated gradient border on the primary CTA

**Built-For Banner**: Add a subtle gradient background instead of flat `bg-primary/[0.03]`

**Problem section**: Use larger, more impactful typography with a staggered fade that feels cinematic

**Solution section**: Replace `gap-px bg-border` grid hack with proper cards that have hover elevation — each card gets a subtle top-border accent color

**How It Works**: Upgrade step numbers with a gradient ring instead of solid fill; add a vertical connecting line between steps

**Features grid**: Add hover glow effect (subtle box-shadow) and a slight scale on hover

**Social Proof / Stats**: Animate stat numbers with a count-up effect on scroll; add quotation mark decorators to testimonials

**Audience cards**: Add subtle icon background glow; hover state lifts card with shadow

**Pricing**: Premium card gets a subtle animated gradient border; free card stays clean

**FAQ**: Smoother accordion with better padding rhythm

**Final CTA**: Add a subtle background gradient that draws the eye; larger, bolder typography

**Footer**: Add a subtle gradient divider line at the top instead of a flat border

### 3. `tailwind.config.ts` — Extended Utilities
- Add `text-balance` utility
- Add subtle `shadow-glow-sm` for card hover states
- Add `animate-gradient` for slow gradient border animation on premium pricing card

---

## Technical Details

### New CSS classes (index.css)
```css
.section-alt {
  background: radial-gradient(ellipse at 50% 0%, hsl(var(--muted) / 0.5) 0%, transparent 70%);
}
.hero-glow {
  background: radial-gradient(ellipse at 50% 40%, hsl(var(--primary) / 0.04) 0%, transparent 60%);
}
.card-hover-lift {
  transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
}
.card-hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
  border-color: hsl(var(--primary) / 0.15);
}
```

### Landing page structural changes
- All alternating sections switch from `bg-muted/30` to `section-alt` class
- All cards get `card-hover-lift` class
- Hero gets `hero-glow` wrapper div
- Steps get a vertical connecting line via `relative` positioning + `::before` pseudo-element
- Stats get a simple count-up animation via `useEffect` + `useState`
- Testimonials get a decorative `"` character in `text-primary/10` as background
- Premium pricing card border uses `bg-gradient-to-br` with subtle animation

### Files modified
| File | Scope |
|------|-------|
| `src/index.css` | ~15 new utility classes |
| `src/pages/Landing.tsx` | Visual class updates across all 11 sections |
| `tailwind.config.ts` | 2-3 new animation/shadow entries |

