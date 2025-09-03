import { useState } from "react";
import Draggable from "react-draggable";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, ArrowRight, StickyNote } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";

interface StickyNote {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
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

export const StickyNotes = ({ onCreateCard }: StickyNotesProps) => {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [selectedColor, setSelectedColor] = useState(stickyColors[0]);

  const addNote = () => {
    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      content: "New sticky note...",
      color: selectedColor,
      position: { 
        x: Math.random() * 300, 
        y: Math.random() * 200 
      }
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
    const lines = note.content.split('\n');
    const title = lines[0]?.trim() || "Sticky Note";
    
    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: title.length > 50 ? title.substring(0, 50) + "..." : title,
      content: note.content,
      description: "Converted from sticky note",
      category: "000",
      number: "",
      tags: ["sticky-note", "quick-idea"],
      linkedCards: []
    };
    
    onCreateCard(newCard);
    deleteNote(note.id);
    toast("Converted sticky note to zettel card");
  };

  const updatePosition = (id: string, position: { x: number; y: number }) => {
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, position } : note
    ));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              <h3 className="font-semibold">Sticky Notes Board</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Color:</span>
              <div className="flex gap-1">
                {stickyColors.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 ${
                      selectedColor === color ? "border-primary" : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
              
              <Button onClick={addNote} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </div>
          </div>
          
          <div 
            className="relative border-2 border-dashed border-border rounded-lg min-h-96 overflow-hidden"
            style={{ height: "500px" }}
          >
            {notes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <StickyNote className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Click "Add Note" to start brainstorming with sticky notes</p>
                </div>
              </div>
            )}
            
            {notes.map((note) => (
              <Draggable
                key={note.id}
                defaultPosition={note.position}
                onStop={(e, data) => updatePosition(note.id, { x: data.x, y: data.y })}
                bounds="parent"
              >
                <div
                  className="absolute w-48 h-48 p-3 rounded-lg shadow-lg cursor-move select-none"
                  style={{ backgroundColor: note.color }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-black/10"
                        onClick={() => convertToCard(note)}
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-black/10"
                      onClick={() => deleteNote(note.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <Textarea
                    value={note.content}
                    onChange={(e) => updateNote(note.id, e.target.value)}
                    className="w-full h-32 resize-none border-none bg-transparent p-0 text-sm focus:ring-0 placeholder:text-black/50"
                    placeholder="Write your note here..."
                  />
                </div>
              </Draggable>
            ))}
          </div>
          
          <p className="text-sm text-muted-foreground mt-2">
            Drag sticky notes around to organize your thoughts. 
            Click the arrow to convert a note to a zettel card.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};