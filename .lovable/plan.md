# Watch & Ask: real transcripts + a much better summary

## What I verified with a live run

I ran a real video (3Blue1Brown, "But what is a neural network?", `aircAruvnKk`) through the live `youtube-transcript` function:

- Title: captured correctly.
- Description: captured in full (including the creator's own `0:00 / 1:07 / 2:42 …` timeline), though YouTube truncates outbound links to `https://…/ne...`.
- Channel: **empty**.
- Transcript: **empty** — `hasTranscript: false`, `warning: "No captions available for this video"` — even though this video has captions.
- I then probed YouTube's Innertube player directly from a server IP: the WEB client returns `playabilityStatus: UNPLAYABLE` and zero caption tracks, and the ANDROID client returns HTTP 400.

So the root cause is not the parsing code: YouTube now refuses to serve caption tracks to datacenter IPs. Every "I can only infer from the title" answer traces back to this. `analyze-watch` is doing its job — it is being handed a description and nothing else.

## Fix in two parts

### 1. Actually get the transcript (the real problem)

Add a transcript acquisition chain to `youtube-transcript`, trying in order and stopping at the first success:

1. Existing watch-page + Innertube path (keep — it works from some IPs/regions).
2. **Firecrawl-backed transcript scrape** (the project already has `FIRECRAWL_API_KEY`): scrape a public transcript renderer for the video id and parse `[mm:ss] text` pairs into real segments. Try 2-3 renderers in sequence so one going down does not kill the feature.
3. **Timed-text direct** with `fmt=json3` and both auto and manual caption languages, when a caption track URL was obtained at all.
4. Cache every successful result in a new `youtube_transcripts` table (video id, title, channel, description, segments JSON, fetched_at) so a video is fetched once and afterwards loads instantly for every user. Cache negative results for a short window too, so retry storms don't hammer YouTube.

Also fill in `channel` from the oEmbed response (it returns `author_name`) — that field is currently always blank.

Response gains a `transcriptSource` field (`watch_page` | `innertube` | `scrape` | `cache`) so the UI can be honest about provenance.

### 2. Make the summary robust and honest

In `analyze-watch`:

- **Parse the description's own chapter list** (lines like `2:42 - What are neurons?`) into a structured outline and pass it as its own labelled context block. This alone makes `chapters` mode accurate even with zero captions, and gives `summary` real topic structure.
- **Tiered grounding contract** instead of one prompt: full-transcript, sampled-transcript, and metadata-only. In metadata-only mode the model must still produce a useful, clearly-labelled *outline-based overview* ("Based on the chapter list and description, not the spoken audio") rather than a refusal paragraph. The current behaviour — a paragraph apologising for missing content — is the single worst part of the output.
- **Better sampling for long videos.** The current head/middle/tail character slicing can cut mid-word and drops most of the middle. Replace with even coverage: split the transcript into N windows across the whole runtime and keep a proportional slice of each, so a 3-hour video still yields timestamps spread across its full length.
- **Quality floor on every mode**: minimum takeaway counts, every non-trivial claim carries a timestamp drawn verbatim from the supplied transcript, no timestamps invented when no transcript exists, and an explicit "what the source does not cover" line.
- Reject fabricated timestamps: after generation, strip/flag any `[m:ss]` that does not exist within the runtime we know about.

### 3. UI (`WatchAsk.tsx`)

- Status chip under the player: `Transcript: 412 segments · via cache` / `No captions — answers use title, description and chapters only`, replacing the current silent degradation.
- Show the parsed chapter list as clickable seek links when captions are missing, so the panel is still useful.
- Keep the existing 7 analysis modes; they get better inputs, not new names.

## Technical notes

- Files: `supabase/functions/youtube-transcript/index.ts`, `supabase/functions/analyze-watch/index.ts`, `src/pages/WatchAsk.tsx`, plus one migration for the `youtube_transcripts` cache table (grants + RLS: authenticated read, service_role write only).
- No new secrets needed — Firecrawl and the Lovable AI gateway keys are already configured.
- Verification: re-run `aircAruvnKk` end-to-end and paste back the transcript segment count, the parsed chapters, and the resulting summary before calling it done.

## Open question

Scraping a third-party transcript renderer is the only server-side way I found to get captions from a datacenter IP. If you would rather avoid third-party dependencies, the alternative is an official YouTube Data API key (gives clean metadata and chapters, but **not** transcripts) — in that case Watch & Ask stays outline-grounded rather than transcript-grounded.
