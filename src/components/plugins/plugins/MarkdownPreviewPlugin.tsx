import { useState, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import type { PluginProps } from '../types';

function mdToHtml(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-4 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>')
    .replace(/^\- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-primary pl-3 italic text-muted-foreground">$1</blockquote>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary underline" target="_blank">$1</a>')
    .replace(/^---$/gm, '<hr class="my-3 border-border"/>')
    .replace(/\n\n/g, '<br/><br/>');
  return html;
}

const SAMPLE = `# Hello Markdown

## Features
- **Bold** and *italic* text
- \`Inline code\` support
- [Links](https://example.com)

> Blockquotes work too

---

### Lists
1. First item
2. Second item
3. Third item`;

export function MarkdownPreviewPlugin({ onClose }: PluginProps) {
  const [md, setMd] = useState(SAMPLE);
  const html = useMemo(() => mdToHtml(md), [md]);

  return (
    <div className="grid grid-cols-2 gap-3 min-h-[300px]">
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">Markdown</div>
        <Textarea value={md} onChange={e => setMd(e.target.value)} className="h-[300px] text-xs font-mono resize-none" />
      </div>
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">Preview</div>
        <div className="border border-border rounded-md p-3 h-[300px] overflow-y-auto text-sm prose-sm"
          dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
