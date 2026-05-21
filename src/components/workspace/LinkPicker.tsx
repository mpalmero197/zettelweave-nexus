import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export type LinkSource = 'cards' | 'notes';

interface PickerItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
}

interface LinkPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: LinkSource;
  /** Pre-selected ids (or card numbers for legacy card linking) */
  selected: string[];
  /** Excludes this item from the list (e.g., the current item being edited) */
  excludeId?: string;
  onSave: (selectedIds: string[]) => void;
  /**
   * If true, the picker resolves selection against `number` for cards (legacy storage of linked cards by number).
   * If false, selection is by id.
   */
  byCardNumber?: boolean;
}

export function LinkPicker({
  open, onOpenChange, source, selected, excludeId, onSave, byCardNumber,
}: LinkPickerProps) {
  const [items, setItems] = useState<PickerItem[]>([]);
  const [query, setQuery] = useState('');
  const [picks, setPicks] = useState<Set<string>>(new Set(selected));
  const [loading, setLoading] = useState(false);

  useEffect(() => { setPicks(new Set(selected)); }, [selected, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (source === 'cards') {
          const { data } = await supabase
            .from('zettel_cards')
            .select('id, number, title, category, tags')
            .is('deleted_at', null)
            .order('updated_at', { ascending: false })
            .limit(500);
          if (!cancelled) {
            setItems((data ?? []).map((c: any) => ({
              id: byCardNumber ? c.number : c.id,
              title: c.title,
              subtitle: `#${c.number}`,
              meta: c.category,
            })));
          }
        } else {
          const { data } = await supabase
            .from('notes')
            .select('id, title, tags, notebook_id')
            .is('deleted_at', null)
            .order('updated_at', { ascending: false })
            .limit(500);
          if (!cancelled) {
            setItems((data ?? []).map((n: any) => ({
              id: n.id,
              title: n.title,
              meta: (n.tags || []).slice(0, 2).join(', '),
            })));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, source, byCardNumber]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(i => i.id !== excludeId)
      .filter(i => !q || i.title.toLowerCase().includes(q) || (i.subtitle ?? '').toLowerCase().includes(q) || (i.meta ?? '').toLowerCase().includes(q));
  }, [items, query, excludeId]);

  const toggle = (id: string) => {
    setPicks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    onSave(Array.from(picks));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Link {source === 'cards' ? 'cards' : 'notes'}
          </DialogTitle>
          <DialogDescription>
            Search and select multiple items to link in a single action.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${source}...`}
            className="pl-8"
            autoFocus
          />
        </div>

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-0.5">
            {loading && <div className="text-sm text-muted-foreground p-3">Loading...</div>}
            {!loading && filtered.length === 0 && (
              <div className="text-sm text-muted-foreground p-3">No matches.</div>
            )}
            {filtered.map(item => {
              const checked = picks.has(item.id);
              return (
                <label
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 p-2.5 rounded-md cursor-pointer border border-transparent hover:bg-muted/50',
                    checked && 'bg-muted/40 border-border/60'
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(item.id)} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.subtitle && (
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">{item.subtitle}</Badge>
                      )}
                      <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
                    </div>
                    {item.meta && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.meta}</p>}
                  </div>
                </label>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <div className="flex-1 text-xs text-muted-foreground">{picks.size} selected</div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Link {picks.size > 0 ? `(${picks.size})` : ''}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
