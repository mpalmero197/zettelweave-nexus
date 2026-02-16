# Vault Import System -- Complete Overhaul

## Overview

Merge the two separate import dialogs (EnhancedImportDialog + VaultImportDialog) into a single, unified **Import Studio** that consolidates all import methods into one powerful interface with better UX, more source types, actual link resolution, and a post-import summary report.

## Current Problems

- **Two separate dialogs** that overlap in functionality and confuse users
- **PDF import is a placeholder** -- just shows "requires server-side processing"
- **No link resolution** -- wikilinks are extracted but never resolved to actual card IDs after import
- **No Roam Research support** -- mentioned in changelog but not implemented
- **No structured data import** -- no CSV/JSON support for bulk data
- **No folder structure awareness** -- Obsidian folder hierarchy is thrown away
- **No import summary report** -- user has no idea what happened after import
- **No drag-and-drop for folders** -- only file picker button
- **Duplicate detection between the two dialogs is inconsistent** -- different algorithms

## New Unified Architecture

Replace both `EnhancedImportDialog` and `VaultImportDialog` with a single `ImportStudio` component.

```text
+------------------------------------------------------------------+
|  Import Studio                                                    |
+------------------------------------------------------------------+
|  [Files] [URL] [Clipboard] [Obsidian] [Notion] [Roam] [CSV/JSON] |
+------------------------------------------------------------------+
|                                                                   |
|  (Source-specific UI)                                             |
|                                                                   |
|  Options:                                                        |
|  [x] Check duplicates  [x] Resolve wikilinks  [ ] Quick import  |
|                                                                   |
+------------------------------------------------------------------+
|  [Import] or [Review First]                                      |
+------------------------------------------------------------------+

After import:
+------------------------------------------------------------------+
|  Import Summary                                                  |
|  32 cards created | 5 links resolved | 2 duplicates skipped      |
|  [View Cards] [Import More] [Close]                              |
+------------------------------------------------------------------+
```

## File Changes

### 1. New file: `src/components/ImportStudio.tsx`

The single unified import component (~800 lines). Key sections:

**Source tabs** (7 tabs):

- **Files**: Drag-and-drop zone + file picker (from EnhancedImportDialog). Supports MD, TXT, DOCX, PDF, images.
- **URL**: Single URL + batch URL mode (from EnhancedImportDialog)
- **Clipboard**: Paste text with optional title (from EnhancedImportDialog)
- **Obsidian**: Folder picker with `webkitdirectory` for vault import. Processes `.md` files, extracts `#tags`, resolves `[[wikilinks]]`, preserves folder path as metadata.
- **Notion**: Folder picker for Notion Markdown+CSV export. Cleans Notion-specific link formatting.
- **Roam Research**: JSON file upload. Parses Roam's JSON export format (`[{title, children: [{string, children}]}]`), flattens nested bullet structure into markdown, extracts `[[page references]]` and `#tags`.
- **CSV/JSON**: Upload CSV or JSON files. Auto-detects columns/fields. User maps columns to card fields (title, content, tags, category) via dropdowns. Preview table before import.

**Review step** (enhanced from VaultImportDialog's preview):

- Unified file list with category badges, keyword tags, and content preview
- Search and filter by category
- Bulk category assignment
- Select/deselect all
- Per-file category and tag editing
- Duplicate indicators with similarity scores

**Wikilink resolution** (new):
After all cards are created, a post-processing pass matches `[[Page Name]]` references in card content to the titles of other imported cards, and populates the `linkedCards` array with the resolved card IDs. This turns extracted wikilinks into actual PendragonX card links.

**Import summary report** (new):
A completion screen showing:

- Cards created count
- Links resolved count
- Duplicates skipped count
- Errors encountered (with file names)
- Category distribution breakdown (mini bar chart)
- Button to view imported cards, import more, or close

**Roam Research JSON parser** (inline helper):

```
function parseRoamJSON(json): ParsedFile[] {
  // Roam exports as [{title, children: [{string, children}]}]
  // Flatten each page's nested bullets into markdown with indentation
  // Extract [[references]] and #tags
}
```

**CSV/JSON parser** (inline helper):

```
function parseCSV(text): {headers: string[], rows: string[][]}
function parseJSON(text): {fields: string[], records: object[]}
// User maps fields to: title, content, description, tags, category
```

### 2. Edit: `src/pages/Index.tsx`

- Remove imports of both `EnhancedImportDialog` and `VaultImportDialog`
- Add import for `ImportStudio`
- Replace the two separate dropdown menu items with a single "Import" item that opens `ImportStudio`
- Pass `existingCards` and `onImportCards` props (same interface)

### 3. Edit: `src/components/ImportDialog.tsx`

- Update the re-export to point to `ImportStudio` instead of `EnhancedImportDialog`

### 4. Keep existing files

- `EnhancedImportDialog.tsx` and `VaultImportDialog.tsx` remain in the codebase for backward compatibility but are no longer used from Index.tsx
- `ImportHistoryPanel.tsx` continues to be used within ImportStudio's History tab

## Technical Details

- **No new dependencies**: CSV parsing done with simple `split()` logic (no papaparse needed). Roam JSON is standard `JSON.parse()`.
- **Backward compatible**: `ImportStudio` accepts the same `onImportCards` callback. Existing card creation logic unchanged.
- **Wikilink resolution algorithm**: After import, iterate all new cards. For each `[[link text]]` found in content, search all new cards for a matching title (case-insensitive). If found, add to `linkedCards` array. This is O(n*m) but bounded by the number of wikilinks per card (capped at 50).
- **CSV field mapping**: User sees a preview table (first 5 rows) and selects which column maps to title, content, tags (comma-separated), and category. Unmapped columns are appended to content as key-value pairs.
- **Folder path preservation**: For Obsidian/Notion imports, the relative folder path is stored as a tag (e.g., `folder:Projects/Research`) so users can filter by original structure.