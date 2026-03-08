import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Calendar, Edit3, Star, X, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';

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

interface NoteViewerDialogProps {
  note: Note | null;
  notebooks: Notebook[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (note: Note) => void;
}

export function NoteViewerDialog({ note, notebooks, isOpen, onClose, onEdit }: NoteViewerDialogProps) {
  const sanitizedContent = useMemo(() => {
    if (!note) return '';
    return DOMPurify.sanitize(note.content, {
      ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','strong','b','em','i','u','s','strike','del','ul','ol','li','blockquote','pre','code','a','img','hr','span','div','table','thead','tbody','tr','th','td','sup','sub'],
      ALLOWED_ATTR: ['href','src','alt','style','class','target','rel'],
    });
  }, [note]);

  if (!note) return null;

  const notebook = notebooks.find(nb => nb.id === note.notebook_id);
  const hasHtml = isHtmlContent(note.content);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden bg-card border border-border shadow-hover flex flex-col">
        <DialogTitle className="sr-only">{note.title}</DialogTitle>
        <DialogDescription className="sr-only">Note details</DialogDescription>

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-border/20 bg-muted/30 flex-shrink-0">
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {note.is_favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
              {notebook && (
                <Badge variant="outline" className="text-xs" style={{ borderColor: notebook.color, color: notebook.color }}>
                  <BookOpen className="h-3 w-3 mr-1" />
                  {notebook.name}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight text-foreground">{note.title}</h1>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created {format(new Date(note.created_at), 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Modified {format(new Date(note.updated_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-4 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onEdit(note)} className="hover:bg-primary/10 text-muted-foreground hover:text-primary">
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap px-6 pt-3 flex-shrink-0">
            {note.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Content - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [webkit-overflow-scrolling:touch]">
          <div className="p-4 md:p-6 prose prose-sm md:prose-base max-w-none dark:prose-invert">
            {hasHtml ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
            ) : note.content.trim() ? (
              <ReactMarkdown>{note.content}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">No content</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
