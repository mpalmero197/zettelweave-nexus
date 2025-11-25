import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Trash2, Edit2, Search } from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: string;
  title: string;
  preview: string;
  updatedAt: Date;
  emoji?: string;
}

export function DocumentsWidget() {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      title: "Getting Started",
      preview: "Welcome to your workspace. Start organizing your thoughts...",
      updatedAt: new Date(),
      emoji: "📝"
    },
    {
      id: "2",
      title: "Project Planning",
      preview: "Key milestones and deliverables for Q1...",
      updatedAt: new Date(Date.now() - 86400000),
      emoji: "📋"
    }
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createDocument = () => {
    if (!newTitle.trim()) return;
    
    const newDoc: Document = {
      id: Date.now().toString(),
      title: newTitle,
      preview: "Start writing...",
      updatedAt: new Date(),
      emoji: "📄"
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    setNewTitle("");
    setIsCreating(false);
    toast.success("Document created");
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    toast.success("Document deleted");
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
          {filteredDocs.map((doc) => (
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
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}