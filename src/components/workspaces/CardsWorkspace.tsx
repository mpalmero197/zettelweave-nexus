import { useEffect, useMemo, useState } from 'react';
import { useZettelCards } from '@/hooks/useZettelCards';
import { ZettelCard as ZettelCardType } from '@/types/zettel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Search, Star, Plus, Edit3, Link2, Trash2, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { EditCardDialog } from '@/components/EditCardDialog';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const isHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

export function CardsWorkspace() {
  const { cards, isLoading, createCard, updateCard, deleteCard } = useZettelCards();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const [editing, setEditing] = useState<ZettelCardType | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (cards || []).filter(c => {
      if (favOnly && !c.is_favorite) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q) ||
        c.number.toLowerCase().includes(q) ||
        (c.tags || []).some(t => t.toLowerCase().includes(q))
      );
    });
    return list.sort(
      (a, b) =>
        new Date(b.updated_at || b.modified).getTime() -
        new Date(a.updated_at || a.modified).getTime()
    );
  }, [cards, query, favOnly]);

  useEffect(() => {
    if (!selectedId && filtered[0]) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = useMemo(() => cards.find(c => c.id === selectedId) || null, [cards, selectedId]);
  const linked = useMemo(
    () => (selected?.linkedCards || []).map(id => cards.find(c => c.id === id)).filter(Boolean) as ZettelCardType[],
    [selected, cards]
  );

  const handleCreate = () => {
    try {
      createCard({
        number: `N-${Date.now()}`,
        title: 'New card',
        content: '',
        category: 'Uncategorized',
        tags: [],
        linkedCards: [],
      });
    } catch {
      toast.error('Failed to create card');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Delete "${selected.title}"?`)) return;
    await deleteCard(selected.id);
    setSelectedId(null);
    toast.success('Card deleted');
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
                  <Brain className="h-4 w-4 text-primary" /> Cards
                </h2>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCreate} aria-label="New card">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search cards…" className="h-8 pl-7 text-xs" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{filtered.length} card{filtered.length !== 1 ? 's' : ''}</span>
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
              {isLoading ? (
                <div className="p-3 space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-14 bg-muted/40 rounded animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">No cards</div>
              ) : (
                <ul className="p-1">
                  {filtered.map(c => {
                    const active = c.id === selectedId;
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => setSelectedId(c.id)}
                          className={cn(
                            'w-full text-left px-2.5 py-2 rounded-md transition-colors',
                            active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            {c.is_favorite && <Star className="h-3 w-3 text-yellow-500 fill-current shrink-0" />}
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">{c.number}</span>
                            <p className="text-sm font-medium truncate">{c.title || 'Untitled'}</p>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {c.content.replace(/<[^>]*>/g, '').slice(0, 80) || 'No content'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {c.category && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1">{c.category}</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(c.updated_at || c.modified), 'MMM d')}
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{selected.number}</span>
                    {selected.category && <Badge variant="outline" className="text-[10px]">{selected.category}</Badge>}
                  </div>
                  <h1 className="text-xl font-bold truncate mt-1">{selected.title || 'Untitled'}</h1>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">
                      Updated {format(new Date(selected.updated_at || selected.modified), 'MMM d, yyyy · h:mm a')}
                    </span>
                    {selected.tags?.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setEditing(selected)}>
                    <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6 max-w-3xl mx-auto">
                  {selected.description && (
                    <p className="text-sm text-muted-foreground italic mb-4">{selected.description}</p>
                  )}
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {selected.content.trim() ? (
                      isHtml(selected.content) ? (
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selected.content) }} />
                      ) : (
                        <ReactMarkdown>{selected.content}</ReactMarkdown>
                      )
                    ) : (
                      <p className="text-muted-foreground italic">This card is empty. Click Edit to add content.</p>
                    )}
                  </div>
                  {linked.length > 0 && (
                    <div className="mt-8 pt-4 border-t border-border/40">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Link2 className="h-3 w-3" /> Linked cards
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {linked.map(lc => (
                          <button
                            key={lc.id}
                            onClick={() => setSelectedId(lc.id)}
                            className="text-xs px-2 py-1 rounded border border-border/60 hover:bg-accent transition-colors"
                          >
                            <span className="font-mono text-muted-foreground mr-1.5">{lc.number}</span>
                            {lc.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Brain className="h-10 w-10 opacity-20 mb-3" />
              <p className="text-sm">Select a card to view</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={handleCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New card
              </Button>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {editing && (
        <EditCardDialog
          card={editing}
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          onSave={async (u) => { await updateCard(u); setEditing(null); toast.success('Saved'); }}
        />
      )}
    </div>
  );
}

export default CardsWorkspace;
