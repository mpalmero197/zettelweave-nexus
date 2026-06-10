import { Extension, ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import {
  Heading1, Heading2, Heading3, List, ListOrdered, ListChecks,
  Quote, Code2, Minus, Image as ImageIcon, Table as TableIcon, Link as LinkIcon,
} from 'lucide-react';

interface CommandItem {
  title: string;
  description: string;
  icon: any;
  command: (props: { editor: any; range: any }) => void;
}

const items: CommandItem[] = [
  { title: 'Heading 1', description: 'Big section heading', icon: Heading1,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run() },
  { title: 'Heading 2', description: 'Medium heading', icon: Heading2,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run() },
  { title: 'Heading 3', description: 'Small heading', icon: Heading3,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run() },
  { title: 'Bulleted list', description: 'Simple bullets', icon: List,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { title: 'Numbered list', description: 'Ordered list', icon: ListOrdered,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { title: 'Task list', description: 'Checkboxes', icon: ListChecks,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run() },
  { title: 'Quote', description: 'Block quote', icon: Quote,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
  { title: 'Code block', description: 'Syntax-highlighted code', icon: Code2,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
  { title: 'Divider', description: 'Horizontal rule', icon: Minus,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
  { title: 'Image', description: 'Insert image from URL', icon: ImageIcon,
    command: ({ editor, range }) => {
      const url = window.prompt('Image URL');
      if (!url) return;
      editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
    }},
  { title: 'Table', description: 'Insert 3x3 table', icon: TableIcon,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: 'Link', description: 'Insert hyperlink', icon: LinkIcon,
    command: ({ editor, range }) => {
      const url = window.prompt('Link URL');
      if (!url) return;
      editor.chain().focus().deleteRange(range).setLink({ href: url }).run();
    }},
];

const CommandList = forwardRef<any, { items: CommandItem[]; command: (item: CommandItem) => void }>(
  ({ items, command }, ref) => {
    const [index, setIndex] = useState(0);
    useEffect(() => setIndex(0), [items]);
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: any) => {
        if (event.key === 'ArrowDown') { setIndex(i => (i + 1) % items.length); return true; }
        if (event.key === 'ArrowUp') { setIndex(i => (i - 1 + items.length) % items.length); return true; }
        if (event.key === 'Enter') { if (items[index]) command(items[index]); return true; }
        return false;
      },
    }));
    if (!items.length) return null;
    return (
      <div className="z-50 w-72 max-h-80 overflow-y-auto rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-xl p-1">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => command(item)}
              onMouseEnter={() => setIndex(i)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                i === index ? 'bg-primary/15 text-foreground' : 'hover:bg-muted/60 text-foreground/90'
              }`}
            >
              <span className="h-7 w-7 flex items-center justify-center rounded-md bg-muted/50 shrink-0">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-none">{item.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.description}</div>
              </span>
            </button>
          );
        })}
      </div>
    );
  }
);
CommandList.displayName = 'CommandList';

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        allowSpaces: false,
        command: ({ editor, range, props }: any) => props.command({ editor, range }),
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) =>
          items.filter(i => i.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10),
        render: () => {
          let component: ReactRenderer;
          let popup: TippyInstance[] = [];
          return {
            onStart: (props: any) => {
              component = new ReactRenderer(CommandList as any, { props, editor: props.editor });
              if (!props.clientRect) return;
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },
            onUpdate(props: any) {
              component?.updateProps(props);
              if (!props.clientRect) return;
              popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown(props: any) {
              if (props.event.key === 'Escape') { popup[0]?.hide(); return true; }
              return (component?.ref as any)?.onKeyDown?.(props) ?? false;
            },
            onExit() {
              popup[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});
