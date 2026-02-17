

# Mind Map Save/Recall, ZettelCard Integration, and Study Guide Generator

## Overview

Three major enhancements to the Mind Map feature: (1) persist mind maps to the database so users can save, name, and recall multiple maps; (2) allow nodes to link to ZettelCards and open them inline; (3) add a "Generate Study Guide" feature that uses AI to produce a structured study guide (like NotebookLM) from the mind map content.

## 1. Database: `mind_maps` Table

Create a new `mind_maps` table to store saved maps:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Default `gen_random_uuid()` |
| user_id | uuid NOT NULL | Owner |
| title | text NOT NULL | User-given name |
| description | text | Optional summary |
| map_data | jsonb NOT NULL | The full `MindMapData` JSON (nodes + rootId) |
| layout_mode | text | `radial`, `tree`, or `orgchart` |
| is_favorite | boolean | Default false |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

RLS policies: standard user-owns-rows pattern (SELECT/INSERT/UPDATE/DELETE where `auth.uid() = user_id`).

## 2. Mind Map Save/Recall System

### Toolbar Changes (in `MindMap.tsx`)

Replace the current "New" and "Export" buttons with a richer file management bar:

- **Save** button: If the current map has a saved ID, update it. If not, open a "Save As" dialog prompting for a title.
- **Open** button: Opens a dialog listing all saved mind maps (fetched from `mind_maps` table). Shows title, node count, last modified date. Click to load. Swipe-to-delete on mobile.
- **New** button: Clears current map, resets to default, clears the saved map ID.
- **Auto-save indicator**: Small "Saved" / "Unsaved changes" text in the toolbar.

### Data Flow

- Current localStorage persistence stays as a fallback for offline/anonymous use.
- When logged in, save/load goes to Supabase `mind_maps` table.
- The component gains a `currentMapId` state. When set, saves update that row. When null, save prompts "Save As".
- The "Open" dialog fetches the list via `supabase.from('mind_maps').select('id, title, description, layout_mode, updated_at, map_data->rootId').eq('user_id', user.id).order('updated_at', { ascending: false })`.

### New Component: `MindMapLibrary` Dialog (~120 lines)

A dialog component showing:
- List of saved maps with title, date, node count badge, favorite star
- Search/filter by title
- Delete button per map (with confirmation)
- "Load" action that sets the map data and currentMapId

## 3. Node-to-ZettelCard Linking

### MindMapNode Type Extension

Add an optional `linked_card_id: string | null` field to `MindMapNode`. The `migrateNode` function will default it to `null`.

### UI Changes

- **Context menu**: Add a "Link to Card" option that opens a card picker dialog (search existing ZettelCards by title). Also add "Open Linked Card" when a card is already linked.
- **Visual indicator**: Nodes with a linked card show a small card icon badge in the bottom-right corner.
- **Click behavior**: Double-click a linked node opens the CardViewer dialog for that card. The existing double-click-to-edit is moved to require the edit action from context menu or F2.
- **"Create Card from Node"**: Context menu option that creates a new ZettelCard with the node's text as the title and the node's note as the content, then auto-links it.

### Props Changes

`MindMap` will accept optional props from `Index.tsx`:
```
cards: ZettelCardType[]
onCardSelect: (card: ZettelCardType) => void
onCreateCard: (card: Partial<ZettelCardType>) => void
```

`Index.tsx` will pass these down where `MindMap` is rendered.

## 4. Study Guide Generator

### New Edge Function: `generate-study-guide`

Takes the mind map's node tree (titles + notes + linked card content) and sends it to the AI gateway with a system prompt instructing it to generate a comprehensive study guide in the style of NotebookLM. The guide includes:

- **Overview**: A summary paragraph of the subject
- **Key Concepts**: Each major branch becomes a section with explanations
- **Key Terms**: A glossary extracted from nodes
- **Review Questions**: 5-10 questions with answers
- **Study Tips**: Practical advice for learning the material

The AI returns structured markdown. The edge function uses `google/gemini-3-flash-preview`.

### UI in MindMap

- **"Study Guide" button** in the toolbar (with a `FileText` icon).
- Clicking it opens a dialog showing a loading state, then renders the generated markdown study guide.
- The dialog has "Copy to Clipboard", "Save as Note" (creates a new note in the Notes system), and "Download as PDF" actions.
- "Save as Note" calls `onCreateNote` (a new optional prop) or creates a note directly via Supabase.

### New Component: `StudyGuideDialog.tsx` (~150 lines)

- Full-screen-ish dialog with the study guide content rendered via `react-markdown`
- Toolbar: Copy, Save as Note, Download, Close
- Loading state with progress text ("Analyzing mind map...", "Generating study guide...")

## File Changes

### New Files

1. **`supabase/migrations/XXXX_create_mind_maps.sql`** (via migration tool)
   - Creates `mind_maps` table with RLS policies

2. **`src/components/MindMapLibrary.tsx`** (~120 lines)
   - Dialog for browsing, searching, loading, and deleting saved mind maps

3. **`src/components/StudyGuideDialog.tsx`** (~150 lines)
   - Dialog for displaying AI-generated study guide with copy/save/download actions

4. **`supabase/functions/generate-study-guide/index.ts`** (~120 lines)
   - Edge function that takes mind map data, enriches with linked card content, calls AI to produce a study guide

### Modified Files

5. **`src/components/MindMap.tsx`** (major edit)
   - Add `currentMapId`, `isSaved`, `isDirty` state
   - Add save/load/open logic with Supabase queries
   - Extend `MindMapNode` type with `linked_card_id`
   - Add "Link to Card" and "Create Card from Node" context menu items
   - Add card picker dialog (inline, uses a searchable list of passed-in cards)
   - Add "Study Guide" toolbar button
   - Add `MindMapLibrary` dialog integration
   - Add `StudyGuideDialog` integration
   - Accept `cards`, `onCardSelect`, `onCreateCard` props
   - Change double-click behavior: if node has linked card, open card viewer; otherwise edit

6. **`src/pages/Index.tsx`** (minor edit)
   - Pass `cards`, `onCardSelect={setViewingCard}`, `onCreateCard={handleCreateCard}` to `<MindMap />`

7. **`supabase/config.toml`** (minor edit)
   - Add `[functions.generate-study-guide]` with `verify_jwt = false`

## Technical Details

- **No new dependencies**: Uses existing `react-markdown`, `jspdf`, Supabase client, `cmdk` for card search
- **AI model**: `google/gemini-3-flash-preview` via Lovable AI Gateway
- **Study guide prompt**: Instructs AI to act as a study guide creator, taking hierarchical knowledge and producing NotebookLM-style output with overview, key concepts, glossary, review questions, and study tips
- **Card linking**: Stored as `linked_card_id` in the node JSON within `map_data`. No separate junction table needed -- it's embedded in the JSONB.
- **Offline fallback**: localStorage save continues to work for anonymous/offline users. Database save only when authenticated.
- **Performance**: Mind map library fetches only metadata (title, date, layout_mode) in the list view. Full `map_data` is loaded only when opening a specific map.

