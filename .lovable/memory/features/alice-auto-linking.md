---
name: ALICE Auto-Linking
description: Cards auto-link by embedding similarity AND Dewey number prefix match. User chooses mode: auto, suggest (dotted lines on graph), or manual. User-made links override AI links and lock the card.
type: feature
---
- Modes stored on `profiles.auto_link_mode` ('auto' | 'suggest' | 'manual', default 'auto').
- Edge function `alice-auto-link` runs every 30 min and on demand.
- Sources of links per card: (1) `find_similar_zettel_cards` cosine >= 0.78, (2) other cards owned by same user whose `number` shares the first 3 chars (Dewey bucket).
- 'auto' → writes via `alice_set_auto_links` (skips `links_locked=true`); user editing `linked_cards` flips `links_locked` true (via trigger `zettel_cards_lock_on_user_link_change`).
- 'suggest' → writes to `zettel_cards.suggested_links` only; never touches `linked_cards`. Graph renders these as dashed lines.
- 'manual' → no auto writes.
- UI: setting lives in Account Management → AI tab. "Reset to auto" button on Linked Items panel unlocks a card and re-runs the function.
