import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Save, FileText, Trash2 } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";

interface ScratchPadProps {
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
}

const STORAGE_KEY = "scratchpad:notes:v1";

export const ScratchPad = ({ onCreateCard }: ScratchPadProps) => {
  const [content, setContent] = useState("");
  const [savedNotes, setSavedNotes] = useState<{ id: string; content: string; timestamp: Date }[]>([]);

  // Load notes from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedNotes = JSON.parse(saved);
        const notesWithDates = parsedNotes.map((note: any) => ({
          ...note,
          timestamp: new Date(note.timestamp)
        }));
        setSavedNotes(notesWithDates);
      }
    } catch (error) {
      console.error("Failed to load scratch notes:", error);
    }
  }, []);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedNotes));
    } catch (error) {
      console.error("Failed to save scratch notes:", error);
    }
  }, [savedNotes]);

  const handleSave = () => {
    if (!content.trim()) return;
    
    const newNote = {
      id: crypto.randomUUID(),
      content,
      timestamp: new Date()
    };
    
    setSavedNotes(prev => [newNote, ...prev]);
    setContent("");
    toast("Note saved to scratch pad");
  };

  const handleCreateCard = (noteContent?: string) => {
    const contentToUse = noteContent || content;
    if (!contentToUse.trim()) {
      toast("Cannot create card from empty content");
      return;
    }
    
    const lines = contentToUse.split('\n');
    const title = lines[0]?.trim() || "Scratch Note";
    
    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: title.length > 50 ? title.substring(0, 50) + "..." : title,
      content: contentToUse,
      description: "Created from scratch pad",
      category: "000",
      number: "",
      tags: ["scratch", "quick-note"],
      linkedCards: []
    };
    
    onCreateCard(newCard);
    toast("Created zettel card from scratch note");
    
    // Clear current content if creating from current input
    if (!noteContent) {
      setContent("");
    }
  };

  const handleDeleteNote = (id: string) => {
    setSavedNotes(prev => prev.filter(note => note.id !== id));
    toast("Note deleted");
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <Card className="flex-shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quick Scratch Pad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Jot down quick thoughts, ideas, or notes..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-32 resize-y"
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!content.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleCreateCard(content)} 
              disabled={!content.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Zettel Card
            </Button>
          </div>
        </CardContent>
      </Card>

      {savedNotes.length > 0 && (
        <div className="space-y-4 flex-1 overflow-y-auto">
          <h3 className="text-lg font-semibold">Saved Notes</h3>
          <div className="grid gap-3 pb-4">
            {savedNotes.map((note) => (
              <Card key={note.id} className="border-l-4 border-l-accent">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">
                        {note.timestamp.toLocaleString()}
                      </p>
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {note.content}
                      </pre>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateCard(note.content)}
                        title="Convert to Zettel Card"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Card
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteNote(note.id)}
                        title="Delete Note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};