import { useState } from 'react';
import { Clock, Trash2, RefreshCw, Combine, X, ChevronRight } from 'lucide-react';
import { SearchHistoryItem } from '@/hooks/useSearchHistory';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';

interface SearchHistorySidebarProps {
  history: SearchHistoryItem[];
  onRerun: (query: string) => void;
  onCombine: (queries: string[]) => void;
  onClear: () => void;
  onRemove: (id: string) => void;
}

export function SearchHistorySidebar({
  history,
  onRerun,
  onCombine,
  onClear,
  onRemove,
}: SearchHistorySidebarProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCombine = () => {
    const queries = history
      .filter((item) => selectedIds.has(item.id))
      .map((item) => item.query);

    if (queries.length < 2) {
      toast.error('Select at least 2 searches to combine');
      return;
    }

    onCombine(queries);
    setSelectedIds(new Set());
    setIsOpen(false);
    toast.success(`Combined ${queries.length} searches`);
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'internal_search':
        return 'bg-primary/20 text-primary';
      case 'web_search':
        return 'bg-accent/20 text-accent-foreground';
      case 'image_generation':
        return 'bg-secondary/20 text-foreground';
      case 'multimedia_search':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getIntentLabel = (intent: string) => {
    switch (intent) {
      case 'internal_search':
        return 'Notes';
      case 'web_search':
        return 'Web';
      case 'image_generation':
        return 'Generate';
      case 'multimedia_search':
        return 'Media';
      default:
        return intent;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Clock className="h-4 w-4" />
          {history.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {history.length > 9 ? '9+' : history.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Search History</span>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        {selectedIds.size > 0 && (
          <div className="mt-4 p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCombine}
                  disabled={selectedIds.size < 2}
                >
                  <Combine className="h-4 w-4 mr-2" />
                  Combine
                </Button>
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-180px)] mt-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">No search history yet</p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                    selectedIds.has(item.id) ? 'ring-2 ring-primary bg-muted/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelection(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={getIntentColor(item.intent)}
                        >
                          {getIntentLabel(item.intent)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>

                      <p className="text-sm font-medium mb-2 line-clamp-2">
                        {item.query}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span>{item.resultCount} results</span>
                        {item.hasImages && <span>• Images</span>}
                        {item.hasVideos && <span>• Videos</span>}
                        {item.hasCitations && <span>• Citations</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onRerun(item.query);
                            setIsOpen(false);
                          }}
                          className="h-7 text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Re-run
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(item.id)}
                          className="h-7 text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
