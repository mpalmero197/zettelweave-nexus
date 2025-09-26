import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
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
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 180 ? '#000000' : '#ffffff';
  };

  const getToolsColor = (bgColor: string) => {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 150 ? '#333333' : '#ffffff';
  };

  return (
    <>
      <div className="relative w-full h-full">
        {notes.map((note) => (
          <Draggable
            key={note.id}
            defaultPosition={note.position}
            onStop={(_, data) => updateNotePosition(note.id, { x: data.x, y: data.y })}
            nodeRef={nodeRef}
          >
            <Card
              ref={nodeRef}
              className={`absolute w-64 h-48 shadow-lg cursor-move border-0 transition-all duration-200 hover:shadow-xl ${
                note.alwaysOnTop ? 'z-50' : 'z-10'
              }`}
              style={{ 
                backgroundColor: note.color,
                color: getTextColor(note.color)
              }}
            >
              <CardContent className="p-3 h-full flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 rounded-full hover:bg-white/20 transition-colors"
                      style={{ color: getToolsColor(note.color) }}
                      onClick={() => {
                        const currentIndex = colors.indexOf(note.color);
                        const nextIndex = (currentIndex + 1) % colors.length;
                        updateNoteColor(note.id, colors[nextIndex]);
                      }}
                      title="Change color"
                    >
                      <Palette className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 rounded-full hover:bg-white/20 transition-colors"
                      style={{ color: getToolsColor(note.color) }}
                      onClick={() => toggleAlwaysOnTop(note.id)}
                      title={note.alwaysOnTop ? "Remove from always on top" : "Keep always on top"}
                    >
                      {note.alwaysOnTop ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full hover:bg-white/20 transition-colors"
                    style={{ color: getToolsColor(note.color) }}
                    onClick={() => deleteNote(note.id)}
                    title="Delete note"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Write your note..."
                  value={note.content}
                  onChange={(e) => updateNoteContent(note.id, e.target.value)}
                  className="flex-1 resize-none border-0 bg-transparent placeholder:opacity-60 focus:ring-0 text-sm"
                  style={{ color: getTextColor(note.color) }}
                />
                <div 
                  className="text-xs opacity-70 mt-2"
                  style={{ color: getToolsColor(note.color) }}
                >
                  {note.timestamp}
                </div>
              </CardContent>
            </Card>
          </Draggable>
        ))}

        <Button
          onClick={addNote}
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

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
    </>
  );
};