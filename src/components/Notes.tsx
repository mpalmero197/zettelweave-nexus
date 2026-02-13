import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { 
  FileText, Plus, Star, Search, Edit, Trash2, BookOpen, MoreHorizontal,
  LayoutGrid, List, ArrowUpDown, Copy, Expand, StarOff, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { SimilarContentDialog } from './SimilarContentDialog';
import { useSimilarContent } from '@/hooks/useSimilarContent';
import { useIsMobile } from '@/hooks/use-mobile';
import { EditNoteDialog } from './EditNoteDialog';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  description?: string;
  is_favorite?: boolean;
}

const getRelativeDate = (dateStr: string) => {
  try {
    return formatDistanceToNowStrict(new Date(dateStr), { addSuffix: false })
      .replace(' seconds', 's').replace(' second', 's')
      .replace(' minutes', 'm').replace(' minute', 'm')
      .replace(' hours', 'h').replace(' hour', 'h')
      .replace(' days', 'd').replace(' day', 'd')
      .replace(' months', 'mo').replace(' month', 'mo')
      .replace(' years', 'y').replace(' year', 'y');
  } catch { return ''; }
};

export function Notes() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotebook, setSelectedNotebook] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'created' | 'alpha' | 'favorites'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [quickTitle, setQuickTitle] = useState('');
  const [currentNoteForSimilar, setCurrentNoteForSimilar] = useState<Note | null>(null);
  const { loading: similarLoading, similarItems, findSimilar, mergeContent, generateEmbedding } = useSimilarContent();

  // Notebook management
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookColor, setNewNotebookColor] = useState('#3b82f6');
  const [showNewNotebook, setShowNewNotebook] = useState(false);

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

  const fetchNotes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
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
        .select('id, name, color, description, is_favorite')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      setNotebooks(data || []);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    }
  };

  // Compute note counts per notebook
  const notebookCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let uncategorized = 0;
    for (const note of notes) {
      if (note.notebook_id) {
        counts[note.notebook_id] = (counts[note.notebook_id] || 0) + 1;
      } else {
        uncategorized++;
      }
    }
    return { counts, uncategorized };
  }, [notes]);

  // Filter and sort notes
  const displayedNotes = useMemo(() => {
    let filtered = notes;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (selectedNotebook !== 'all') {
      if (selectedNotebook === 'none') {
        filtered = filtered.filter(note => !note.notebook_id);
      } else {
        filtered = filtered.filter(note => note.notebook_id === selectedNotebook);
      }
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'created': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'alpha': return a.title.localeCompare(b.title);
        case 'favorites': {
          if (a.is_favorite && !b.is_favorite) return -1;
          if (!a.is_favorite && b.is_favorite) return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        case 'recent':
        default: return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return filtered;
  }, [notes, searchTerm, selectedNotebook, sortBy]);

  const quickCreateNote = async () => {
    if (!user || !quickTitle.trim()) return;
    try {
      const notebookId = selectedNotebook !== 'all' && selectedNotebook !== 'none' ? selectedNotebook : null;
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: quickTitle.trim(),
          content: '',
          notebook_id: notebookId,
          tags: []
        })
        .select()
        .single();
      if (error) throw error;
      if (data) generateEmbedding(data.id, 'note', quickTitle.trim());
      setQuickTitle('');
      fetchNotes();
      toast.success('Note created');
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note');
    }
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
      if (data) generateEmbedding(data.id, 'note', `${newNote.title} ${newNote.content}`);
      setNewNote({ title: '', content: '', notebook_id: '', tags: [] });
      setShowCreateDialog(false);
      fetchNotes();
      toast.success('Note created successfully');
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Failed to create note');
    }
  };

  const updateNote = async (updatedNote: Note) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: updatedNote.title,
          content: updatedNote.content,
          notebook_id: updatedNote.notebook_id || null,
          tags: updatedNote.tags
        })
        .eq('id', updatedNote.id);
      if (error) throw error;
      generateEmbedding(updatedNote.id, 'note', `${updatedNote.title} ${updatedNote.content}`);
      setEditingNote(null);
      fetchNotes();
      toast.success('Note updated');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      if (error) throw error;
      fetchNotes();
      toast.success('Note deleted');
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
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleFindSimilarNote = async (note: Note) => {
    const results = await findSimilar(note.id, 'note');
    if (results.length > 0) setCurrentNoteForSimilar(note);
  };

  const handleMergeNotes = async (sourceId: string, destinationId: string, mergedContent: string) => {
    await mergeContent(sourceId, destinationId, mergedContent, 'note');
    setCurrentNoteForSimilar(null);
    fetchNotes();
  };

  // Notebook CRUD
  const createNotebook = async () => {
    if (!user || !newNotebookName.trim()) return;
    try {
      const { error } = await supabase
        .from('notebooks')
        .insert({ user_id: user.id, name: newNotebookName.trim(), color: newNotebookColor });
      if (error) throw error;
      setNewNotebookName('');
      setNewNotebookColor('#3b82f6');
      setShowNewNotebook(false);
      fetchNotebooks();
      toast.success('Notebook created');
    } catch (error) {
      console.error('Error creating notebook:', error);
      toast.error('Failed to create notebook');
    }
  };

  const updateNotebook = async (nb: Notebook) => {
    try {
      const { error } = await supabase
        .from('notebooks')
        .update({ name: nb.name, color: nb.color })
        .eq('id', nb.id);
      if (error) throw error;
      setEditingNotebook(null);
      fetchNotebooks();
      toast.success('Notebook updated');
    } catch (error) {
      toast.error('Failed to update notebook');
    }
  };

  const deleteNotebook = async (nbId: string) => {
    if (!confirm('Delete this notebook? Notes inside will become uncategorized.')) return;
    try {
      // Unassign notes first
      await supabase.from('notes').update({ notebook_id: null }).eq('notebook_id', nbId);
      const { error } = await supabase.from('notebooks').delete().eq('id', nbId);
      if (error) throw error;
      if (selectedNotebook === nbId) setSelectedNotebook('all');
      fetchNotebooks();
      fetchNotes();
      toast.success('Notebook deleted');
    } catch (error) {
      toast.error('Failed to delete notebook');
    }
  };

  const getNotebookColor = (notebookId?: string) => {
    if (!notebookId) return 'hsl(var(--muted-foreground))';
    const notebook = notebooks.find(nb => nb.id === notebookId);
    return notebook?.color || 'hsl(var(--muted-foreground))';
  };

  const getNotebookName = (notebookId?: string) => {
    if (!notebookId) return 'Uncategorized';
    const notebook = notebooks.find(nb => nb.id === notebookId);
    return notebook?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-muted/40 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Notebook sidebar item
  const NotebookItem = ({ id, name, color, count, active }: { id: string; name: string; color?: string; count: number; active: boolean }) => (
    <button
      onClick={() => setSelectedNotebook(id)}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
        active ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      }`}
    >
      {color && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
      {!color && <FileText className="h-3.5 w-3.5 flex-shrink-0" />}
      <span className="truncate flex-1 text-left">{name}</span>
      <span className="text-xs tabular-nums opacity-60">{count}</span>
    </button>
  );

  // Note card component
  const NoteCard = ({ note }: { note: Note }) => {
    const nbColor = getNotebookColor(note.notebook_id);
    
    if (viewMode === 'list') {
      return (
        <div className="widget-card flex items-center gap-3 px-3 py-2 group" style={{ borderLeft: `3px solid ${nbColor}` }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {note.is_favorite && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
              <span className="text-sm font-medium truncate">{note.title}</span>
              {note.tags?.slice(0, 2).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 hidden sm:inline-flex">{tag}</Badge>
              ))}
            </div>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{getRelativeDate(note.updated_at)}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => toggleFavorite(note)}>
                <Star className="mr-2 h-3.5 w-3.5" />{note.is_favorite ? 'Unfavorite' : 'Favorite'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditingNote(note)}>
                <Edit className="mr-2 h-3.5 w-3.5" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFindSimilarNote(note)} disabled={similarLoading}>
                <Copy className="mr-2 h-3.5 w-3.5" />Find Similar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => deleteNote(note.id)} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    return (
      <div className="widget-card p-3 group animate-fade-in" style={{ borderLeft: `3px solid ${nbColor}` }}>
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {note.is_favorite && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
            <h3 className="text-sm font-medium truncate">{note.title}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 flex-shrink-0 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => toggleFavorite(note)}>
                <Star className="mr-2 h-3.5 w-3.5" />{note.is_favorite ? 'Unfavorite' : 'Favorite'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditingNote(note)}>
                <Edit className="mr-2 h-3.5 w-3.5" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFindSimilarNote(note)} disabled={similarLoading}>
                <Copy className="mr-2 h-3.5 w-3.5" />Find Similar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => deleteNote(note.id)} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content preview */}
        <p className="text-xs text-muted-foreground line-clamp-3 mb-2">
          {note.content || 'No content...'}
        </p>

        {/* Tags */}
        {note.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {note.tags.slice(0, 2).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{tag}</Badge>
            ))}
            {note.tags.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">+{note.tags.length - 2}</Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-[11px] text-muted-foreground tabular-nums">
          {getRelativeDate(note.updated_at)} ago
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-0 animate-fade-in min-h-[calc(100vh-8rem)]">
      {/* Notebook Sidebar - Desktop */}
      {!isMobile && (
        <div className="w-48 flex-shrink-0 border-r border-border/50 pr-2 mr-2 py-3 space-y-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notebooks</span>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setShowNewNotebook(!showNewNotebook)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Inline new notebook */}
          {showNewNotebook && (
            <div className="px-2 py-1.5 space-y-1.5 border border-border/50 rounded-md bg-card/50 mb-1">
              <Input
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                placeholder="Name..."
                className="h-7 text-xs"
                onKeyDown={(e) => e.key === 'Enter' && createNotebook()}
              />
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: newNotebookColor }} />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <HexColorPicker color={newNotebookColor} onChange={setNewNotebookColor} style={{ width: '160px', height: '120px' }} />
                  </PopoverContent>
                </Popover>
                <Button size="sm" className="h-6 text-xs px-2 flex-1" onClick={createNotebook} disabled={!newNotebookName.trim()}>
                  Add
                </Button>
              </div>
            </div>
          )}

          <NotebookItem id="all" name="All Notes" count={notes.length} active={selectedNotebook === 'all'} />
          
          {notebooks.map(nb => (
            <div key={nb.id} className="group/nb relative">
              <NotebookItem id={nb.id} name={nb.name} color={nb.color || '#6b7280'} count={notebookCounts.counts[nb.id] || 0} active={selectedNotebook === nb.id} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="absolute right-0 top-0.5 h-6 w-6 p-0 opacity-0 group-hover/nb:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={() => setEditingNotebook(nb)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => deleteNotebook(nb.id)} className="text-destructive">
                    <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          <NotebookItem id="none" name="Uncategorized" count={notebookCounts.uncategorized} active={selectedNotebook === 'none'} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-3 space-y-2">
        {/* Mobile notebook chips */}
        {isMobile && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            <button
              onClick={() => setSelectedNotebook('all')}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedNotebook === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'
              }`}
            >
              All ({notes.length})
            </button>
            {notebooks.map(nb => (
              <button
                key={nb.id}
                onClick={() => setSelectedNotebook(nb.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedNotebook === nb.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'
                }`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: nb.color || '#6b7280' }} />
                {nb.name} ({notebookCounts.counts[nb.id] || 0})
              </button>
            ))}
            <button
              onClick={() => setSelectedNotebook('none')}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedNotebook === 'none' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'
              }`}
            >
              Uncategorized ({notebookCounts.uncategorized})
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="sticky top-14 sm:top-20 z-20 bg-card/90 backdrop-blur-sm border border-border/60 rounded-lg px-2 sm:px-3 py-2">
          <div className="flex items-center gap-2">
            {/* Quick add */}
            <div className="flex-1 relative max-w-sm">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notes..."
                className="h-8 pl-7 text-xs bg-background/60"
              />
            </div>

            {/* Note count */}
            <span className="text-xs text-muted-foreground hidden sm:inline tabular-nums">{displayedNotes.length} notes</span>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setSortBy('recent')} className={sortBy === 'recent' ? 'bg-accent' : ''}>Recently Modified</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('created')} className={sortBy === 'created' ? 'bg-accent' : ''}>Recently Created</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('alpha')} className={sortBy === 'alpha' ? 'bg-accent' : ''}>Alphabetical</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('favorites')} className={sortBy === 'favorites' ? 'bg-accent' : ''}>Favorites First</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View toggle */}
            <Button variant="ghost" size="sm" onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} className="h-8 w-8 p-0">
              {viewMode === 'grid' ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            </Button>

            {/* Create button */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New Note</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Note</DialogTitle>
                  <DialogDescription>Create a new note with optional notebook and tags</DialogDescription>
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
                        onValueChange={(value) => setNewNote(prev => ({ ...prev, notebook_id: value === 'no-notebook' ? '' : value }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select notebook" /></SelectTrigger>
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
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                    <Button onClick={createNote} disabled={!newNote.title.trim()}>Create Note</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Add Bar */}
        <div className="flex gap-2">
          <Input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Quick note... press Enter"
            className="h-8 text-xs flex-1 bg-card/60 border-border/50"
            onKeyDown={(e) => e.key === 'Enter' && quickCreateNote()}
          />
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowCreateDialog(true)}>
            <Expand className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Notes Grid/List */}
        {displayedNotes.length > 0 ? (
          viewMode === 'list' ? (
            <div className="space-y-1">
              {displayedNotes.map(note => <NoteCard key={note.id} note={note} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
              {displayedNotes.map(note => <NoteCard key={note.id} note={note} />)}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-15 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              {searchTerm ? `No notes matching "${searchTerm}"` : notes.length === 0 ? 'Create your first note to get started' : 'No notes in this notebook'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Note Dialog */}
      {editingNote && (
        <EditNoteDialog
          note={editingNote}
          notebooks={notebooks}
          isOpen={!!editingNote}
          onClose={() => setEditingNote(null)}
          onSave={updateNote}
        />
      )}

      {/* Edit Notebook Dialog */}
      {editingNotebook && (
        <Dialog open={!!editingNotebook} onOpenChange={(open) => !open && setEditingNotebook(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Notebook</DialogTitle>
              <DialogDescription>Update notebook name and color</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={editingNotebook.name}
                onChange={(e) => setEditingNotebook({ ...editingNotebook, name: e.target.value })}
                placeholder="Notebook name"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm">Color:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: editingNotebook.color }} />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <HexColorPicker color={editingNotebook.color} onChange={(c) => setEditingNotebook({ ...editingNotebook, color: c })} style={{ width: '160px', height: '120px' }} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingNotebook(null)}>Cancel</Button>
                <Button onClick={() => updateNotebook(editingNotebook)}>Save</Button>
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
