import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Notebook {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_favorite: boolean;
  created_at: string;
  note_count?: number;
}

export function NotebookListWidget() {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchNotebooks();
  }, [user]);

  const fetchNotebooks = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notebooks')
        .select('id, name, description, color, is_favorite, created_at')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;

      const withCounts = await Promise.all(
        (data || []).map(async (nb) => {
          const { count } = await supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('notebook_id', nb.id);
          return { ...nb, note_count: count || 0 };
        })
      );
      setNotebooks(withCounts);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (id: string, isFav: boolean) => {
    try {
      await supabase.from('notebooks').update({ is_favorite: !isFav }).eq('id', id).eq('user_id', user?.id);
      fetchNotebooks();
    } catch (error) {
      console.error('Error updating notebook:', error);
    }
  };

  return (
    <div className="widget-card widget-accent-notebooks p-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-medium text-foreground">Notebooks</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {notebooks.length > 0 ? (
            notebooks.map((nb) => (
              <div key={nb.id} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent/50 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: nb.color }} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{nb.name}</p>
                  {nb.description && <p className="text-[10px] text-muted-foreground truncate">{nb.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className="text-[10px]">{nb.note_count} notes</Badge>
                  <Button variant="ghost" size="sm" onClick={() => toggleFavorite(nb.id, nb.is_favorite)} className="h-6 w-6 p-0" aria-label="Toggle favorite">
                    <Star className={`h-2.5 w-2.5 ${nb.is_favorite ? 'text-foreground fill-foreground' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
              <p className="text-xs text-muted-foreground">No notebooks yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
