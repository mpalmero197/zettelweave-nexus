import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, Pin, PinOff, MoreHorizontal, Trash2, StickyNote, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';

interface StickyNote {
  id: string;
  content: string;
  color: string;
  timestamp: string;
  alwaysOnTop?: boolean;
}

const NOTE_COLORS = [
  { value: '#fef3c7', label: 'Yellow' },
  { value: '#fce7f3', label: 'Pink' },
  { value: '#dbeafe', label: 'Blue' },
  { value: '#d1fae5', label: 'Green' },
  { value: '#e9d5ff', label: 'Purple' },
  { value: '#fed7aa', label: 'Orange' },
];

type SortBy = 'recent' | 'oldest' | 'alpha' | 'color';
type ViewMode = 'grid' | 'list';

const SORT_LABELS: Record<SortBy, string> = {
  recent: 'Recent',
  oldest: 'Oldest',
  alpha: 'A → Z',
  color: 'Color',
};

export const StickyNotesSimple: React.FC = () => {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [quickAddContent, setQuickAddContent] = useState('');
  const [quickAddColor, setQuickAddColor] = useState(NOTE_COLORS[0].value);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('stickyNotes');
    if (saved) {
      try { setNotes(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const persist = (updated: StickyNote[]) => {
    setNotes(updated);
    localStorage.setItem('stickyNotes', JSON.stringify(updated));
  };

  const addNote = (content: string, color: string) => {
    const note: StickyNote = {
      id: Date.now().toString(),
      content,
      color,
      timestamp: new Date().toISOString(),
      alwaysOnTop: false,
    };
    persist([note, ...notes]);
    toast.success('Note created');
  };

  const handleQuickAdd = () => {
    const text = quickAddContent.trim();
    if (!text) return;
    addNote(text, quickAddColor);
    setQuickAddContent('');
    quickAddRef.current?.focus();
  };

  const updateContent = (id: string, content: string) => {
    persist(notes.map(n => n.id === id ? { ...n, content } : n));
  };

  const updateColor = (id: string, color: string) => {
    persist(notes.map(n => n.id === id ? { ...n, color } : n));
  };

  const togglePin = (id: string) => {
    const note = notes.find(n => n.id === id);
    persist(notes.map(n => n.id === id ? { ...n, alwaysOnTop: !n.alwaysOnTop } : n));
    toast.success(note?.alwaysOnTop ? 'Unpinned' : 'Pinned');
  };

  const requestDelete = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note && note.content.trim()) {
      setDeleteConfirmId(id);
    } else {
      persist(notes.filter(n => n.id !== id));
      toast.success('Note deleted');
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    persist(notes.filter(n => n.id !== deleteConfirmId));
    setDeleteConfirmId(null);
    toast.success('Note deleted');
  };

  const getRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp;
      return formatDistanceToNowStrict(date, { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  const wordCount = (text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length;
  };

  // Filter + sort
  const processed = (() => {
    let result = [...notes];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => n.content.toLowerCase().includes(q));
    }

    // Pinned always first
    const pinned = result.filter(n => n.alwaysOnTop);
    const unpinned = result.filter(n => !n.alwaysOnTop);

    const sortFn = (a: StickyNote, b: StickyNote) => {
      switch (sortBy) {
        case 'recent': return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'oldest': return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'alpha': return a.content.localeCompare(b.content);
        case 'color': return a.color.localeCompare(b.color);
        default: return 0;
      }
    };

    pinned.sort(sortFn);
    unpinned.sort(sortFn);
    return [...pinned, ...unpinned];
  })();

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <StickyNote className="h-7 w-7 text-primary" />
            Sticky Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
            {searchQuery && ` · ${processed.length} found`}
          </p>
        </div>
        <Button onClick={() => addNote('', quickAddColor)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Note</span>
        </Button>
      </div>

      {/* Quick-add bar */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card/80 backdrop-blur-sm p-2.5 shadow-sm">
        <Input
          ref={quickAddRef}
          value={quickAddContent}
          onChange={e => setQuickAddContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
          placeholder="Quick add a note… press Enter"
          className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-8 text-sm"
        />
        <div className="flex gap-1 shrink-0">
          {NOTE_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setQuickAddColor(c.value)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                quickAddColor === c.value ? 'border-primary scale-110 shadow-sm' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={handleQuickAdd} className="h-8 px-2.5 text-xs">
          Add
        </Button>
      </div>

      {/* Search + Sort + View */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notes…"
            className="pl-8 h-8 text-sm border-border/50 bg-card/60"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {SORT_LABELS[sortBy]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(SORT_LABELS) as SortBy[]).map(key => (
              <DropdownMenuItem key={key} onClick={() => setSortBy(key)} className={sortBy === key ? 'bg-accent' : ''}>
                {SORT_LABELS[key]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent text-muted-foreground'}`}
            title="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent text-muted-foreground'}`}
            title="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Notes */}
      {processed.length > 0 ? (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
            : 'flex flex-col gap-2'
        }>
          {processed.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              viewMode={viewMode}
              onUpdateContent={updateContent}
              onUpdateColor={updateColor}
              onTogglePin={togglePin}
              onDelete={requestDelete}
              relativeTime={getRelativeTime(note.timestamp)}
              words={wordCount(note.content)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <StickyNote className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {searchQuery ? 'No notes found' : 'No sticky notes yet'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {searchQuery
              ? `Nothing matches "${searchQuery}". Try a different search.`
              : 'Type in the quick-add bar above and press Enter to create your first note.'
            }
          </p>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>This note has content. Are you sure you want to delete it?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ─── Note Card ─── */

interface NoteCardProps {
  note: StickyNote;
  viewMode: ViewMode;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  relativeTime: string;
  words: number;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note, viewMode, onUpdateContent, onUpdateColor, onTogglePin, onDelete, relativeTime, words
}) => {
  const [showColors, setShowColors] = useState(false);
  const isGrid = viewMode === 'grid';

  return (
    <div
      className={`group relative rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-sm
        transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden
        ${isGrid ? '' : 'flex items-start'}
      `}
      style={{ borderTop: `3px solid ${note.color}` }}
      onMouseEnter={() => setShowColors(true)}
      onMouseLeave={() => setShowColors(false)}
    >
      {/* Folded corner effect */}
      <div
        className="absolute bottom-0 right-0 w-5 h-5 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, transparent 50%, ${note.color} 50%)`,
          opacity: 0.6,
        }}
      />

      {/* Content area */}
      <div className={`flex-1 p-3 ${isGrid ? '' : 'flex items-start gap-3'}`}>
        {/* Pin badge */}
        {note.alwaysOnTop && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary bg-primary/10 rounded-full px-1.5 py-0.5 mb-1.5">
            <Pin className="h-2.5 w-2.5" /> Pinned
          </span>
        )}

        <textarea
          value={note.content}
          onChange={e => onUpdateContent(note.id, e.target.value)}
          placeholder="Write something…"
          className={`w-full bg-transparent border-0 resize-none text-sm text-foreground placeholder:text-muted-foreground/50
            focus:outline-none focus:ring-0 p-0
            ${isGrid ? 'min-h-[80px]' : 'min-h-[36px]'}
          `}
          rows={isGrid ? 4 : 2}
        />

        {/* Footer */}
        <div className={`flex items-center justify-between mt-2 ${isGrid ? '' : 'shrink-0'}`}>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{relativeTime}</span>
            <span className="opacity-40">·</span>
            <span>{words} {words === 1 ? 'word' : 'words'}</span>
          </div>

          {/* Inline color dots (on hover) */}
          <div className={`flex gap-1 transition-opacity duration-150 ${showColors ? 'opacity-100' : 'opacity-0'}`}>
            {NOTE_COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => onUpdateColor(note.id, c.value)}
                className={`w-3 h-3 rounded-full transition-transform ${
                  note.color === c.value ? 'ring-1 ring-primary ring-offset-1 ring-offset-background scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Actions menu (top-right) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent/80 text-muted-foreground">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => onTogglePin(note.id)}>
              {note.alwaysOnTop ? <PinOff className="h-3.5 w-3.5 mr-2" /> : <Pin className="h-3.5 w-3.5 mr-2" />}
              {note.alwaysOnTop ? 'Unpin' : 'Pin to top'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(note.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
