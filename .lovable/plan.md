

# Comprehensive Plugin Hub Expansion

## Overview
Add 15 new fully functional plugins to the Plugin Hub, expanding from 7 to 22. All client-side, no API keys needed.

## Files to Create (15)
All in `src/components/plugins/plugins/`:

| Plugin | Category | Core Logic |
|--------|----------|------------|
| `PomodoroPlugin.tsx` | productivity | Wraps existing `PomodoroTimer` component with compact mode |
| `HabitStreakPlugin.tsx` | productivity | Daily check-ins with localStorage persistence, streak counter, calendar heatmap grid |
| `EisenhowerPlugin.tsx` | productivity | 4-quadrant grid (urgent/important), add/delete/move tasks between quadrants |
| `CountdownPlugin.tsx` | productivity | Multiple named countdowns, Notification API alerts, localStorage persistence |
| `CitationPlugin.tsx` | writing | Form inputs (title/author/year/URL/publisher), outputs APA/MLA/Chicago/Harvard strings |
| `ReadabilityPlugin.tsx` | writing | Textarea input, computes Flesch-Kincaid, Gunning Fog, Coleman-Liau scores with grade levels |
| `LoremIpsumPlugin.tsx` | writing | Paragraph/word count selector, style variants (classic, hipster, tech, pirate), copy button |
| `MarkdownPreviewPlugin.tsx` | writing | Split pane: textarea left, rendered HTML right using basic markdown-to-HTML regex conversion |
| `JsonFormatterPlugin.tsx` | data | Textarea input, JSON.parse validation, pretty-print/minify toggle, error display |
| `Base64Plugin.tsx` | utilities | Encode/decode tabs, text input + file drag-and-drop via FileReader API |
| `ColorPalettePlugin.tsx` | utilities | Color input picker, generates complementary/analogous/triadic/split-complementary palettes via HSL math |
| `UnitConverterPlugin.tsx` | utilities | Category tabs (length/weight/temp/data/time), from/to selects, conversion factor math |
| `PasswordGeneratorPlugin.tsx` | utilities | Length slider, character set toggles, entropy display, crypto.getRandomValues generation |
| `HashGeneratorPlugin.tsx` | utilities | Textarea input, Web Crypto API (SHA-256/SHA-512), hex output, copy button |
| `DiffCheckerPlugin.tsx` | data | Two textareas, line-by-line diff with colored additions (green) and deletions (red) |

## Files to Modify

### `src/components/plugins/PluginHub.tsx`
- Import all 15 new plugin components
- Add 15 entries to `PLUGINS` array following existing pattern
- Add new icons to `ICON_MAP`: `Clock`, `Flame`, `LayoutGrid`, `Hourglass`, `BookOpen`, `Eye`, `FileText`, `Code`, `FileJson`, `Binary`, `Palette`, `Ruler`, `Lock`, `Hash`, `GitCompare`
- Add `'productivity'` to `CATEGORY_LABELS`

### `src/components/plugins/types.ts`
- Add `'productivity'` to the category union type

## Each plugin follows the established pattern
- Accepts `PluginProps` with `onClose`
- Self-contained with `useState`/`useEffect`
- Uses existing shadcn/ui components (Button, Input, Textarea, Badge, Card, Tabs, Select, Slider, Switch)
- localStorage for persistence where needed
- No external dependencies or API calls

