

## Preloaded Template Text for Catalyst & Resume AI

### What Changes

**1. Resume AI — Rich Preloaded Examples**
The Resume templates already have an `example` field, but they contain generic skeleton text ("X+ years", "Skill 1", etc.). I will replace each template's `example` with a realistic, fully fleshed-out sample resume so users can immediately see what the style looks like. Additionally, I will modify `applyTemplate` to always populate the textarea with the example text when a template is selected (currently it only fills when the textarea is empty).

Templates to enrich (8 total): Professional, Tech/Engineering, Creative/Design, Academic/Research, Healthcare, Executive/Leadership, Career Change, Entry Level.

**2. Catalyst — Document Templates with Preloaded Content**
Currently, "New" creates a blank "Untitled Document". I will add a template selection dialog that appears when clicking "New", offering document type templates with preloaded HTML content (since Catalyst uses TipTap/HTML storage). Templates will include:

| Template | Preloaded Content |
|---|---|
| Blank Document | Empty (current behavior) |
| Essay | Intro paragraph, body sections, conclusion with sample academic text |
| Research Paper | Abstract, introduction, methodology, results, discussion, references |
| Blog Post | Title, hook intro, subheadings with body paragraphs, call-to-action |
| Business Report | Executive summary, findings, recommendations, appendix |
| Creative Writing | Chapter opening with narrative prose sample |
| Meeting Notes | Date/attendees header, agenda, discussion points, action items |

Each template will populate both the document title and editor content with styled HTML so users see the formatting (headings, paragraphs, lists) immediately in the Word-view editor.

### Files Modified
- `src/components/ResumeOptimizer.tsx` — Replace skeleton `example` strings with realistic content; update `applyTemplate` to always populate
- `src/components/Catalyst.tsx` — Add template selection dialog to `handleNewDocument`, define `DOCUMENT_TEMPLATES` array with preloaded HTML content

### Implementation Notes
- Catalyst templates use HTML (h1, h2, p, ul/li tags) per the existing TipTap storage format
- Resume examples stay as plain text (matching the existing `<pre>` rendering in the template preview)
- Template dialog will be a simple inline Dialog with a grid of template cards, consistent with the existing UI patterns

