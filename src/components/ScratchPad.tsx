import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Save, FileText } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";

interface ScratchPadProps {
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
}

export const ScratchPad = ({ onCreateCard }: ScratchPadProps) => {
  const [content, setContent] = useState("");
  const [savedNotes, setSavedNotes] = useState<{ id: string; content: string; timestamp: Date }[]>([]);

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

  const handleCreateCard = (noteContent: string) => {
    const lines = noteContent.split('\n');
    const title = lines[0]?.trim() || "Scratch Note";
    
    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: title.length > 50 ? title.substring(0, 50) + "..." : title,
      content: noteContent,
      description: "Created from scratch pad",
      category: "000",
      number: "",
      tags: ["scratch", "quick-note"],
      linkedCards: []
    };
    
    onCreateCard(newCard);
    toast("Created zettel card from scratch note");
  };

  const handleDeleteNote = (id: string) => {
    setSavedNotes(prev => prev.filter(note => note.id !== id));
    toast("Note deleted");
  };

  return (
    <div className="space-y-6">
      <Card>
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
            className="min-h-32 resize-none"
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
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Saved Notes</h3>
          <div className="grid gap-3">
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
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        ×
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