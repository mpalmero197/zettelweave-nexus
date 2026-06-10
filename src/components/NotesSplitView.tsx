import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { NoteViewerDialog } from './NoteViewerDialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

const isHtmlContent = (content: string) => /<[a-z][\s\S]*>/i.test(content);

interface Note {
  id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  tags: string[];
  notebook_id?: string;
  created_at: string;
  updated_at: string;
}

interface Notebook {
  id: string;
  name: string;
  color: string;
}

interface NotesSplitViewProps {
  leftNote: Note;
  rightNote: Note;
  notebooks: Notebook[];
  onClose: () => void;
  onEditNote: (note: Note) => void;
}

function InlineNoteView({ note, notebooks }: { note: Note; notebooks: Notebook[] }) {
  const sanitized = useMemo(() => DOMPurify.sanitize(note.content), [note.content]);
  const hasHtml = isHtmlContent(note.content);
  const notebook = notebooks.find(nb => nb.id === note.notebook_id);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border/30 flex-shrink-0">
        <h2 className="text-lg font-bold text-foreground">{note.title}</h2>
        <div className="flex items-center gap-2 mt-1">
          {notebook && (
            <Badge variant="outline" className="text-[10px]" style={{ borderColor: notebook.color, color: notebook.color }}>
              {notebook.name}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(note.updated_at), 'MMM d, yyyy')}
          </span>
        </div>
        {note.tags?.length > 0 && (
          <div className="flex gap-1 mt-2">
            {note.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="reader-prose max-w-[68ch] mx-auto p-6 text-[15px]">
          {hasHtml ? (
            <div dangerouslySetInnerHTML={{ __html: sanitized }} />
          ) : note.content.trim() ? (
            <ReactMarkdown>{note.content}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">No content</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function NotesSplitView({ leftNote, rightNote, notebooks, onClose, onEditNote }: NotesSplitViewProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-card/50">
        <span className="text-sm font-medium text-muted-foreground">Split View</span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" />
          Close
        </Button>
      </div>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={25}>
          <InlineNoteView note={leftNote} notebooks={notebooks} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={25}>
          <InlineNoteView note={rightNote} notebooks={notebooks} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
