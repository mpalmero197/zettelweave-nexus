import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  FileCheck, 
  FileX, 
  RefreshCw, 
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { getImportHistory, clearImportHistory, ImportHistoryRecord } from "@/utils/importTracking";
import { toast } from "sonner";
import { format } from "date-fns";

interface ImportHistoryPanelProps {
  sourceType: 'obsidian' | 'notion';
  onSelectForReimport?: (filePaths: string[]) => void;
}

export function ImportHistoryPanel({ sourceType, onSelectForReimport }: ImportHistoryPanelProps) {
  const [history, setHistory] = useState<ImportHistoryRecord[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const records = await getImportHistory(sourceType);
      setHistory(records);
    } catch (error) {
      console.error('Error loading import history:', error);
      toast.error('Failed to load import history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [sourceType]);

  const handleToggleFile = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === history.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(history.map(r => r.file_path)));
    }
  };

  const handleClearHistory = async () => {
    if (!confirm(`Are you sure you want to clear all ${sourceType} import history? This will not delete your cards.`)) {
      return;
    }

    try {
      await clearImportHistory(sourceType);
      setHistory([]);
      setSelectedFiles(new Set());
      toast.success('Import history cleared');
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Failed to clear history');
    }
  };

  const handleReimportSelected = () => {
    if (selectedFiles.size === 0) {
      toast.error('Please select files to re-import');
      return;
    }

    onSelectForReimport?.(Array.from(selectedFiles));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-8 text-center">
          <FileX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            No import history found for {sourceType}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Files will appear here after your first import
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Import History ({history.length} files)
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
            >
              {selectedFiles.size === history.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              className="text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {history.map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedFiles.has(record.file_path)}
                  onCheckedChange={() => handleToggleFile(record.file_path)}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      {record.file_name}
                    </span>
                    {record.card_id && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Imported
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(record.imported_at), 'MMM d, yyyy h:mm a')}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-1">
                    {record.file_path}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {selectedFiles.size > 0 && (
          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span>{selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected</span>
              </div>
              <Button
                size="sm"
                onClick={handleReimportSelected}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Re-import Selected
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}