import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface GenericImportConfig {
  id: string;
  name: string;
  icon: string;
  /** Comma-separated accept value, e.g. ".md,.txt,.html" */
  accept: string;
  /** Short instructions for how to obtain the export */
  instructions: string;
  /** Optional link to provider's export documentation */
  docsUrl?: string;
  /** Optional custom parser; defaults to plain-text per file */
  parse?: (file: File, text: string) => Promise<Array<{ title: string; content: string; tags?: string[] }>>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (count: number) => void;
  config: GenericImportConfig | null;
}

const stripHtml = (s: string) => s.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const defaultParse: GenericImportConfig["parse"] = async (file, text) => {
  const ext = file.name.toLowerCase().split(".").pop();
  const baseTitle = file.name.replace(/\.[^.]+$/, "");

  if (ext === "ics" || ext === "ical") {
    // Very small ICS parser: split on VEVENT
    const events = [...text.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)].map((m) => m[1]);
    return events.map((block) => {
      const get = (k: string) => (block.match(new RegExp(`${k}[^:]*:(.+)`)) || [])[1]?.trim() || "";
      return {
        title: get("SUMMARY") || "Calendar event",
        content: `**Start:** ${get("DTSTART")}\n**End:** ${get("DTEND")}\n**Location:** ${get("LOCATION")}\n\n${get("DESCRIPTION").replace(/\\n/g, "\n")}`,
        tags: ["calendar"],
      };
    });
  }

  if (ext === "json") {
    try {
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : data.items || data.notes || data.cards || data.bookmarks || [data];
      return items.slice(0, 5000).map((item: any, i: number) => ({
        title: String(item.title || item.name || item.subject || `${baseTitle} ${i + 1}`).slice(0, 200),
        content: typeof item === "string" ? item : (item.content || item.body || item.text || item.description || JSON.stringify(item, null, 2)),
        tags: Array.isArray(item.tags) ? item.tags.map(String) : undefined,
      }));
    } catch {
      return [{ title: baseTitle, content: text }];
    }
  }

  if (ext === "csv") {
    const lines = text.split(/\r?\n/).filter(Boolean);
    return lines.slice(1).map((line, i) => {
      const cols = line.split(",").map((c) => c.replace(/^"|"$/g, ""));
      return { title: cols[0] || `${baseTitle} ${i + 1}`, content: cols.slice(1).join("\n") };
    });
  }

  if (ext === "html" || ext === "htm" || ext === "eml" || ext === "mhtml") {
    return [{ title: baseTitle, content: stripHtml(text) }];
  }

  return [{ title: baseTitle, content: text }];
};

export function GenericImportDialog({ open, onOpenChange, onConnected, config }: Props) {
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!config) return null;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user) return;
    setImporting(true);
    let count = 0;
    try {
      const parser = config.parse || defaultParse!;
      for (const file of Array.from(files)) {
        const text = await file.text();
        const items = await parser(file, text);
        for (const item of items) {
          const { error } = await supabase.from("notes").insert({
            user_id: user.id,
            title: item.title.slice(0, 200) || "Untitled",
            content: item.content || "",
            tags: item.tags,
          });
          if (!error) count++;
        }
      }
      toast.success(`Imported ${count} item${count !== 1 ? "s" : ""} from ${config.name}`);
      onConnected(count);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Import failed — please check your files and try again");
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span aria-hidden>{config.icon}</span> Import from {config.name}
          </DialogTitle>
          <DialogDescription>{config.instructions}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept={config.accept}
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <Button className="w-full" disabled={importing} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            {importing ? "Importing…" : `Select ${config.accept.replace(/\./g, "").toUpperCase().split(",").join(" / ")} files`}
          </Button>
          {config.docsUrl && (
            <a
              href={config.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              How to export from {config.name}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
