import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { X, Plus, Palette, Pin, PinOff, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDraggable } from '@/hooks/useDraggable';

interface StickyNote {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  timestamp: string;
  alwaysOnTop?: boolean;
}

const colors = [
  '#fef3c7', // yellow
  '#fce7f3', // pink  
  '#dbeafe', // blue
  '#d1fae5', // green
  '#e9d5ff', // purple
  '#fed7aa'  // orange
];

export const StickyNotesSimple: React.FC = () => {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const nodeRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const savedNotes = localStorage.getItem('stickyNotes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (error) {
        console.error('Failed to load sticky notes:', error);
      }
    }
  }, []);

  const saveToStorage = (updatedNotes: StickyNote[]) => {
    localStorage.setItem('stickyNotes', JSON.stringify(updatedNotes));
  };

  const addNote = () => {
    const newNote: StickyNote = {
      id: Date.now().toString(),
      content: '',
      color: colors[Math.floor(Math.random() * colors.length)],
      position: { x: Math.random() * 300, y: Math.random() * 200 },
      timestamp: new Date().toLocaleString(),
      alwaysOnTop: false,
    };

    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    saveToStorage(updatedNotes);
    toast.success('Note created');
  };

  const deleteNote = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note && note.content.trim()) {
      setDeleteConfirmId(id);
      return;
    }
    
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
    saveToStorage(updatedNotes);
    toast.success('Note deleted');
  };

  const confirmDelete = (id: string) => {
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
    saveToStorage(updatedNotes);
    setDeleteConfirmId(null);
    toast.success('Note deleted');
  };

  const updateNoteContent = (id: string, content: string) => {
    const updatedNotes = notes.map(note =>
      note.id === id ? { ...note, content } : note
    );
    setNotes(updatedNotes);
    saveToStorage(updatedNotes);
  };

  const updateNoteColor = (id: string, color: string) => {
    const updatedNotes = notes.map(note =>
      note.id === id ? { ...note, color } : note
    );
    setNotes(updatedNotes);
    saveToStorage(updatedNotes);
  };

  const updateNotePosition = (id: string, position: { x: number; y: number }) => {
    const updatedNotes = notes.map(note =>
      note.id === id ? { ...note, position } : note
    );
    setNotes(updatedNotes);
    saveToStorage(updatedNotes);
  };

  const toggleAlwaysOnTop = (id: string) => {
    const updatedNotes = notes.map(note =>
      note.id === id ? { ...note, alwaysOnTop: !note.alwaysOnTop } : note
    );
    setNotes(updatedNotes);
    saveToStorage(updatedNotes);
    const note = notes.find(n => n.id === id);
    toast.success(note?.alwaysOnTop ? 'Removed from always on top' : 'Set to always on top');
  };

  const getTextColor = (bgColor: string) => {
    // Always use dark text on these light pastel backgrounds for WCAG AAA compliance (7:1 contrast ratio)
    return 'hsl(0 0% 15%)'; // Very dark gray for excellent contrast on all pastel colors
  };

  const getToolsColor = (bgColor: string) => {
    // Use dark color for tools/timestamps for WCAG compliance
    return 'hsl(0 0% 25%)'; // Dark gray for good contrast
  };

  // Render individual note card
  const renderNoteCard = (note: StickyNote) => {
    const NoteCard = () => {
      const cardRef = useRef<HTMLDivElement>(null);
      const draggable = useDraggable(cardRef, {
        disabled: false,
        onDragEnd: (position) => updateNotePosition(note.id, position),
      });

      useEffect(() => {
        draggable.setPosition(note.position);
      }, []);

      return (
        <Card
          ref={cardRef}
          className={`absolute shadow-lg border-0 transition-all duration-200 hover:shadow-xl touch-manipulation ${
            note.alwaysOnTop ? 'z-30' : 'z-10'
          } w-56 sm:w-64 md:w-72 h-44 sm:h-48 md:h-52`}
          style={{ 
            backgroundColor: note.color,
            color: getTextColor(note.color),
            ...draggable.style,
          }}
        >
          <CardContent className="p-2 sm:p-3 h-full flex flex-col">
            <div className="flex justify-between items-start mb-1 sm:mb-2 drag-handle cursor-grab active:cursor-grabbing touch-manipulation">
              <div className="flex gap-0.5 sm:gap-1 items-center">
                <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 opacity-50" style={{ color: getToolsColor(note.color) }} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0 rounded-full hover:bg-black/10 transition-colors touch-manipulation"
                  style={{ color: getToolsColor(note.color) }}
                  onClick={() => {
                    const currentIndex = colors.indexOf(note.color);
                    const nextIndex = (currentIndex + 1) % colors.length;
                    updateNoteColor(note.id, colors[nextIndex]);
                  }}
                  aria-label="Change color"
                >
                  <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0 rounded-full hover:bg-black/10 transition-colors touch-manipulation"
                  style={{ color: getToolsColor(note.color) }}
                  onClick={() => toggleAlwaysOnTop(note.id)}
                  aria-label={note.alwaysOnTop ? "Unpin note" : "Pin note"}
                >
                  {note.alwaysOnTop ? <PinOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Pin className="h-3 w-3 sm:h-4 sm:w-4" />}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 sm:h-7 sm:w-7 p-0 rounded-full hover:bg-black/10 transition-colors touch-manipulation"
                style={{ color: getToolsColor(note.color) }}
                onClick={() => deleteNote(note.id)}
                aria-label="Delete note"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Write your note..."
              value={note.content}
              onChange={(e) => updateNoteContent(note.id, e.target.value)}
              className="flex-1 resize-none border-0 bg-transparent placeholder:opacity-60 focus:ring-0 focus-visible:ring-0 text-xs sm:text-sm md:text-base"
              style={{ color: getTextColor(note.color) }}
            />
            <div 
              className="text-[10px] sm:text-xs opacity-70 mt-1 sm:mt-2"
              style={{ color: getToolsColor(note.color) }}
            >
              {note.timestamp}
            </div>
          </CardContent>
        </Card>
      );
    };

    return <NoteCard key={note.id} />;
  };

  return (
    <div className="relative w-full h-full min-h-[400px] flex flex-col">
      {/* Notes canvas area */}
      <div className="relative flex-1 overflow-auto">
        {notes.length > 0 ? (
          <div className="relative min-h-full" style={{ minHeight: '500px', minWidth: '100%' }}>
            {notes.map(renderNoteCard)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-4">
            <div className="rounded-full bg-muted/50 p-4 mb-4">
              <Plus className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
            </div>
            <p className="text-base sm:text-lg font-medium text-muted-foreground mb-2">No sticky notes yet</p>
            <p className="text-xs sm:text-sm text-muted-foreground/70 max-w-xs">
              Click the + button to create your first note
            </p>
          </div>
        )}
      </div>

      {/* FAB button */}
      <Button
        onClick={addNote}
        className={`fixed ${isMobile ? 'bottom-20 right-4' : 'bottom-6 right-6'} rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-2xl z-40 touch-manipulation bg-primary hover:bg-primary/90 hover:scale-110 active:scale-95 transition-all duration-200`}
        aria-label="Add new sticky note"
      >
        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              This note contains text. Are you sure you want to delete it? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && confirmDelete(deleteConfirmId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};