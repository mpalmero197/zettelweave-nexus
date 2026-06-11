// PendragonX Scholar — Capability Registry
// Single source of truth for what Scholar teaches. Every new feature MUST add an entry here.
// The `scholar-curriculum-sync` edge function reads this manifest, regenerates lessons
// from the listed surface files, and writes them to the scholar_lessons table.

export type ScholarCapability = {
  slug: string;
  moduleSlug: string;
  title: string;
  summary: string;
  route?: string;
  /** Repo-relative source files describing this capability — used by the sync engine. */
  surfaceFiles: string[];
  /** Optional ALICE tool names this capability exercises. */
  aliceTools?: string[];
  /** Manual override video URL (YouTube/Vimeo/etc.) — set in admin Scholar tab. */
  videoUrl?: string;
};

export type ScholarModule = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
};

export const SCHOLAR_MODULES: ScholarModule[] = [
  { slug: "getting-started", title: "Getting Started", description: "The grand tour of PendragonX.", icon: "Compass", sortOrder: 0 },
  { slug: "capture", title: "Capture", description: "Quick capture, clipper, recorder.", icon: "Inbox", sortOrder: 10 },
  { slug: "notes", title: "Notes & Notebooks", description: "Spatial notes, wikilinks, backlinks.", icon: "NotebookPen", sortOrder: 20 },
  { slug: "cards", title: "Zettel Cards", description: "Atomic ideas, auto-linking, the knowledge graph.", icon: "LayoutGrid", sortOrder: 30 },
  { slug: "catalyst", title: "Catalyst (Writing)", description: "Long-form writing with AI collaborators.", icon: "PenLine", sortOrder: 40 },
  { slug: "canvas", title: "Canvas Studio", description: "Whiteboard and mind-mapping.", icon: "Brush", sortOrder: 50 },
  { slug: "calendar", title: "Calendar & Tasks", description: "Events, tasks, habits, the bullet journal.", icon: "CalendarDays", sortOrder: 60 },
  { slug: "alice", title: "ALICE", description: "Your AI agent: chat, macros, workflows, memory.", icon: "Sparkles", sortOrder: 70 },
  { slug: "vault", title: "Secure Vault", description: "Passkey-encrypted passwords and ALICE OTP autofill.", icon: "KeyRound", sortOrder: 80 },
  { slug: "integrations", title: "Integrations", description: "Connect Google, Notion, Microsoft, and more.", icon: "Plug", sortOrder: 90 },
];

export const SCHOLAR_CAPABILITIES: ScholarCapability[] = [
  {
    slug: "welcome",
    moduleSlug: "getting-started",
    title: "Welcome to PendragonX",
    summary: "What PendragonX is, who it's for, and how the pieces fit together.",
    surfaceFiles: ["src/pages/Index.tsx", "src/components/AppLayout.tsx"],
  },
  {
    slug: "sandbox-tour",
    moduleSlug: "getting-started",
    title: "The Scholar Sandbox",
    summary: "Practice anywhere in PendragonX without touching your real knowledge base.",
    surfaceFiles: ["src/pages/Scholar.tsx"],
  },
  {
    slug: "quick-capture",
    moduleSlug: "capture",
    title: "Quick Capture",
    summary: "Drop a thought into PendragonX in under a second.",
    surfaceFiles: ["src/components/QuickCapture.tsx"],
  },
  {
    slug: "spatial-notes",
    moduleSlug: "notes",
    title: "Spatial Notes & Wikilinks",
    summary: "Lay out notes on an infinite board and link them like a wiki.",
    surfaceFiles: ["src/pages/Notes.tsx"],
  },
  {
    slug: "zettel-basics",
    moduleSlug: "cards",
    title: "Zettel Cards — Atomic Ideas",
    summary: "Capture one idea per card and let ALICE auto-link them.",
    surfaceFiles: ["src/components/cards/ZettelCard.tsx"],
  },
  {
    slug: "catalyst-intro",
    moduleSlug: "catalyst",
    title: "Writing with Catalyst",
    summary: "Long-form writing with chapters, citations, and AI co-authors.",
    surfaceFiles: ["src/pages/Catalyst.tsx"],
  },
  {
    slug: "canvas-intro",
    moduleSlug: "canvas",
    title: "Canvas Studio",
    summary: "Whiteboard + mind map in one infinite surface.",
    surfaceFiles: ["src/pages/Canvas.tsx"],
  },
  {
    slug: "calendar-bujo",
    moduleSlug: "calendar",
    title: "Calendar & Bullet Journal",
    summary: "Events, tasks, and habits unified with Bullet Journal symbols.",
    surfaceFiles: ["src/pages/Calendar.tsx"],
  },
  {
    slug: "alice-chat",
    moduleSlug: "alice",
    title: "Chatting with ALICE",
    summary: "Conversations grounded in your knowledge base with rigorous citations.",
    surfaceFiles: ["src/pages/Jarvis.tsx"],
    aliceTools: ["search_knowledge", "search_videos", "web_search"],
  },
  {
    slug: "alice-macros",
    moduleSlug: "alice",
    title: "Macros & Workflows",
    summary: "Save repeatable instructions and automate them on a schedule.",
    surfaceFiles: ["src/components/alice/Macros.tsx"],
  },
  {
    slug: "vault-basics",
    moduleSlug: "vault",
    title: "The Secure Vault",
    summary: "Passkey-encrypted passwords with silent OTP autofill via ALICE.",
    surfaceFiles: ["src/pages/Vault.tsx", "src/lib/vault/crypto.ts"],
  },
  {
    slug: "integrations-connect",
    moduleSlug: "integrations",
    title: "Connecting Other Accounts",
    summary: "One-click sign-in to Google, Notion, Microsoft, and more.",
    surfaceFiles: ["src/components/integrations/IntegrationsHub.tsx"],
  },
];

export const ALICE_DEEP_DIVE = [
  { slug: "chat", title: "Conversational Chat", benefit: "Ask anything; ALICE cites your own knowledge base." },
  { slug: "agent-runs", title: "Durable Agent Runs", benefit: "Long-running tasks that survive page reloads." },
  { slug: "macros", title: "Macros", benefit: "Save prompts you use often and rerun in one click." },
  { slug: "workflows", title: "Scheduled Workflows", benefit: "Daily research, weekly summaries, hourly monitors." },
  { slug: "memory", title: "Episodic Memory", benefit: "ALICE remembers prior sessions via vector recall." },
  { slug: "vault-otp", title: "Silent OTP Autofill", benefit: "ALICE reads codes from your vault and types them in." },
  { slug: "video-search", title: "Video Search", benefit: "Plays YouTube, Vimeo, Dailymotion, Odysee, Archive inline." },
  { slug: "web-research", title: "Web Research", benefit: "Multi-step research with source extraction." },
  { slug: "knowledge-graph", title: "Knowledge Graph", benefit: "Auto-link similar cards by embedding similarity." },
];
