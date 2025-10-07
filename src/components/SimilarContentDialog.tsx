import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Calendar, Type } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface SimilarItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  similarity: number;
}

interface SimilarContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentItem: {
    id: string;
    title: string;
    content: string;
    created_at: string;
    type: 'zettel_card' | 'note';
  };
  similarItems: SimilarItem[];
  onMerge: (sourceId: string, destinationId: string, mergedContent: string) => Promise<void>;
}

export const SimilarContentDialog = ({
  open,
  onOpenChange,
  currentItem,
  similarItems,
  onMerge,
}: SimilarContentDialogProps) => {
  const [merging, setMerging] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SimilarItem | null>(
    similarItems.length > 0 ? similarItems[0] : null
  );

  const wordCount = (text: string) => text.trim().split(/\s+/).length;

  const handleMerge = async (sourceItem: SimilarItem) => {
    if (!sourceItem) return;

    setMerging(true);
    try {
      const contentTypeName = currentItem.type === 'zettel_card' ? 'Zettel Card' : 'Note';
      const mergedContent = `${currentItem.content}\n\n--- Added from: "${sourceItem.title}" (${contentTypeName}) ---\n\n${sourceItem.content}`;

      await onMerge(sourceItem.id, currentItem.id, mergedContent);
      
      toast.success("Content merged successfully");
      onOpenChange(false);
    } catch (error) {
      console.error('Error merging content:', error);
      toast.error("Failed to merge content");
    } finally {
      setMerging(false);
    }
  };

  if (!selectedItem && similarItems.length > 0) {
    setSelectedItem(similarItems[0]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto glass-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl">Similar Content Found</DialogTitle>
          <DialogDescription>
            Review and merge similar content to consolidate your knowledge base
          </DialogDescription>
        </DialogHeader>

        {similarItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No similar content found
          </div>
        ) : (
          <div className="space-y-4">
            {/* Similar items selector */}
            {similarItems.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {similarItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={selectedItem?.id === item.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedItem(item)}
                    className="text-xs"
                  >
                    {item.title} ({Math.round(item.similarity * 100)}%)
                  </Button>
                ))}
              </div>
            )}

            {selectedItem && (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Current Item */}
                <div className="glass-card p-4 border border-primary/30 space-y-3 animate-fade-in-up">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-primary flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Current {currentItem.type === 'zettel_card' ? 'Card' : 'Note'}
                    </h3>
                    {wordCount(currentItem.content) > wordCount(selectedItem.content) && (
                      <span className="text-xs bg-primary/20 px-2 py-1 rounded">Longer</span>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">{currentItem.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(currentItem.created_at), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Type className="w-3 h-3" />
                        {wordCount(currentItem.content)} words
                      </span>
                    </div>
                    <div className="text-sm max-h-64 overflow-y-auto p-3 bg-background/50 rounded border border-border">
                      {currentItem.content}
                    </div>
                  </div>
                </div>

                {/* Similar Item */}
                <div className="glass-card p-4 border border-accent/30 space-y-3 animate-fade-in-up">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-accent flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Similar {currentItem.type === 'zettel_card' ? 'Card' : 'Note'}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({Math.round(selectedItem.similarity * 100)}% match)
                      </span>
                    </h3>
                    {wordCount(selectedItem.content) > wordCount(currentItem.content) && (
                      <span className="text-xs bg-accent/20 px-2 py-1 rounded">Longer</span>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">{selectedItem.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(selectedItem.created_at), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Type className="w-3 h-3" />
                        {wordCount(selectedItem.content)} words
                      </span>
                    </div>
                    <div className="text-sm max-h-64 overflow-y-auto p-3 bg-background/50 rounded border border-border">
                      {selectedItem.content}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleMerge(selectedItem)}
                    disabled={merging}
                    className="w-full shadow-glow"
                  >
                    {merging ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Merging...
                      </>
                    ) : (
                      `Merge into current ${currentItem.type === 'zettel_card' ? 'card' : 'note'}`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};