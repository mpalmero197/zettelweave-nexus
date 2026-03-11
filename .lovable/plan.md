

## Fix: Book Search Language Filtering & In-App Reading

### Problems

1. **Wrong language results**: Searching "Atomic Habits" returns "Hábitos Atómicos" because Open Library's `language` parameter doesn't reliably filter search result titles -- it filters by edition language metadata, which is inconsistent. The `detectLanguage` function only checks for special characters, so plain English queries like "Atomic Habits" correctly return `"eng"`, but the API ignores it.

2. **Reader opens externally on some paths**: The embedded reader exists but the Archive.org search fallback (`archive.org/search?query=...`) opens a search page, not an embedded reader -- so books without an `iaId` effectively link out.

### Fix Approach

**File: `src/components/learning/LearningBooks.tsx`**

**1. Fix language filtering** -- Two changes:
- Store the detected language alongside search results so it can be used for filtering.
- After receiving Open Library results, **client-side filter** results to match the detected language. Open Library returns a `language` array on docs when you add `language` to the `fields` param. Filter docs where `language` includes the detected lang code (e.g., `eng`). If no results survive the filter, fall back to unfiltered results.
- Also change the API URL to use the `lang` parameter (3-letter code) instead of `language` parameter, as the search endpoint uses `lang` for filtering edition language.

**2. Fix embedded reader for books without iaId**:
- For the search fallback, change the iframe URL from `archive.org/search?query=...` (which shows a browse page) to `openlibrary.org/search?q=...&mode=ebooks&has_fulltext=true` embedded in the iframe, so users stay in-app and can find readable editions.
- Add `&language=${lang}` to the Archive.org search fallback to prefer same-language editions.

**3. Pass language to book detail fetch**:
- When fetching book details via `openBookDetail`, also try to find the English (or detected-language) edition rather than the work-level data, so description comes back in the right language.

### Summary of Changes

| Change | What |
|--------|------|
| Add `language` to search `fields` param | Get language metadata per result |
| Client-side filter results by detected language | Ensure titles match query language |
| Fix reader fallback URL | Use embeddable Open Library ebooks search instead of Archive.org browse page |
| Add language param to fallback search | Prefer same-language editions in reader |

Single file change: `src/components/learning/LearningBooks.tsx`

