import { useState, useEffect } from "react";
import Draggable from "react-draggable";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, ArrowRight, StickyNote, Save } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";

interface StickyNote {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  created: Date;
}

interface StickyNotesProps {
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
}

const stickyColors = [
  "#fef08a", // yellow
  "#fda4af", // pink
  "#a7f3d0", // green
  "#bfdbfe", // blue
  "#ddd6fe", // purple
  "#fed7aa", // orange
];

const STORAGE_KEY = "sticky-notes:v1";

export const StickyNotes = ({ onCreateCard }: StickyNotesProps) => {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [selectedColor, setSelectedColor] = useState(stickyColors[0]);

  // Load notes from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedNotes = JSON.parse(saved);
        // Convert date strings back to Date objects
        const notesWithDates = parsedNotes.map((note: any) => ({
          ...note,
          created: new Date(note.created)
        }));
        setNotes(notesWithDates);
      }
    } catch (error) {
      console.error("Failed to load sticky notes:", error);
    }
  }, []);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error("Failed to save sticky notes:", error);
    }
  }, [notes]);

  const addNote = () => {
    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      content: "New sticky note...",
      color: selectedColor,
      position: { 
        x: Math.random() * 300, 
        y: Math.random() * 200 
      },
      created: new Date()
    };
    
    setNotes(prev => [...prev, newNote]);
    toast("Sticky note added");
  };

  const updateNote = (id: string, content: string) => {
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, content } : note
    ));
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    toast("Sticky note deleted");
  };

  const convertToCard = (note: StickyNote) => {
    const lines = note.content.trim().split('\n').filter(line => line.trim());
    const title = lines[0]?.trim() || "Sticky Note";
    const content = lines.length > 1 ? lines.join('\n') : note.content;
    
    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: title.length > 80 ? title.substring(0, 80) + "..." : title,
      content: content,
      description: `Created from sticky note on ${note.created.toLocaleDateString()}`,
      category: "000", // General knowledge
      number: "",
      tags: ["sticky-note", "quick-idea", "brainstorm"],
      linkedCards: []
    };
    
    onCreateCard(newCard);
    deleteNote(note.id);
    toast("Converted sticky note to zettel card!");
  };

  const updatePosition = (id: string, position: { x: number; y: number }) => {
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, position } : note
    ));
  };

  const saveAllNotes = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      toast("All sticky notes saved!");
    } catch (error) {
      toast("Failed to save notes");
    }
  };

  const clearAllNotes = () => {
    if (notes.length === 0) return;
    
    if (confirm(`Are you sure you want to delete all ${notes.length} sticky notes?`)) {
      setNotes([]);
      toast("All sticky notes cleared");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              <h3 className="font-semibold">Sticky Notes Board</h3>
              <span className="text-sm text-muted-foreground">({notes.length} notes)</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Color:</span>
              <div className="flex gap-1">
                {stickyColors.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      selectedColor === color ? "border-primary scale-110" : "border-border hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
              
              <div className="flex gap-1 ml-2">
                <Button onClick={addNote} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Note
                </Button>
                <Button onClick={saveAllNotes} variant="outline" size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                {notes.length > 0 && (
                  <Button onClick={clearAllNotes} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div 
            className="relative border-2 border-dashed border-border rounded-lg min-h-96 overflow-hidden bg-gradient-to-br from-background to-accent/5"
            style={{ height: "600px" }}
          >
            {notes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <StickyNote className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-lg font-medium">No sticky notes yet</p>
                  <p className="text-sm">Click "Add Note" to start brainstorming with sticky notes</p>
                  <p className="text-xs mt-2">Notes are automatically saved and persist between sessions</p>
                </div>
              </div>
            )}
            
            {notes.map((note) => (
              <Draggable
                key={note.id}
                defaultPosition={note.position}
                onStop={(e, data) => updatePosition(note.id, { x: data.x, y: data.y })}
                bounds="parent"
                handle=".drag-handle"
              >
                <div
                  className="absolute w-52 h-52 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                  style={{ backgroundColor: note.color }}
                >
                  {/* Drag handle and controls */}
                  <div className="drag-handle flex justify-between items-center p-2 cursor-move bg-black/5 rounded-t-lg">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-black/10"
                        onClick={() => convertToCard(note)}
                        title="Convert to Zettel Card"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-black/60">
                        {note.created.toLocaleDateString()}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-black/10"
                        onClick={() => deleteNote(note.id)}
                        title="Delete Note"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Note content */}
                  <div className="p-3">
                    <Textarea
                      value={note.content}
                      onChange={(e) => updateNote(note.id, e.target.value)}
                      className="w-full h-36 resize-none border-none bg-transparent p-0 text-sm focus:ring-0 placeholder:text-black/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="Write your note here..."
                    />
                  </div>
                </div>
              </Draggable>
            ))}
          </div>
          
          <div className="text-sm text-muted-foreground mt-3 space-y-1">
            <p><strong>Tips:</strong></p>
            <p>• Drag notes around to organize your thoughts</p>
            <p>• Click the arrow (→) to convert a note to a permanent zettel card</p>
            <p>• Notes are automatically saved and will persist between sessions</p>
            <p>• Use different colors to categorize your ideas</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};