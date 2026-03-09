import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { CatalystFindReplace } from '@/components/catalyst/CatalystFindReplace';
import { DocumentThemeSelector } from '@/components/DocumentThemeSelector';
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
} from 'lucide-react';

interface CatalystEditorProps {
  content: string;
  onChange: (content: string) => void;
  onWordCountChange: (count: number) => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function CatalystEditor({
  content,
  onChange,
  onWordCountChange,
  focusMode = false,
  onToggleFocusMode,
  isFullscreen = false,
  onToggleFullscreen,
}: CatalystEditorProps) {
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [documentTheme, setDocumentTheme] = useState('default');
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Image,
      CharacterCount,
      Placeholder.configure({
        placeholder: 'Start writing your masterpiece...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange(html);

      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      onWordCountChange(words.length);
    },
    editorProps: {
      attributes: {
        class: `catalyst-word-view ${getThemeClass(documentTheme)} max-w-none focus:outline-none ${
          isFullscreen ? 'min-h-screen' : 'min-h-[600px]'
        } ${focusMode ? 'catalyst-focus-mode' : ''}`,
      },
    },
  });

  // Keyboard shortcut for find
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync external content changes to editor
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

  const handleHighlight = useCallback((_searchTerm: string, _caseSensitive: boolean) => {
    // Visual highlighting handled via CSS mark or browser find
  }, []);

  const handleHeadingClick = useCallback(
    (headingText: string) => {
      if (!editor || !editorRef.current) return;
      // Find the heading in the DOM and scroll to it
      const editorEl = editorRef.current.querySelector('.ProseMirror');
      if (!editorEl) return;
      const headings = editorEl.querySelectorAll('h1, h2, h3, h4');
      for (const heading of headings) {
        if (heading.textContent?.trim() === headingText) {
          heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-hidden relative" ref={editorRef}>
      {/* Formatting Toolbar */}
      <div className="bg-muted/50 border-b p-2 flex flex-wrap items-center gap-1 sticky top-0 z-10">
        {/* Undo/Redo */}
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Text Formatting */}
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('code')}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Headings */}
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Lists */}
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Alignment */}
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'left' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'center' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'right' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'justify' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Horizontal Rule */}
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </Toggle>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Find & Replace */}
        <Toggle
          size="sm"
          pressed={showFindReplace}
          onPressedChange={() => setShowFindReplace(!showFindReplace)}
          title="Find & Replace (Ctrl+F)"
        >
          <Search className="h-4 w-4" />
        </Toggle>

        {/* Focus Mode */}
        {onToggleFocusMode && (
          <Toggle
            size="sm"
            pressed={focusMode}
            onPressedChange={onToggleFocusMode}
            title="Focus mode — dims non-active paragraphs"
          >
            <Focus className="h-4 w-4" />
          </Toggle>
        )}

        {/* Fullscreen */}
        {onToggleFullscreen && (
          <Toggle
            size="sm"
            pressed={isFullscreen}
            onPressedChange={onToggleFullscreen}
            title="Distraction-free mode"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Toggle>
        )}

        <Separator orientation="vertical" className="mx-1 h-6 hidden md:block" />
        <DocumentThemeSelector value={documentTheme} onChange={setDocumentTheme} />
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

// Export a method reference for outline panel usage
export type { CatalystEditorProps };
