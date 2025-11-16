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

const typeConfig = {
  card: { icon: Brain, color: 'text-primary', bg: 'bg-primary/10', label: 'Card' },
  note: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Note' },
  notebook: { icon: BookOpen, color: 'text-green-600', bg: 'bg-green-100', label: 'Notebook' },
};

export function FavoritesWidget() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      // Fetch favorite cards
      const { data: cards } = await supabase
        .from('zettel_cards')
        .select('id, title, description, updated_at')
        .eq('user_id', user.id)
        .eq('is_favorite', true)
        .order('updated_at', { ascending: false });

      // Fetch favorite notes
      const { data: notes } = await supabase
        .from('notes')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .eq('is_favorite', true)
        .order('updated_at', { ascending: false });

      // Fetch favorite notebooks
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id, name, description, color, updated_at')
        .eq('user_id', user.id)
        .eq('is_favorite', true)
        .order('updated_at', { ascending: false });

      // Combine all favorites
      const allFavorites: FavoriteItem[] = [
        ...(cards || []).map(card => ({
          id: card.id,
          title: card.title,
          type: 'card' as const,
          updated_at: card.updated_at,
          description: card.description,
        })),
        ...(notes || []).map(note => ({
          id: note.id,
          title: note.title,
          type: 'note' as const,
          updated_at: note.updated_at,
        })),
        ...(notebooks || []).map(notebook => ({
          id: notebook.id,
          title: notebook.name,
          type: 'notebook' as const,
          updated_at: notebook.updated_at,
          description: notebook.description,
          color: notebook.color,
        })),
      ];

      // Sort by updated_at
      allFavorites.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setFavorites(allFavorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (id: string, type: string) => {
    try {
      const table = type === 'card' ? 'zettel_cards' : type === 'note' ? 'notes' : 'notebooks';
      
      const { error } = await supabase
        .from(table)
        .update({ is_favorite: false })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      fetchFavorites(); // Refresh the list
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Star className="h-4 w-4" />
            Favorites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          Favorites
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-full max-h-[300px]">
          <div className="space-y-3">
            {favorites.length > 0 ? (
              favorites.map((item) => {
                const config = typeConfig[item.type];
                const Icon = config.icon;

                return (
                  <div key={`${item.type}-${item.id}`} className="p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {item.type === 'notebook' && item.color ? (
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        ) : (
                          <div className={`p-1 rounded ${config.bg}`}>
                            <Icon className={`h-3 w-3 ${config.color}`} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-medium truncate">{item.title}</h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFavorite(item.id, item.type)}
                          className="h-6 w-6 p-0 text-yellow-500 hover:text-yellow-600"
                        >
                          <Star className="h-3 w-3 fill-current" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6">
                <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">No favorites yet</p>
                <p className="text-xs text-muted-foreground">
                  Star cards, notes, or notebooks to see them here
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}