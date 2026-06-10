import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Typography from '@tiptap/extension-typography';
import { createLowlight, common } from 'lowlight';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Bold, Italic, Underline as UIcon, Strikethrough, Code,
  List, ListOrdered, ListChecks, Heading1, Heading2, Heading3,
  Quote, Undo2, Redo2, Highlighter, Palette, Link as LinkIcon,
  Image as ImageIcon, Table as TableIcon, Minus, ChevronDown, Type, Code2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { SlashCommand } from './editor/SlashCommand';
import 'tippy.js/dist/tippy.css';

const lowlight = createLowlight(common);

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'hsl(48 96% 60% / 0.4)' },
  { name: 'Green', value: 'hsl(142 70% 55% / 0.35)' },
  { name: 'Blue', value: 'hsl(210 90% 60% / 0.35)' },
  { name: 'Pink', value: 'hsl(330 85% 65% / 0.35)' },
  { name: 'Purple', value: 'hsl(270 80% 65% / 0.35)' },
  { name: 'Orange', value: 'hsl(25 95% 60% / 0.4)' },
];
const TEXT_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Red', value: 'hsl(0 80% 65%)' },
  { name: 'Orange', value: 'hsl(25 95% 60%)' },
  { name: 'Yellow', value: 'hsl(48 96% 60%)' },
  { name: 'Green', value: 'hsl(142 70% 55%)' },
  { name: 'Blue', value: 'hsl(210 90% 65%)' },
  { name: 'Purple', value: 'hsl(270 80% 70%)' },
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  editable?: boolean;
}

const ToolBtn = ({ active, onClick, children, label }: any) => (
  <Toggle
    size="sm"
    pressed={!!active}
    onPressedChange={() => onClick()}
    aria-label={label}
    title={label}
    className="h-8 w-8 p-0 data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
  >
    {children}
  </Toggle>
);

const Divider = () => <div className="w-px h-5 bg-border/60 mx-0.5" />;

function HeadingDropdown({ editor }: { editor: Editor }) {
  const current = editor.isActive('heading', { level: 1 }) ? 'H1'
    : editor.isActive('heading', { level: 2 }) ? 'H2'
    : editor.isActive('heading', { level: 3 }) ? 'H3'
    : 'Text';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs font-medium">
          <Type className="h-3.5 w-3.5" />{current}<ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
          <Type className="h-3.5 w-3.5 mr-2" />Paragraph
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-3.5 w-3.5 mr-2" />Heading 1
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-3.5 w-3.5 mr-2" />Heading 2
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-3.5 w-3.5 mr-2" />Heading 3
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HighlightPopover({ editor }: { editor: Editor }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={editor.isActive('highlight')} className="h-8 w-8 p-0 data-[state=on]:bg-primary/15" aria-label="Highlight">
          <Highlighter className="h-3.5 w-3.5" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-6 gap-1.5">
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.name}
              onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}
              className="h-7 w-7 rounded-md border border-border/40 hover:scale-110 transition-transform"
              style={{ background: c.value }}
              title={c.name}
            />
          ))}
        </div>
        <button
          onClick={() => editor.chain().focus().unsetHighlight().run()}
          className="w-full mt-2 text-[11px] text-muted-foreground hover:text-foreground py-1 rounded"
        >
          Remove highlight
        </button>
      </PopoverContent>
    </Popover>
  );
}

function ColorPopover({ editor }: { editor: Editor }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Toggle size="sm" className="h-8 w-8 p-0" aria-label="Text color">
          <Palette className="h-3.5 w-3.5" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-7 gap-1.5">
          {TEXT_COLORS.map(c => (
            <button
              key={c.name}
              onClick={() => {
                if (!c.value) editor.chain().focus().unsetColor().run();
                else editor.chain().focus().setColor(c.value).run();
              }}
              className="h-7 w-7 rounded-md border border-border/40 hover:scale-110 transition-transform flex items-center justify-center text-[10px] font-bold"
              style={{ color: c.value || undefined, background: c.value ? 'hsl(var(--muted) / 0.4)' : 'transparent' }}
              title={c.name}
            >
              A
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LinkPopover({ editor }: { editor: Editor }) {
  const [url, setUrl] = useState('');
  return (
    <Popover onOpenChange={(o) => o && setUrl(editor.getAttributes('link').href || '')}>
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={editor.isActive('link')} className="h-8 w-8 p-0 data-[state=on]:bg-primary/15" aria-label="Link">
          <LinkIcon className="h-3.5 w-3.5" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="flex gap-1.5">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://…"
            className="h-8 text-xs"
            onKeyDown={e => {
              if (e.key === 'Enter' && url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }}
          />
          <Button size="sm" className="h-8 px-2 text-xs" onClick={() => url && editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()}>
            Apply
          </Button>
        </div>
        {editor.isActive('link') && (
          <button
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="w-full mt-2 text-[11px] text-muted-foreground hover:text-destructive py-1"
          >
            Remove link
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const onImage = () => {
    const url = window.prompt('Image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border/40 bg-muted/30 px-2 py-1.5 sticky top-0 z-10 overflow-x-auto">
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().undo().run()} aria-label="Undo" title="Undo"><Undo2 className="h-3.5 w-3.5" /></Button>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().redo().run()} aria-label="Redo" title="Redo"><Redo2 className="h-3.5 w-3.5" /></Button>
      <Divider />
      <HeadingDropdown editor={editor} />
      <Divider />
      <ToolBtn label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></ToolBtn>
      <ToolBtn label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></ToolBtn>
      <ToolBtn label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UIcon className="h-3.5 w-3.5" /></ToolBtn>
      <ToolBtn label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-3.5 w-3.5" /></ToolBtn>
      <ToolBtn label="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="h-3.5 w-3.5" /></ToolBtn>
      <Divider />
      <HighlightPopover editor={editor} />
      <ColorPopover editor={editor} />
      <Divider />
      <ToolBtn label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-3.5 w-3.5" /></ToolBtn>
      <ToolBtn label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5" /></ToolBtn>
      <ToolBtn label="Task list" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecks className="h-3.5 w-3.5" /></ToolBtn>
      <Divider />
      <ToolBtn label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-3.5 w-3.5" /></ToolBtn>
      <ToolBtn label="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 className="h-3.5 w-3.5" /></ToolBtn>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().setHorizontalRule().run()} aria-label="Divider" title="Divider"><Minus className="h-3.5 w-3.5" /></Button>
      <Divider />
      <LinkPopover editor={editor} />
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onImage} aria-label="Image" title="Insert image"><ImageIcon className="h-3.5 w-3.5" /></Button>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        aria-label="Table" title="Insert table"
      ><TableIcon className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing… press '/' for commands",
  className,
  minHeight = '200px',
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: 'text-primary underline underline-offset-2' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full' } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'rte-table' } }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.configure({ lowlight }),
      Typography,
      SlashCommand,
    ],
    content: value || '',
    editable,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-4 py-3 prose-headings:font-semibold prose-headings:tracking-tight',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || '', { emitUpdate: false } as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn('rounded-lg border border-input bg-background overflow-hidden flex flex-col', className)}>
      {editable && <Toolbar editor={editor} />}
      {editable && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100, placement: 'top' }}>
          <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-popover/95 backdrop-blur-xl shadow-lg p-1">
            <ToolBtn label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></ToolBtn>
            <ToolBtn label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></ToolBtn>
            <ToolBtn label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UIcon className="h-3.5 w-3.5" /></ToolBtn>
            <HighlightPopover editor={editor} />
            <LinkPopover editor={editor} />
          </div>
        </BubbleMenu>
      )}
      <div className="overflow-y-auto" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
