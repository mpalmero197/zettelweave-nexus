import { useState, useEffect, useCallback } from "react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import Draggable from "react-draggable";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, ArrowRight, StickyNote, Save, Loader2 } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notifyContentCreated } from "@/lib/aliceFollowups";

interface StickyNoteData {
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
  "#fef08a", "#fda4af", "#a7f3d0", "#bfdbfe", "#ddd6fe", "#fed7aa",
];

// Helper to query the sticky_notes table (not yet in generated types)
const stickyTable = () => supabase.from('sticky_notes' as any);

export const StickyNotes = ({ onCreateCard }: StickyNotesProps) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<StickyNoteData[]>([]);
  const [selectedColor, setSelectedColor] = useState(stickyColors[0]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await stickyTable()
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setNotes((data as any[]).map((n: any) => ({
        id: n.id,
        content: n.content,
        color: n.color,
        position: { x: Number(n.position_x), y: Number(n.position_y) },
        created: new Date(n.created_at),
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  // Auto-refresh when sticky notes change on other devices/tabs
  useRealtimeSync('sticky_notes', {
    userId: user?.id,
    onChanged: loadNotes,
  });

  const addNote = async () => {
    if (!user) return;
    const pos = { x: Math.random() * 300, y: Math.random() * 200 };
    const { data, error } = await stickyTable()
      .insert({ user_id: user.id, content: 'New sticky note...', color: selectedColor, position_x: pos.x, position_y: pos.y } as any)
      .select()
      .single();
    if (!error && data) {
      const d = data as any;
      setNotes(prev => [...prev, {
        id: d.id, content: d.content, color: d.color,
        position: { x: Number(d.position_x), y: Number(d.position_y) },
        created: new Date(d.created_at),
      }]);
      toast("Sticky note added");
    }
  };

  const updateNote = async (id: string, content: string) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, content } : note));
    await stickyTable().update({ content, updated_at: new Date().toISOString() } as any).eq('id', id);
    // Once a sticky has real content (>20 chars), let ALICE consider follow-ups.
    // We fire only once per sticky per session via a window-level set.
    try {
      const w = window as any;
      w.__pendragonStickyFired = w.__pendragonStickyFired || new Set<string>();
      if (content.trim().length > 20 && !w.__pendragonStickyFired.has(id)) {
        w.__pendragonStickyFired.add(id);
        notifyContentCreated({ contentType: 'sticky_note', id, title: content.trim().slice(0, 60), content });
      }
    } catch { /* ignore */ }
  };

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    await stickyTable().delete().eq('id', id);
    toast("Sticky note deleted");
  };

  const convertToCard = (note: StickyNoteData) => {
    const lines = note.content.trim().split('\n').filter(line => line.trim());
    const title = lines[0]?.trim() || "Sticky Note";
    const content = lines.length > 1 ? lines.join('\n') : note.content;
    
    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: title.length > 80 ? title.substring(0, 80) + "..." : title,
      content,
      description: `Created from sticky note on ${note.created.toLocaleDateString()}`,
      category: "000",
      number: "",
      tags: ["sticky-note", "quick-idea", "brainstorm"],
      linkedCards: []
    };
    
    onCreateCard(newCard);
    deleteNote(note.id);
    toast("Converted sticky note to zettel card!");
  };

  const updatePosition = (id: string, position: { x: number; y: number }) => {
    setNotes(prev => prev.map(note => note.id === id ? { ...note, position } : note));
    stickyTable().update({ position_x: position.x, position_y: position.y } as any).eq('id', id);
  };

  const clearAllNotes = async () => {
    if (notes.length === 0 || !user) return;
    if (confirm(`Are you sure you want to delete all ${notes.length} sticky notes?`)) {
      await stickyTable().delete().eq('user_id', user.id);
      setNotes([]);
      toast("All sticky notes cleared");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                  <p className="text-sm">Click "Add Note" to start brainstorming</p>
                  <p className="text-xs mt-2">Notes are saved to the cloud and sync across devices</p>
                </div>
              </div>
            )}
            
            {notes.map((note) => (
              <Draggable
                key={note.id}
                defaultPosition={note.position}
                onStop={(_e, data) => updatePosition(note.id, { x: data.x, y: data.y })}
                bounds="parent"
                handle=".drag-handle"
              >
                <div
                  className="absolute w-52 h-52 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                  style={{ backgroundColor: note.color }}
                >
                  <div className="drag-handle flex justify-between items-center p-2 cursor-move rounded-t-lg" style={{ background: 'rgba(0,0,0,0.05)' }}>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                        onClick={() => convertToCard(note)} title="Convert to Zettel Card">
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium" style={{ color: 'rgba(0,0,0,0.7)' }}>
                        {note.created.toLocaleDateString()}
                      </span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                        onClick={() => deleteNote(note.id)} title="Delete Note">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <Textarea
                      value={note.content}
                      onChange={(e) => updateNote(note.id, e.target.value)}
                      className="w-full h-36 resize-none border-none bg-transparent p-0 text-sm focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      style={{ color: 'rgba(0,0,0,0.85)' }}
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
            <p>• Notes are saved to the cloud and sync across all your devices</p>
            <p>• Use different colors to categorize your ideas</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
