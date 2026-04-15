import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  X, Wand2, Loader2, Check, Copy, ChevronDown, ChevronUp,
  FileText, StickyNote, NotebookPen, PenLine, Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ContentItem {
  id: string;
  type: 'note' | 'card' | 'scratchpad' | 'stickynote';
  title: string;
  content: string;
}

interface ModifyResult {
  id: string;
  title: string;
  content: string;
  changes: string;
}

interface AIModifySidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_ICONS = {
  note: NotebookPen,
  card: FileText,
  scratchpad: PenLine,
  stickynote: StickyNote,
};

const TYPE_LABELS = {
  note: 'Note',
  card: 'Card',
  scratchpad: 'Scratchpad',
  stickynote: 'Sticky Note',
};

export function AIModifySidebar({ open, onOpenChange }: AIModifySidebarProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [availableItems, setAvailableItems] = useState<ContentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  const [results, setResults] = useState<ModifyResult[] | null>(null);
  const [showPicker, setShowPicker] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available content when sidebar opens
  useEffect(() => {
    if (open && user) fetchAvailableItems();
  }, [open, user]);

  const fetchAvailableItems = useCallback(async () => {
    if (!user) return;
    setIsFetchingItems(true);
    try {
      const [notesRes, cardsRes, stickiesRes] = await Promise.all([
        supabase.from('notes').select('id, title, content').eq('user_id', user.id).is('deleted_at', null).order('updated_at', { ascending: false }).limit(50),
        supabase.from('zettel_cards').select('id, title, content').eq('user_id', user.id).is('deleted_at', null).order('updated_at', { ascending: false }).limit(50),
        supabase.from('notes').select('id, title, content').eq('user_id', user.id).is('deleted_at', null).not('position_x', 'is', null).order('updated_at', { ascending: false }).limit(50),
      ]);

      const all: ContentItem[] = [];
      notesRes.data?.forEach(n => all.push({ id: n.id, type: 'note', title: n.title, content: n.content || '' }));
      cardsRes.data?.forEach(c => all.push({ id: c.id, type: 'card', title: c.title, content: c.content || '' }));

      // Scratchpad from localStorage
      try {
        const sp = localStorage.getItem('scratchpad-content');
        if (sp && sp.trim()) {
          all.push({ id: 'scratchpad-local', type: 'scratchpad', title: 'Scratchpad', content: sp });
        }
      } catch {}

      setAvailableItems(all);
    } catch (e) {
      console.error('Failed to fetch items:', e);
    } finally {
      setIsFetchingItems(false);
    }
  }, [user]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addSelected = () => {
    const toAdd = availableItems.filter(i => selectedIds.has(i.id) && !items.find(x => x.id === i.id));
    setItems(prev => [...prev, ...toAdd]);
    setSelectedIds(new Set());
    setShowPicker(false);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleModify = async () => {
    if (!instruction.trim() || items.length === 0) {
      toast.error('Add items and enter an instruction');
      return;
    }
    setIsLoading(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-modify-content', {
        body: {
          items: items.map(i => ({ id: i.id, type: i.type, title: i.title, content: i.content })),
          instruction: instruction.trim(),
        },
      });
      if (error) throw error;
      setResults(data.results || [data]);
    } catch (e: any) {
      toast.error(e.message || 'AI modification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const applyResult = async (result: ModifyResult) => {
    const original = items.find(i => i.id === result.id);
    if (!original) return;

    try {
      if (original.type === 'card') {
        await supabase.from('zettel_cards').update({ title: result.title, content: result.content, updated_at: new Date().toISOString() }).eq('id', original.id);
      } else if (original.type === 'note' || original.type === 'stickynote') {
        await supabase.from('notes').update({ title: result.title, content: result.content, updated_at: new Date().toISOString() }).eq('id', original.id);
      } else if (original.type === 'scratchpad') {
        localStorage.setItem('scratchpad-content', result.content);
      }
      toast.success(`Applied changes to "${result.title}"`);
      // Update item in our list
      setItems(prev => prev.map(i => i.id === result.id ? { ...i, title: result.title, content: result.content } : i));
    } catch (e: any) {
      toast.error('Failed to apply: ' + (e.message || 'Unknown error'));
    }
  };

  const filteredAvailable = availableItems.filter(i => {
    if (filterType !== 'all' && i.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q);
    }
    return true;
  });

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[380px] z-[60] bg-card border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right-full duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">AI Modify</h2>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Selected Items */}
          {items.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selected Items ({items.length})</h3>
              {items.map(item => {
                const Icon = TYPE_ICONS[item.type];
                return (
                  <div key={item.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 border border-border">
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.content.substring(0, 100)}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Item Picker */}
          <div>
            <Button variant="outline" size="sm" className="w-full justify-between text-xs" onClick={() => setShowPicker(!showPicker)}>
              Add Content Items
              {showPicker ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>

            {showPicker && (
              <div className="mt-2 space-y-2">
                {/* Filters */}
                <div className="flex gap-1 flex-wrap">
                  {['all', 'note', 'card', 'scratchpad'].map(t => (
                    <Badge
                      key={t}
                      variant={filterType === t ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => setFilterType(t)}
                    >
                      {t === 'all' ? 'All' : TYPE_LABELS[t as keyof typeof TYPE_LABELS]}
                    </Badge>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-7 px-2 text-xs rounded-md border border-input bg-background"
                />

                {isFetchingItems ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {filteredAvailable.map(item => {
                      const Icon = TYPE_ICONS[item.type];
                      const alreadyAdded = items.find(i => i.id === item.id);
                      return (
                        <label
                          key={item.id}
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md cursor-pointer hover:bg-accent/50 text-xs",
                            alreadyAdded && "opacity-50 pointer-events-none"
                          )}
                        >
                          <Checkbox
                            checked={selectedIds.has(item.id) || !!alreadyAdded}
                            onCheckedChange={() => !alreadyAdded && toggleSelect(item.id)}
                            disabled={!!alreadyAdded}
                          />
                          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </label>
                      );
                    })}
                    {filteredAvailable.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2 text-center">No items found</p>
                    )}
                  </div>
                )}

                {selectedIds.size > 0 && (
                  <Button size="sm" className="w-full text-xs h-7" onClick={addSelected}>
                    Add {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Instruction */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Instruction</h3>
            <Textarea
              placeholder="e.g., 'Combine these notes into one summary', 'Rewrite in a more professional tone', 'Add bullet points'..."
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              className="min-h-[80px] text-xs resize-none"
            />
          </div>

          {/* Run Button */}
          <Button
            className="w-full"
            onClick={handleModify}
            disabled={isLoading || items.length === 0 || !instruction.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Modifying...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Modify with AI
              </>
            )}
          </Button>

          {/* Results */}
          {results && results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Results</h3>
              {results.map((result, idx) => {
                const original = items.find(i => i.id === result.id);
                return (
                  <div key={idx} className="rounded-lg border border-border overflow-hidden">
                    {/* Changes summary */}
                    <div className="px-3 py-2 bg-muted/30 border-b border-border">
                      <p className="text-xs font-medium">{result.title}</p>
                      <p className="text-xs ai-modify-highlight mt-0.5">{result.changes}</p>
                    </div>

                    {/* Original vs Modified */}
                    {original && (
                      <div className="p-3 space-y-2">
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase">Original</span>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-4">{original.content.substring(0, 300)}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium uppercase ai-modify-highlight">Modified</span>
                          <p className="text-xs mt-0.5 ai-modify-highlight whitespace-pre-wrap">{result.content.substring(0, 500)}</p>
                        </div>
                      </div>
                    )}

                     {/* Actions */}
                    <div className="flex gap-1 px-3 py-2 border-t border-border bg-muted/20">
                      <Button size="sm" variant="default" className="h-6 text-xs flex-1" onClick={() => applyResult(result)}>
                        <Check className="h-3 w-3 mr-1" /> Apply
                      </Button>
                      {items.length > 1 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 text-xs"
                          onClick={async () => {
                            if (!user) return;
                            try {
                              const { error } = await supabase.from('zettel_cards').insert({
                                user_id: user.id,
                                title: result.title,
                                content: result.content,
                                card_number: 'NEW',
                                category: 'Combined',
                                tags: [],
                              });
                              if (error) throw error;
                              toast.success(`Created new card "${result.title}"`);
                            } catch (e: any) {
                              toast.error('Failed to create card: ' + (e.message || 'Unknown error'));
                            }
                          }}
                        >
                          <FileText className="h-3 w-3 mr-1" /> Save as Card
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(result.content);
                          toast.success('Copied to clipboard');
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
