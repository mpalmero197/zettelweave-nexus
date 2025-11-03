import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  result: string;
}

export function SearchResultsDialog({ open, onOpenChange, query, result }: SearchResultsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Internet Search Results
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-accent rounded-lg p-3">
            <p className="text-sm font-medium text-muted-foreground mb-1">Query:</p>
            <p className="text-sm">{query}</p>
          </div>

          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap">{result}</div>
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
