import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, FileText, Hash, Link2, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

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

interface BacklinkWithContext {
  id: string;
  title: string;
  snippet: string;
}

interface NotePropertiesPanelProps {
  note: Note;
  notebooks: Notebook[];
  onClose: () => void;
  onNavigateToNote: (noteTitle: string) => void;
}

function extractSnippet(content: string, noteTitle: string): string {
  const plainText = content.replace(/<[^>]*>/g, '');
  const escaped = noteTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(.{0,50})\\[\\[${escaped}\\]\\](.{0,50})`, 'i');
  const match = plainText.match(regex);
  if (match) {
    return `…${match[1]}[[${noteTitle}]]${match[2]}…`;
  }
  return '';
}

export function NotePropertiesPanel({ note, notebooks, onClose, onNavigateToNote }: NotePropertiesPanelProps) {
  const [backlinks, setBacklinks] = useState<BacklinkWithContext[]>([]);

  const plainText = (note.content || '').replace(/<[^>]*>/g, '');
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const charCount = plainText.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const notebook = notebooks.find(nb => nb.id === note.notebook_id);
  const tags = note.tags ?? [];

  useEffect(() => {
    let cancelled = false;
    const fetchBacklinks = async () => {
      const { data } = await supabase
        .from('notes')
        .select('id, title, content')
        .ilike('content', `%[[${note.title}]]%`)
        .neq('id', note.id)
        .is('deleted_at', null)
        .limit(20);
      if (cancelled) return;
      setBacklinks(
        (data || []).map(bl => ({
          id: bl.id,
          title: bl.title,
          snippet: extractSnippet(bl.content || '', note.title),
        }))
      );
    };
    fetchBacklinks();
    return () => { cancelled = true; };
  }, [note.id, note.title]);

  return (
    <div className="w-64 border-l border-border/40 bg-card/50 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Properties</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Stats */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Stats</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>{wordCount} words</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span>{charCount} chars</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground col-span-2">
                <Clock className="h-3 w-3" />
                <span>{readingTime} min read</span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Dates</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Created {format(new Date(note.created_at), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Modified {format(new Date(note.updated_at), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>

          {/* Notebook */}
          {notebook && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Notebook</h4>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: notebook.color }} />
                <span className="text-xs">{notebook.name}</span>
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Backlinks */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Backlinks ({backlinks.length})
            </h4>
            {backlinks.length > 0 ? (
              <div className="space-y-2">
                {backlinks.map(bl => (
                  <button
                    key={bl.id}
                    onClick={() => onNavigateToNote(bl.title)}
                    className="block w-full text-left group"
                  >
                    <span className="flex items-center gap-1.5 text-xs text-primary group-hover:underline">
                      <Link2 className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{bl.title}</span>
                    </span>
                    {bl.snippet && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 ml-[18px] line-clamp-2">{bl.snippet}</p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/50">No notes link here yet</p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
