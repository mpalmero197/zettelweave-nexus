import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Edit3, Star, BookOpen, PanelRight, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo, useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import { NotePropertiesPanel } from './NotePropertiesPanel';
import { supabase } from '@/integrations/supabase/client';

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

// Render content with wikilinks parsed
function WikilinkContent({ content, onWikilinkClick }: { content: string; onWikilinkClick: (title: string) => void }) {
  const hasHtml = isHtmlContent(content);
  
  if (hasHtml) {
    // For HTML content, parse wikilinks in the sanitized HTML
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','strong','b','em','i','u','s','strike','del','ul','ol','li','blockquote','pre','code','a','img','hr','span','div','table','thead','tbody','tr','th','td','sup','sub'],
      ALLOWED_ATTR: ['href','src','alt','style','class','target','rel'],
    });
    // Replace [[...]] with styled spans
    const withLinks = sanitized.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
      return `<button class="wikilink-btn text-primary hover:underline font-medium" data-wikilink="${title}">[[${title}]]</button>`;
    });
    return (
      <div
        dangerouslySetInnerHTML={{ __html: withLinks }}
        onClick={(e) => {
          const btn = (e.target as HTMLElement).closest('.wikilink-btn');
          if (btn) {
            const title = btn.getAttribute('data-wikilink');
            if (title) onWikilinkClick(title);
          }
        }}
      />
    );
  }

  if (!content.trim()) {
    return <p className="text-muted-foreground italic">No content</p>;
  }

  // For markdown, split by wikilinks and render
  const parts = content.split(/(\[\[[^\]]+\]\])/g);
  return (
    <div>
      {parts.map((part, i) => {
        const match = part.match(/^\[\[([^\]]+)\]\]$/);
        if (match) {
          return (
            <button
              key={i}
              onClick={() => onWikilinkClick(match[1])}
              className="text-primary hover:underline font-medium inline"
            >
              [[{match[1]}]]
            </button>
          );
        }
        return <ReactMarkdown key={i}>{part}</ReactMarkdown>;
      })}
    </div>
  );
}

export function NoteViewerDialog({ note, notebooks, isOpen, onClose, onEdit }: NoteViewerDialogProps) {
  const [showProperties, setShowProperties] = useState(false);
  const [backlinks, setBacklinks] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!note) return;
    const fetchBacklinks = async () => {
      const { data } = await supabase
        .from('notes')
        .select('id, title')
        .ilike('content', `%[[${note.title}]]%`)
        .neq('id', note.id)
        .is('deleted_at', null)
        .limit(20);
      setBacklinks(data || []);
    };
    fetchBacklinks();
  }, [note?.id, note?.title]);

  const handleWikilinkClick = useCallback(async (title: string) => {
    // Find note by title
    const { data } = await supabase
      .from('notes')
      .select('*')
      .ilike('title', title)
      .is('deleted_at', null)
      .limit(1);
    if (data && data.length > 0) {
      // Navigate to that note by triggering onEdit or re-opening viewer
      onEdit(data[0] as Note);
    }
  }, [onEdit]);

  if (!note) return null;

  const notebook = notebooks.find(nb => nb.id === note.notebook_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-4xl h-[calc(100dvh-1rem)] sm:h-auto sm:max-h-[90vh] p-0 overflow-hidden bg-card border border-border shadow-hover flex flex-col">
        <DialogTitle className="sr-only">{note.title}</DialogTitle>
        <DialogDescription className="sr-only">Note details</DialogDescription>

        <div className="flex flex-1 min-h-0">
          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0">
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
                <Button variant="ghost" size="sm" onClick={() => setShowProperties(!showProperties)} className="hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Properties">
                  <PanelRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(note)} className="hover:bg-primary/10 text-muted-foreground hover:text-primary">
                  <Edit3 className="h-4 w-4" />
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
                <WikilinkContent content={note.content} onWikilinkClick={handleWikilinkClick} />
              </div>

              {/* Backlinks section */}
              {backlinks.length > 0 && (
                <div className="mx-4 md:mx-6 mb-6 p-4 rounded-lg bg-muted/30 border border-border/30">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
                    Backlinks ({backlinks.length})
                  </h3>
                  <div className="space-y-1">
                    {backlinks.map(bl => (
                      <button
                        key={bl.id}
                        onClick={() => handleWikilinkClick(bl.title)}
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <Link2 className="h-3 w-3 flex-shrink-0" />
                        {bl.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Properties sidebar */}
          {showProperties && (
            <NotePropertiesPanel
              note={note}
              notebooks={notebooks}
              onClose={() => setShowProperties(false)}
              onNavigateToNote={handleWikilinkClick}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
