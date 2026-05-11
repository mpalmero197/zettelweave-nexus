import { useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plug, Activity, RefreshCw, CheckCircle2, AlertCircle, Cable } from "lucide-react";
import { toast } from "sonner";
import { IntegrationCard } from "./IntegrationCard";
import { useIntegrationStatus } from "./useIntegrationStatus";
import type { Integration, IntegrationCategory } from "./types";

import { SlackDialog } from "./dialogs/SlackDialog";
import { ZapierDialog } from "./dialogs/ZapierDialog";
import { TodoistDialog } from "./dialogs/TodoistDialog";
import { GoogleCalendarDialog } from "./dialogs/GoogleCalendarDialog";
import { GoogleDriveDialog } from "./dialogs/GoogleDriveDialog";
import { GenericImportDialog, type GenericImportConfig } from "./dialogs/GenericImportDialog";

// File-based connectors share a unified import dialog so adding new ones is trivial.
const FILE_IMPORT_CONFIGS: Record<string, GenericImportConfig> = {
  notion:        { id: "notion",        name: "Notion",          icon: "📝", accept: ".md,.csv,.html,.json", instructions: "In Notion: Settings → Export all content (Markdown & CSV). Drop the unzipped files here.", docsUrl: "https://www.notion.so/help/export-your-content" },
  obsidian:      { id: "obsidian",      name: "Obsidian",        icon: "💎", accept: ".md",                  instructions: "Select .md files from your Obsidian vault. Wikilinks and frontmatter are preserved.", docsUrl: "https://help.obsidian.md/Files+and+folders/Manage+vaults" },
  onenote:       { id: "onenote",       name: "OneNote",         icon: "📓", accept: ".html,.htm,.md,.txt",  instructions: "In OneNote → right-click a section → Export → HTML. Then select the files here." },
  outlook:       { id: "outlook",       name: "Outlook",         icon: "📧", accept: ".eml,.msg,.html,.htm", instructions: "Drag .eml or .msg messages from Outlook into a folder, then select them here. Bodies are imported as notes." },
  "outlook-cal": { id: "outlook-cal",   name: "Outlook Calendar",icon: "🗓️", accept: ".ics,.ical",           instructions: "In Outlook → File → Save Calendar (.ics). Each event becomes a tagged note." },
  onedrive:      { id: "onedrive",      name: "OneDrive",        icon: "☁️", accept: ".md,.txt,.html,.csv,.json,.docx", instructions: "Download files from OneDrive (web or desktop) and drop them here. Most text formats supported." },
  "google-keep": { id: "google-keep",   name: "Google Keep",     icon: "🟡", accept: ".json,.html,.txt",     instructions: "In Google Takeout, request a Keep export. Drop the resulting JSON/HTML files here.", docsUrl: "https://takeout.google.com/" },
  trello:        { id: "trello",        name: "Trello",          icon: "📋", accept: ".json",                instructions: "In Trello → Show menu → ⋯ More → Print and Export → Export JSON. Each card becomes a note." },
  roam:          { id: "roam",          name: "Roam Research",   icon: "🧠", accept: ".json,.md",            instructions: "In Roam → ⋯ → Export All → JSON or Markdown. Drop the export here." },
  logseq:        { id: "logseq",        name: "Logseq",          icon: "🪵", accept: ".md,.json",            instructions: "Select pages from your Logseq graph (the markdown files in /pages)." },
  bear:          { id: "bear",          name: "Bear",            icon: "🐻", accept: ".md,.html,.txt",       instructions: "In Bear → File → Export Notes → Markdown. Then select the .md files here." },
  "apple-notes": { id: "apple-notes",   name: "Apple Notes",     icon: "🍎", accept: ".html,.txt,.md",       instructions: "In Apple Notes → File → Export as PDF/HTML, or copy/paste into a .txt file." },
  evernote:      { id: "evernote",      name: "Evernote",        icon: "🐘", accept: ".enex",                instructions: "In Evernote → right-click a notebook → Export → .enex. Then select the file here." },
  pocket:        { id: "pocket",        name: "Pocket",          icon: "📰", accept: ".html,.csv",           instructions: "In Pocket → Options → Export → HTML. Each saved article becomes a note." },
  instapaper:    { id: "instapaper",    name: "Instapaper",      icon: "📖", accept: ".html,.csv",           instructions: "In Instapaper → Settings → Export. Drop the CSV or HTML here." },
  readwise:      { id: "readwise",      name: "Readwise",        icon: "📚", accept: ".csv,.json,.md",       instructions: "Export highlights from Readwise (CSV or Markdown). Each book becomes a note." },
  dropbox:       { id: "dropbox",       name: "Dropbox",         icon: "📦", accept: ".md,.txt,.html,.csv,.json", instructions: "Download files from Dropbox and drop them here. Most text formats supported." },
  github:        { id: "github",        name: "GitHub",          icon: "🐙", accept: ".md,.txt,.json",       instructions: "Drop README, issues export, or wiki .md files here. Each becomes a note." },
  linear:        { id: "linear",        name: "Linear",          icon: "📐", accept: ".csv,.json",           instructions: "In Linear → Settings → Export → CSV. Each issue becomes a note." },
  asana:         { id: "asana",         name: "Asana",           icon: "🌿", accept: ".csv,.json",           instructions: "In Asana → Project → ⋯ → Export → CSV. Each task becomes a note." },
};

const INTEGRATIONS: Integration[] = [
  // Connector-based (OAuth / API key) — kept as-is
  { id: "google-calendar", name: "Google Calendar", description: "Two-way sync: PendragonX calendar events appear in Google Calendar and vice versa.", icon: "📅", category: "productivity", status: "available", color: "#4285F4", setupType: "api-key", docsUrl: "https://console.cloud.google.com/apis/credentials" },
  { id: "google-drive", name: "Google Drive", description: "Attach and sync files directly from your Google Drive.", icon: "📁", category: "storage", status: "available", color: "#0F9D58", setupType: "api-key", docsUrl: "https://console.cloud.google.com/apis/credentials" },
  { id: "todoist", name: "Todoist", description: "Sync tasks between PendragonX Task Manager and Todoist.", icon: "✅", category: "productivity", status: "available", color: "#E44332", setupType: "api-key", docsUrl: "https://todoist.com/prefs/integrations" },
  { id: "slack", name: "Slack", description: "Send notes and cards to Slack channels via webhook.", icon: "💬", category: "communication", status: "available", color: "#4A154B", setupType: "webhook", docsUrl: "https://api.slack.com/messaging/webhooks" },
  { id: "webhooks", name: "Zapier / Webhooks", description: "Generic webhook URL — connect 5,000+ apps via Zapier, Make, n8n.", icon: "🔗", category: "productivity", status: "available", color: "#FF4A00", setupType: "webhook", docsUrl: "https://zapier.com/app/zaps" },

  // File-import connectors (one-click via unified dialog)
  { id: "notion",        name: "Notion",           description: "Import Notion pages, databases, and CSVs into your notes.",                  icon: "📝", category: "productivity",   status: "available", color: "#000000", setupType: "file-import" },
  { id: "obsidian",      name: "Obsidian",         description: "Import your Obsidian vault (.md). Wikilinks and frontmatter preserved.",       icon: "💎", category: "import-export",  status: "available", color: "#7C3AED", setupType: "file-import" },
  { id: "onenote",       name: "OneNote",          description: "Import OneNote sections exported as HTML or Markdown.",                        icon: "📓", category: "import-export",  status: "available", color: "#7719AA", setupType: "file-import" },
  { id: "outlook",       name: "Outlook",          description: "Import Outlook emails (.eml / .msg) as searchable notes.",                     icon: "📧", category: "communication",  status: "available", color: "#0072C6", setupType: "file-import" },
  { id: "outlook-cal",   name: "Outlook Calendar", description: "Import Outlook calendar events from .ics exports.",                            icon: "🗓️", category: "productivity",   status: "available", color: "#0072C6", setupType: "file-import" },
  { id: "onedrive",      name: "OneDrive",         description: "Import documents and notes from your Microsoft OneDrive.",                     icon: "☁️", category: "storage",        status: "available", color: "#0078D4", setupType: "file-import" },
  { id: "google-keep",   name: "Google Keep",      description: "Import Google Keep notes via Google Takeout export.",                          icon: "🟡", category: "productivity",   status: "available", color: "#FBBC04", setupType: "file-import" },
  { id: "trello",        name: "Trello",           description: "Import Trello cards and boards from JSON exports.",                            icon: "📋", category: "productivity",   status: "available", color: "#0079BF", setupType: "file-import" },
  { id: "roam",          name: "Roam Research",    description: "Import your Roam graph (JSON or Markdown).",                                   icon: "🧠", category: "import-export",  status: "available", color: "#1A1A1A", setupType: "file-import" },
  { id: "logseq",        name: "Logseq",           description: "Import Logseq pages (.md) into your knowledge base.",                          icon: "🪵", category: "import-export",  status: "available", color: "#002B36", setupType: "file-import" },
  { id: "bear",          name: "Bear",             description: "Import Bear notes (.md / HTML).",                                              icon: "🐻", category: "import-export",  status: "available", color: "#FF1A45", setupType: "file-import" },
  { id: "apple-notes",   name: "Apple Notes",      description: "Import Apple Notes via HTML / text export.",                                   icon: "🍎", category: "import-export",  status: "available", color: "#FFCC00", setupType: "file-import" },
  { id: "evernote",      name: "Evernote",         description: "Import Evernote notebooks via .enex export files.",                            icon: "🐘", category: "import-export",  status: "available", color: "#00A82D", setupType: "file-import" },
  { id: "pocket",        name: "Pocket",           description: "Import saved articles from your Pocket export.",                               icon: "📰", category: "import-export",  status: "available", color: "#EF4056", setupType: "file-import" },
  { id: "instapaper",    name: "Instapaper",       description: "Import Instapaper articles (CSV / HTML).",                                     icon: "📖", category: "import-export",  status: "available", color: "#1F1F1F", setupType: "file-import" },
  { id: "readwise",      name: "Readwise",         description: "Import highlights and notes from Readwise.",                                   icon: "📚", category: "import-export",  status: "available", color: "#0F1B2D", setupType: "file-import" },
  { id: "dropbox",       name: "Dropbox",          description: "Import files from Dropbox.",                                                   icon: "📦", category: "storage",        status: "available", color: "#0061FF", setupType: "file-import" },
  { id: "github",        name: "GitHub",           description: "Import READMEs, wikis, and issue exports as notes.",                           icon: "🐙", category: "import-export",  status: "available", color: "#181717", setupType: "file-import" },
  { id: "linear",        name: "Linear",           description: "Import Linear issues from CSV / JSON exports.",                                icon: "📐", category: "productivity",   status: "available", color: "#5E6AD2", setupType: "file-import" },
  { id: "asana",         name: "Asana",            description: "Import Asana tasks from CSV exports.",                                         icon: "🌿", category: "productivity",   status: "available", color: "#F06A6A", setupType: "file-import" },
];

const CATEGORIES: { label: string; value: IntegrationCategory | "all"; icon: string }[] = [
  { label: "All", value: "all", icon: "🔌" },
  { label: "Productivity", value: "productivity", icon: "⚡" },
  { label: "Storage", value: "storage", icon: "💾" },
  { label: "Import / Export", value: "import-export", icon: "📦" },
  { label: "Communication", value: "communication", icon: "💬" },
];

export function IntegrationsHub() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | "all">("all");
  const { connectedIds, connect, disconnect, getMeta, runHealthChecks, meta } = useIntegrationStatus();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

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
    openDialog(id);
  }, [openDialog]);

  const handleDisconnect = useCallback((id: string) => {
    disconnect(id);
    toast.success("Disconnected successfully");
  }, [disconnect]);

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

      {/* Connector-based & API dialogs */}
      <SlackDialog open={dialogOpen === "slack"} onOpenChange={(o) => !o && closeDialog()} onConnected={() => { connect("slack"); closeDialog(); }} />
      <ZapierDialog open={dialogOpen === "webhooks"} onOpenChange={(o) => !o && closeDialog()} onConnected={() => { connect("webhooks"); closeDialog(); }} />
      <TodoistDialog open={dialogOpen === "todoist"} onOpenChange={(o) => !o && closeDialog()} onConnected={() => { connect("todoist"); closeDialog(); }} />
      <GoogleCalendarDialog open={dialogOpen === "google-calendar"} onOpenChange={(o) => !o && closeDialog()} onConnected={() => { connect("google-calendar"); closeDialog(); }} />
      <GoogleDriveDialog open={dialogOpen === "google-drive"} onOpenChange={(o) => !o && closeDialog()} onConnected={() => { connect("google-drive"); closeDialog(); }} />

      {/* Unified file-import dialog handles every file-based connector */}
      <GenericImportDialog
        open={!!dialogOpen && !!FILE_IMPORT_CONFIGS[dialogOpen]}
        onOpenChange={(o) => !o && closeDialog()}
        onConnected={(count) => {
          if (dialogOpen) connect(dialogOpen, count);
          closeDialog();
        }}
        config={dialogOpen ? FILE_IMPORT_CONFIGS[dialogOpen] ?? null : null}
      />
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
