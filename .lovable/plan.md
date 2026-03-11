

## Two Changes: Book Language Labels + Embedded Course Viewer

### 1. Books: Show language badge on each card

The search already fetches `language` data from Open Library (line 122, `fields=...language`) and stores it as `_languages` on each doc (line 135). However, `BookResult` interface doesn't include this field, and it's not rendered.

**Changes to `LearningBooks.tsx`:**
- Add `languages?: string[]` to `BookResult` interface
- Map `doc.language` into `languages` field when parsing results (currently stored as `_languages` but stripped by type)
- Render a small language badge on each book card next to the year, using a 3-letter-to-readable-name map (e.g., `eng` → `English`, `spa` → `Spanish`, `ger` → `German`)
- Show in both search results and saved library cards

Language name map:
```
eng → English, spa → Spanish, fre → French, ger → German,
por → Portuguese, ita → Italian, chi → Chinese, jpn → Japanese,
kor → Korean, rus → Russian, ara → Arabic, hin → Hindi
```

### 2. Courses: Embed in PendragonX instead of linking externally

Same pattern as the book reader -- add a `viewingCourse` state that renders a full-height iframe embedding the course URL.

**Changes to `LearningCourses.tsx`:**
- Add `viewingCourse` state: `{ title: string; url: string } | null`
- When `viewingCourse` is set, render a full-screen-like view with Back button + iframe (identical pattern to `readerBook` in LearningBooks)
- Replace all `<a href={course.url} target="_blank">` links (lines 235, 250-254) with `onClick` handlers that set `viewingCourse`
- Both "View Course" button (search results) and "Open Course" button (saved courses) open the embedded viewer

### Files Modified
| File | Change |
|------|--------|
| `src/components/learning/LearningBooks.tsx` | Add `languages` to BookResult, render language badge on cards |
| `src/components/learning/LearningCourses.tsx` | Add embedded course viewer iframe, remove external links |

