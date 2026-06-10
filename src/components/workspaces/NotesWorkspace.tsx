import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Star, Plus, Edit3, BookOpen, ChevronLeft } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { EditNoteDialog } from '@/components/EditNoteDialog';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { TwoPaneShell } from '@/components/workspace/TwoPaneShell';

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
interface Notebook { id: string; name: string; color: string; }

const isHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);
const relTime = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: false });

export function NotesWorkspace() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

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
    } finally { setLoading(false); }
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
    if (!isMobile && !selectedId && filtered[0]) setSelectedId(filtered[0].id);
  }, [filtered, selectedId, isMobile]);

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
      .select().single();
    if (error) { toast.error('Failed to create note'); return; }
    await load();
    setSelectedId(data.id);
    setEditing(data as Note);
  };

  const handleSave = async (updated: Note) => {
    const { error } = await supabase
      .from('notes')
      .update({
        title: updated.title, content: updated.content, tags: updated.tags,
        notebook_id: updated.notebook_id, is_favorite: updated.is_favorite,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updated.id);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Saved');
    await load();
  };

  const listPane = (
    <div className="h-full flex flex-col bg-card/20">
      <div className="px-3 pt-3 pb-2 border-b border-border/30 space-y-2.5">
        <div className="flex items-center justify-between h-7">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" /> Notes
          </h2>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCreate} aria-label="New note">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="h-9 pl-9 text-sm rounded-full bg-muted/40 border-border/40 focus-visible:ring-primary/40"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{filtered.length} note{filtered.length !== 1 ? 's' : ''}</span>
          <button
            className={cn('flex items-center gap-1 hover:text-foreground transition-colors', favOnly && 'text-foreground')}
            onClick={() => setFavOnly(v => !v)}
          >
            <Star className={cn('h-3 w-3', favOnly && 'fill-current text-yellow-500')} />
            Favorites
          </button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => (<div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No notes</div>
        ) : (
          <ul className="p-2 space-y-0.5">
            {filtered.map(n => {
              const nb = n.notebook_id ? notebooks.find(b => b.id === n.notebook_id) : undefined;
              const active = n.id === selectedId;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => { setSelectedId(n.id); setMobileView('detail'); }}
                    className={cn(
                      'relative w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group',
                      active && !isMobile
                        ? 'bg-primary/8 text-foreground'
                        : 'hover:bg-foreground/[0.04] text-foreground/90',
                    )}
                  >
                    {active && !isMobile && (
                      <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary" />
                    )}
                    <div className="flex items-center gap-1.5">
                      {n.is_favorite && <Star className="h-3 w-3 text-yellow-500 fill-current shrink-0" />}
                      <p className="text-[13.5px] font-medium truncate leading-tight">{n.title || 'Untitled'}</p>
                    </div>
                    <p className="text-[11.5px] text-muted-foreground/90 line-clamp-2 mt-1 leading-snug">
                      {n.content.replace(/<[^>]*>/g, '').slice(0, 130) || 'Empty note'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {nb && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-normal border-border/40"
                          style={{ borderColor: `${nb.color}40`, color: nb.color }}>
                          {nb.name}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground/70">{relTime(n.updated_at)} ago</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );

  const detailPane = selected ? (
    <div className="relative h-full flex flex-col bg-background/40">
      <div className="px-6 md:px-8 py-5 md:py-6 border-b border-border/30 flex items-start gap-3">
        {isMobile && (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0 -ml-2" onClick={() => setMobileView('list')} aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-2">
            {selectedNotebook && (
              <span className="inline-flex items-center gap-1" style={{ color: selectedNotebook.color }}>
                <BookOpen className="h-3 w-3" />{selectedNotebook.name}
              </span>
            )}
            {selectedNotebook && <span className="opacity-40">·</span>}
            <span>{format(new Date(selected.updated_at), 'MMM d, yyyy')}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground leading-tight">
            {selected.title || 'Untitled'}
          </h1>
          {selected.tags?.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {selected.tags.map((t, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] font-normal h-5 px-1.5">{t}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <article className="reader-prose max-w-[68ch] mx-auto px-6 md:px-10 py-8 md:py-10 text-[15px]">
          {selected.content.trim() ? (
            isHtml(selected.content) ? (
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selected.content) }} />
            ) : (
              <ReactMarkdown>{selected.content}</ReactMarkdown>
            )
          ) : (
            <p className="text-muted-foreground italic">This note is empty. Click Edit to start writing.</p>
          )}
        </article>
      </ScrollArea>
      <Button
        size="sm"
        onClick={() => setEditing(selected)}
        className="absolute bottom-5 right-5 h-10 rounded-full px-4 shadow-lg shadow-primary/30 backdrop-blur"
      >
        <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit
      </Button>
    </div>
  ) : (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-background/40">
      {isMobile && (
        <Button size="sm" variant="ghost" className="absolute top-2 left-2" onClick={() => setMobileView('list')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      )}
      <FileText className="h-10 w-10 opacity-20 mb-3" />
      <p className="text-sm">Select a note to view</p>
      <Button size="sm" variant="outline" className="mt-4" onClick={handleCreate}>
        <Plus className="h-3.5 w-3.5 mr-1.5" /> New note
      </Button>
    </div>
  );

  return (
    <>
      <TwoPaneShell list={listPane} detail={detailPane} mobileView={mobileView} />
      {editing && (
        <EditNoteDialog
          note={editing}
          notebooks={notebooks}
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          onSave={(n) => { handleSave(n as Note); setEditing(null); }}
        />
      )}
    </>
  );
}

export default NotesWorkspace;
