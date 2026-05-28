import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Plus,
  Save,
  X,
  Trash2,
  Move,
  Palette,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Type,
  CheckSquare,
  Bell,
} from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";
import Draggable from "react-draggable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";


interface StickyNote {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  created: Date;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline' | 'line-through';
  backgroundColor: string;
  textColor: string;
}

interface StickyNotesEnhancedProps {
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
  isFloating?: boolean;
}

const colors = [
  { name: "Yellow", bg: "bg-yellow-200", text: "text-yellow-900", value: "#fef3c7" },
  { name: "Pink", bg: "bg-pink-200", text: "text-pink-900", value: "#fce7f3" },
  { name: "Blue", bg: "bg-blue-200", text: "text-blue-900", value: "#dbeafe" },
  { name: "Green", bg: "bg-green-200", text: "text-green-900", value: "#d1fae5" },
  { name: "Purple", bg: "bg-purple-200", text: "text-purple-900", value: "#e9d5ff" },
  { name: "Orange", bg: "bg-orange-200", text: "text-orange-900", value: "#fed7aa" }
];

const textColors = [
  { name: "Dark", value: "#374151" },
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#dc2626" },
  { name: "Blue", value: "#2563eb" },
  { name: "Green", value: "#16a34a" },
  { name: "Purple", value: "#9333ea" }
];

const STORAGE_KEY = "enhanced-sticky-notes:v1";

export const StickyNotesEnhanced = ({ onCreateCard, isFloating = false }: StickyNotesEnhancedProps) => {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const { user } = useAuth();

  const convertToTask = async (note: StickyNote, kind: 'task' | 'reminder') => {
    if (!user) {
      toast.error("Sign in to convert sticky notes into tasks");
      return;
    }
    const lines = note.content.split('\n').filter(Boolean);
    const title = (lines[0] || 'Sticky reminder').slice(0, 120);
    const notesBody = lines.slice(1).join('\n') || (kind === 'reminder' ? 'Reminder from sticky note' : 'From sticky note');
    try {
      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: kind === 'reminder' ? `🔔 ${title}` : title,
        notes: notesBody,
        estimated_time: 15,
        list: 'inbox',
      });
      if (error) throw error;
      toast.success(kind === 'reminder' ? 'Reminder added to Tasks' : 'Task created — find it in Tasks');
    } catch (e) {
      console.error(e);
      toast.error('Failed to create task');
    }
  };


  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedNotes = JSON.parse(saved);
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error("Failed to save sticky notes:", error);
    }
  }, [notes]);

  const addNote = () => {
    const randomPosition = {
      x: Math.random() * (window.innerWidth - 300),
      y: Math.random() * (window.innerHeight - 300)
    };

    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      content: "",
      color: selectedColor.value,
      position: randomPosition,
      created: new Date(),
      fontSize: 14,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      backgroundColor: selectedColor.value,
      textColor: textColors[0].value
    };

    setNotes(prev => [...prev, newNote]);
    toast("New sticky note created");
  };

  const updateNote = (id: string, content: string) => {
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, content } : note
    ));
  };

  const updateNoteStyle = (id: string, style: Partial<StickyNote>) => {
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, ...style } : note
    ));
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    toast("Sticky note deleted");
  };

  const convertToCard = (note: StickyNote) => {
    const lines = note.content.split('\n');
    const title = lines[0]?.trim() || `Sticky Note - ${note.created.toLocaleDateString()}`;
    
    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: title.length > 50 ? title.substring(0, 50) + "..." : title,
      content: note.content,
      description: "Created from sticky note",
      category: "000",
      number: "",
      tags: ["sticky", "quick-note"],
      linkedCards: []
    };

    onCreateCard(newCard);
    toast("Created zettel card from sticky note");
  };

  const updatePosition = (id: string, position: { x: number; y: number }) => {
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, position } : note
    ));
  };

  const clearAllNotes = () => {
    if (confirm(`Are you sure you want to delete all ${notes.length} sticky notes?`)) {
      setNotes([]);
      toast("All sticky notes cleared");
    }
  };

  const containerClass = isFloating 
    ? "fixed inset-0 pointer-events-none z-50" 
    : "space-y-4";

  return (
    <div className={containerClass}>
      {!isFloating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Enhanced Sticky Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Note Color:</span>
              {colors.map((color) => (
                <button
                  key={color.name}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    selectedColor.name === color.name ? "border-primary ring-2 ring-primary/20" : "border-border"
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColor(color)}
                  title={color.name}
                />
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={addNote}>
                <Plus className="h-4 w-4 mr-2" />
                Add Sticky Note
              </Button>
              <Button variant="outline" onClick={clearAllNotes} disabled={notes.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All ({notes.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sticky Notes */}
      {notes.map((note) => (
        <Draggable
          key={note.id}
          defaultPosition={note.position}
          onStop={(e, data) => updatePosition(note.id, { x: data.x, y: data.y })}
          handle=".drag-handle"
          bounds={isFloating ? "parent" : undefined}
          disabled={window.innerWidth < 768} // Disable dragging on mobile
        >
          <div 
            className={`${isFloating ? 'absolute pointer-events-auto' : 'relative'} w-64 shadow-lg rounded-lg border border-border/50 transition-all hover:shadow-xl resize-none overflow-hidden`}
            style={{ 
              backgroundColor: note.backgroundColor,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {/* Drag handle and controls */}
            <div className="drag-handle flex items-center justify-between p-2 bg-black/10 cursor-move border-b border-border/20" style={{ 
              backgroundColor: `rgba(0, 0, 0, 0.1)`,
              color: note.textColor
            }}>
              <div className="flex items-center gap-1">
                <Move className="h-3 w-3" style={{ color: note.textColor }} />
                <Badge variant="outline" className="text-xs px-1 py-0" style={{ 
                  borderColor: note.textColor, 
                  color: note.textColor,
                  backgroundColor: 'transparent'
                }}>
                  {note.created.toLocaleDateString()}
                </Badge>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Text formatting controls */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Type className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="p-2 space-y-2">
                      <div className="flex gap-1">
                        <Button
                          variant={note.fontWeight === 'bold' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateNoteStyle(note.id, { 
                            fontWeight: note.fontWeight === 'bold' ? 'normal' : 'bold' 
                          })}
                        >
                          <Bold className="h-3 w-3" />
                        </Button>
                        <Button
                          variant={note.fontStyle === 'italic' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateNoteStyle(note.id, { 
                            fontStyle: note.fontStyle === 'italic' ? 'normal' : 'italic' 
                          })}
                        >
                          <Italic className="h-3 w-3" />
                        </Button>
                        <Button
                          variant={note.textDecoration === 'underline' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateNoteStyle(note.id, { 
                            textDecoration: note.textDecoration === 'underline' ? 'none' : 'underline' 
                          })}
                        >
                          <Underline className="h-3 w-3" />
                        </Button>
                        <Button
                          variant={note.textDecoration === 'line-through' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateNoteStyle(note.id, { 
                            textDecoration: note.textDecoration === 'line-through' ? 'none' : 'line-through' 
                          })}
                        >
                          <Strikethrough className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs font-medium">Text Color</div>
                        <div className="flex gap-1">
                          {textColors.map((color) => (
                            <button
                              key={color.name}
                              className={`w-5 h-5 rounded border ${
                                note.textColor === color.value ? "ring-1 ring-primary" : ""
                              }`}
                              style={{ backgroundColor: color.value }}
                              onClick={() => updateNoteStyle(note.id, { textColor: color.value })}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs font-medium">Background</div>
                        <div className="flex gap-1">
                          {colors.map((color) => (
                            <button
                              key={color.name}
                              className={`w-5 h-5 rounded border ${
                                note.backgroundColor === color.value ? "ring-1 ring-primary" : ""
                              }`}
                              style={{ backgroundColor: color.value }}
                              onClick={() => updateNoteStyle(note.id, { backgroundColor: color.value })}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => convertToCard(note)}
                  title="Convert to Zettel Card"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => deleteNote(note.id)}
                  title="Delete Note"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Note content */}
            <Textarea
              value={note.content}
              onChange={(e) => updateNote(note.id, e.target.value)}
              placeholder="Write your note..."
              className="min-h-32 border-none bg-transparent resize-none focus:ring-0 focus:outline-none text-sm"
              style={{
                color: note.textColor,
                fontSize: `${note.fontSize}px`,
                fontWeight: note.fontWeight,
                fontStyle: note.fontStyle,
                textDecoration: note.textDecoration
              }}
            />
          </div>
        </Draggable>
      ))}

      {!isFloating && notes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Palette className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No sticky notes yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create your first sticky note to jot down quick thoughts and reminders.
            </p>
            <Button onClick={addNote}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Note
            </Button>
          </CardContent>
        </Card>
      )}

      {!isFloating && notes.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-2">
                <strong>{notes.length}</strong> sticky note{notes.length !== 1 ? 's' : ''} created
              </p>
              <p className="text-xs">
                💡 <strong>Tip:</strong> Drag notes around to organize them. Use the formatting tools for better visibility.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StickyNotesEnhanced;