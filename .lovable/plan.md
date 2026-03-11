

## Deep Learning Hub Integration -- Real Features, Not Links

### Problem
The current Learning Hub is surface-level: it searches the web for URLs, parses titles from URL paths, and links out. There's no actual course browsing, no book reading, no interactive topic maps, and no persistence. The user rightly calls this lazy.

### What We'll Build

**1. Courses Tab -- AI-Powered Course Catalog**

Replace the URL-scraping approach with structured AI-generated course results. When a user searches "machine learning":
- The `web-search` edge function is called, but results are parsed by a **second AI call** (via a new `search-courses` edge function) that extracts structured data: title, provider, description, difficulty level, estimated duration, whether it's free, rating, syllabus topics, and enrollment URL.
- Results render as rich cards with difficulty badges (Beginner/Intermediate/Advanced), duration, provider logo area, syllabus preview (expandable list of topics), and a "Save Course" button.
- **My Courses**: Saved courses persist in a new `saved_courses` Supabase table. Users can track status: "Want to Take", "In Progress", "Completed". A "My Courses" toggle at the top switches between search and saved list with progress tracking.

**2. Books Tab -- Full Library Experience**

Open Library has rich APIs beyond search. Expand to:
- **Book Detail View**: Clicking a book opens an in-app detail panel (Sheet) showing full description, all authors, all subjects, all editions, availability status (via Open Library Availability API: `https://openlibrary.org/api/books?bibkeys=...`), and a "Read Online" button that opens the Internet Archive reader.
- **Reading Lists**: A `reading_lists` Supabase table lets users save books with status: "Want to Read", "Reading", "Finished". Render a "My Library" toggle showing saved books grouped by status.
- **Book Notes**: Users can attach notes to saved books (stored in `reading_list_notes` column), connecting the learning hub to the knowledge management system.

**3. Topic Maps Tab -- Interactive Learning Paths**

Replace the link-list with actual generated topic maps:
- When a user searches a topic, use a new `generate-topic-map` edge function that calls Gemini to produce a structured JSON tree of subtopics, prerequisites, and resources for each node.
- Render the tree as an **interactive expandable outline** (accordion-style) with: topic name, brief description, difficulty indicator, and curated resource links per node.
- Users can click any subtopic to drill deeper (triggers a new search for that subtopic).
- Add a "Save as Mind Map" button that converts the topic map JSON into the existing MindMap format and saves it to the user's Mind Map library.

### Database Tables (Migration)

```sql
-- Saved courses
create table public.saved_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  provider text,
  url text not null,
  description text,
  difficulty text,
  duration text,
  is_free boolean default false,
  syllabus jsonb default '[]',
  status text default 'want_to_take' check (status in ('want_to_take','in_progress','completed')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.saved_courses enable row level security;
create policy "Users manage own courses" on public.saved_courses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reading list
create table public.reading_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  book_key text not null,
  title text not null,
  author text,
  cover_id integer,
  year integer,
  subjects jsonb default '[]',
  status text default 'want_to_read' check (status in ('want_to_read','reading','finished')),
  notes text,
  rating integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.reading_list enable row level security;
create policy "Users manage own reading list" on public.reading_list for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
```

### New Edge Function

**`search-courses/index.ts`**: Takes a search query, calls `web-search` internally (or Gemini directly), and returns structured course objects with real titles, descriptions, difficulty, duration, and syllabus. Uses Gemini tool-calling to enforce the output schema.

**`generate-topic-map/index.ts`**: Takes a topic string, calls Gemini with a system prompt to generate a hierarchical topic map as structured JSON (nodes with children, descriptions, difficulty levels, and resource URLs).

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/search-courses/index.ts` | Create -- structured course search |
| `supabase/functions/generate-topic-map/index.ts` | Create -- AI topic map generation |
| `src/components/learning/LearningCourses.tsx` | Rewrite -- rich course cards + My Courses |
| `src/components/learning/LearningBooks.tsx` | Rewrite -- book details + reading list |
| `src/components/learning/LearningTopicMaps.tsx` | Rewrite -- interactive topic tree + save to mind map |
| `src/components/LearningHub.tsx` | Minor update -- add reading list / my courses counts |
| `supabase/config.toml` | Add new function configs |
| DB migration | Create `saved_courses` and `reading_list` tables |

