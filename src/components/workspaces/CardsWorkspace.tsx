import { useEffect, useMemo, useState } from 'react';
import { useZettelCards } from '@/hooks/useZettelCards';
import { ZettelCard as ZettelCardType } from '@/types/zettel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Search, Star, Plus, Edit3, Link2, Trash2, ChevronLeft } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { EditCardDialog } from '@/components/EditCardDialog';
import { CreateCardDialog } from '@/components/CreateCardDialog';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { TwoPaneShell } from '@/components/workspace/TwoPaneShell';
import { getCategoryColor } from '@/utils/categoryUtils';

const isHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);
const relTime = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: false });

export function CardsWorkspace() {
  const { cards, isLoading, createCard, updateCard, deleteCard } = useZettelCards();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const [editing, setEditing] = useState<ZettelCardType | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

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
    return list.sort((a, b) =>
      new Date(b.updated_at || b.modified).getTime() - new Date(a.updated_at || a.modified).getTime()
    );
  }, [cards, query, favOnly]);

  useEffect(() => {
    if (!isMobile && !selectedId && filtered[0]) setSelectedId(filtered[0].id);
  }, [filtered, selectedId, isMobile]);

  const selected = useMemo(() => cards.find(c => c.id === selectedId) || null, [cards, selectedId]);
  const linked = useMemo(
    () => (selected?.linkedCards || []).map(id => cards.find(c => c.id === id)).filter(Boolean) as ZettelCardType[],
    [selected, cards]
  );

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Delete "${selected.title}"?`)) return;
    await deleteCard(selected.id);
    setSelectedId(null);
    toast.success('Card deleted');
  };

  const selectedCategoryColor = selected?.category ? getCategoryColor(selected.category) : undefined;

  const listPane = (
    <div className="h-full flex flex-col bg-card/20">
      <div className="px-3 pt-3 pb-2 border-b border-border/30 space-y-2.5">
        <div className="flex items-center justify-between h-7">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-primary" /> Cards
          </h2>
          <CreateCardDialog
            existingCards={cards}
            onCreateCard={(c) => createCard(c as any)}
            trigger={
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="New card">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            }
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search cards…"
            className="h-9 pl-9 text-sm rounded-full bg-muted/40 border-border/40 focus-visible:ring-primary/40"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{filtered.length} card{filtered.length !== 1 ? 's' : ''}</span>
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
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => (<div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No cards</div>
        ) : (
          <ul className="p-2 space-y-0.5">
            {filtered.map(c => {
              const active = c.id === selectedId;
              const color = c.category ? getCategoryColor(c.category) : undefined;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => { setSelectedId(c.id); setMobileView('detail'); }}
                    className={cn(
                      'relative w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150',
                      active && !isMobile
                        ? 'bg-primary/8 text-foreground'
                        : 'hover:bg-foreground/[0.04] text-foreground/90',
                    )}
                  >
                    {active && !isMobile && (
                      <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary" />
                    )}
                    <div className="flex items-center gap-1.5">
                      {c.is_favorite && <Star className="h-3 w-3 text-yellow-500 fill-current shrink-0" />}
                      <span className="text-[10px] font-mono text-muted-foreground/80 shrink-0">{c.number}</span>
                      <p className="text-[13.5px] font-medium truncate leading-tight">{c.title || 'Untitled'}</p>
                    </div>
                    <p className="text-[11.5px] text-muted-foreground/90 line-clamp-2 mt-1 leading-snug">
                      {c.content.replace(/<[^>]*>/g, '').slice(0, 130) || 'No content'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {c.category && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-normal"
                          style={{ borderColor: `${color}50`, color }}>
                          {c.category}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground/70">{relTime(c.updated_at || c.modified)} ago</span>
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
      {selectedCategoryColor && (
        <div className="h-[3px] w-full shrink-0" style={{ background: selectedCategoryColor }} />
      )}
      <div className="px-6 md:px-8 py-5 md:py-6 border-b border-border/30 flex items-start gap-3">
        {isMobile && (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0 -ml-2" onClick={() => setMobileView('list')} aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-2">
            <span className="font-mono">{selected.number}</span>
            {selected.category && (
              <>
                <span className="opacity-40">·</span>
                <span style={{ color: selectedCategoryColor }}>{selected.category}</span>
              </>
            )}
            <span className="opacity-40">·</span>
            <span>{format(new Date(selected.updated_at || selected.modified), 'MMM d, yyyy')}</span>
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
        <Button size="sm" variant="ghost" className="text-destructive/80 hover:text-destructive h-8 w-8 p-0" onClick={handleDelete} aria-label="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <article className="reader-prose max-w-[68ch] mx-auto px-6 md:px-10 py-8 md:py-10 text-[15px]">
          {selected.description && (
            <p className="not-prose text-[15px] text-muted-foreground italic mb-6 pb-6 border-b border-border/30">
              {selected.description}
            </p>
          )}
          {selected.content.trim() ? (
            isHtml(selected.content) ? (
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selected.content) }} />
            ) : (
              <ReactMarkdown>{selected.content}</ReactMarkdown>
            )
          ) : (
            <p className="text-muted-foreground italic">This card is empty. Click Edit to add content.</p>
          )}
          {linked.length > 0 && (
            <div className="not-prose mt-10 pt-6 border-t border-border/30">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3 flex items-center gap-1.5">
                <Link2 className="h-3 w-3" /> Linked cards
              </h3>
              <div className="flex flex-wrap gap-2">
                {linked.map(lc => (
                  <button
                    key={lc.id}
                    onClick={() => setSelectedId(lc.id)}
                    className="text-xs px-2.5 py-1.5 rounded-md border border-border/50 hover:border-primary/60 hover:bg-primary/5 transition-colors"
                  >
                    <span className="font-mono text-muted-foreground mr-1.5">{lc.number}</span>
                    {lc.title}
                  </button>
                ))}
              </div>
            </div>
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
      <Brain className="h-10 w-10 opacity-20 mb-3" />
      <p className="text-sm">Select a card to view</p>
      <CreateCardDialog
        existingCards={cards}
        onCreateCard={(c) => createCard(c as any)}
        trigger={
          <Button size="sm" variant="outline" className="mt-4">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New card
          </Button>
        }
      />
    </div>
  );

  return (
    <>
      <TwoPaneShell list={listPane} detail={detailPane} mobileView={mobileView} />
      {editing && (
        <EditCardDialog
          card={editing}
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          onSave={async (u) => { await updateCard(u); setEditing(null); toast.success('Saved'); }}
        />
      )}
    </>
  );
}

export default CardsWorkspace;
