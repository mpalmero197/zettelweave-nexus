import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Star, Brain, FileText, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface FavoriteItem {
  id: string;
  title: string;
  type: 'card' | 'note' | 'notebook';
  updated_at: string;
  color?: string;
}

const typeIcons = { card: Brain, note: FileText, notebook: BookOpen };
const typeLabels = { card: 'Card', note: 'Note', notebook: 'NB' };

export function FavoritesWidget() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      const [{ data: cards }, { data: notes }, { data: notebooks }] = await Promise.all([
        supabase.from('zettel_cards').select('id, title, updated_at').eq('user_id', user.id).eq('is_favorite', true).order('updated_at', { ascending: false }).limit(3),
        supabase.from('notes').select('id, title, updated_at').eq('user_id', user.id).eq('is_favorite', true).order('updated_at', { ascending: false }).limit(3),
        supabase.from('notebooks').select('id, name, color, updated_at').eq('user_id', user.id).eq('is_favorite', true).order('updated_at', { ascending: false }).limit(3),
      ]);

      const all: FavoriteItem[] = [
        ...(cards || []).map(c => ({ id: c.id, title: c.title, type: 'card' as const, updated_at: c.updated_at })),
        ...(notes || []).map(n => ({ id: n.id, title: n.title, type: 'note' as const, updated_at: n.updated_at })),
        ...(notebooks || []).map(nb => ({ id: nb.id, title: nb.name, type: 'notebook' as const, updated_at: nb.updated_at, color: nb.color })),
      ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 4);

      setFavorites(all);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-header-left">
          <Star className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-medium text-foreground">Favorites</h3>
        </div>
      </div>
      <div className="widget-body">
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted/50 rounded-md animate-pulse" />)}
          </div>
        ) : favorites.length > 0 ? (
          favorites.map((item) => {
            const Icon = typeIcons[item.type];
            return (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent/50 transition-colors">
                {item.type === 'notebook' && item.color ? (
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} aria-hidden="true" />
                ) : (
                  <Icon className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.updated_at), { addSuffix: false })} ago
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{typeLabels[item.type]}</Badge>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground py-6 text-center">Star items to pin them here</p>
        )}
      </div>
    </div>
  );
}
