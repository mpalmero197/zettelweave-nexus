import { useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Plug, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { IntegrationCard } from "./IntegrationCard";
import type { Integration, IntegrationCategory } from "./types";
import { parseEnexFile } from "@/utils/evernoteImport";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const INTEGRATIONS: Integration[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Two-way sync: PendragonX calendar events appear in Google Calendar and vice versa.",
    icon: "📅",
    category: "productivity",
    status: "coming-soon",
    color: "#4285F4",
    setupType: "oauth",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Import Notion pages and databases into your Zettelcards and notebooks.",
    icon: "📝",
    category: "productivity",
    status: "coming-soon",
    color: "#000000",
    setupType: "oauth",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Import your Obsidian vault (.md files) as notes. Supports wikilinks and frontmatter.",
    icon: "💎",
    category: "import-export",
    status: "available",
    color: "#7C3AED",
    setupType: "file-import",
  },
  {
    id: "onenote",
    name: "OneNote",
    description: "Import OneNote sections and pages into PendragonX notebooks.",
    icon: "📓",
    category: "import-export",
    status: "coming-soon",
    color: "#7719AA",
    setupType: "oauth",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Attach and sync files directly from your Google Drive.",
    icon: "📁",
    category: "storage",
    status: "coming-soon",
    color: "#0F9D58",
    setupType: "oauth",
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Import and attach files from your Microsoft OneDrive.",
    icon: "☁️",
    category: "storage",
    status: "available",
    color: "#0078D4",
    setupType: "oauth",
  },
  {
    id: "evernote",
    name: "Evernote",
    description: "Import your Evernote notebooks via .enex export files.",
    icon: "🐘",
    category: "import-export",
    status: "available",
    color: "#00A82D",
    setupType: "file-import",
  },
  {
    id: "todoist",
    name: "Todoist",
    description: "Sync tasks between PendragonX Task Manager and Todoist.",
    icon: "✅",
    category: "productivity",
    status: "coming-soon",
    color: "#E44332",
    setupType: "api-key",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send notes and cards to Slack channels. Receive Slack messages as notes.",
    icon: "💬",
    category: "communication",
    status: "coming-soon",
    color: "#4A154B",
    setupType: "oauth",
  },
  {
    id: "webhooks",
    name: "Zapier / Webhooks",
    description: "Get a webhook URL for custom automations. Send data in, create cards and notes automatically.",
    icon: "🔗",
    category: "productivity",
    status: "coming-soon",
    color: "#FF4A00",
    setupType: "webhook",
  },
];

const CATEGORIES: { label: string; value: IntegrationCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Productivity", value: "productivity" },
  { label: "Storage", value: "storage" },
  { label: "Import / Export", value: "import-export" },
  { label: "Communication", value: "communication" },
];

export function IntegrationsHub() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | "all">("all");
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [obsidianOpen, setObsidianOpen] = useState(false);
  const [evernoteOpen, setEvernoteOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const obsidianInputRef = useRef<HTMLInputElement>(null);
  const evernoteInputRef = useRef<HTMLInputElement>(null);

  const filtered = INTEGRATIONS.filter((i) => {
    if (category !== "all" && i.category !== category) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleConnect = useCallback((id: string) => {
    if (id === "obsidian") { setObsidianOpen(true); return; }
    if (id === "evernote") { setEvernoteOpen(true); return; }
    if (id === "onedrive") {
      // Trigger existing OneDrive picker if available
      if ((window as any).OneDrive) {
        toast.info("Opening OneDrive picker…");
      } else {
        toast.error("OneDrive SDK not loaded. Please try again later.");
      }
      return;
    }
    toast.info(`${INTEGRATIONS.find(i => i.id === id)?.name} integration coming soon!`);
  }, []);

  const handleDisconnect = useCallback((id: string) => {
    setConnectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    toast.success("Disconnected");
  }, []);

  // ── Obsidian import ──
  const handleObsidianFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user) return;
    setImporting(true);
    let count = 0;
    try {
      for (const file of Array.from(files)) {
        if (!file.name.endsWith(".md")) continue;
        const text = await file.text();
        const title = file.name.replace(/\.md$/, "");
        await supabase.from("notes").insert({ user_id: user.id, title, content: text });
        count++;
      }
      toast.success(`Imported ${count} Obsidian note${count !== 1 ? "s" : ""}`);
      setConnectedIds(prev => new Set(prev).add("obsidian"));
    } catch (err) {
      toast.error("Import failed");
    } finally {
      setImporting(false);
      setObsidianOpen(false);
    }
  };

  // ── Evernote import ──
  const handleEvernoteFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImporting(true);
    try {
      const text = await file.text();
      const notes = parseEnexFile(text);
      let count = 0;
      for (const note of notes) {
        await supabase.from("notes").insert({
          user_id: user.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
        });
        count++;
      }
      toast.success(`Imported ${count} Evernote note${count !== 1 ? "s" : ""}`);
      setConnectedIds(prev => new Set(prev).add("evernote"));
    } catch (err: any) {
      toast.error(err?.message || "Failed to parse .enex file");
    } finally {
      setImporting(false);
      setEvernoteOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Integrations</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Connect PendragonX with the tools you already use. Import data, sync tasks, and automate workflows.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <Button
              key={c.value}
              variant={category === c.value ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            isConnected={connectedIds.has(integration.id)}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No integrations match your search.
        </div>
      )}

      {/* Obsidian Import Dialog */}
      <Dialog open={obsidianOpen} onOpenChange={setObsidianOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">💎 Import Obsidian Vault</DialogTitle>
            <DialogDescription>
              Select <code>.md</code> files from your Obsidian vault to import as notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input ref={obsidianInputRef} type="file" accept=".md" multiple onChange={handleObsidianFiles} className="hidden" />
            <Button className="w-full" disabled={importing} onClick={() => obsidianInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? "Importing…" : "Select .md Files"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evernote Import Dialog */}
      <Dialog open={evernoteOpen} onOpenChange={setEvernoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">🐘 Import from Evernote</DialogTitle>
            <DialogDescription>
              Export your Evernote notebook as an <code>.enex</code> file, then select it here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input ref={evernoteInputRef} type="file" accept=".enex" onChange={handleEvernoteFile} className="hidden" />
            <Button className="w-full" disabled={importing} onClick={() => evernoteInputRef.current?.click()}>
              <FileText className="h-4 w-4 mr-2" />
              {importing ? "Importing…" : "Select .enex File"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
