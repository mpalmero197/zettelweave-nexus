
# Fix Author Agent: Eliminate Timeouts, Guarantee Document Output

## Problem

The Author Agent makes **12+ sequential AI calls** (topic selection, gap analysis, research, outline, 8 chapters, citations). Supabase edge functions have a hard timeout (~150 seconds). The agent consistently times out before finishing, producing **no content at all**.

## Solution: Collapse to 3 AI Calls Maximum

Instead of orchestrating a complex multi-pass pipeline that exceeds edge function limits, we will restructure the Author Agent to make only **3 fast, focused AI calls**:

1. **Call 1 -- Topic Selection** (quick, small output): Pick the best topic from the user's Zettelcards.
2. **Call 2 -- Full Document Generation** (one big call): Write the entire document in a single AI call with detailed instructions for formatting, research, and structure. Request `max_tokens: 16384`.
3. **Call 3 -- Extend if short** (conditional): If the document is under 5,000 words, make one continuation call to extend it.

This eliminates the 8-chapter loop, the separate research call, the gap analysis call, and the citation call -- all of which contributed to timeouts.

## Technical Details

### File: `supabase/functions/execute-agent/index.ts`

**Changes to `callAI`:**
- Increase default `maxTokens` to `16384` to allow longer single outputs.

**Changes to `runAuthorAgent`:**
- **Remove**: Steps 3 (Knowledge Gap), 4 (Research), 5 (Outline), 6 (Chapter Loop), 7 (Citations) as separate calls.
- **Replace with**: A single comprehensive prompt that instructs the AI to:
  - Select a topic (or use the one from Call 1)
  - Write a fully formatted document with table of contents, 8+ sections, research insights, citations, and rich markdown
  - Target 3,000-5,000 words in one shot (the realistic max for a single AI response with 16k tokens)
- **Add**: A conditional extension call if the document is under 5,000 words, asking the AI to continue writing more sections.
- **Add**: A second extension call if still under target, to push toward the 10k goal.
- **Wrap everything** in try/catch with meaningful fallback -- if any call fails, save whatever content was generated so far rather than losing everything.

**Changes to error handling:**
- If the main document call fails, save a partial document with an error note rather than returning nothing.
- Every AI call gets its own try/catch so one failure doesn't kill the whole process.

### Key Design Decisions

| Before | After |
|--------|-------|
| 12+ sequential AI calls | 3 max AI calls |
| ~5+ minutes execution | ~30-60 seconds execution |
| Times out, produces nothing | Always produces a document |
| Separate research/gap/citation steps | All instructions in one comprehensive prompt |
| Chapter-by-chapter generation | Single document generation + extensions |

### Expected Output

The Author Agent will reliably produce a well-formatted Catalyst document of 3,000-10,000+ words with:
- A topic chosen from the user's Zettelcards
- Rich markdown formatting (headers, lists, blockquotes, bold/italic)
- Table of contents
- References section
- The "(Created by PendragonX)" suffix
- A notification on success

The word count may vary (3k-10k+) depending on AI response length, but it will **always produce something** rather than timing out with nothing.
