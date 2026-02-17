import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Trash2, Star, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SavedMap {
  id: string;
  title: string;
  description: string | null;
  layout_mode: string | null;
  is_favorite: boolean;
  updated_at: string;
  map_data: any;
}

interface MindMapLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (id: string, title: string, mapData: any, layoutMode: string) => void;
}

export function MindMapLibrary({ open, onOpenChange, onLoad }: MindMapLibraryProps) {
  const { user } = useAuth();
  const [maps, setMaps] = useState<SavedMap[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) fetchMaps();
  }, [open, user]);

  const fetchMaps = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mind_maps' as any)
        .select('id, title, description, layout_mode, is_favorite, updated_at, map_data')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setMaps((data as any[]) || []);
    } catch (err: any) {
      toast.error('Failed to load mind maps');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('mind_maps' as any).delete().eq('id', id);
      if (error) throw error;
      setMaps(prev => prev.filter(m => m.id !== id));
      toast.success('Mind map deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleFavorite = async (map: SavedMap) => {
    try {
      const { error } = await supabase
        .from('mind_maps' as any)
        .update({ is_favorite: !map.is_favorite })
        .eq('id', map.id);
      if (error) throw error;
      setMaps(prev => prev.map(m => m.id === map.id ? { ...m, is_favorite: !m.is_favorite } : m));
    } catch {
      toast.error('Failed to update');
    }
  };

  const filtered = maps.filter(m =>
    !search.trim() || m.title.toLowerCase().includes(search.toLowerCase())
  );

  const getNodeCount = (mapData: any) => {
    try {
      return Object.keys(mapData?.nodes || {}).length;
    } catch { return 0; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Saved Mind Maps</DialogTitle>
          <DialogDescription>Open a previously saved mind map</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search maps..." className="pl-8 h-9 text-sm" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {maps.length === 0 ? 'No saved mind maps yet' : 'No maps match your search'}
            </p>
          ) : filtered.map(map => (
            <div
              key={map.id}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors group"
              onClick={() => { onLoad(map.id, map.title, map.map_data, map.layout_mode || 'radial'); onOpenChange(false); }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{map.title}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{getNodeCount(map.map_data)} nodes</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(map.updated_at), 'MMM d, yyyy h:mm a')}
                  {map.layout_mode && <span className="ml-1.5">· {map.layout_mode}</span>}
                </p>
              </div>
              <button
                className="h-7 w-7 rounded flex items-center justify-center hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => { e.stopPropagation(); toggleFavorite(map); }}
              >
                <Star className={`h-3.5 w-3.5 ${map.is_favorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
              </button>
              <button
                className="h-7 w-7 rounded flex items-center justify-center hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => { e.stopPropagation(); handleDelete(map.id); }}
                disabled={deletingId === map.id}
              >
                {deletingId === map.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
