import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  FileText, Plus, Star, Search, Edit, Trash2, MoreHorizontal,
  LayoutGrid, List, ArrowUpDown, Copy, Expand, Pencil, BookOpen, FolderOpen, X, FileUp, Loader2, Wand2,
  PanelTop, CalendarDays, Columns2
} from 'lucide-react';
import { toast } from 'sonner';
import { SimilarContentDialog } from './SimilarContentDialog';
import { useSimilarContent } from '@/hooks/useSimilarContent';
import { useIsMobile } from '@/hooks/use-mobile';
import { EditNoteDialog } from './EditNoteDialog';
import { NoteViewerDialog } from './NoteViewerDialog';
import { HexColorPicker } from 'react-colorful';
import { importFile, getSupportedFileTypes } from '@/utils/fileImportUtils';
import { readEnexFile } from '@/utils/evernoteImport';
import DOMPurify from 'dompurify';
import { smartCategorize, CATEGORIES } from '@/utils/categoryUtils';
import { NotesBoard } from './NotesBoard';
import { NotesSplitView } from './NotesSplitView';
import { format } from 'date-fns';

const isHtmlContent = (content: string) => /<[a-z][\s\S]*>/i.test(content);

const sanitizeHtml = (html: string) => DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','strong','b','em','i','u','s','strike','del','ul','ol','li','blockquote','pre','code','a','img','hr','span','div','table','thead','tbody','tr','th','td','sup','sub'],
  ALLOWED_ATTR: ['href','src','alt','style','class','target','rel'],
});

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

interface NotesProps {
  initialView?: 'notes' | 'notebooks';
}

export function Notes({ initialView }: NotesProps = {}) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotebook, setSelectedNotebook] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'created' | 'alpha' | 'favorites'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'board'>('grid');
  const [splitNote, setSplitNote] = useState<Note | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [currentNoteForSimilar, setCurrentNoteForSimilar] = useState<Note | null>(null);
  const { loading: similarLoading, similarItems, findSimilar, mergeContent, generateEmbedding } = useSimilarContent();

  // Notebook management
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookColor, setNewNotebookColor] = useState('#64748b');
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [autoCategorizing, setAutoCategorizing] = useState(false);
  const [currentView, setCurrentView] = useState<'notes' | 'notebooks'>(initialView || 'notes');
  const [pendingNotebookId, setPendingNotebookId] = useState<string | null>(null);

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

  // Sync initialView prop
  useEffect(() => {
    if (initialView) setCurrentView(initialView);
  }, [initialView]);

  // Listen for open-notebook events from dashboard widget
  useEffect(() => {
    const handler = (e: Event) => {
      const nbId = (e as CustomEvent).detail;
      if (nbId) {
        setPendingNotebookId(nbId);
      }
    };
    window.addEventListener('open-notebook', handler);
    return () => window.removeEventListener('open-notebook', handler);
  }, []);

  // Apply pending notebook selection after notebooks load
  useEffect(() => {
    if (pendingNotebookId && notebooks.length > 0) {
      setSelectedNotebook(pendingNotebookId);
      setCurrentView('notes');
      setPendingNotebookId(null);
    }
  }, [pendingNotebookId, notebooks]);

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

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    setImporting(true);
    let importedCount = 0;
    try {
      for (const file of Array.from(files)) {
        // ENEX files contain multiple notes — split them
        if (file.name.endsWith('.enex')) {
          const enexNotes = await readEnexFile(file);
          for (const en of enexNotes) {
            const notebookId = selectedNotebook !== 'all' && selectedNotebook !== 'none' ? selectedNotebook : null;
            await supabase.from('notes').insert({
              user_id: user.id,
              title: en.title || file.name,
              content: en.content,
              notebook_id: notebookId,
              tags: en.tags || [],
            });
            importedCount++;
          }
        } else {
          // Single-file import
          const imported = await importFile(file);
          const notebookId = selectedNotebook !== 'all' && selectedNotebook !== 'none' ? selectedNotebook : null;
          await supabase.from('notes').insert({
            user_id: user.id,
            title: imported.name.replace(/\.(txt|md|docx|pdf|markdown)$/i, ''),
            content: imported.content,
            notebook_id: notebookId,
            tags: [],
          });
          importedCount++;
        }
      }
      fetchNotes();
      toast.success(`Imported ${importedCount} note${importedCount !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import some files');
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
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
      setNewNotebookColor('#64748b');
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

  const getNotebookColor = useCallback((notebookId?: string) => {
    if (!notebookId) return 'hsl(var(--muted-foreground) / 0.3)';
    const notebook = notebooks.find(nb => nb.id === notebookId);
    return notebook?.color || 'hsl(var(--muted-foreground) / 0.3)';
  }, [notebooks]);

  const getNotebookName = useCallback((notebookId?: string) => {
    if (!notebookId) return 'Uncategorized';
    const notebook = notebooks.find(nb => nb.id === notebookId);
    return notebook?.name || 'Unknown';
  }, [notebooks]);

  // Category-to-color mapping for auto-created notebooks
  const categoryColors: Record<string, string> = {
    'Technology': '#3b82f6', 'Science': '#06b6d4', 'Business': '#f97316',
    'Health': '#22c55e', 'Education': '#64748b', 'Creative': '#ec4899',
    'Personal': '#eab308', 'Reference': '#6b7280', 'Projects': '#14b8a6',
    'Philosophy': '#a855f7',
  };

  const autoCategorizeNotes = async () => {
    if (!user || autoCategorizing) return;
    setAutoCategorizing(true);
    try {
      // Get uncategorized notes
      const uncategorized = notes.filter(n => !n.notebook_id);
      if (uncategorized.length === 0) {
        toast.info('All notes are already in notebooks');
        setAutoCategorizing(false);
        return;
      }

      // Categorize each note
      const categorized: Record<string, Note[]> = {};
      for (const note of uncategorized) {
        const text = `${note.title} ${note.content}`;
        const category = smartCategorize(text, note.title);
        if (!categorized[category]) categorized[category] = [];
        categorized[category].push(note);
      }

      // Create notebooks for categories that don't exist yet, assign notes
      const existingNames = notebooks.map(nb => nb.name.toLowerCase());
      let created = 0;
      let assigned = 0;

      for (const [category, catNotes] of Object.entries(categorized)) {
        let notebookId: string;

        // Check if notebook with this name already exists
        const existing = notebooks.find(nb => nb.name.toLowerCase() === category.toLowerCase());
        if (existing) {
          notebookId = existing.id;
        } else {
          // Create the notebook
          const color = categoryColors[category] || '#6b7280';
          const { data, error } = await supabase
            .from('notebooks')
            .insert({ user_id: user.id, name: category, color, description: `Auto-created for ${category} notes` })
            .select('id')
            .single();
          if (error) throw error;
          notebookId = data.id;
          created++;
        }

        // Assign notes to this notebook
        const noteIds = catNotes.map(n => n.id);
        for (const noteId of noteIds) {
          await supabase.from('notes').update({ notebook_id: notebookId }).eq('id', noteId);
          assigned++;
        }
      }

      await fetchNotes();
      await fetchNotebooks();
      toast.success(`Organized ${assigned} note${assigned !== 1 ? 's' : ''} into ${Object.keys(categorized).length} notebook${Object.keys(categorized).length !== 1 ? 's' : ''}${created > 0 ? ` (${created} new)` : ''}`);
    } catch (error) {
      console.error('Auto-categorize error:', error);
      toast.error('Failed to auto-categorize notes');
    } finally {
      setAutoCategorizing(false);
    }
  };

  // Preset colors for quick selection
  const presetColors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6b7280'];

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-10 bg-muted/30 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // === NOTEBOOK DIRECTORY VIEW ===
  if (currentView === 'notebooks') {
    return (
      <div className="p-4 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Notebooks</h2>
            <Badge variant="secondary" className="text-xs">{notebooks.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentView('notes')} className="text-xs">
              ← All Notes
            </Button>
            <Button size="sm" onClick={() => setShowNewNotebook(true)} className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Notebook
            </Button>
          </div>
        </div>

        {/* Notebook Grid */}
        {notebooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notebooks.map((nb) => {
              const count = notebookCounts.counts[nb.id] || 0;
              return (
                <button
                  key={nb.id}
                  onClick={() => {
                    setSelectedNotebook(nb.id);
                    setCurrentView('notes');
                  }}
                  className="group relative rounded-xl border border-border/60 bg-card text-left p-5 transition-all duration-200 hover:shadow-lg hover:shadow-foreground/[0.03] hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                  style={{ borderLeftWidth: '4px', borderLeftColor: nb.color || 'hsl(var(--border))' }}
                >
                  {/* Subtle color accent bg */}
                  <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{ background: `linear-gradient(135deg, ${nb.color || 'transparent'}, transparent)` }}
                  />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <h3 className="text-sm font-semibold text-foreground">{nb.name}</h3>
                      </div>
                      <Badge variant="outline" className="text-[10px] tabular-nums shrink-0">{count}</Badge>
                    </div>
                    {nb.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{nb.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nb.color }} />
                      <span className="text-[11px] text-muted-foreground/70">
                        {count} note{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No notebooks yet</p>
            <p className="text-xs text-muted-foreground/60 mb-4">Create your first notebook to organize your notes</p>
            <Button size="sm" onClick={() => setShowNewNotebook(true)} className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create Notebook
            </Button>
          </div>
        )}

        {/* Uncategorized notes section */}
        {notebookCounts.uncategorized > 0 && (
          <button
            onClick={() => {
              setSelectedNotebook('none');
              setCurrentView('notes');
            }}
            className="w-full rounded-xl border border-dashed border-border/60 bg-card/50 p-4 text-left transition-all hover:bg-card hover:border-border"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Uncategorized Notes</span>
              </div>
              <Badge variant="outline" className="text-[10px]">{notebookCounts.uncategorized}</Badge>
            </div>
          </button>
        )}

        {/* New notebook dialog inline */}
        {showNewNotebook && (
          <Dialog open={showNewNotebook} onOpenChange={setShowNewNotebook}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Notebook</DialogTitle>
                <DialogDescription>Give your notebook a name and color.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder="Notebook name"
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createNotebook()}
                  autoFocus
                />
                <div className="flex flex-wrap gap-2">
                  {presetColors.map((c) => (
                    <button
                      key={c}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${newNotebookColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewNotebookColor(c)}
                    />
                  ))}
                </div>
                <Button onClick={createNotebook} disabled={!newNotebookName.trim()} className="w-full">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // === NOTEBOOK SIDEBAR ITEM ===
  const NotebookSidebarItem = ({ id, name, color, count, active }: {
    id: string; name: string; color?: string; count: number; active: boolean;
  }) => (
    <button
      onClick={() => setSelectedNotebook(id)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
        active
          ? 'bg-primary/10 text-primary font-medium shadow-sm'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      {color ? (
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
          style={{ backgroundColor: color, boxShadow: active ? `0 0 8px ${color}40` : 'none' }}
        />
      ) : (
        <FileText className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
      )}
      <span className="truncate flex-1 text-left">{name}</span>
      <span className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
        active ? 'bg-primary/15 text-primary' : 'bg-muted/60 text-muted-foreground/70'
      }`}>
        {count}
      </span>
    </button>
  );

  // === NOTE CARD (GRID) ===
  const NoteCardGrid = ({ note }: { note: Note }) => {
    const nbColor = getNotebookColor(note.notebook_id);
    const nbName = getNotebookName(note.notebook_id);

    return (
      <div
        className="group relative rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 transition-all duration-200 hover:shadow-lg hover:shadow-foreground/[0.03] hover:border-border cursor-pointer h-[180px] flex flex-col"
        style={{ borderTopWidth: '3px', borderTopColor: nbColor }}
        onClick={() => setViewingNote(note)}
      >
        {/* Favorite indicator */}
        {note.is_favorite && (
          <Star className="absolute top-3 right-3 h-3.5 w-3.5 text-amber-400 fill-amber-400" />
        )}

        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground pr-8 mb-1.5 line-clamp-1 flex-shrink-0">
          {note.title}
        </h3>

        {/* Notebook label */}
        {note.notebook_id && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 mb-2 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: nbColor }} />
            {nbName}
          </span>
        )}

        {/* Content preview */}
        <div className="flex-1 min-h-0 overflow-hidden mb-2">
          {note.content ? (
            isHtmlContent(note.content) ? (
              <div
                className="text-xs text-muted-foreground/80 line-clamp-3 leading-relaxed prose prose-xs dark:prose-invert max-w-none [&_img]:max-h-16 [&_img]:rounded [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content) }}
              />
            ) : (
              <p className="text-xs text-muted-foreground/80 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                {note.content}
              </p>
            )
          ) : (
            <p className="text-xs text-muted-foreground/80 line-clamp-3 leading-relaxed italic">Empty note...</p>
          )}
        </div>

        {/* Tags */}
        {note.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 flex-shrink-0">
            {note.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/40 text-muted-foreground/60">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between flex-shrink-0 mt-auto">
          <span className="text-[10px] text-muted-foreground/50 tabular-nums">
            {getRelativeDate(note.updated_at)} ago
          </span>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 ${isMobile ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'} hover:opacity-100 transition-opacity`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleFavorite(note); }}>
                <Star className="mr-2 h-3.5 w-3.5" />
                {note.is_favorite ? 'Unfavorite' : 'Favorite'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingNote(note); }}>
                <Edit className="mr-2 h-3.5 w-3.5" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleFindSimilarNote(note); }} disabled={similarLoading}>
                <Copy className="mr-2 h-3.5 w-3.5" />Find Similar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  // === NOTE CARD (LIST) ===
  const NoteCardList = ({ note }: { note: Note }) => {
    const nbColor = getNotebookColor(note.notebook_id);

    return (
      <div
        className="group flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 bg-card/60 hover:bg-card/90 hover:border-border/70 transition-all duration-150 cursor-pointer"
        style={{ borderLeftWidth: '3px', borderLeftColor: nbColor }}
        onClick={() => setViewingNote(note)}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          {note.is_favorite && <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
          <span className="text-sm font-medium truncate">{note.title}</span>
          {note.tags?.slice(0, 2).map((tag, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground hidden sm:inline">{tag}</span>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground/50 tabular-nums flex-shrink-0">{getRelativeDate(note.updated_at)}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost" size="sm"
              className={`h-6 w-6 p-0 flex-shrink-0 ${isMobile ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'} hover:opacity-100 transition-opacity`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleFavorite(note); }}>
              <Star className="mr-2 h-3.5 w-3.5" />{note.is_favorite ? 'Unfavorite' : 'Favorite'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingNote(note); }}>
              <Edit className="mr-2 h-3.5 w-3.5" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleFindSimilarNote(note); }} disabled={similarLoading}>
              <Copy className="mr-2 h-3.5 w-3.5" />Find Similar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="flex gap-0 animate-fade-in h-[calc(100dvh-7rem)] md:h-[calc(100dvh-4rem)]">
      {/* ============ NOTEBOOK SIDEBAR (Desktop) ============ */}
      {!isMobile && (
        <aside className="w-52 flex-shrink-0 border-r border-border/40 py-4 pr-3 mr-1 space-y-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-3 mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary/70" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notebooks</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-md hover:bg-primary/10 hover:text-primary"
              onClick={() => setShowNewNotebook(!showNewNotebook)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* New notebook inline form */}
          {showNewNotebook && (
            <div className="mx-2 p-3 space-y-2.5 rounded-lg border border-primary/20 bg-primary/[0.03]">
              <Input
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                placeholder="Notebook name..."
                className="h-8 text-xs bg-background/80 border-border/50"
                onKeyDown={(e) => e.key === 'Enter' && createNotebook()}
                autoFocus
              />
              {/* Color presets */}
              <div className="flex items-center gap-1 flex-wrap">
                {presetColors.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewNotebookColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${newNotebookColor === c ? 'scale-125 ring-2 ring-offset-1 ring-offset-background ring-primary/50' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs px-3 flex-1" onClick={createNotebook} disabled={!newNotebookName.trim()}>
                  Create
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setShowNewNotebook(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* All Notes */}
          <NotebookSidebarItem id="all" name="All Notes" count={notes.length} active={selectedNotebook === 'all'} />

          {/* Separator */}
          {notebooks.length > 0 && <div className="h-px bg-border/30 mx-3 my-2" />}

          {/* Notebook list */}
          {notebooks.map(nb => (
            <div key={nb.id} className="group/nb relative">
              <NotebookSidebarItem
                id={nb.id}
                name={nb.name}
                color={nb.color || '#6b7280'}
                count={notebookCounts.counts[nb.id] || 0}
                active={selectedNotebook === nb.id}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-5 w-5 p-0 rounded opacity-0 group-hover/nb:opacity-60 hover:!opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => setEditingNotebook(nb)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => deleteNotebook(nb.id)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          {/* Uncategorized */}
          {notebookCounts.uncategorized > 0 && (
            <>
              <div className="h-px bg-border/30 mx-3 my-2" />
              <NotebookSidebarItem id="none" name="Uncategorized" count={notebookCounts.uncategorized} active={selectedNotebook === 'none'} />
            </>
          )}
        </aside>
      )}

      {/* ============ MAIN CONTENT ============ */}
      <div className="flex-1 flex flex-col gap-2 min-w-0 py-2 px-2 sm:px-3 overflow-hidden">
        {/* Mobile notebook chips */}
        {isMobile && (
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-hide sticky top-0 z-10 bg-background/95 backdrop-blur-sm flex-shrink-0">
            <button
              onClick={() => setSelectedNotebook('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                selectedNotebook === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border/60 text-muted-foreground'
              }`}
            >
              All ({notes.length})
            </button>
            {notebooks.map(nb => (
              <button
                key={nb.id}
                onClick={() => setSelectedNotebook(nb.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                  selectedNotebook === nb.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border/60 text-muted-foreground'
                }`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: nb.color || '#6b7280' }} />
                {nb.name} ({notebookCounts.counts[nb.id] || 0})
              </button>
            ))}
            {notebookCounts.uncategorized > 0 && (
              <button
                onClick={() => setSelectedNotebook('none')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                  selectedNotebook === 'none'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border/60 text-muted-foreground'
                }`}
              >
                Loose ({notebookCounts.uncategorized})
              </button>
            )}
            <button
              onClick={() => setShowNewNotebook(true)}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border border-dashed border-border/60 text-muted-foreground/60 hover:text-muted-foreground hover:border-border transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Mobile new notebook dialog */}
        {isMobile && showNewNotebook && (
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/[0.03] space-y-2.5">
            <Input
              value={newNotebookName}
              onChange={(e) => setNewNotebookName(e.target.value)}
              placeholder="Notebook name..."
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && createNotebook()}
              autoFocus
            />
            <div className="flex items-center gap-1 flex-wrap">
              {presetColors.map(c => (
                <button
                  key={c}
                  onClick={() => setNewNotebookColor(c)}
                  className={`w-6 h-6 rounded-full ${newNotebookColor === c ? 'ring-2 ring-offset-1 ring-offset-background ring-primary/50 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs flex-1" onClick={createNotebook} disabled={!newNotebookName.trim()}>Create</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowNewNotebook(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* ===== TOOLBAR ===== */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap flex-shrink-0 mt-1">
          {/* Search */}
          <div className={`relative ${isMobile ? 'w-full order-first' : 'flex-1 min-w-[140px] max-w-sm'}`}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notes..."
              className="h-9 pl-8 text-xs bg-card/60 border-border/50 rounded-lg"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Note count */}
          <span className="text-[11px] text-muted-foreground/60 tabular-nums hidden sm:inline">
            {displayedNotes.length} note{displayedNotes.length !== 1 ? 's' : ''}
          </span>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5 text-xs text-muted-foreground">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {sortBy === 'recent' ? 'Recent' : sortBy === 'created' ? 'Created' : sortBy === 'alpha' ? 'A–Z' : 'Favorites'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {[
                { key: 'recent' as const, label: 'Recently Modified' },
                { key: 'created' as const, label: 'Recently Created' },
                { key: 'alpha' as const, label: 'Alphabetical' },
                { key: 'favorites' as const, label: 'Favorites First' },
              ].map(opt => (
                <DropdownMenuItem key={opt.key} onClick={() => setSortBy(opt.key)} className={sortBy === opt.key ? 'bg-accent font-medium' : ''}>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
          <div className="flex items-center bg-muted/40 rounded-lg p-0.5">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm"
              onClick={() => setViewMode('grid')}
              className="h-7 w-7 p-0"
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm"
              onClick={() => setViewMode('list')}
              className="h-7 w-7 p-0"
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'board' ? 'secondary' : 'ghost'} size="sm"
              onClick={() => setViewMode('board')}
              className="h-7 w-7 p-0"
              title="Board view"
            >
              <PanelTop className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Daily journal */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs rounded-lg"
            onClick={async () => {
              if (!user) return;
              const today = format(new Date(), 'yyyy-MM-dd');
              // Check if today's journal note exists
              const { data: existing } = await supabase
                .from('notes')
                .select('*')
                .eq('user_id', user.id)
                .eq('title', today)
                .is('deleted_at', null)
                .limit(1);
              if (existing && existing.length > 0) {
                setEditingNote(existing[0] as Note);
              } else {
                // Find or create Journal notebook
                let journalNbId: string | null = null;
                const jnb = notebooks.find(nb => nb.name.toLowerCase() === 'journal');
                if (jnb) {
                  journalNbId = jnb.id;
                } else {
                  const { data: newNb } = await supabase
                    .from('notebooks')
                    .insert({ user_id: user.id, name: 'Journal', color: '#f59e0b', description: 'Daily journal entries' })
                    .select('id')
                    .single();
                  if (newNb) {
                    journalNbId = newNb.id;
                    fetchNotebooks();
                  }
                }
                const { data: newNote } = await supabase
                  .from('notes')
                  .insert({ user_id: user.id, title: today, content: '', notebook_id: journalNbId, tags: ['journal'] })
                  .select()
                  .single();
                if (newNote) {
                  fetchNotes();
                  setEditingNote(newNote as Note);
                }
              }
            }}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Journal</span>
          </Button>

          {/* Auto-categorize */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs rounded-lg"
            onClick={autoCategorizeNotes}
            disabled={autoCategorizing}
            title="Auto-organize uncategorized notes into notebooks based on content"
          >
            {autoCategorizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{autoCategorizing ? 'Organizing...' : 'Auto-Organize'}</span>
          </Button>

          {/* Import files */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs rounded-lg"
            onClick={() => importFileRef.current?.click()}
            disabled={importing}
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{importing ? 'Importing...' : 'Import'}</span>
          </Button>
          <input
            ref={importFileRef}
            type="file"
            accept={getSupportedFileTypes()}
            multiple
            onChange={handleImportFiles}
            className="hidden"
          />

          {/* Create note */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5 text-xs rounded-lg">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* ===== QUICK ADD BAR ===== */}
        <div className="flex gap-2 flex-shrink-0">
          <div className="flex-1 relative">
            <Plus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
            <Input
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder={selectedNotebook !== 'all' && selectedNotebook !== 'none'
                ? `Quick note in ${getNotebookName(selectedNotebook)}...`
                : 'Quick note... press Enter'
              }
              className="h-9 pl-8 text-xs bg-card/40 border-border/40 border-dashed rounded-lg placeholder:text-muted-foreground/40"
              onKeyDown={(e) => e.key === 'Enter' && quickCreateNote()}
            />
          </div>
          <Button
            variant="ghost" size="sm"
            className="h-9 w-9 p-0 text-muted-foreground/50 hover:text-muted-foreground"
            onClick={() => setShowCreateDialog(true)}
            title="Full editor"
          >
            <Expand className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* ===== NOTES GRID / LIST (scrollable) ===== */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-4 -mx-1 px-1">
        {viewMode === 'board' ? (
            <NotesBoard
              notes={displayedNotes as any}
              notebooks={notebooks}
              onViewNote={(n) => setViewingNote(n as Note)}
              onEditNote={(n) => setEditingNote(n as Note)}
              onDeleteNote={deleteNote}
              onToggleFavorite={(n) => toggleFavorite(n as Note)}
              onFindSimilar={(n) => handleFindSimilarNote(n as Note)}
              onRefresh={fetchNotes}
            />
          ) : displayedNotes.length > 0 ? (
            viewMode === 'list' ? (
              <div className="space-y-1.5">
                {displayedNotes.map(note => <NoteCardList key={note.id} note={note} />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {displayedNotes.map(note => <NoteCardGrid key={note.id} note={note} />)}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center">
                <FileText className="h-7 w-7 text-muted-foreground/20" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground/70">
                  {searchTerm ? `No notes matching "${searchTerm}"` : notes.length === 0 ? 'No notes yet' : 'No notes in this notebook'}
                </p>
                {notes.length === 0 && (
                  <p className="text-xs text-muted-foreground/40">
                    Type in the quick-add bar above or click New Note to get started
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============ DIALOGS ============ */}

      {/* Note Viewer Dialog */}
      <NoteViewerDialog
        note={viewingNote}
        notebooks={notebooks}
        isOpen={!!viewingNote}
        onClose={() => setViewingNote(null)}
        onEdit={(note) => { setViewingNote(null); setEditingNote(note); }}
      />

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
            <div className="space-y-4">
              <Input
                value={editingNotebook.name}
                onChange={(e) => setEditingNotebook({ ...editingNotebook, name: e.target.value })}
                placeholder="Notebook name"
              />
              <div className="space-y-2">
                <span className="text-sm font-medium">Color</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {presetColors.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditingNotebook({ ...editingNotebook, color: c })}
                      className={`w-6 h-6 rounded-full transition-transform ${editingNotebook.color === c ? 'scale-125 ring-2 ring-offset-1 ring-offset-background ring-primary/50' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: editingNotebook.color }} />
                      Custom color...
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3">
                    <HexColorPicker color={editingNotebook.color} onChange={(c) => setEditingNotebook({ ...editingNotebook, color: c })} style={{ width: '180px', height: '140px' }} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex justify-end gap-2 pt-1">
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
