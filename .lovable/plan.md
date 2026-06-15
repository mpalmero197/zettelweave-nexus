# ALICE Enhancement Plan

A focused set of upgrades that build on what ALICE already does (chat, plans, auto-linking, page navigation, macro learning, TTS speech) and push her toward a true always-on assistant. Pick any subset.

## 1. Voice & Conversation
- **Voice input (wake-word free push-to-talk)**: hold-to-talk mic button in JarvisChat using the browser SpeechRecognition API (no API cost). Live transcript preview, auto-send on release.
- **Streaming TTS**: speak ALICE's reply as it streams (chunk on sentence boundaries) instead of after completion. Toggle in settings.
- **Voice profile picker**: let user choose voice + rate/pitch from `speechSynthesis.getVoices()`; persist on `profiles`.
- **Barge-in**: clicking the mic or typing cancels current TTS.

## 2. Proactive Intelligence
- **Smart morning brief**: extend `alice-proactive-pulse` to deliver a spoken+chat brief (overdue tasks, today's calendar, writing streak, 1 suggested card to revisit). Triggered on first session of the day.
- **Context-aware nudges**: when user lingers on a card/note > 60s, ALICE offers inline "Want me to find related cards / summarize / expand?" chips. Uses existing `useScreenContext`.
- **Idle suggestions**: after 90s idle on Cards & Notes workspace, ALICE proposes the next likely action based on recent macros.

## 3. Persistent Memory
- **Episodic memory upgrade**: store conversation summaries + user preferences in a new `alice_memories` table with embeddings; retrieve top-k on each chat call (already partially scaffolded via auto-linking infra — reuse HuggingFace embeddings).
- **"Remember this"/"Forget this" commands**: explicit tools ALICE can call to write/delete memories.
- **Memory inspector**: settings page listing memories with delete buttons.

## 4. Skills & Macros
- **Macro library UI**: surface learned macros from page-navigation feature as named, editable, re-runnable workflows ("Open Catalyst → new chapter → insert outline").
- **Macro sharing**: export/import macros as JSON.
- **Slash commands in chat**: `/run <macro>`, `/find <query>`, `/summarize`, `/card`, `/plan`.

## 5. Multimodal
- **Screenshot understanding**: paste/drop an image into chat → ALICE describes & extracts text (Gemini vision via existing gateway).
- **Audio note transcription shortcut**: drag-drop audio → transcribe + summarize into a card.

## 6. Quality-of-Life
- **Reply actions**: per-message buttons: Copy, Save as card, Save as note, Speak, Regenerate, Continue.
- **Conversation pinning + search**: pin important threads; full-text search across past Jarvis conversations.
- **Token/cost meter**: tiny indicator in chat footer showing today's ALICE usage.
- **Error transparency**: surface 429/402 gateway errors with the "Add credits" CTA pattern.

## Suggested first slice (recommended)
If we ship just one round, do:
1. Voice input (push-to-talk)
2. Streaming TTS + voice picker
3. Per-message reply actions (Copy / Save card / Speak / Regenerate)
4. Smart morning brief (spoken on first daily open)

This gives an immediately tangible "she talks back and listens" upgrade plus one proactive moment.

## Technical notes
- Voice in/out: Web Speech APIs only — no new secrets, no cost.
- Memory: new table `alice_memories(id, user_id, content, embedding vector(384), kind, created_at)` with RLS + GRANTs per project rules; reuse `generate-embedding` edge function.
- Streaming TTS: chunk on `.?!` while assistant text streams in `useJarvis`, push to `aliceTts.ts` queue.
- Macros: already captured by the toolbox; expose via new `src/components/alice/MacroLibrary.tsx` reading existing macro store.
- No changes to auth, RLS model, or pricing tiers.

## Question for you
Want me to build the **recommended first slice** (voice in + streaming TTS + reply actions + morning brief), or pick a different combination from sections 1–6?
