import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StickyNote, Edit3, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CustomNote {
  id: string;
  title: string;
  content: string;
  color: string;
  created_at: string;
  updated_at: string;
}

const noteColors = [
  'hsl(var(--card))',
  'hsl(var(--muted))',
  'hsl(var(--accent))',
  'hsl(var(--secondary))',
  'hsl(var(--card))',
  'hsl(var(--muted))',
];

export function CustomNoteWidget() {
  const [notes, setNotes] = useState<CustomNote[]>([]);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editedNote, setEditedNote] = useState<Partial<CustomNote>>({});
  const [newNote, setNewNote] = useState({ title: '', content: '', color: noteColors[0] });

  useEffect(() => {
    // Load notes from localStorage
    const savedNotes = localStorage.getItem('customWidgetNotes');
    if (savedNotes) {
      try {
        const parsedNotes = JSON.parse(savedNotes);
        setNotes(parsedNotes);
      } catch (error) {
        console.error('Error loading saved notes:', error);
      }
    } else {
      // Create a default note
      const defaultNote: CustomNote = {
        id: '1',
        title: 'Welcome Note',
        content: 'This is your custom note widget. Click edit to customize it or create new notes!',
        color: noteColors[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setNotes([defaultNote]);
      localStorage.setItem('customWidgetNotes', JSON.stringify([defaultNote]));
    }
  }, []);

  const saveNotes = (updatedNotes: CustomNote[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('customWidgetNotes', JSON.stringify(updatedNotes));
  };

  const handleEdit = () => {
    if (notes.length > 0) {
      setEditedNote(notes[currentNoteIndex]);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (editedNote.title && editedNote.content) {
      const updatedNotes = [...notes];
      updatedNotes[currentNoteIndex] = {
        ...updatedNotes[currentNoteIndex],
        ...editedNote,
        updated_at: new Date().toISOString(),
      };
      saveNotes(updatedNotes);
      setIsEditing(false);
      setEditedNote({});
      toast.success('Note saved successfully!');
    }
  };

  const handleCreateNote = () => {
    if (newNote.title && newNote.content) {
      const note: CustomNote = {
        id: Date.now().toString(),
        title: newNote.title,
        content: newNote.content,
        color: newNote.color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const updatedNotes = [...notes, note];
      saveNotes(updatedNotes);
      setCurrentNoteIndex(updatedNotes.length - 1);
      setNewNote({ title: '', content: '', color: noteColors[0] });
      setShowCreateDialog(false);
      toast.success('Note created successfully!');
    }
  };

  const currentNote = notes[currentNoteIndex];

  if (!currentNote) {
    return (
      <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="text-center">
            <StickyNote className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-2">No notes yet</p>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-3 w-3 mr-1" />
                  Create Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Custom Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Note title"
                    value={newNote.title}
                    onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Note content"
                    value={newNote.content}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color</label>
                    <div className="flex gap-2">
                      {noteColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewNote(prev => ({ ...prev, color }))}
                          className={`w-8 h-8 rounded-full border-2 ${
                            newNote.color === color ? 'border-foreground' : 'border-border'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateNote} disabled={!newNote.title || !newNote.content}>
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border border-border/50 shadow-sm bg-card text-card-foreground">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm text-foreground">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-foreground" />
            {isEditing ? (
              <Input
                value={editedNote.title || ''}
                onChange={(e) => setEditedNote(prev => ({ ...prev, title: e.target.value }))}
                className="h-6 text-sm bg-transparent border-none p-0 font-semibold text-foreground"
              />
            ) : (
              <span className="truncate text-foreground">{currentNote.title}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notes.length > 1 && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentNoteIndex((prev) => (prev - 1 + notes.length) % notes.length)}
                  className="h-6 w-6 p-0 text-xs"
                >
                  ←
                </Button>
                <span className="text-xs self-center">{currentNoteIndex + 1}/{notes.length}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentNoteIndex((prev) => (prev + 1) % notes.length)}
                  className="h-6 w-6 p-0 text-xs"
                >
                  →
                </Button>
              </div>
            )}
            {isEditing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                className="h-6 w-6 p-0"
              >
                <Save className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-6 w-6 p-0"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Custom Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Note title"
                    value={newNote.title}
                    onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Note content"
                    value={newNote.content}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color</label>
                    <div className="flex gap-2">
                      {noteColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewNote(prev => ({ ...prev, color }))}
                          className={`w-8 h-8 rounded-full border-2 ${
                            newNote.color === color ? 'border-foreground' : 'border-border'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateNote} disabled={!newNote.title || !newNote.content}>
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isEditing ? (
          <Textarea
            value={editedNote.content || ''}
            onChange={(e) => setEditedNote(prev => ({ ...prev, content: e.target.value }))}
            className="min-h-[100px] bg-transparent border-none p-0 resize-none text-sm text-foreground"
            placeholder="Write your note content..."
          />
        ) : (
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
            {currentNote.content}
          </div>
        )}
      </CardContent>
    </Card>
  );
}