

## Mock Exam Section for Learning Hub

### Overview
Add a new "Exams" tab to the Learning Hub where users can create AI-generated mock exams on any subject. The AI (via Lovable AI Gateway using `google/gemini-2.5-pro` for highest accuracy) generates multiple-choice questions with full source citations. Questions are presented one at a time, answers revealed only after completion, with configurable question count and optional countdown timer.

### Architecture

```text
LearningHub (new "Exams" tab)
  └── LearningExams.tsx
        ├── Setup View (subject, question count, timer config)
        ├── Exam View (one question at a time, progress bar, timer)
        └── Results View (score, review all Q&A with citations)

Edge Function: generate-mock-exam/index.ts
  └── Calls Lovable AI Gateway (gemini-2.5-pro)
      └── Tool calling to extract structured JSON
```

### New Files

**1. `src/components/learning/LearningExams.tsx`**
- **Setup screen**: Text input for subject/topic, radio buttons for question count (50, 100, 150), timer toggle with presets (30min, 60min, custom input in minutes), +30min/+1hr increment buttons
- **Exam screen**: Shows one question at a time with 4 answer choices (A-D), navigation (prev/next), progress bar, optional countdown timer in top-right, "Submit Exam" button
- **Results screen**: Score summary (correct/total, percentage), review each question showing: the question, all choices, user's answer (highlighted red/green), correct answer, and full citation string
- State management: `useState` for exam phase (`setup | taking | results`), selected answers array, current question index, timer countdown

**2. `supabase/functions/generate-mock-exam/index.ts`**
- Accepts: `{ subject: string, questionCount: number }`
- Uses `google/gemini-2.5-pro` (strongest reasoning model) via Lovable AI Gateway
- Uses **tool calling** to extract structured output — a `generate_exam` tool with schema:
  ```
  questions: array of {
    question: string,
    choices: { a, b, c, d },
    correctAnswer: "a"|"b"|"c"|"d",
    citation: string,
    explanation: string
  }
  ```
- System prompt instructs the model to:
  - Only use verifiable, published sources (federal regulations, textbooks with ISBN, peer-reviewed papers, official government publications)
  - Cite exact regulation/section/page when possible
  - Make wrong answers plausible using real but inapplicable information from the same source material
  - Include material references (charts, diagrams, regulations) when relevant
- Handles 429/402 errors with appropriate messages
- Non-streaming (structured output via tool calling)

**3. `supabase/config.toml`** — add `[functions.generate-mock-exam]` with `verify_jwt = true`

### Modified Files

**`src/components/LearningHub.tsx`**
- Add 5th tab "Exams" with `ClipboardCheck` icon
- Update grid from `grid-cols-4` to `grid-cols-5`
- Import and render `LearningExams` component

### Key Design Decisions
- **gemini-2.5-pro** chosen over flash models for maximum accuracy on citations and factual content
- **Tool calling** ensures structured JSON output without fragile parsing
- **No database persistence** for MVP — exams are ephemeral per session (can add persistence later)
- Questions generated in batches (the AI generates all at once, not one-by-one)
- Timer is client-side only; auto-submits when time expires
- The AI is strongly prompted for verifiable citations, but a disclaimer will note that users should verify citations independently (since AI can hallucinate)

