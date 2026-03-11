

## Fix Language Filtering for Book Search

### Problem
Open Library's `language:` search qualifier within the `q` parameter is unreliable — many books lack language metadata or have incomplete data, so non-English books slip through. The client-side filter then can't catch them because `_languages` is empty.

### Solution (in `src/components/learning/LearningBooks.tsx`)

1. **Remove `language:` from the `q` parameter** — it pollutes search relevance without reliably filtering.

2. **Increase the API fetch limit to ~100** so after strict client-side filtering there are still enough results.

3. **Stricter client-side language filter**:
   - If a book has a `language` array and the selected language is in it → include.
   - If a book has a `language` array but the selected language is NOT in it → exclude.
   - If a book has NO language data (empty array) → exclude when a language filter is active. This is the key change — currently these untagged books slip through.

4. **Prioritize language match**: Sort results so books where the selected language appears first in the `language` array rank higher than books where it appears later (multi-language books).

### Changes — single file `src/components/learning/LearningBooks.tsx`

**Lines 153-177** — update search and filter logic:
```typescript
// Remove language: from q param, increase limit
const searchParam = isEmptyQuery ? "subject:popular" : searchQuery;
const url = `...?q=${encodeURIComponent(searchParam)}&limit=100&fields=...`;

// Strict filter: book MUST have the selected language in its language array
const langResult = allDocs.filter((b) =>
  Array.isArray(b._languages) && b._languages.length > 0 && b._languages.includes(currentLang)
);

// Sort: prioritize books where selected language is primary (index 0)
langResult.sort((a, b) => {
  const aIdx = a._languages.indexOf(currentLang);
  const bIdx = b._languages.indexOf(currentLang);
  return aIdx - bIdx;
});
```

This ensures only books with confirmed language metadata matching the filter are shown, and multi-language books where the selected language is primary appear first.

