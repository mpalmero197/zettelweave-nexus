import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Star, Brain, FileText, BookOpen, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface FavoriteItem {
  id: string;
  title: string;
  type: 'card' | 'note' | 'notebook';
  updated_at: string;
  description?: string;
  color?: string;
}

const typeIcons = { card: Brain, note: FileText, notebook: BookOpen };
const typeLabels = { card: 'Card', note: 'Note', notebook: 'Notebook' };

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
        supabase.from('zettel_cards').select('id, title, description, updated_at').eq('user_id', user.id).eq('is_favorite', true).order('updated_at', { ascending: false }),
        supabase.from('notes').select('id, title, updated_at').eq('user_id', user.id).eq('is_favorite', true).order('updated_at', { ascending: false }),
        supabase.from('notebooks').select('id, name, description, color, updated_at').eq('user_id', user.id).eq('is_favorite', true).order('updated_at', { ascending: false }),
      ]);

      const all: FavoriteItem[] = [
        ...(cards || []).map(c => ({ id: c.id, title: c.title, type: 'card' as const, updated_at: c.updated_at, description: c.description })),
        ...(notes || []).map(n => ({ id: n.id, title: n.title, type: 'note' as const, updated_at: n.updated_at })),
        ...(notebooks || []).map(nb => ({ id: nb.id, title: nb.name, type: 'notebook' as const, updated_at: nb.updated_at, description: nb.description, color: nb.color })),
      ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setFavorites(all);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (id: string, type: string) => {
    try {
      const table = type === 'card' ? 'zettel_cards' : type === 'note' ? 'notes' : 'notebooks';
      await supabase.from(table).update({ is_favorite: false }).eq('id', id).eq('user_id', user?.id);
      fetchFavorites();
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            Favorites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-md animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          <Star className="h-3.5 w-3.5" aria-hidden="true" />
          Favorites
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-72">
          <div className="space-y-1">
            {favorites.length > 0 ? (
              favorites.map((item) => {
                const Icon = typeIcons[item.type];
                return (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent/50 transition-colors">
                    {item.type === 'notebook' && item.color ? (
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} aria-hidden="true" />
                    ) : (
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{typeLabels[item.type]}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFavorite(item.id, item.type)}
                        className="h-6 w-6 p-0"
                        aria-label="Remove from favorites"
                      >
                        <Star className="h-2.5 w-2.5 text-foreground fill-foreground" />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Heart className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">No favorites yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
