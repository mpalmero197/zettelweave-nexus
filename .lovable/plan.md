

# AI Mind Map Generator

## Overview

Add an "AI Generate" button to the Mind Map toolbar that opens a dialog where users type a subject (e.g., "Part 107 exam preparation"). The AI searches the internet via Perplexity for real information, then structures it into a hierarchical mind map automatically.

## Architecture

The feature uses a two-step pipeline:
1. **Perplexity** (already configured) fetches real, current information about the subject
2. **Lovable AI Gateway** (already configured) structures that information into a mind map hierarchy using tool calling for structured JSON output

Both API keys (`PERPLEXITY_API_KEY` and `LOVABLE_API_KEY`) are already configured as secrets.

## File Changes

### 1. New edge function: `supabase/functions/generate-mindmap/index.ts`

A new edge function that:
- Accepts a `subject` string
- Calls Perplexity `sonar-pro` to research the subject and get comprehensive, cited information
- Passes the Perplexity response to Lovable AI Gateway (`google/gemini-2.5-flash`) with tool calling to extract structured output matching the mind map node format
- Returns a JSON tree structure: `{ root: string, nodes: [{ id, text, emoji, children: string[] }] }`

The structured output schema enforces:
- A root node (the subject)
- 4-8 main branches (major topics)
- 2-5 sub-items per branch
- Optional emojis for visual clarity
- Max depth of 3 levels to keep maps readable

### 2. Update `supabase/config.toml`

Add the new function entry:
```toml
[functions.generate-mindmap]
verify_jwt = true
```

### 3. Edit: `src/components/MindMap.tsx`

Add the following to the existing component:

**New state variables:**
- `aiDialogOpen` (boolean) -- controls the AI generate dialog
- `aiSubject` (string) -- the user's input subject
- `aiLoading` (boolean) -- loading state during generation

**New "AI Generate" button** in the toolbar (next to "New" button), styled with a Sparkles icon and primary accent color.

**New Dialog** that appears when clicked:
- Text input for the subject ("What would you like to map?")
- Example suggestions as clickable chips (e.g., "Part 107 exam", "Machine Learning basics", "Project management")
- Generate button with loading spinner
- On success: replaces the current mind map data with the AI-generated structure, runs `layoutTree()`, calls `fitToScreen()`, and shows a toast

**Integration with existing `updateData` / `pushHistory`:**
- The AI result is converted into the existing `MindMapData` format (with proper `parentId`, `color` from `BRANCH_COLORS`, `x`/`y` set to 0 before layout)
- History is pushed so the user can undo back to their previous map

## Technical Details

- The edge function uses Perplexity's `sonar-pro` model for high-quality research with citations
- Lovable AI Gateway's tool calling ensures reliable JSON structure (no regex parsing)
- The mind map generation is capped at ~50 nodes to keep performance smooth
- Error handling surfaces rate limit (429) and payment (402) errors as user-friendly toasts
- No new dependencies needed

