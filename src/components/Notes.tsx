import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  FileText, 
  Plus, 
  Star, 
  Search, 
  Edit, 
  Trash2, 
  BookOpen,
  Filter,
  StarOff,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { SimilarContentDialog } from './SimilarContentDialog';
import { useSimilarContent } from '@/hooks/useSimilarContent';

interface Note {
  id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  tags: string[];
  notebook_id?: string;
  created_at: string;
  updated_at: string;
}

interface Notebook {
  id: string;
  name: string;
  color: string;
}

export function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotebook, setSelectedNotebook] = useState<string>('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [currentNoteForSimilar, setCurrentNoteForSimilar] = useState<Note | null>(null);
  const { loading: similarLoading, similarItems, findSimilar, mergeContent, generateEmbedding } = useSimilarContent();

  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    notebook_id: '',
    tags: [] as string[]
  });

  useEffect(() => {
    if (user) {
      fetchNotes();
      fetchNotebooks();
    }
  }, [user]);

  useEffect(() => {
    filterNotes();
  }, [notes, searchTerm, selectedNotebook, showFavorites]);

  const fetchNotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotebooks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notebooks')
        .select('id, name, color')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setNotebooks(data || []);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    }
  };

  const filterNotes = () => {
    let filtered = notes;

    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedNotebook !== 'all') {
      if (selectedNotebook === 'none') {
        filtered = filtered.filter(note => !note.notebook_id);
      } else {
        filtered = filtered.filter(note => note.notebook_id === selectedNotebook);
      }
    }

    if (showFavorites) {
      filtered = filtered.filter(note => note.is_favorite);
    }

    setFilteredNotes(filtered);
  };

  const createNote = async () => {
    if (!user || !newNote.title.trim()) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: newNote.title,
          content: newNote.content,
          notebook_id: newNote.notebook_id || null,
          tags: newNote.tags
        })
        .select()
        .single();

      if (error) throw error;

      // Generate embedding for the new note
      if (data) {
        generateEmbedding(data.id, 'note', `${newNote.title} ${newNote.content}`);
      }

      setNewNote({ title: '', content: '', notebook_id: '', tags: [] });
      setShowCreateDialog(false);
      fetchNotes();
      toast.success('Note created successfully');
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note');
    }
  };

  const updateNote = async () => {
    if (!editingNote) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: editingNote.title,
          content: editingNote.content,
          notebook_id: editingNote.notebook_id || null,
          tags: editingNote.tags
        })
        .eq('id', editingNote.id);

      if (error) throw error;

      // Regenerate embedding for the updated note
      generateEmbedding(editingNote.id, 'note', `${editingNote.title} ${editingNote.content}`);

      setEditingNote(null);
      fetchNotes();
      toast.success('Note updated successfully');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  const handleFindSimilarNote = async (note: Note) => {
    const results = await findSimilar(note.id, 'note');
    if (results.length > 0) {
      setCurrentNoteForSimilar(note);
    }
  };

  const handleMergeNotes = async (sourceId: string, destinationId: string, mergedContent: string) => {
    await mergeContent(sourceId, destinationId, mergedContent, 'note');
    setCurrentNoteForSimilar(null);
    fetchNotes();
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      fetchNotes();
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const toggleFavorite = async (note: Note) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_favorite: !note.is_favorite })
        .eq('id', note.id);

      if (error) throw error;

      fetchNotes();
      toast.success(note.is_favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  const getNotebookColor = (notebookId?: string) => {
    if (!notebookId) return '#6b7280';
    const notebook = notebooks.find(nb => nb.id === notebookId);
    return notebook?.color || '#6b7280';
  };

  const getNotebookName = (notebookId?: string) => {
    if (!notebookId) return 'No Notebook';
    const notebook = notebooks.find(nb => nb.id === notebookId);
    return notebook?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-20 bg-muted rounded mb-4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notes</h1>
          <p className="text-muted-foreground">Create and manage your documents</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Note</DialogTitle>
              <DialogDescription>
                Create a new note with optional notebook and tags
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Note title"
                value={newNote.title}
                onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                placeholder="Write your note content here..."
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Notebook</label>
                  <Select 
                    value={newNote.notebook_id || 'no-notebook'} 
                    onValueChange={(value) => setNewNote(prev => ({ ...prev, notebook_id: value === 'no-notebook' ? undefined : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select notebook" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-notebook">No Notebook</SelectItem>
                      {notebooks.map(notebook => (
                        <SelectItem key={notebook.id} value={notebook.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: notebook.color }} />
                            {notebook.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Tags (comma separated)</label>
                  <Input
                    placeholder="tag1, tag2, tag3"
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                      setNewNote(prev => ({ ...prev, tags }));
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createNote} disabled={!newNote.title.trim()}>
                  Create Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedNotebook} onValueChange={setSelectedNotebook}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Notebooks</SelectItem>
            <SelectItem value="none">No Notebook</SelectItem>
            {notebooks.map(notebook => (
              <SelectItem key={notebook.id} value={notebook.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: notebook.color }} />
                  {notebook.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showFavorites ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFavorites(!showFavorites)}
          className="flex items-center gap-2"
        >
          <Star className="h-4 w-4" />
          Favorites
        </Button>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note) => (
            <Card key={note.id} className="group hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: getNotebookColor(note.notebook_id) }}
                    />
                    <h3 className="font-semibold text-lg line-clamp-1">{note.title}</h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(note)}
                      className="h-8 w-8 p-0"
                    >
                      {note.is_favorite ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingNote(note)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFindSimilarNote(note)}
                      disabled={similarLoading}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNote(note.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {note.content || 'No content...'}
                  </p>
                </div>

                {/* Tags */}
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {note.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {note.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{note.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{getNotebookName(note.notebook_id)}</span>
                  <span>{format(new Date(note.updated_at), 'MMM d')}</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              {searchTerm || selectedNotebook !== 'all' || showFavorites 
                ? 'No notes match your filters' 
                : 'No notes yet'
              }
            </p>
            <p className="text-muted-foreground">
              {searchTerm || selectedNotebook !== 'all' || showFavorites
                ? 'Try adjusting your search or filters'
                : 'Create your first note to get started'
              }
            </p>
          </div>
        )}
      </div>

      {/* Edit Note Dialog */}
      {editingNote && (
        <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Note</DialogTitle>
              <DialogDescription>
                Update your note's content and organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={editingNote.title}
                onChange={(e) => setEditingNote(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder="Note title"
              />
              <Textarea
                value={editingNote.content}
                onChange={(e) => setEditingNote(prev => prev ? { ...prev, content: e.target.value } : null)}
                rows={8}
                placeholder="Note content"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Notebook</label>
                  <Select 
                    value={editingNote.notebook_id || 'no-notebook'} 
                    onValueChange={(value) => setEditingNote(prev => prev ? { ...prev, notebook_id: value === 'no-notebook' ? undefined : value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select notebook" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-notebook">No Notebook</SelectItem>
                      {notebooks.map(notebook => (
                        <SelectItem key={notebook.id} value={notebook.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: notebook.color }} />
                            {notebook.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Tags</label>
                  <Input
                    value={editingNote.tags.join(', ')}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                      setEditingNote(prev => prev ? { ...prev, tags } : null);
                    }}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingNote(null)}>
                  Cancel
                </Button>
                <Button onClick={updateNote}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Similar Content Dialog */}
      {currentNoteForSimilar && (
        <SimilarContentDialog
          open={!!currentNoteForSimilar}
          onOpenChange={(open) => !open && setCurrentNoteForSimilar(null)}
          currentItem={{
            id: currentNoteForSimilar.id,
            title: currentNoteForSimilar.title,
            content: currentNoteForSimilar.content,
            created_at: currentNoteForSimilar.created_at,
            type: 'note'
          }}
          similarItems={similarItems}
          onMerge={handleMergeNotes}
        />
      )}
    </div>
  );
}