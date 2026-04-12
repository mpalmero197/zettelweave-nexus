import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OneNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export function OneNoteDialog({ open, onOpenChange, onConnected }: OneNoteDialogProps) {
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
        const title = file.name.replace(/\.(html|htm|md|txt)$/, "");
        
        // Strip HTML tags for plain content if HTML
        const content = file.name.endsWith(".html") || file.name.endsWith(".htm")
          ? text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
          : text;

        await supabase.from("notes").insert({
          user_id: user.id,
          title,
          content,
        });
        count++;
      }
      toast.success(`Imported ${count} OneNote page${count !== 1 ? "s" : ""}`);
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
          <DialogTitle className="flex items-center gap-2">📓 Import from OneNote</DialogTitle>
          <DialogDescription>
            Export your OneNote sections as HTML or PDF, then select the files here. You can also paste exported .md or .txt files.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input ref={inputRef} type="file" accept=".html,.htm,.md,.txt" multiple onChange={handleFiles} className="hidden" />
          <Button className="w-full" disabled={importing} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            {importing ? "Importing…" : "Select OneNote Export Files"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            In OneNote → Right-click a section → Export → choose HTML format
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
