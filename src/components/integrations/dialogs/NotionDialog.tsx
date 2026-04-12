import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface NotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export function NotionDialog({ open, onOpenChange, onConnected }: NotionDialogProps) {
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user) return;
    setImporting(true);
    let count = 0;
    try {
      for (const file of Array.from(files)) {
        const text = await file.text();
        const name = file.name.replace(/\.(md|csv|html)$/, "");
        
        if (file.name.endsWith(".csv")) {
          const lines = text.split("\n").filter(Boolean);
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",");
            await supabase.from("notes").insert({
              user_id: user.id,
              title: cols[0]?.replace(/"/g, "") || `Notion Import ${i}`,
              content: cols.slice(1).join(",").replace(/"/g, ""),
            });
            count++;
          }
        } else {
          await supabase.from("notes").insert({
            user_id: user.id,
            title: name,
            content: text,
          });
          count++;
        }
      }
      toast.success(`Imported ${count} item${count !== 1 ? "s" : ""} from Notion export`);
      onConnected();
      onOpenChange(false);
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">📝 Import from Notion</DialogTitle>
          <DialogDescription>
            Export your Notion workspace (Settings → Export all content) as Markdown or CSV, then select the files here.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input ref={inputRef} type="file" accept=".md,.csv,.html" multiple onChange={handleFiles} className="hidden" />
          <Button className="w-full" disabled={importing} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            {importing ? "Importing…" : "Select Notion Export Files"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Supports .md, .csv, and .html files from Notion exports
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
