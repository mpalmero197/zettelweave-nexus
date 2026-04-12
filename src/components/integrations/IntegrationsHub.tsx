import { useState, useCallback, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Plug, Upload, FileText, Activity, RefreshCw, CheckCircle2, AlertCircle, Cable } from "lucide-react";
import { toast } from "sonner";
import { IntegrationCard } from "./IntegrationCard";
import { useIntegrationStatus } from "./useIntegrationStatus";
import type { Integration, IntegrationCategory } from "./types";
import { parseEnexFile } from "@/utils/evernoteImport";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { SlackDialog } from "./dialogs/SlackDialog";
import { ZapierDialog } from "./dialogs/ZapierDialog";
import { TodoistDialog } from "./dialogs/TodoistDialog";
import { GoogleCalendarDialog } from "./dialogs/GoogleCalendarDialog";
import { NotionDialog } from "./dialogs/NotionDialog";
import { GoogleDriveDialog } from "./dialogs/GoogleDriveDialog";
import { OneNoteDialog } from "./dialogs/OneNoteDialog";

const INTEGRATIONS: Integration[] = [
  { id: "google-calendar", name: "Google Calendar", description: "Two-way sync: PendragonX calendar events appear in Google Calendar and vice versa.", icon: "📅", category: "productivity", status: "available", color: "#4285F4", setupType: "api-key", docsUrl: "https://console.cloud.google.com/apis/credentials" },
  { id: "notion", name: "Notion", description: "Import Notion pages and databases into your Zettelcards and notebooks.", icon: "📝", category: "productivity", status: "available", color: "#000000", setupType: "file-import", docsUrl: "https://www.notion.so/help/export-your-content" },
  { id: "obsidian", name: "Obsidian", description: "Import your Obsidian vault (.md files) as notes. Supports wikilinks and frontmatter.", icon: "💎", category: "import-export", status: "available", color: "#7C3AED", setupType: "file-import", docsUrl: "https://help.obsidian.md/Files+and+folders/Manage+vaults" },
  { id: "onenote", name: "OneNote", description: "Import OneNote sections and pages into PendragonX notebooks.", icon: "📓", category: "import-export", status: "available", color: "#7719AA", setupType: "file-import" },
  { id: "google-drive", name: "Google Drive", description: "Attach and sync files directly from your Google Drive.", icon: "📁", category: "storage", status: "available", color: "#0F9D58", setupType: "api-key", docsUrl: "https://console.cloud.google.com/apis/credentials" },
  { id: "onedrive", name: "OneDrive", description: "Import and attach files from your Microsoft OneDrive.", icon: "☁️", category: "storage", status: "available", color: "#0078D4", setupType: "oauth" },
  { id: "evernote", name: "Evernote", description: "Import your Evernote notebooks via .enex export files.", icon: "🐘", category: "import-export", status: "available", color: "#00A82D", setupType: "file-import" },
  { id: "todoist", name: "Todoist", description: "Sync tasks between PendragonX Task Manager and Todoist.", icon: "✅", category: "productivity", status: "available", color: "#E44332", setupType: "api-key", docsUrl: "https://todoist.com/prefs/integrations" },
  { id: "slack", name: "Slack", description: "Send notes and cards to Slack channels. Receive Slack messages as notes.", icon: "💬", category: "communication", status: "available", color: "#4A154B", setupType: "webhook", docsUrl: "https://api.slack.com/messaging/webhooks" },
  { id: "webhooks", name: "Zapier / Webhooks", description: "Get a webhook URL for custom automations. Send data in, create cards and notes automatically.", icon: "🔗", category: "productivity", status: "available", color: "#FF4A00", setupType: "webhook", docsUrl: "https://zapier.com/app/zaps" },
];

const CATEGORIES: { label: string; value: IntegrationCategory | "all"; icon: string }[] = [
  { label: "All", value: "all", icon: "🔌" },
  { label: "Productivity", value: "productivity", icon: "⚡" },
  { label: "Storage", value: "storage", icon: "💾" },
  { label: "Import / Export", value: "import-export", icon: "📦" },
  { label: "Communication", value: "communication", icon: "💬" },
];

export function IntegrationsHub() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | "all">("all");
  const { connectedIds, connect, disconnect, getMeta, runHealthChecks, meta } = useIntegrationStatus();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const obsidianInputRef = useRef<HTMLInputElement>(null);
  const evernoteInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => INTEGRATIONS.filter((i) => {
    if (category !== "all" && i.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
    }
    return true;
  }), [category, search]);

  // Stats
  const connectedCount = connectedIds.size;
  const healthyCount = Object.values(meta).filter((m) => m.health === "healthy").length;
  const errorCount = Object.values(meta).filter((m) => m.health === "error").length;
  const totalSynced = Object.values(meta).reduce((sum, m) => sum + (m.itemsSynced || 0), 0);

  const openDialog = useCallback((id: string) => setDialogOpen(id), []);
  const closeDialog = useCallback(() => setDialogOpen(null), []);

  const handleConnect = useCallback((id: string) => {
    if (id === "onedrive") {
      if ((window as any).OneDrive) {
        toast.info("Opening OneDrive picker…");
      } else {
        toast.error("OneDrive SDK not loaded. Please try again later.");
      }
      return;
    }
    openDialog(id);
  }, [openDialog]);

  const handleDisconnect = useCallback((id: string) => {
    disconnect(id);
    toast.success("Disconnected successfully");
  }, [disconnect]);

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
      connect("obsidian", count);
    } catch {
      toast.error("Import failed — please check your files and try again");
    } finally {
      setImporting(false);
      closeDialog();
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
      connect("evernote", count);
    } catch (err: any) {
      toast.error(err?.message || "Failed to parse .enex file");
    } finally {
      setImporting(false);
      closeDialog();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-card to-accent/20 border border-border/40 p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <Cable className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold text-foreground">Integrations</h1>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect PendragonX with the tools you already use. Import data, sync tasks, and automate workflows.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="self-start sm:self-center h-8 text-xs gap-1.5"
            onClick={() => {
              runHealthChecks();
              toast.success("Health checks complete");
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Check Health
          </Button>
        </div>

        {/* Stats strip */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/30">
          <StatPill icon={<Plug className="h-3.5 w-3.5 text-primary" />} label="Connected" value={connectedCount} />
          <StatPill icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} label="Healthy" value={healthyCount} />
          <StatPill icon={<AlertCircle className="h-3.5 w-3.5 text-destructive" />} label="Errors" value={errorCount} />
          <StatPill icon={<Activity className="h-3.5 w-3.5 text-primary" />} label="Items Synced" value={totalSynced} />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-card border-border/50"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <Button
              key={c.value}
              variant={category === c.value ? "default" : "outline"}
              size="sm"
              className={`h-8 text-xs gap-1 transition-all duration-200 ${
                category === c.value ? "shadow-sm" : "border-border/50"
              }`}
              onClick={() => setCategory(c.value)}
            >
              <span className="text-xs">{c.icon}</span>
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} integration{filtered.length !== 1 ? "s" : ""}
          {category !== "all" && ` in ${CATEGORIES.find(c => c.value === category)?.label}`}
        </p>
        {search && (
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setSearch("")}>
            Clear search
          </Button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Connected integrations first */}
        {filtered
          .sort((a, b) => {
            const aConn = connectedIds.has(a.id) ? 0 : 1;
            const bConn = connectedIds.has(b.id) ? 0 : 1;
            return aConn - bConn;
          })
          .map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              isConnected={connectedIds.has(integration.id)}
              connectionMeta={getMeta(integration.id)}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">🔍</div>
          <p className="text-sm text-muted-foreground">No integrations match your search.</p>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCategory("all"); }}>
            Reset filters
          </Button>
        </div>
      )}

      {/* Obsidian Import Dialog */}
      <Dialog open={dialogOpen === "obsidian"} onOpenChange={(o) => !o && closeDialog()}>
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
      <Dialog open={dialogOpen === "evernote"} onOpenChange={(o) => !o && closeDialog()}>
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

      {/* Connector-based & API dialogs */}
      <SlackDialog open={dialogOpen === "slack"} onOpenChange={(o) => !o && closeDialog()} onConnected={() => { connect("slack"); closeDialog(); }} />
      <ZapierDialog open={dialogOpen === "webhooks"} onOpenChange={(o) => !o && closeDialog()} onConnected={() => { connect("webhooks"); closeDialog(); }} />
      <TodoistDialog open={dialogOpen === "todoist"} onOpenChange={(o) => !o && closeDialog()} onConnected={() => { connect("todoist"); closeDialog(); }} />
      <GoogleCalendarDialog open={dialogOpen === "google-calendar"} onOpenChange={(o) => !o && closeDialog()} onConnected={() => { connect("google-calendar"); closeDialog(); }} />
      <NotionDialog open={dialogOpen === "notion"} onOpenChange={(o) => !o && closeDialog()} onConnected={() => { connect("notion"); closeDialog(); }} />
      <GoogleDriveDialog open={dialogOpen === "google-drive"} onOpenChange={(o) => !o && closeDialog()} onConnected={() => { connect("google-drive"); closeDialog(); }} />
      <OneNoteDialog open={dialogOpen === "onenote"} onOpenChange={(o) => !o && closeDialog()} onConnected={() => { connect("onenote"); closeDialog(); }} />
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 bg-background/60 rounded-lg px-3 py-2 border border-border/30">
      {icon}
      <div>
        <span className="text-sm font-semibold text-foreground">{value}</span>
        <span className="text-[10px] text-muted-foreground ml-1">{label}</span>
      </div>
    </div>
  );
}
