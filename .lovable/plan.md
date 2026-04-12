

# Living Second Brain: AI Knowledge Chat + Auto Master Documents

## Overview

Two features:

1. **Enhanced AI Chat** -- upgrade the existing `ai-assistant-chat` edge function to include ALL user content (cards, notes, catalyst documents, calendar events, tasks, scratchpad) as context, making it a true "second brain" the user can query about their own knowledge.

2. **Auto Master Documents** -- a background system that detects subject clusters across the user's content and auto-creates/updates comprehensive Catalyst documents per subject. Triggered whenever new content is added.

---

## Step 1: Enhance AI Chat with Full Knowledge Base Context

**What changes:** Update `AIAssistantSidebar.tsx` to also fetch and pass catalyst documents, calendar events, and tasks as context. Update the `ai-assistant-chat` edge function system prompt to understand all content types.

- Fetch `catalyst_documents` (title + first 500 chars of content) alongside existing cards/notes
- Fetch `calendar_events` (title, date, description)
- Fetch `tasks` (title, notes, status)
- Fetch `scratchpad_notes` from Supabase instead of localStorage
- Pass all of these in the `context` object to the edge function
- Update the edge function system prompt to reference all content types

**Files:** `src/components/AIAssistantSidebar.tsx`, `supabase/functions/ai-assistant-chat/index.ts`

## Step 2: Create Master Document Synthesis System

### Database

New table `master_document_subjects` to track detected subjects and their linked Catalyst document:

```sql
CREATE TABLE public.master_document_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  catalyst_document_id UUID REFERENCES catalyst_documents(id) ON DELETE SET NULL,
  last_synthesized_at TIMESTAMPTZ,
  source_count INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE master_document_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subjects" ON master_document_subjects
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Edge Function: `synthesize-master-document`

A new edge function that:
1. Receives a `user_id` and optional `subject` hint
2. Scans all user content (cards, notes, catalyst docs) for subject clusters using AI
3. For each subject with 3+ related items:
   - If no master doc exists: creates a new Catalyst document with synthesized content
   - If master doc exists: reads existing content, merges new information, improves writing/formatting
4. Uses Gemini via Lovable AI Gateway with a structured prompt for academic-quality synthesis
5. Saves the result to `catalyst_documents` and links it in `master_document_subjects`

### Trigger Mechanism

- Add a database trigger on `zettel_cards`, `notes`, and `catalyst_documents` that sets a flag or inserts into a queue
- Create a lightweight edge function `trigger-synthesis` called via `pg_net` on INSERT/UPDATE
- The user must opt in via a setting (stored in `profiles` or a new `user_preferences` table)

### User Consent Flow

- Add an opt-in toggle in Settings: "Enable Auto Master Documents"
- When first enabled, run an initial scan of all content
- Show a "Master Documents" section in Catalyst listing auto-generated docs with a badge

## Step 3: UI Integration

- **Catalyst:** Add a "Master Documents" filter/tag to show auto-generated documents, with an "Auto-generated" badge
- **Settings:** Add toggle for "Living Second Brain - Auto Master Documents"
- **AI Chat:** Add a quick prompt: "What subjects could you create master documents for?"

---

## Technical Details

**AI Chat context payload structure:**
```typescript
context: {
  cards: [...],           // existing
  notes: [...],           // existing
  catalystDocs: [{ id, title, content: first500chars }],
  calendarEvents: [{ id, title, start_date, description }],
  tasks: [{ id, title, notes, is_completed }],
  scratchPad: [...]       // from Supabase
}
```

**Synthesis prompt pattern:**
```
You are a knowledge synthesizer. Given these source materials about "{subject}",
create a comprehensive, well-structured document. Use H1-H3 hierarchy, cite
source titles, and produce at least 2000 words. If an existing document is
provided, merge new information and improve the writing quality.
```

**Trigger flow:**
```
User creates card/note → DB trigger → pg_net calls synthesize-master-document
→ AI clusters content → Creates/updates Catalyst doc → Updates master_document_subjects
```

