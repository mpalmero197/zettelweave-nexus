import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  BookOpen, 
  Plus, 
  Star, 
  Search, 
  Edit, 
  Trash2, 
  FileText,
  Brain,
  Palette,
  StarOff,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface Notebook {
  id: string;
  name: string;
  description: string;
  color: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

interface NotebookWithCounts extends Notebook {
  notes_count: number;
  cards_count: number;
  notes?: any[];
  cards?: any[];
}

const colorOptions = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#ec4899', // pink
  '#6b7280'  // gray
];

export function Notebooks() {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<NotebookWithCounts[]>([]);
  const [filteredNotebooks, setFilteredNotebooks] = useState<NotebookWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set());

  const [newNotebook, setNewNotebook] = useState({
    name: '',
    description: '',
    color: colorOptions[0]
  });

  useEffect(() => {
    if (user) {
      fetchNotebooks();
    }
  }, [user]);

  useEffect(() => {
    filterNotebooks();
  }, [notebooks, searchTerm, showFavorites]);

  const fetchNotebooks = async () => {
    if (!user) return;

    try {
      // Fetch notebooks with counts
      const { data: notebooksData, error: notebooksError } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (notebooksError) throw notebooksError;

      // Get counts and items for each notebook
      const notebooksWithCounts = await Promise.all(
        (notebooksData || []).map(async (notebook) => {
          // Fetch notes
          const { data: notes, count: notesCount } = await supabase
            .from('notes')
            .select('id, title, created_at', { count: 'exact' })
            .eq('notebook_id', notebook.id)
            .order('created_at', { ascending: false })
            .limit(5);

          // Fetch zettel cards
          const { data: cards, count: cardsCount } = await supabase
            .from('zettel_cards')
            .select('id, title, number, created_at', { count: 'exact' })
            .eq('notebook_id', notebook.id)
            .order('created_at', { ascending: false })
            .limit(5);

          return {
            ...notebook,
            notes_count: notesCount || 0,
            cards_count: cardsCount || 0,
            notes: notes || [],
            cards: cards || []
          };
        })
      );

      setNotebooks(notebooksWithCounts);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
      toast.error('Failed to load notebooks');
    } finally {
      setLoading(false);
    }
  };

  const filterNotebooks = () => {
    let filtered = notebooks;

    if (searchTerm) {
      filtered = filtered.filter(notebook =>
        notebook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notebook.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showFavorites) {
      filtered = filtered.filter(notebook => notebook.is_favorite);
    }

    setFilteredNotebooks(filtered);
  };

  const createNotebook = async () => {
    if (!user || !newNotebook.name.trim()) return;

    try {
      const { error } = await supabase
        .from('notebooks')
        .insert({
          user_id: user.id,
          name: newNotebook.name,
          description: newNotebook.description,
          color: newNotebook.color
        });

      if (error) throw error;

      setNewNotebook({ name: '', description: '', color: colorOptions[0] });
      setShowCreateDialog(false);
      fetchNotebooks();
      toast.success('Notebook created successfully');
    } catch (error) {
      console.error('Error creating notebook:', error);
      toast.error('Failed to create notebook');
    }
  };

  const updateNotebook = async () => {
    if (!editingNotebook) return;

    try {
      const { error } = await supabase
        .from('notebooks')
        .update({
          name: editingNotebook.name,
          description: editingNotebook.description,
          color: editingNotebook.color
        })
        .eq('id', editingNotebook.id);

      if (error) throw error;

      setEditingNotebook(null);
      fetchNotebooks();
      toast.success('Notebook updated successfully');
    } catch (error) {
      console.error('Error updating notebook:', error);
      toast.error('Failed to update notebook');
    }
  };

  const deleteNotebook = async (notebookId: string) => {
    if (!confirm('Are you sure you want to delete this notebook? Items in this notebook will be moved to "No Notebook".')) return;

    try {
      const { error } = await supabase
        .from('notebooks')
        .delete()
        .eq('id', notebookId);

      if (error) throw error;

      fetchNotebooks();
      toast.success('Notebook deleted successfully');
    } catch (error) {
      console.error('Error deleting notebook:', error);
      toast.error('Failed to delete notebook');
    }
  };

  const toggleFavorite = async (notebook: Notebook) => {
    try {
      const { error } = await supabase
        .from('notebooks')
        .update({ is_favorite: !notebook.is_favorite })
        .eq('id', notebook.id);

      if (error) throw error;

      fetchNotebooks();
      toast.success(notebook.is_favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-16 bg-muted rounded mb-3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Notebooks</h1>
          <p className="text-sm text-muted-foreground">Organize your content into collections</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">New Notebook</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Notebook</DialogTitle>
              <DialogDescription>
                Create a new notebook to organize your notes and cards
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Notebook name"
                value={newNotebook.name}
                onChange={(e) => setNewNotebook(prev => ({ ...prev, name: e.target.value }))}
              />
              <Textarea
                placeholder="Description (optional)"
                value={newNotebook.description}
                onChange={(e) => setNewNotebook(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
              <div>
                <label className="text-sm font-medium mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newNotebook.color === color 
                          ? 'border-foreground scale-110' 
                          : 'border-border hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewNotebook(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createNotebook} disabled={!newNotebook.name.trim()}>
                  Create Notebook
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notebooks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <Button
          variant={showFavorites ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFavorites(!showFavorites)}
          className="flex items-center gap-1 h-9"
        >
          <Star className="h-4 w-4" />
          <span className="hidden sm:inline">Favorites</span>
        </Button>
      </div>

      {/* Notebooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredNotebooks.length > 0 ? (
          filteredNotebooks.map((notebook) => {
            const isExpanded = expandedNotebooks.has(notebook.id);
            return (
            <Collapsible 
              key={notebook.id}
              open={isExpanded}
              onOpenChange={(open) => {
                setExpandedNotebooks(prev => {
                  const next = new Set(prev);
                  if (open) next.add(notebook.id);
                  else next.delete(notebook.id);
                  return next;
                });
              }}
            >
            <Card className="group hover:shadow-md transition-all duration-200 relative overflow-hidden">
              {/* Color Strip */}
              <div 
                className="absolute top-0 left-0 right-0 h-1" 
                style={{ backgroundColor: notebook.color }}
              />
              
              <CardContent className="p-4 pt-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${notebook.color}20` }}
                    >
                      <BookOpen 
                        className="h-6 w-6" 
                        style={{ color: notebook.color }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg line-clamp-1">{notebook.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {notebook.notes_count}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          <Brain className="h-3 w-3 mr-1" />
                          {notebook.cards_count}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(notebook)}
                      className="h-8 w-8 p-0"
                    >
                      {notebook.is_favorite ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingNotebook(notebook)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotebook(notebook.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Description */}
                {notebook.description && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {notebook.description}
                    </p>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      {isExpanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                      {notebook.notes_count + notebook.cards_count} items
                    </Button>
                  </CollapsibleTrigger>
                  <span>{format(new Date(notebook.updated_at), 'MMM d')}</span>
                </div>

                {/* Expandable Content */}
                <CollapsibleContent className="mt-3 pt-3 border-t border-border/50 space-y-2">
                  {notebook.notes && notebook.notes.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Notes</div>
                      {notebook.notes.map((note: any) => (
                        <div key={note.id} className="text-xs py-1 px-2 rounded bg-muted/50 truncate">
                          {note.title}
                        </div>
                      ))}
                    </div>
                  )}
                  {notebook.cards && notebook.cards.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Cards</div>
                      {notebook.cards.map((card: any) => (
                        <div key={card.id} className="text-xs py-1 px-2 rounded bg-muted/50 truncate flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1">{card.number}</Badge>
                          {card.title}
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </CardContent>
            </Card>
            </Collapsible>
          );
        })
        ) : (
          <div className="col-span-full text-center py-8">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium mb-2">
              {searchTerm || showFavorites 
                ? 'No notebooks match your filters' 
                : 'No notebooks yet'
              }
            </p>
            <p className="text-muted-foreground">
              {searchTerm || showFavorites
                ? 'Try adjusting your search or filters'
                : 'Create your first notebook to organize your content'
              }
            </p>
          </div>
        )}
      </div>

      {/* Edit Notebook Dialog */}
      {editingNotebook && (
        <Dialog open={!!editingNotebook} onOpenChange={() => setEditingNotebook(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Notebook</DialogTitle>
              <DialogDescription>
                Update your notebook's name, description, and color
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={editingNotebook.name}
                onChange={(e) => setEditingNotebook(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Notebook name"
              />
              <Textarea
                value={editingNotebook.description}
                onChange={(e) => setEditingNotebook(prev => prev ? { ...prev, description: e.target.value } : null)}
                rows={3}
                placeholder="Description (optional)"
              />
              <div>
                <label className="text-sm font-medium mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        editingNotebook.color === color 
                          ? 'border-foreground scale-110' 
                          : 'border-border hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingNotebook(prev => prev ? { ...prev, color } : null)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingNotebook(null)}>
                  Cancel
                </Button>
                <Button onClick={updateNotebook}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}