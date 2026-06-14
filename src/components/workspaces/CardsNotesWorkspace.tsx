import { useEffect, useMemo, useRef, useState, useCallback, KeyboardEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, StickyNote, Search, Plus, Sparkles, ChevronRight, BookOpen, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type ItemType = 'card' | 'note';

interface WorkItem {
  id: string;
  type: ItemType;
  title: string;
  content: string;
  tags: string[];
  updated_at: string;
}

const CARD_LIMIT = 1500;

function ghostFromBody(content: string): string {
  const text = (content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 'Untitled';
  const words = text.split(' ').slice(0, 5).join(' ');
  return `Draft: ${words}${text.split(' ').length > 5 ? '…' : ''}`;
}

function fuzzy(query: string, target: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;
  let i = 0;
  for (const ch of t) { if (ch === q[i]) i++; if (i === q.length) return true; }
  return false;
}

export function CardsNotesWorkspace() {
  const { user } = useAuth();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Multi-select (pile & drag)
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);

  // Linking popover
  const [linkPopover, setLinkPopover] = useState<{ x: number; y: number; query: string; activeIdx: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [c, n] = await Promise.all([
        supabase.from('zettel_cards').select('id,title,content,tags,updated_at')
          .eq('user_id', user.id).is('deleted_at', null).order('updated_at', { ascending: false }),
        supabase.from('notes').select('id,title,content,tags,updated_at')
          .eq('user_id', user.id).is('deleted_at', null).order('updated_at', { ascending: false }),
      ]);
      if (c.error) throw c.error;
      if (n.error) throw n.error;
      const cards: WorkItem[] = (c.data || []).map((r: any) => ({
        id: r.id, type: 'card', title: r.title || '', content: r.content || '',
        tags: r.tags || [], updated_at: r.updated_at,
      }));
      const notes: WorkItem[] = (n.data || []).map((r: any) => ({
        id: r.id, type: 'note', title: r.title || '', content: r.content || '',
        tags: r.tags || [], updated_at: r.updated_at,
      }));
      const merged = [...cards, ...notes].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      setItems(merged);
      if (!selectedId && merged[0]) setSelectedId(merged[0].id);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load workspace');
    } finally { setLoading(false); }
  }, [user, selectedId]);

  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line
  useRealtimeSync('zettel_cards', { userId: user?.id, onChanged: load });
  useRealtimeSync('notes', { userId: user?.id, onChanged: load });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q));
  }, [items, query]);

  const selected = useMemo(() => items.find(i => i.id === selectedId) || null, [items, selectedId]);

  // ===== Create =====
  const createCard = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('zettel_cards').insert({
      user_id: user.id, title: '', content: '', tags: [], category: 'general', number: '000.0',
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await load();
    setSelectedId(data.id);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  const createNote = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('notes').insert({
      user_id: user.id, title: '', content: '', tags: [], is_favorite: false,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await load();
    setSelectedId(data.id);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  // ===== Update =====
  const persistTitle = async (item: WorkItem, title: string) => {
    const table = item.type === 'card' ? 'zettel_cards' : 'notes';
    await supabase.from(table).update({ title }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, title } : i));
  };

  const persistContent = async (item: WorkItem, content: string) => {
    const table = item.type === 'card' ? 'zettel_cards' : 'notes';
    await supabase.from(table).update({ content }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, content } : i));
  };

  const updateLocal = (id: string, patch: Partial<WorkItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  // ===== Promote =====
  const promoteToNote = async (item: WorkItem) => {
    if (!user || item.type !== 'card') return;
    const { data: note, error } = await supabase.from('notes').insert({
      user_id: user.id, title: item.title || 'Promoted card', content: item.content,
      tags: item.tags, is_favorite: false,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await supabase.from('zettel_cards').update({ deleted_at: new Date().toISOString() }).eq('id', item.id);
    toast.success('Card promoted to Note. Backlinks preserved.');
    await load();
    setSelectedId(note.id);
  };

  // ===== [[ link popover =====
  const onContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (!selected) return;
    updateLocal(selected.id, { content: val });
    persistContent(selected, val);

    const ta = e.target;
    const caret = ta.selectionStart;
    const before = val.slice(0, caret);
    const match = before.match(/\[\[([^\[\]\n]*)$/);
    if (match) {
      const rect = ta.getBoundingClientRect();
      // Approximate caret position
      setLinkPopover({
        x: rect.left + 24,
        y: rect.top + Math.min(rect.height - 12, 80),
        query: match[1],
        activeIdx: 0,
      });
    } else if (linkPopover) {
      setLinkPopover(null);
    }
  };

  const linkSuggestions = useMemo(() => {
    if (!linkPopover) return [];
    return items.filter(i => i.id !== selectedId && fuzzy(linkPopover.query, i.title || ghostFromBody(i.content))).slice(0, 8);
  }, [linkPopover, items, selectedId]);

  const insertLink = (target: WorkItem) => {
    if (!selected || !textareaRef.current) return;
    const ta = textareaRef.current;
    const caret = ta.selectionStart;
    const before = ta.value.slice(0, caret);
    const after = ta.value.slice(caret);
    const trimmedBefore = before.replace(/\[\[[^\[\]\n]*$/, '');
    const title = target.title || ghostFromBody(target.content);
    const insertion = target.type === 'note' ? `[[${title}]]` : `[${title}](card-id:${target.id})`;
    const next = trimmedBefore + insertion + after;
    updateLocal(selected.id, { content: next });
    persistContent(selected, next);
    setLinkPopover(null);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = trimmedBefore.length + insertion.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const onContentKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!linkPopover || linkSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setLinkPopover({ ...linkPopover, activeIdx: (linkPopover.activeIdx + 1) % linkSuggestions.length }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setLinkPopover({ ...linkPopover, activeIdx: (linkPopover.activeIdx - 1 + linkSuggestions.length) % linkSuggestions.length }); }
    else if (e.key === 'Enter') { e.preventDefault(); insertLink(linkSuggestions[linkPopover.activeIdx]); }
    else if (e.key === 'Escape') { setLinkPopover(null); }
  };

  // ===== Pile selection =====
  const toggleMulti = (id: string, additive: boolean) => {
    setMultiSelected(prev => {
      const next = new Set(additive ? prev : []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const onListMouseDown = () => setIsDragSelecting(true);
  const onListMouseUp = () => setIsDragSelecting(false);
  const onItemEnter = (id: string) => {
    if (isDragSelecting) setMultiSelected(prev => new Set(prev).add(id));
  };

  const onItemDragStart = (e: React.DragEvent, id: string) => {
    const ids = multiSelected.has(id) && multiSelected.size > 0 ? Array.from(multiSelected) : [id];
    e.dataTransfer.setData('application/x-workspace-items', JSON.stringify(ids));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onEditorDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-workspace-items')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDropTarget(true);
    }
  };
  const onEditorDragLeave = () => setIsDropTarget(false);
  const onEditorDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);
    if (!selected) return;
    const raw = e.dataTransfer.getData('application/x-workspace-items');
    if (!raw) return;
    const ids: string[] = JSON.parse(raw);
    const dropped = items.filter(i => ids.includes(i.id));
    const block = dropped.map(d => {
      const title = d.title || ghostFromBody(d.content);
      const link = d.type === 'note' ? `[[${title}]]` : `[${title}](card-id:${d.id})`;
      const snippet = (d.content || '').replace(/<[^>]+>/g, ' ').slice(0, 200);
      return `> ${link}\n> ${snippet}\n`;
    }).join('\n');
    const next = (selected.content || '') + (selected.content ? '\n\n' : '') + block;
    updateLocal(selected.id, { content: next });
    persistContent(selected, next);
    setMultiSelected(new Set());
    toast.success(`Inserted ${dropped.length} item${dropped.length > 1 ? 's' : ''}`);
  };

  // ===== Ghost title =====
  const ghostTitle = selected ? ghostFromBody(selected.content) : '';
  const showGhost = selected && !selected.title;

  const acceptGhost = () => {
    if (!selected || !ghostTitle) return;
    updateLocal(selected.id, { title: ghostTitle });
    persistTitle(selected, ghostTitle);
  };

  // ===== Render =====
  const charCount = selected?.type === 'card' ? (selected.content || '').length : 0;
  const overLimit = charCount > CARD_LIMIT;

  const list = (
    <div
      className="h-full flex flex-col bg-slate-950 border-r border-slate-800 select-none"
      onMouseDown={onListMouseDown}
      onMouseUp={onListMouseUp}
      onMouseLeave={onListMouseUp}
    >
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="Search cards & notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 bg-slate-900 border-slate-800 text-slate-100 text-xs placeholder:text-slate-500"
          />
        </div>
        <div className="flex gap-1.5">
          <Button onClick={createCard} size="sm" variant="outline"
            className="flex-1 h-7 text-[11px] bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-slate-50">
            <Plus className="h-3 w-3 mr-1" /> Card
          </Button>
          <Button onClick={createNote} size="sm" variant="outline"
            className="flex-1 h-7 text-[11px] bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-slate-50">
            <Plus className="h-3 w-3 mr-1" /> Note
          </Button>
        </div>
        {multiSelected.size > 0 && (
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>{multiSelected.size} selected — drag into editor</span>
            <button onClick={() => setMultiSelected(new Set())} className="hover:text-slate-200">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <ul className="p-1.5 space-y-0.5">
          {loading && <li className="text-xs text-slate-500 p-3">Loading…</li>}
          {!loading && filtered.length === 0 && (
            <li className="text-xs text-slate-500 p-3">Nothing yet. Create your first card or note.</li>
          )}
          {filtered.map((it) => {
            const isActive = it.id === selectedId;
            const isMulti = multiSelected.has(it.id);
            const Icon = it.type === 'card' ? StickyNote : FileText;
            const title = it.title || ghostFromBody(it.content);
            return (
              <li
                key={it.id}
                draggable
                onDragStart={(e) => onItemDragStart(e, it.id)}
                onMouseEnter={() => onItemEnter(it.id)}
                onClick={(e) => {
                  if (e.shiftKey || e.metaKey || e.ctrlKey) { toggleMulti(it.id, true); return; }
                  setSelectedId(it.id);
                }}
                className={cn(
                  'group rounded-md px-2.5 py-2 cursor-pointer transition-all border',
                  isActive
                    ? 'bg-slate-800/80 border-slate-700 text-slate-50'
                    : 'border-transparent text-slate-300 hover:bg-slate-900 hover:border-slate-800',
                  isMulti && 'ring-1 ring-sky-500/60'
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0',
                    it.type === 'card' ? 'text-amber-400/80' : 'text-sky-400/80')} />
                  <div className="min-w-0 flex-1">
                    <div className={cn('text-[12px] font-medium truncate', !it.title && 'italic text-slate-500')}>
                      {title}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {it.type} · {formatDistanceToNow(new Date(it.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                  <ChevronRight className="h-3 w-3 text-slate-600 opacity-0 group-hover:opacity-100 mt-1" />
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );

  const editor = (
    <div
      className={cn(
        'h-full flex flex-col bg-slate-950 relative transition-all',
        isDropTarget && 'ring-2 ring-dashed ring-sky-400/70 ring-inset',
      )}
      onDragOver={onEditorDragOver}
      onDragLeave={onEditorDragLeave}
      onDrop={onEditorDrop}
    >
      {!selected && (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          <div className="text-center">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Select or create a card or note to begin.
          </div>
        </div>
      )}
      {selected && (
        <>
          <div className="border-b border-slate-800 px-5 py-3 flex items-center gap-3">
            <Badge variant="outline"
              className={cn('text-[10px] uppercase tracking-wider border-slate-700',
                selected.type === 'card' ? 'text-amber-400' : 'text-sky-400')}>
              {selected.type}
            </Badge>
            <div className="relative flex-1">
              <Input
                ref={titleRef}
                value={selected.title}
                onChange={(e) => { updateLocal(selected.id, { title: e.target.value }); persistTitle(selected, e.target.value); }}
                placeholder=""
                className="h-9 bg-transparent border-0 text-slate-100 text-lg font-semibold focus-visible:ring-0 px-0 placeholder:text-slate-600"
              />
              {showGhost && (
                <button
                  onClick={acceptGhost}
                  className="absolute inset-0 flex items-center text-lg font-semibold text-slate-600 italic pointer-events-auto text-left hover:text-slate-400 transition-colors"
                  title="Click to use as title"
                >
                  {ghostTitle}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div key={selected.id} className="max-w-3xl mx-auto p-6 animate-fade-in">
              <textarea
                ref={textareaRef}
                value={selected.content}
                onChange={onContentChange}
                onKeyDown={onContentKeyDown}
                placeholder={selected.type === 'card'
                  ? 'Capture one atomic idea. Type [[ to link…'
                  : 'Write freely. Type [[ to link to a card or note…'}
                className="w-full min-h-[60vh] bg-transparent text-slate-100 text-[15px] leading-relaxed resize-none outline-none placeholder:text-slate-600"
                style={{ fontFamily: '"Google Sans Text", Inter, sans-serif' }}
              />
            </div>
          </div>

          {/* Char count + promote */}
          {selected.type === 'card' && (
            <div className="absolute bottom-4 right-5 flex items-center gap-2">
              <div className={cn(
                'text-[11px] font-mono px-2.5 py-1 rounded-full border transition-colors',
                overLimit
                  ? 'text-amber-300 border-amber-500/50 bg-amber-500/10'
                  : 'text-slate-500 border-slate-800 bg-slate-900/80'
              )}>
                {charCount}/{CARD_LIMIT}
              </div>
              {overLimit && (
                <Button
                  size="sm"
                  onClick={() => promoteToNote(selected)}
                  className="h-7 text-[11px] bg-amber-500/90 hover:bg-amber-400 text-slate-950 border-0"
                >
                  <Sparkles className="h-3 w-3 mr-1" /> Promote to Note
                </Button>
              )}
            </div>
          )}

          {/* Link popover */}
          {linkPopover && linkSuggestions.length > 0 && (
            <div
              className="fixed z-50 w-72 rounded-lg border border-slate-700 bg-slate-900/95 backdrop-blur shadow-2xl shadow-black/60 overflow-hidden animate-scale-in"
              style={{ left: linkPopover.x, top: linkPopover.y }}
            >
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                Link to… {linkPopover.query && <span className="text-slate-400">"{linkPopover.query}"</span>}
              </div>
              <ul className="max-h-64 overflow-auto">
                {linkSuggestions.map((s, idx) => {
                  const Icon = s.type === 'card' ? StickyNote : FileText;
                  return (
                    <li key={s.id}>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); insertLink(s); }}
                        onMouseEnter={() => setLinkPopover({ ...linkPopover, activeIdx: idx })}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-left text-xs',
                          idx === linkPopover.activeIdx ? 'bg-slate-800 text-slate-50' : 'text-slate-300 hover:bg-slate-800/60'
                        )}
                      >
                        <Icon className={cn('h-3 w-3 shrink-0',
                          s.type === 'card' ? 'text-amber-400/80' : 'text-sky-400/80')} />
                        <span className="truncate">{s.title || ghostFromBody(s.content)}</span>
                        <span className="ml-auto text-[10px] text-slate-500 uppercase">{s.type}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="px-3 py-1 text-[10px] text-slate-500 border-t border-slate-800">
                ↑↓ navigate · ↵ select · esc to close
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="h-[calc(100dvh-12rem)] min-h-[520px] rounded-xl border border-slate-800 overflow-hidden bg-slate-950 text-slate-100">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={38} minSize={25} maxSize={55}>
          {list}
        </ResizablePanel>
        <ResizableHandle className="w-px bg-slate-800 hover:bg-sky-500/50 transition-colors" />
        <ResizablePanel defaultSize={62} minSize={45}>
          {editor}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
