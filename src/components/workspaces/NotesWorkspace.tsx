import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { supabase } from '@/integrations/supabase/client';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Star, Plus, Edit3, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { EditNoteDialog } from '@/components/EditNoteDialog';
import { cn } from '@/lib/utils';

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

const isHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

export function NotesWorkspace() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const load = async () => {
    if (!user) return;
    try {
      const [n, nb] = await Promise.all([
        supabase.from('notes').select('*').eq('user_id', user.id).is('deleted_at', null).order('updated_at', { ascending: false }),
        supabase.from('notebooks').select('*').eq('user_id', user.id).order('name'),
      ]);
      if (n.error) throw n.error;
      setNotes((n.data || []) as Note[]);
      setNotebooks((nb.data || []) as Notebook[]);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user]);
  useRealtimeSync('notes', { userId: user?.id, onChanged: load });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter(n => {
      if (favOnly && !n.is_favorite) return false;
      if (!q) return true;
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    });
  }, [notes, query, favOnly]);

  useEffect(() => {
    if (!selectedId && filtered[0]) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = useMemo(() => notes.find(n => n.id === selectedId) || null, [notes, selectedId]);
  const selectedNotebook = useMemo(
    () => (selected?.notebook_id ? notebooks.find(nb => nb.id === selected.notebook_id) : undefined),
    [selected, notebooks]
  );

  const handleCreate = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title: 'Untitled note', content: '', tags: [], is_favorite: false })
      .select()
      .single();
    if (error) { toast.error('Failed to create note'); return; }
    await load();
    setSelectedId(data.id);
    setEditing(data as Note);
  };

  const handleSave = async (updated: Note) => {
    const { error } = await supabase
      .from('notes')
      .update({
        title: updated.title,
        content: updated.content,
        tags: updated.tags,
        notebook_id: updated.notebook_id,
        is_favorite: updated.is_favorite,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updated.id);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Saved');
    await load();
  };

  return (
    <div className="h-[calc(100dvh-7rem-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4.5rem)]">
      <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-border/40 bg-card/40">
        {/* LEFT PANE */}
        <ResizablePanel defaultSize={32} minSize={22} maxSize={50}>
          <div className="h-full flex flex-col">
            <div className="p-3 border-b border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" /> Notes
                </h2>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCreate} aria-label="New note">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notes…" className="h-8 pl-7 text-xs" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{filtered.length} note{filtered.length !== 1 ? 's' : ''}</span>
                <button
                  className={cn('flex items-center gap-1 hover:text-foreground transition-colors', favOnly && 'text-foreground')}
                  onClick={() => setFavOnly(v => !v)}
                >
                  <Star className={cn('h-3 w-3', favOnly && 'fill-current')} />
                  Favorites
                </button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-14 bg-muted/40 rounded animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">No notes</div>
              ) : (
                <ul className="p-1">
                  {filtered.map(n => {
                    const nb = n.notebook_id ? notebooks.find(b => b.id === n.notebook_id) : undefined;
                    const active = n.id === selectedId;
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => setSelectedId(n.id)}
                          className={cn(
                            'w-full text-left px-2.5 py-2 rounded-md transition-colors group',
                            active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            {n.is_favorite && <Star className="h-3 w-3 text-yellow-500 fill-current shrink-0" />}
                            <p className="text-sm font-medium truncate">{n.title || 'Untitled'}</p>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {n.content.replace(/<[^>]*>/g, '').slice(0, 80) || 'Empty note'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {nb && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1" style={{ borderColor: nb.color, color: nb.color }}>
                                {nb.name}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(n.updated_at), 'MMM d')}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* RIGHT PANE */}
        <ResizablePanel defaultSize={68} minSize={40}>
          {selected ? (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-border/40 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold truncate">{selected.title || 'Untitled'}</h1>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {selectedNotebook && (
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: selectedNotebook.color, color: selectedNotebook.color }}>
                        <BookOpen className="h-3 w-3 mr-1" />{selectedNotebook.name}
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      Updated {format(new Date(selected.updated_at), 'MMM d, yyyy · h:mm a')}
                    </span>
                    {selected.tags?.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(selected)}>
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6 prose prose-sm max-w-3xl mx-auto dark:prose-invert">
                  {selected.content.trim() ? (
                    isHtml(selected.content) ? (
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selected.content) }} />
                    ) : (
                      <ReactMarkdown>{selected.content}</ReactMarkdown>
                    )
                  ) : (
                    <p className="text-muted-foreground italic">This note is empty. Click Edit to add content.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="h-10 w-10 opacity-20 mb-3" />
              <p className="text-sm">Select a note to view</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={handleCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New note
              </Button>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {editing && (
        <EditNoteDialog
          note={editing}
          notebooks={notebooks}
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          onSave={(n) => { handleSave(n as Note); setEditing(null); }}
        />
      )}
    </div>
  );
}

export default NotesWorkspace;
