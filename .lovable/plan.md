

# Knowledge Gap Analyzer

## Overview
Build a **Knowledge Gap Analyzer** that scans the user's cards, notes, and scratchpad content, identifies topics where their knowledge is incomplete, and surfaces free learning resources (videos, books, courses, quotes) to fill those gaps. This appears as a new section/tab accessible from the Dashboard and as a dedicated panel.

## How It Works

1. **Content Analysis**: An edge function receives the user's cards/notes content, sends it to the Lovable AI Gateway (Gemini), and asks the model to identify knowledge gaps -- topics mentioned but not fully covered, assumptions without evidence, referenced concepts lacking depth.

2. **Resource Discovery**: For each gap, the AI returns structured recommendations including:
   - YouTube/video search queries
   - Open Library book suggestions
   - Class Central / free course suggestions
   - Relevant quotes or key concepts to research
   - Wikipedia/reference links

3. **UI**: A `KnowledgeGapAnalyzer` component with:
   - A "Scan My Knowledge" button that triggers analysis
   - Gap cards showing the topic, why it's a gap, confidence level, and source notes
   - Each gap expands to show recommended resources (videos, books, courses, articles)
   - Ability to mark gaps as "resolved" or "studying"
   - Filter by subject/category

## Technical Plan

### 1. New Edge Function: `supabase/functions/analyze-knowledge-gaps/index.ts`
- Accepts user's cards and notes content (titles + content, truncated)
- Calls Lovable AI Gateway with a system prompt that instructs the model to:
  - Identify 5-15 knowledge gaps from the provided content
  - For each gap, suggest specific free resources (book titles from Open Library, course topics from Class Central, video search terms for YouTube)
- Uses tool-calling for structured JSON output with schema: `{ gaps: [{ topic, description, severity, relatedNotes, resources: { videos, books, courses, articles, quotes } }] }`
- Handles 429/402 errors

### 2. New Component: `src/components/KnowledgeGapAnalyzer.tsx`
- Fetches cards via `useZettelCards`, notes via Supabase query
- "Analyze" button sends content to the edge function
- Displays gaps as expandable cards with resource links
- Gap states: `new`, `studying`, `resolved`
- Persists gap state in localStorage (or a new `knowledge_gaps` table if desired)
- Resources link out to:
  - YouTube search URLs
  - Open Library search URLs
  - Class Central search URLs
  - Wikipedia article URLs

### 3. Integration Points
- **Dashboard**: Add a "Knowledge Gaps" widget/card in the Dashboard stats or as a tab
- **Index.tsx**: Add a `knowledge-gaps` tab value so it's accessible from navigation
- **MobileNavigation**: Add entry point if space allows, or nest under an existing menu

### 4. Files to Create
- `supabase/functions/analyze-knowledge-gaps/index.ts`
- `src/components/KnowledgeGapAnalyzer.tsx`

### 5. Files to Edit
- `src/pages/Index.tsx` -- add tab content for knowledge gaps
- `src/components/Dashboard.tsx` -- add a Knowledge Gaps summary card
- `src/components/TopNavBar.tsx` or `src/components/MobileNavigation.tsx` -- add navigation entry

