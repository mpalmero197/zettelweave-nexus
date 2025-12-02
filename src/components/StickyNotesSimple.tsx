import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { X, Plus, Palette, Pin, PinOff } from 'lucide-react';
import { toast } from 'sonner';

interface StickyNote {
  id: string;
  content: string;
  color: string;
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const toggleAlwaysOnTop = (id: string) => {
    const updatedNotes = notes.map(note =>
      note.id === id ? { ...note, alwaysOnTop: !note.alwaysOnTop } : note
    );
    setNotes(updatedNotes);
    saveToStorage(updatedNotes);
    const note = notes.find(n => n.id === id);
    toast.success(note?.alwaysOnTop ? 'Unpinned' : 'Pinned');
  };

  // Sort notes - pinned first
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.alwaysOnTop && !b.alwaysOnTop) return -1;
    if (!a.alwaysOnTop && b.alwaysOnTop) return 1;
    return 0;
  });

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sticky Notes</h1>
          <p className="text-sm text-muted-foreground">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={addNote} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Note</span>
        </Button>
      </div>

      {/* Notes grid */}
      {notes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sortedNotes.map((note) => (
            <Card
              key={note.id}
              className={`shadow-md border-0 transition-all duration-200 hover:shadow-lg ${
                note.alwaysOnTop ? 'ring-2 ring-primary/50' : ''
              }`}
              style={{ backgroundColor: note.color }}
            >
              <CardContent className="p-3 h-36 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 rounded-full hover:bg-black/10"
                      style={{ color: 'hsl(0 0% 25%)' }}
                      onClick={() => {
                        const currentIndex = colors.indexOf(note.color);
                        const nextIndex = (currentIndex + 1) % colors.length;
                        updateNoteColor(note.id, colors[nextIndex]);
                      }}
                      aria-label="Change color"
                    >
                      <Palette className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 rounded-full hover:bg-black/10"
                      style={{ color: 'hsl(0 0% 25%)' }}
                      onClick={() => toggleAlwaysOnTop(note.id)}
                      aria-label={note.alwaysOnTop ? "Unpin" : "Pin"}
                    >
                      {note.alwaysOnTop ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full hover:bg-black/10"
                    style={{ color: 'hsl(0 0% 25%)' }}
                    onClick={() => deleteNote(note.id)}
                    aria-label="Delete note"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Write your note..."
                  value={note.content}
                  onChange={(e) => updateNoteContent(note.id, e.target.value)}
                  className="flex-1 resize-none border-0 bg-transparent placeholder:opacity-50 focus:ring-0 focus-visible:ring-0 text-sm p-0"
                  style={{ color: 'hsl(0 0% 15%)' }}
                />
                <div 
                  className="text-[10px] opacity-60 mt-1"
                  style={{ color: 'hsl(0 0% 25%)' }}
                >
                  {note.timestamp}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Plus className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">No sticky notes yet</p>
          <p className="text-xs text-muted-foreground/70">Click "Add Note" to create one</p>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              This note contains text. Are you sure you want to delete it?
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
