import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Plus, Trash2, Edit2, Search, X, Maximize2, Minimize2, Star, StarOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Document {
  id: string;
  title: string;
  preview: string;
  updatedAt: Date;
  emoji?: string;
  isFavorite: boolean;
}

export function DocumentsWidget() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setDocuments(data.map(doc => ({
          id: doc.id,
          title: doc.title,
          preview: doc.preview,
          updatedAt: new Date(doc.updated_at),
          emoji: doc.emoji || "📄",
          isFavorite: doc.is_favorite || false
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

  const toggleFavorite = async (id: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ is_favorite: !currentFavorite })
        .eq('id', id);

      if (error) throw error;

      await loadDocuments();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error("Failed to update favorite");
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDocs.length && filteredDocs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocs.map(doc => doc.id)));
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`Deleted ${selectedIds.size} document(s)`);
      setSelectedIds(new Set());
      await loadDocuments();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error("Failed to delete documents");
    }
  };

  const bulkToggleFavorite = async (markAsFavorite: boolean) => {
    if (selectedIds.size === 0) return;
    
    try {
      const { error } = await supabase
        .from('documents')
        .update({ is_favorite: markAsFavorite })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`Updated ${selectedIds.size} document(s)`);
      setSelectedIds(new Set());
      await loadDocuments();
    } catch (error) {
      console.error('Error bulk updating favorites:', error);
      toast.error("Failed to update favorites");
    }
  };

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Documents</h3>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCompact(!isCompact)}
            aria-label={isCompact ? "Expand view" : "Compact view"}
          >
            {isCompact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCreating(true)}
            aria-label="Add document"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-2 p-2 bg-accent/50 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex gap-1 ml-auto">
            <Button size="sm" variant="ghost" onClick={() => bulkToggleFavorite(true)} aria-label="Mark as favorite">
              <Star className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => bulkToggleFavorite(false)} aria-label="Remove from favorites">
              <StarOff className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={bulkDelete} className="text-destructive" aria-label="Delete selected">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} aria-label="Clear selection">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

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
            className="flex-1"
          />
          <Button size="sm" onClick={createDocument} className="h-10 w-10 p-0" aria-label="Create document">
            <Plus className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)} className="h-10 w-10 p-0" aria-label="Cancel">
            <FileText className="w-4 h-4" />
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        {filteredDocs.length > 0 && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <Checkbox
              checked={selectedIds.size === filteredDocs.length && filteredDocs.length > 0}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all"
            />
            <span className="text-xs text-muted-foreground">Select all</span>
          </div>
        )}
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
              className={`group rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
                isCompact ? 'p-2' : 'p-3'
              }`}
            >
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={selectedIds.has(doc.id)}
                  onCheckedChange={() => toggleSelection(doc.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                  aria-label={`Select ${doc.title}`}
                />
                <div className="flex-1 min-w-0 cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-2 ${isCompact ? 'mb-0' : 'mb-1'}`}>
                    {doc.emoji && <span className={isCompact ? 'text-base' : 'text-lg'}>{doc.emoji}</span>}
                    <h4 className={`font-medium truncate ${isCompact ? 'text-sm' : ''}`}>{doc.title}</h4>
                  </div>
                  {!isCompact && (
                    <>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {doc.preview}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.updatedAt.toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`${isCompact ? 'h-6 w-6' : 'h-8 w-8'} p-0 ${doc.isFavorite ? 'opacity-100' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(doc.id, doc.isFavorite);
                    }}
                    aria-label={doc.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star className={`${isCompact ? 'w-3 h-3' : 'w-3 h-3'} ${doc.isFavorite ? 'fill-primary text-primary' : ''}`} />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={isCompact ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0'} 
                    aria-label="Edit document"
                  >
                    <Edit2 className={isCompact ? 'w-3 h-3' : 'w-3 h-3'} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`${isCompact ? 'h-6 w-6' : 'h-8 w-8'} p-0 text-destructive`}
                    onClick={() => deleteDocument(doc.id)}
                    aria-label="Delete document"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
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