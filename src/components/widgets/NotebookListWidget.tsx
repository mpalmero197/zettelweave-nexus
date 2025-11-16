import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Star } from 'lucide-react';
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
    if (user) {
      fetchNotebooks();
    }
  }, [user]);

  const fetchNotebooks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notebooks')
        .select(`
          id,
          name,
          description,
          color,
          is_favorite,
          created_at
        `)
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;

      // Get note counts for each notebook
      const notebooksWithCounts = await Promise.all(
        (data || []).map(async (notebook) => {
          const { count } = await supabase
            .from('notes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('notebook_id', notebook.id);

          return {
            ...notebook,
            note_count: count || 0
          };
        })
      );

      setNotebooks(notebooksWithCounts);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (notebookId: string, isFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('notebooks')
        .update({ is_favorite: !isFavorite })
        .eq('id', notebookId)
        .eq('user_id', user?.id);

      if (error) throw error;
      fetchNotebooks();
    } catch (error) {
      console.error('Error updating notebook favorite:', error);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4" />
            Notebooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
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
          <BookOpen className="h-4 w-4" />
          Notebooks
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-full max-h-[300px]">
          <div className="space-y-3">
            {notebooks.length > 0 ? (
              notebooks.map((notebook) => (
                <div key={notebook.id} className="p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: notebook.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-medium truncate">{notebook.name}</h4>
                        {notebook.description && (
                          <p className="text-xs text-muted-foreground truncate">{notebook.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {notebook.note_count} notes
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(notebook.id, notebook.is_favorite)}
                        className="h-6 w-6 p-0"
                      >
                        <Star className={`h-3 w-3 ${
                          notebook.is_favorite 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-muted-foreground'
                        }`} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-2">No notebooks yet</p>
                <Button size="sm" variant="outline" className="text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Create Notebook
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}