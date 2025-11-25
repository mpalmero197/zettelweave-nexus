import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Trash2, Edit2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Document {
  id: string;
  title: string;
  preview: string;
  updatedAt: Date;
  emoji?: string;
}

export function DocumentsWidget() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setDocuments(data.map(doc => ({
          id: doc.id,
          title: doc.title,
          preview: doc.preview,
          updatedAt: new Date(doc.updated_at),
          emoji: doc.emoji || "📄"
        })));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createDocument = async () => {
    if (!newTitle.trim() || !user) return;
    
    try {
      const { error } = await supabase
        .from('documents')
        .insert([{
          user_id: user.id,
          title: newTitle,
          preview: "Start writing...",
          emoji: "📄"
        }]);

      if (error) throw error;

      setNewTitle("");
      setIsCreating(false);
      toast.success("Document created");
      await loadDocuments();
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error("Failed to create document");
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Document deleted");
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error("Failed to delete document");
    }
  };

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Documents</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isCreating && (
        <div className="mb-4 flex gap-2">
          <Input
            placeholder="Document title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createDocument()}
            autoFocus
          />
          <Button size="sm" onClick={createDocument}>Create</Button>
          <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No documents found" : "No documents yet"}
            </div>
          ) : (
            filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="group p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {doc.emoji && <span className="text-lg">{doc.emoji}</span>}
                    <h4 className="font-medium truncate">{doc.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {doc.preview}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {doc.updatedAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={() => deleteDocument(doc.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}