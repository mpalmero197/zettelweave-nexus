

## Plan: NotebookLM-Style "Chat With Your Knowledge" Experience

### Problem
The current ALICE assistant sidebar sends all user content as context but lacks the focused, source-grounded experience that NotebookLM provides. Responses are plain text without markdown rendering, there is no way to select specific sources to chat about, and citations to specific user content are not displayed.

### Changes

**1. Add Markdown Rendering to ALICE Chat (AIAssistantSidebar.tsx)**
- Replace the plain `<p>` whitespace-pre-wrap rendering with `<ReactMarkdown>` (already a project dependency)
- Apply the same `prose prose-sm dark:prose-invert` classes used elsewhere in the app

**2. Add Source Selector Panel**
- Add a collapsible "Sources" section at the top of the sidebar showing content categories (Cards, Notes, Catalyst Docs, Tasks, Calendar) with toggle switches
- Within each category, allow the user to select/deselect specific items (e.g., individual notebooks, card categories)
- Show a count badge: "12 cards, 5 notes selected"
- Default: all sources selected (current behavior preserved)

**3. Update Edge Function for Better Grounding (ai-assistant-chat/index.ts)**
- Enhance the system prompt to instruct the model to cite specific source titles inline (e.g., "According to your card *Quantum Entanglement*...")
- Accept a `selectedSources` filter parameter so only user-picked content is sent as context
- Send more content per item (increase substring limits) when fewer sources are selected, for deeper grounding

**4. Add Full-Page Chat Mode**
- Add a "Knowledge Chat" view accessible from the main navigation (alongside Graph, Whiteboard, etc.)
- Two-panel layout: left panel shows selected sources with checkboxes, right panel is the chat
- Reuse the chat logic from AIAssistantSidebar via a shared hook (`useKnowledgeChat`)
- Mobile: source panel collapses into a sheet triggered by a button

**5. Extract Shared Chat Logic (hooks/useKnowledgeChat.ts)**
- Move message state, send logic, context assembly, and suggested-search handling into a reusable hook
- Both the sidebar and full-page view consume this hook

### Files to Create/Edit

| File | Action |
|------|--------|
| `src/hooks/useKnowledgeChat.ts` | Create - shared chat state and logic |
| `src/components/KnowledgeChat.tsx` | Create - full-page chat view |
| `src/components/KnowledgeChatSourcePanel.tsx` | Create - source selector UI |
| `src/components/AIAssistantSidebar.tsx` | Edit - use shared hook, add markdown rendering, add source toggles |
| `src/pages/Index.tsx` | Edit - add Knowledge Chat as a view option |
| `supabase/functions/ai-assistant-chat/index.ts` | Edit - accept source filters, improve citation prompting |

### Technical Details

- The source selector will filter content client-side before sending to the edge function, reducing payload size and improving response relevance
- The system prompt will be updated to enforce inline citations: "When referencing user content, always mention the exact title in bold"
- Full-page view uses the same `100dvh` height pattern established for Graph/Whiteboard
- ReactMarkdown is already installed (`react-markdown@^10.1.0`)

