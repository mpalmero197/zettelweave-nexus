

## Evernote Import for Pendragon

### The Reality of Evernote Integration

Evernote uses **OAuth 1.0a** authentication, which requires:
1. Applying for an Evernote API key (manual review process, can take days/weeks)
2. Server-side token exchange (OAuth 1.0a requires server-side signing with a consumer secret)
3. Evernote's API has strict rate limits and their developer program has become increasingly restrictive

**Recommended approach**: Support **ENEX file import** -- this is Evernote's standard export format (XML-based). Users can export their notes from Evernote (File > Export Notes) and import the `.enex` file directly into Pendragon. This works immediately with no API key approval needed.

### What will be built

1. **ENEX parser utility** (`src/utils/evernoteImport.ts`)
   - Parse `.enex` XML files using the browser's built-in `DOMParser`
   - Extract note title, content (ENML/HTML), tags, created/updated dates, and attachments metadata
   - Convert ENML (Evernote Markup Language) to clean HTML suitable for Zettel cards
   - Handle multiple notes per `.enex` file (Evernote exports entire notebooks)

2. **Add Evernote tab to Import Studio** (`src/components/ImportStudio.tsx`)
   - New "Evernote" tab alongside existing File/URL/Obsidian/Notion tabs
   - Drag-and-drop or file picker for `.enex` files
   - Preview parsed notes with title, tag count, and content snippet before importing
   - Select/deselect individual notes
   - Map Evernote tags to Zettel card tags
   - Import selected notes as Zettel cards with auto-categorization

3. **Also support ENEX in Catalyst Import** (`src/components/CatalystImportDialog.tsx`)
   - Add `.enex` to the supported file types for the Computer tab
   - Parse and convert ENEX content to HTML for use in the Catalyst editor

### ENEX Format Structure (for reference)
```text
<?xml version="1.0" encoding="UTF-8"?>
<en-export>
  <note>
    <title>Note Title</title>
    <content><![CDATA[...ENML content...]]></content>
    <created>20230101T120000Z</created>
    <updated>20230615T180000Z</updated>
    <tag>tag1</tag>
    <tag>tag2</tag>
  </note>
  ...more notes...
</en-export>
```

### Technical Details

- **No new dependencies needed** -- browser `DOMParser` handles XML parsing natively
- **No database changes** -- imported notes become standard Zettel cards via existing `onImportCards`
- **ENML to HTML conversion**: Strip Evernote-specific elements (`en-note`, `en-media`, `en-todo`), convert checkboxes to Unicode, preserve formatting
- **File type addition**: Add `.enex` to `getSupportedFileTypes()` in `fileImportUtils.ts`

### User flow
1. In Evernote: Select notes > File > Export Notes > Save as `.enex`
2. In Pendragon: Open Import Studio > Evernote tab > Drop/select `.enex` file
3. Preview notes, select which to import, click Import
4. Notes appear as Zettel cards with preserved tags and content

