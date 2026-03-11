

## Add "Preview" Badge to Limited-Access Books

Open Library's search API provides an `ebook_access` field with values: `"public"`, `"borrowable"`, `"printdisabled"`, or `"no_ebook"`. Books that aren't `"public"` are limited preview.

### Changes to `src/components/learning/LearningBooks.tsx`

1. **Add `ebookAccess` to `BookResult` interface** — new optional field `ebookAccess?: string`

2. **Add `ebook_access` to the API `fields` param** (line 146) and map it when parsing results (line 158 area): `ebookAccess: doc.ebook_access || "no_ebook"`

3. **Render a "Preview" or "Full" badge on each book card** (after the language badges, ~line 366):
   - If `ebookAccess === "public"` → green "Full Text" badge
   - If `ebookAccess === "borrowable"` → yellow "Borrow" badge  
   - Otherwise (printdisabled/no_ebook) → gray "Preview" badge

4. **Also show in book detail sheet** next to the title (~line 415 area)

Single file change, minimal additions.

