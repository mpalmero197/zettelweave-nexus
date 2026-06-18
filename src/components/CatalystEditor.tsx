import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import FontFamily from '@tiptap/extension-font-family';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalystFindReplace } from '@/components/catalyst/CatalystFindReplace';
import { DocumentThemeSelector } from '@/components/DocumentThemeSelector';
import { CatalystLayoutSelector, type DocumentLayout } from '@/components/catalyst/CatalystLayoutSelector';
import { getThemeClass } from '@/utils/documentThemes';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Quote,
  Code,
  Minus,
  Search,
  Maximize2,
  Minimize2,
  Focus,
  Highlighter,
  ALargeSmall,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Strikethrough,
  Link as LinkIcon,
  Table as TableIcon,
  Palette,
  Unlink,
  ImagePlus,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CatalystEditorProps {
  content: string;
  onChange: (content: string) => void;
  onWordCountChange: (count: number) => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  documentTheme?: string;
  onThemeChange?: (theme: string) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fef08a', label: 'Needs citation' },
  { name: 'Green', value: '#bbf7d0', label: 'Approved' },
  { name: 'Blue', value: '#bfdbfe', label: 'Research needed' },
  { name: 'Pink', value: '#fecdd3', label: 'Cut candidate' },
];

const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Garamond', value: 'Garamond' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Palatino', value: 'Palatino Linotype' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS' },
];

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999',
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
  '#2563eb', '#7c3aed', '#db2777', '#0891b2',
];

export function CatalystEditor({
  content,
  onChange,
  onWordCountChange,
  focusMode = false,
  onToggleFocusMode,
  isFullscreen = false,
  onToggleFullscreen,
  documentTheme = 'default',
  onThemeChange,
}: CatalystEditorProps) {
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<DocumentLayout>('web');
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Image,
      CharacterCount,
      Placeholder.configure({ placeholder: 'Start writing your masterpiece...' }),
      Highlight.configure({ multicolor: true }),
      Typography,
      Subscript,
      Superscript,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'catalyst-link' },
      }),
      FontFamily,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange(html);
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      onWordCountChange(words.length);
    },
    onTransaction: ({ editor }) => {
      if (!typewriterMode) return;
      const { view } = editor;
      if (!view.hasFocus()) return;
      const { from } = view.state.selection;
      const coords = view.coordsAtPos(from);
      if (coords) {
        const editorEl = editorRef.current?.querySelector('.ProseMirror');
        if (editorEl) {
          const rect = editorEl.getBoundingClientRect();
          const scrollContainer = editorEl.closest('.overflow-auto') || editorEl.parentElement;
          if (scrollContainer) {
            const targetY = coords.top - rect.top - scrollContainer.clientHeight / 2;
            scrollContainer.scrollTo({ top: targetY, behavior: 'smooth' });
          }
        }
      }
    },
    editorProps: {
      attributes: {
        class: `catalyst-word-view ${getThemeClass(documentTheme)} max-w-none focus:outline-none ${
          isFullscreen ? 'min-h-screen' : 'min-h-[600px]'
        } ${focusMode ? 'catalyst-focus-mode' : ''} ${typewriterMode ? 'catalyst-typewriter' : ''}`,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Document editor',
      },
    },
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
      }
      if (e.key === 'Escape' && toolbarRef.current) {
        const firstButton = toolbarRef.current.querySelector('button:not([disabled])') as HTMLElement;
        firstButton?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (editor && content !== editor.getHTML()) {
    editor.commands.setContent(content);
  }

  const handleReplace = useCallback(
    (searchTerm: string, replaceTerm: string, replaceAll: boolean) => {
      if (!editor) return;
      const html = editor.getHTML();
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, replaceAll ? 'gi' : 'i');
      const newHtml = html.replace(regex, replaceTerm);
      editor.commands.setContent(newHtml);
      onChange(newHtml);
    },
    [editor, onChange]
  );

  const handleHighlight = useCallback((_searchTerm: string, _caseSensitive: boolean) => {}, []);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const setFontSize = useCallback((size: string) => {
    if (!editor) return;
    editor.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run();
  }, [editor]);

  const setFont = useCallback((family: string) => {
    if (!editor) return;
    if (family === '') {
      editor.chain().focus().unsetFontFamily().run();
    } else {
      editor.chain().focus().setFontFamily(family).run();
    }
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  const layoutClass =
    layoutMode === 'single-page' ? 'catalyst-layout-page' :
    layoutMode === 'two-page' ? 'catalyst-layout-book' :
    layoutMode === 'reading' ? 'catalyst-layout-reading' :
    layoutMode === 'manuscript' ? 'catalyst-layout-manuscript' :
    layoutMode === 'print' ? 'catalyst-layout-print' :
    layoutMode === 'draft' ? 'catalyst-layout-draft' :
    'catalyst-layout-web';

  return (
    <div className={`border rounded-lg overflow-hidden relative ${layoutClass}`} ref={editorRef} role="region" aria-label="Document editor" data-writing-suggest="catalyst">
      {/* ── Row 1: Main formatting toolbar ── */}
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label="Formatting toolbar"
        className="bg-muted/50 border-b p-2 flex flex-wrap items-center gap-1 sticky top-0 z-10"
      >
        {/* Undo/Redo */}
        <div role="group" aria-label="History">
          <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} aria-label="Undo" aria-keyshortcuts="Control+Z">
            <Undo className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} aria-label="Redo" aria-keyshortcuts="Control+Shift+Z">
            <Redo className="h-4 w-4" />
          </Toggle>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Font Family */}
        <Select value={editor.getAttributes('textStyle').fontFamily || ''} onValueChange={setFont}>
          <SelectTrigger className="h-7 w-[120px] text-[11px] bg-background border-border" aria-label="Font family">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map(f => (
              <SelectItem key={f.value} value={f.value || 'default'} className="text-xs" style={{ fontFamily: f.value || 'inherit' }}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select onValueChange={setFontSize}>
          <SelectTrigger className="h-7 w-[62px] text-[11px] bg-background border-border" aria-label="Font size">
            <SelectValue placeholder="18" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map(s => (
              <SelectItem key={s} value={s} className="text-xs">{s}px</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Text Formatting */}
        <div role="group" aria-label="Text formatting">
          <Toggle size="sm" pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()} aria-label="Bold" aria-keyshortcuts="Control+B">
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic" aria-keyshortcuts="Control+I">
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('underline')} onPressedChange={() => editor.chain().focus().toggleUnderline().run()} aria-label="Underline" aria-keyshortcuts="Control+U">
            <UnderlineIcon className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('strike')} onPressedChange={() => editor.chain().focus().toggleStrike().run()} aria-label="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('subscript')} onPressedChange={() => editor.chain().focus().toggleSubscript().run()} aria-label="Subscript">
            <SubscriptIcon className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('superscript')} onPressedChange={() => editor.chain().focus().toggleSuperscript().run()} aria-label="Superscript">
            <SuperscriptIcon className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('code')} onPressedChange={() => editor.chain().focus().toggleCode().run()} aria-label="Inline code">
            <Code className="h-4 w-4" />
          </Toggle>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Text Color */}
        <div role="group" aria-label="Text color">
          <Popover>
            <PopoverTrigger asChild>
              <Toggle size="sm" pressed={false} aria-label="Text color">
                <Palette className="h-4 w-4" />
              </Toggle>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-4 gap-1.5">
                {TEXT_COLORS.map(color => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    aria-label={`Text color ${color}`}
                    onClick={() => editor.chain().focus().setColor(color).run()}
                  />
                ))}
                <button
                  className="w-6 h-6 rounded border border-border bg-background text-[9px] flex items-center justify-center hover:bg-muted col-span-4"
                  onClick={() => editor.chain().focus().unsetColor().run()}
                  aria-label="Remove text color"
                >
                  Reset
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Highlight */}
        <div role="group" aria-label="Highlight">
          <Popover>
            <PopoverTrigger asChild>
              <Toggle size="sm" pressed={editor.isActive('highlight')} aria-label="Highlight text">
                <Highlighter className="h-4 w-4" />
              </Toggle>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex gap-1.5">
                {HIGHLIGHT_COLORS.map(color => (
                  <button
                    key={color.value}
                    className="w-7 h-7 rounded-md border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value }}
                    title={`${color.name} — ${color.label}`}
                    aria-label={`Highlight ${color.name}: ${color.label}`}
                    onClick={() => editor.chain().focus().toggleHighlight({ color: color.value }).run()}
                  />
                ))}
                <button
                  className="w-7 h-7 rounded-md border border-border bg-background text-xs flex items-center justify-center hover:bg-muted"
                  title="Remove highlight"
                  aria-label="Remove highlight"
                  onClick={() => editor.chain().focus().unsetHighlight().run()}
                >
                  ✕
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Link */}
        <div role="group" aria-label="Links">
          <Toggle size="sm" pressed={editor.isActive('link')} onPressedChange={setLink} aria-label="Insert link">
            <LinkIcon className="h-4 w-4" />
          </Toggle>
          {editor.isActive('link') && (
            <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().unsetLink().run()} aria-label="Remove link">
              <Unlink className="h-4 w-4" />
            </Toggle>
          )}
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Headings */}
        <div role="group" aria-label="Headings">
          <Toggle size="sm" pressed={editor.isActive('heading', { level: 1 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="Heading 1">
            <Heading1 className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('heading', { level: 2 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading 2">
            <Heading2 className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('heading', { level: 3 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Heading 3">
            <Heading3 className="h-4 w-4" />
          </Toggle>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Lists */}
        <div role="group" aria-label="Lists and blocks">
          <Toggle size="sm" pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list">
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('blockquote')} onPressedChange={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Block quote">
            <Quote className="h-4 w-4" />
          </Toggle>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Alignment */}
        <div role="group" aria-label="Text alignment">
          <Toggle size="sm" pressed={editor.isActive({ textAlign: 'left' })} onPressedChange={() => editor.chain().focus().setTextAlign('left').run()} aria-label="Align left">
            <AlignLeft className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive({ textAlign: 'center' })} onPressedChange={() => editor.chain().focus().setTextAlign('center').run()} aria-label="Align center">
            <AlignCenter className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive({ textAlign: 'right' })} onPressedChange={() => editor.chain().focus().setTextAlign('right').run()} aria-label="Align right">
            <AlignRight className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive({ textAlign: 'justify' })} onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()} aria-label="Justify">
            <AlignJustify className="h-4 w-4" />
          </Toggle>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Table & HR */}
        <div role="group" aria-label="Insert">
          <Toggle size="sm" pressed={false} onPressedChange={insertTable} aria-label="Insert table">
            <TableIcon className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={false} onPressedChange={() => editor.chain().focus().setHorizontalRule().run()} aria-label="Horizontal rule">
            <Minus className="h-4 w-4" />
          </Toggle>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Find & Replace */}
        <Toggle size="sm" pressed={showFindReplace} onPressedChange={() => setShowFindReplace(!showFindReplace)} title="Find & Replace (Ctrl+F)" aria-label="Find and replace" aria-keyshortcuts="Control+F">
          <Search className="h-4 w-4" />
        </Toggle>

        {/* Typewriter Mode */}
        <Toggle size="sm" pressed={typewriterMode} onPressedChange={() => setTypewriterMode(!typewriterMode)} title="Typewriter mode" aria-label="Typewriter scrolling mode">
          <ALargeSmall className="h-4 w-4" />
        </Toggle>

        {/* Focus Mode */}
        {onToggleFocusMode && (
          <Toggle size="sm" pressed={focusMode} onPressedChange={onToggleFocusMode} title="Focus mode" aria-label="Focus mode">
            <Focus className="h-4 w-4" />
          </Toggle>
        )}

        {/* Fullscreen */}
        {onToggleFullscreen && (
          <Toggle size="sm" pressed={isFullscreen} onPressedChange={onToggleFullscreen} title="Distraction-free mode" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Toggle>
        )}
      </div>

      {/* ── Row 2: Layout + Theme selector ── */}
      <div className="bg-muted/30 border-b px-3 py-1.5 flex items-center gap-3">
        <CatalystLayoutSelector value={layoutMode} onChange={setLayoutMode} />
        <Separator orientation="vertical" className="h-5" />
        <DocumentThemeSelector value={documentTheme} onChange={onThemeChange || (() => {})} />

        {/* Table controls (visible when inside a table) */}
        {editor.isActive('table') && (
          <>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-1 text-[11px]">
              <button className="px-2 py-0.5 rounded bg-muted hover:bg-accent text-muted-foreground" onClick={() => editor.chain().focus().addColumnAfter().run()}>+ Col</button>
              <button className="px-2 py-0.5 rounded bg-muted hover:bg-accent text-muted-foreground" onClick={() => editor.chain().focus().addRowAfter().run()}>+ Row</button>
              <button className="px-2 py-0.5 rounded bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive" onClick={() => editor.chain().focus().deleteColumn().run()}>- Col</button>
              <button className="px-2 py-0.5 rounded bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive" onClick={() => editor.chain().focus().deleteRow().run()}>- Row</button>
              <button className="px-2 py-0.5 rounded bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive" onClick={() => editor.chain().focus().deleteTable().run()}>Delete Table</button>
            </div>
          </>
        )}
      </div>

      {/* Find & Replace Panel */}
      <CatalystFindReplace
        open={showFindReplace}
        onClose={() => setShowFindReplace(false)}
        content={content}
        onReplace={handleReplace}
        onHighlight={handleHighlight}
      />

      {/* Editor Content */}
      <EditorContent editor={editor} className="bg-background" />
    </div>
  );
}

export type { CatalystEditorProps };
