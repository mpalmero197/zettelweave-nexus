/**
 * ENEX (Evernote Export) file parser
 * Parses .enex XML files and converts ENML content to clean HTML
 */

export interface EvernoteNote {
  title: string;
  content: string; // cleaned HTML
  tags: string[];
  created: string; // ISO date string
  updated: string; // ISO date string
  sourceUrl?: string;
}

/**
 * Parse an Evernote date string (e.g. "20230101T120000Z") to ISO format
 */
function parseEvernoteDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  // Format: YYYYMMDDTHHmmssZ
  const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!match) return new Date().toISOString();
  const [, y, mo, d, h, mi, s] = match;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`).toISOString();
}

/**
 * Convert ENML (Evernote Markup Language) to clean HTML
 * Strips Evernote-specific elements and normalizes content
 */
function convertEnmlToHtml(enml: string): string {
  if (!enml) return '';

  let html = enml;

  // Remove XML declaration
  html = html.replace(/<\?xml[^?]*\?>/gi, '');

  // Remove DOCTYPE
  html = html.replace(/<!DOCTYPE[^>]*>/gi, '');

  // Unwrap <en-note> — the root ENML element
  html = html.replace(/<\/?en-note[^>]*>/gi, '');

  // Convert <en-todo> checkboxes to Unicode
  html = html.replace(/<en-todo\s+checked="true"\s*\/?>/gi, '☑ ');
  html = html.replace(/<en-todo\s+checked="false"\s*\/?>/gi, '☐ ');
  html = html.replace(/<en-todo\s*\/?>/gi, '☐ ');

  // Remove <en-media> (attachments we can't inline)
  html = html.replace(/<en-media[^>]*\/>/gi, '');
  html = html.replace(/<en-media[^>]*>[\s\S]*?<\/en-media>/gi, '');

  // Remove <en-crypt> encrypted sections
  html = html.replace(/<en-crypt[^>]*>[\s\S]*?<\/en-crypt>/gi, '<em>[Encrypted content]</em>');

  // Clean up excessive whitespace
  html = html.replace(/\n{3,}/g, '\n\n').trim();

  return html;
}

/**
 * Parse an ENEX file string into an array of EvernoteNote objects
 */
export function parseEnexFile(xmlString: string): EvernoteNote[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid ENEX file: XML parsing failed');
  }

  const noteElements = doc.querySelectorAll('note');
  if (noteElements.length === 0) {
    throw new Error('No notes found in this ENEX file');
  }

  const notes: EvernoteNote[] = [];

  noteElements.forEach((noteEl) => {
    const title = noteEl.querySelector('title')?.textContent || 'Untitled';

    // Content is inside CDATA in the <content> element
    const contentEl = noteEl.querySelector('content');
    const rawContent = contentEl?.textContent || '';
    const content = convertEnmlToHtml(rawContent);

    // Tags — each <tag> element is a separate tag
    const tagElements = noteEl.querySelectorAll('tag');
    const tags: string[] = [];
    tagElements.forEach((t) => {
      const tagText = t.textContent?.trim();
      if (tagText) tags.push(tagText);
    });

    const created = parseEvernoteDate(noteEl.querySelector('created')?.textContent || '');
    const updated = parseEvernoteDate(noteEl.querySelector('updated')?.textContent || created);
    const sourceUrl = noteEl.querySelector('source-url')?.textContent || undefined;

    notes.push({ title, content, tags, created, updated, sourceUrl });
  });

  return notes;
}

/**
 * Read an ENEX File object and parse its contents
 */
export async function readEnexFile(file: File): Promise<EvernoteNote[]> {
  const text = await file.text();
  return parseEnexFile(text);
}
