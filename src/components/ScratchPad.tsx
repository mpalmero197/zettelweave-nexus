import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Save, FileText, Trash2, Chrome, Download, ExternalLink, RefreshCw, Cloud, Loader2, Users } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ShareDialog } from "./sharing/ShareDialog";

interface ScratchPadProps {
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
}

interface ScratchNote {
  id: string;
  content: string;
  timestamp: Date;
  synced?: boolean;
}

export const ScratchPad = ({ onCreateCard }: ScratchPadProps) => {
  const [content, setContent] = useState("");
  const [savedNotes, setSavedNotes] = useState<ScratchNote[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sharingNoteId, setSharingNoteId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { user } = useAuth();

  // Load notes from Supabase if logged in, else localStorage
  useEffect(() => {
    if (user) {
      loadNotesFromCloud();
    } else {
      loadNotesFromLocal();
    }
  }, [user]);

  // Subscribe to realtime changes for instant sync across devices
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('scratchpad-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scratchpad_notes',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNote: ScratchNote = {
              id: payload.new.id,
              content: payload.new.content,
              timestamp: new Date(payload.new.created_at),
              synced: true,
            };
            setSavedNotes((prev) => {
              // Avoid duplicates (from our own inserts)
              if (prev.some((n) => n.id === newNote.id)) return prev;
              return [newNote, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            setSavedNotes((prev) => prev.filter((n) => n.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setSavedNotes((prev) =>
              prev.map((n) =>
                n.id === payload.new.id
                  ? { ...n, content: payload.new.content, synced: true }
                  : n
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadNotesFromLocal = () => {
    try {
      const saved = localStorage.getItem("scratchpad:notes:v1");
      if (saved) {
        const parsedNotes = JSON.parse(saved);
        const notesWithDates = parsedNotes.map((note: any) => ({
          ...note,
          timestamp: new Date(note.timestamp),
          synced: false
        }));
        setSavedNotes(notesWithDates);
      }
    } catch (error) {
      console.error("Failed to load scratch notes:", error);
    }
  };

  const loadNotesFromCloud = async () => {
    if (!user) return;
    
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('scratchpad_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notes: ScratchNote[] = (data || []).map(note => ({
        id: note.id,
        content: note.content,
        timestamp: new Date(note.created_at),
        synced: true
      }));

      setSavedNotes(notes);
      
      // Also save to localStorage as backup
      localStorage.setItem("scratchpad:notes:v1", JSON.stringify(notes));
    } catch (error) {
      console.error("Failed to load notes from cloud:", error);
      // Fall back to localStorage
      loadNotesFromLocal();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    
    const newNote: ScratchNote = {
      id: crypto.randomUUID(),
      content,
      timestamp: new Date(),
      synced: false
    };

    // Optimistic update
    setSavedNotes(prev => [newNote, ...prev]);
    setContent("");
    
    if (user) {
      // Save to cloud
      try {
        const { data, error } = await supabase
          .from('scratchpad_notes')
          .insert({ user_id: user.id, content: newNote.content })
          .select()
          .single();

        if (error) throw error;

        // Update with cloud ID
        setSavedNotes(prev => prev.map(n => 
          n.id === newNote.id 
            ? { ...n, id: data.id, synced: true }
            : n
        ));
        toast.success("Note saved and synced");
      } catch (error) {
        console.error("Failed to sync note:", error);
        toast.error("Note saved locally, sync failed");
      }
    } else {
      // Save to localStorage only
      const updatedNotes = [newNote, ...savedNotes];
      localStorage.setItem("scratchpad:notes:v1", JSON.stringify(updatedNotes));
      toast.success("Note saved locally");
    }
  };

  const handleCreateCard = (noteContent?: string) => {
    const contentToUse = noteContent || content;
    if (!contentToUse.trim()) {
      toast.error("Cannot create card from empty content");
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
    toast.success("Created zettel card from scratch note");
    
    if (!noteContent) {
      setContent("");
    }
  };

  const handleDeleteNote = async (id: string) => {
    const noteToDelete = savedNotes.find(n => n.id === id);
    
    // Optimistic update
    setSavedNotes(prev => prev.filter(note => note.id !== id));
    
    if (user && noteToDelete?.synced) {
      // Delete from cloud
      try {
        const { error } = await supabase
          .from('scratchpad_notes')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (error) {
        console.error("Failed to delete from cloud:", error);
      }
    }
    
    // Update localStorage
    const updatedNotes = savedNotes.filter(note => note.id !== id);
    localStorage.setItem("scratchpad:notes:v1", JSON.stringify(updatedNotes));
    toast.success("Note deleted");
  };

  const handleDownloadExtension = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/pendragonx-chrome-extension.zip?t=${Date.now()}`);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "pendragonx-chrome-extension.zip";
      a.click();
      URL.revokeObjectURL(a.href);

      toast.success("Extension downloaded!", {
        description: "1. Unzip the file\n2. Go to chrome://extensions\n3. Enable Developer Mode\n4. Click 'Load unpacked'\n5. Select the unzipped folder",
        duration: 10000,
      });
    } catch (error) {
      console.error("Failed to generate extension ZIP:", error);
      toast.error("Failed to download extension");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSync = () => {
    if (user) {
      loadNotesFromCloud();
      toast.success("Syncing notes...");
    } else {
      toast.info("Sign in to sync notes across devices");
    }
  };

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Quick Scratch Pad
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="h-8 gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {user ? 'Sync' : 'Sign in to sync'}
            </Button>
          </div>
          {user && (
            <CardDescription className="text-xs flex items-center gap-1">
              <Cloud className="h-3 w-3" />
              Synced to your account
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Textarea
            placeholder="Jot down quick thoughts, ideas, or notes..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-24 resize-y"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!content.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </Button>
            <Button 
              variant="outline"
              size="sm"
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
        <div className="space-y-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            Saved Notes
            <span className="text-xs font-normal text-muted-foreground">
              ({savedNotes.length})
            </span>
          </h3>
          <div className="grid gap-2">
            {savedNotes.map((note) => (
              <Card key={note.id} className={`border-l-4 ${note.synced ? 'border-l-primary' : 'border-l-accent'}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        {note.timestamp.toLocaleString()}
                        {note.synced && <Cloud className="h-3 w-3" />}
                      </p>
                      <pre className="whitespace-pre-wrap text-sm font-mono line-clamp-3">
                        {note.content}
                      </pre>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateCard(note.content)}
                        title="Convert to Zettel Card"
                        className="h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Card
                      </Button>
                      {note.synced && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSharingNoteId(note.id)}
                          title="Share with friend"
                          className="h-7 w-7 p-0"
                        >
                          <Users className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteNote(note.id)}
                        title="Delete Note"
                        className="h-7 w-7 p-0"
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

      {/* Chrome Extension distribution moved to Admin → System → Chrome Extension */}

      {sharingNoteId && (
        <ShareDialog
          open={!!sharingNoteId}
          onOpenChange={(o) => !o && setSharingNoteId(null)}
          itemType="scratchpad"
          itemId={sharingNoteId}
          itemTitle="Scratchpad note"
        />
      )}
    </div>
  );
};
