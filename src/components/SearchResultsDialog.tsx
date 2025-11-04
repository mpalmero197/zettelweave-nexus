import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, X, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface SearchResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  result: string;
  onSuggestedSearch?: (query: string) => void;
}

export function SearchResultsDialog({ open, onOpenChange, query, result, onSuggestedSearch }: SearchResultsDialogProps) {
  const [suggestedSearches, setSuggestedSearches] = useState<string[]>([]);
  const [mainContent, setMainContent] = useState('');

  useEffect(() => {
    // Extract suggested searches if present
    const suggestedMatch = result.match(/\*\*Suggested searches:\*\*\n([\s\S]*?)(?:\n\n|$)/);
    if (suggestedMatch) {
      const searches = suggestedMatch[1]
        .split('\n')
        .filter(line => line.trim().match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
      setSuggestedSearches(searches);
      setMainContent(result.replace(suggestedMatch[0], '').trim());
    } else {
      setMainContent(result);
      setSuggestedSearches([]);
    }
  }, [result]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-gradient-to-br from-background via-background to-accent/10">
        <DialogHeader className="pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Search Results
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-accent/50 to-accent/30 rounded-xl p-4 border border-border/30 backdrop-blur-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              Your Query
            </p>
            <p className="text-sm font-medium">{query}</p>
          </div>

          <ScrollArea className="flex-1 pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
              <ReactMarkdown>
                {mainContent}
              </ReactMarkdown>
            </div>

            {suggestedSearches.length > 0 && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
                <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="h-3 w-3" />
                  Suggested Searches
                </p>
                <div className="space-y-2">
                  {suggestedSearches.map((search, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onSuggestedSearch?.(search);
                        onOpenChange(false);
                      }}
                      className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-primary/10 hover:border-primary/50 transition-all"
                    >
                      <span className="text-sm">{search}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex justify-end pt-4 border-t border-border/50">
          <Button onClick={() => onOpenChange(false)} variant="outline" className="gap-2">
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
