

## Embed Course Websites Inside PendragonX

### What
When a user clicks "View Course" or "Open Course", instead of opening a new tab, show the course website in an iframe that fills the main content area — keeping the PendragonX header, sidebar, chat bubble, and mobile nav intact. Include a top bar with a "Back" button, the course title, and an option to open in a new tab instead. Persist the user's preference (iframe vs new tab) in localStorage.

### Changes — single file `src/components/learning/LearningCourses.tsx`

1. **Add `viewingCourse` state** — stores `{ url, title }` of the course being viewed inline.

2. **Add `openPreference` state** — `"embed"` (default) or `"external"`, read from/written to `localStorage` key `pendragon-course-open-pref`.

3. **`handleOpenCourse` function**:
   - If preference is `"external"` → `window.open(url, '_blank')`.
   - If `"embed"` → set `viewingCourse` state, which renders the embedded view.

4. **Embedded course view** — when `viewingCourse` is set, render instead of the search/saved UI:
   - A sticky toolbar at the top with:
     - Back button (arrow left) to return to course list
     - Course title (truncated)
     - "Open in new tab" button (ExternalLink icon)
     - A small settings dropdown/toggle: "Always open in new tab" checkbox that sets the localStorage preference
   - A toast on first embed: "Course opened inside PendragonX. You can change this in the toolbar to open in a separate window."
   - An iframe filling remaining height (`flex-1`) with `src={viewingCourse.url}`, with `sandbox="allow-scripts allow-same-origin allow-popups allow-forms"`.
   - An `onError`/fallback: if the iframe fails to load (X-Frame-Options), show a message: "This course platform doesn't allow embedding. Opening in a new tab..." and auto-open in new tab.

5. **Update all "View Course" / "Open Course" buttons** to call `handleOpenCourse(course.url, course.title)` instead of `window.open`.

### Note on iframe blocking
Many platforms block iframes. The iframe will have an `onLoad` handler that checks if it loaded successfully. Since we can't reliably detect X-Frame-Options failures from JS, we'll use a timeout-based approach: if the iframe's `contentWindow` is inaccessible after load, we show a fallback message and offer to open externally. This gracefully handles both embeddable and non-embeddable sites.

