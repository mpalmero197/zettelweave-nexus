import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { List, Heading1, Heading2, Heading3 } from 'lucide-react';

interface OutlineItem {
  id: string;
  text: string;
  level: number;
}

interface CatalystOutlinePanelProps {
  content: string;
  onHeadingClick: (headingText: string) => void;
}

export function CatalystOutlinePanel({ content, onHeadingClick }: CatalystOutlinePanelProps) {
  const outline = useMemo(() => {
    const items: OutlineItem[] = [];
    // Parse HTML headings
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3, h4');

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1));
      const text = heading.textContent?.trim() || '';
      if (text) {
        items.push({ id: `heading-${index}`, text, level });
      }
    });

    return items;
  }, [content]);

  const getIcon = (level: number) => {
    switch (level) {
      case 1: return <Heading1 className="h-3.5 w-3.5 text-primary shrink-0" />;
      case 2: return <Heading2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
      default: return <Heading3 className="h-3 w-3 text-muted-foreground/60 shrink-0" />;
    }
  };

  if (outline.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <List className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No headings found</p>
        <p className="text-xs mt-1">Add headings (H1, H2, H3) to see the document outline</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-0.5">
        {outline.map((item) => (
          <button
            key={item.id}
            onClick={() => onHeadingClick(item.text)}
            className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors group"
            style={{ paddingLeft: `${(item.level - 1) * 16 + 8}px` }}
          >
            {getIcon(item.level)}
            <span className="text-sm truncate group-hover:text-foreground text-muted-foreground">
              {item.text}
            </span>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
