import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Save, Plus, Trash2, X, Pin, ChevronRight, ChevronLeft } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RightSidebarProps {
  onCreateCard: (
    card: Omit<ZettelCardType, "id" | "created" | "modified">
  ) => void;
}

interface ScratchNote {
  id: string;
  content: string;
  timestamp: Date;
}

interface StickyNote {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  timestamp: string;
  alwaysOnTop?: boolean;
}

const SCRATCH_STORAGE_KEY = "scratchpad:notes:v1";
const STICKY_STORAGE_KEY = "stickyNotes";

export function RightSidebar({ onCreateCard }: RightSidebarProps) {
  const [scratchContent, setScratchContent] = useState("");
  const [scratchNotes, setScratchNotes] = useState<ScratchNote[]>([]);
  const [pinnedNotes, setPinnedNotes] = useState<StickyNote[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load scratch notes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SCRATCH_STORAGE_KEY);
      if (saved) {
        const parsedNotes = JSON.parse(saved);
        const notesWithDates = parsedNotes.map((note: any) => ({
          ...note,
          timestamp: new Date(note.timestamp),
        }));
        setScratchNotes(notesWithDates);
      }
    } catch (error) {
      console.error("Failed to load scratch notes:", error);
    }
  }, []);

  // Load pinned sticky notes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STICKY_STORAGE_KEY);
      if (saved) {
        const allNotes = JSON.parse(saved);
        const pinned = allNotes.filter((note: StickyNote) => note.alwaysOnTop);
        setPinnedNotes(pinned);
      }
    } catch (error) {
      console.error("Failed to load sticky notes:", error);
    }
  }, []);

  // Listen for updates to sticky notes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem(STICKY_STORAGE_KEY);
        if (saved) {
          const allNotes = JSON.parse(saved);
          const pinned = allNotes.filter(
            (note: StickyNote) => note.alwaysOnTop
          );
          setPinnedNotes(pinned);
        }
      } catch (error) {
        console.error("Failed to update sticky notes:", error);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also check periodically for updates
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const saveScratchNote = () => {
    if (!scratchContent.trim()) return;

    const newNote: ScratchNote = {
      id: crypto.randomUUID(),
      content: scratchContent,
      timestamp: new Date(),
    };

    const updatedNotes = [newNote, ...scratchNotes];
    setScratchNotes(updatedNotes);
    localStorage.setItem(SCRATCH_STORAGE_KEY, JSON.stringify(updatedNotes));
    setScratchContent("");
    toast.success("Note saved to scratchpad");
  };

  const deleteScratchNote = (id: string) => {
    const updatedNotes = scratchNotes.filter((note) => note.id !== id);
    setScratchNotes(updatedNotes);
    localStorage.setItem(SCRATCH_STORAGE_KEY, JSON.stringify(updatedNotes));
    toast.success("Note deleted");
  };

  const createCardFromScratch = (content?: string) => {
    const contentToUse = content || scratchContent;
    if (!contentToUse.trim()) {
      toast.error("Cannot create card from empty content");
      return;
    }

    const lines = contentToUse.split("\n");
    const title = lines[0]?.trim() || "Scratch Note";

    const newCard: Omit<ZettelCardType, "id" | "created" | "modified"> = {
      title: title.length > 50 ? title.substring(0, 50) + "..." : title,
      content: contentToUse,
      description: "Created from scratch pad",
      category: "000",
      number: "",
      tags: ["scratch", "quick-note"],
      linkedCards: [],
    };

    onCreateCard(newCard);
    toast.success("Created zettel card from scratch note");

    if (!content) {
      setScratchContent("");
    }
  };

  const unpinStickyNote = (id: string) => {
    try {
      const saved = localStorage.getItem(STICKY_STORAGE_KEY);
      if (saved) {
        const allNotes = JSON.parse(saved);
        const updatedNotes = allNotes.map((note: StickyNote) =>
          note.id === id ? { ...note, alwaysOnTop: false } : note
        );
        localStorage.setItem(STICKY_STORAGE_KEY, JSON.stringify(updatedNotes));
        setPinnedNotes(
          updatedNotes.filter((note: StickyNote) => note.alwaysOnTop)
        );
        toast.success("Note unpinned");
      }
    } catch (error) {
      console.error("Failed to unpin note:", error);
    }
  };

  const getTextColor = (bgColor: string) => {
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 180 ? "#000000" : "#ffffff";
  };

  return (
    <>
      {/* Collapse/Expand Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "fixed top-20 z-50 shadow-lg transition-all duration-300",
          isCollapsed ? "right-4" : "right-[21rem]",
          "hidden md:flex"
        )}
        title={isCollapsed ? "Expand Scratchpad" : "Collapse Scratchpad"}
      >
        {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed right-0 top-16 h-[calc(100vh-4rem)] bg-card/95 backdrop-blur-md border-l border-border/50 shadow-lg z-[100] transition-all duration-300",
          isCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-80 opacity-100"
        )}
      >
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          {/* Scratchpad */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Scratchpad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Quick thoughts..."
                value={scratchContent}
                onChange={(e) => setScratchContent(e.target.value)}
                className="min-h-24 resize-none text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={saveScratchNote}
                  disabled={!scratchContent.trim()}
                  size="sm"
                  className="flex-1"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => createCardFromScratch()}
                  disabled={!scratchContent.trim()}
                  size="sm"
                  className="flex-1"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Card
                </Button>
              </div>

              {/* Saved scratch notes */}
              {scratchNotes.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Saved Notes
                  </p>
                  {scratchNotes.slice(0, 3).map((note) => (
                    <Card key={note.id} className="border-l-4 border-l-accent">
                      <CardContent className="pt-3 pb-2 px-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">
                              {note.timestamp.toLocaleTimeString()}
                            </p>
                            <p className="text-xs line-clamp-2 font-mono">
                              {note.content}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => createCardFromScratch(note.content)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteScratchNote(note.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pinned Sticky Notes */}
          {pinnedNotes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Pin className="h-4 w-4" />
                  Pinned Notes ({pinnedNotes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pinnedNotes.map((note) => (
                  <Card
                    key={note.id}
                    className="border-0 shadow-sm"
                    style={{ backgroundColor: note.color }}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <p
                          className="text-xs font-medium"
                          style={{ color: getTextColor(note.color) }}
                        >
                          {note.timestamp}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => unpinStickyNote(note.id)}
                          className="h-5 w-5 p-0 hover:bg-white/20"
                          style={{ color: getTextColor(note.color) }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p
                        className="text-sm whitespace-pre-wrap"
                        style={{ color: getTextColor(note.color) }}
                      >
                        {note.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
      </div>
    </>
  );
}
