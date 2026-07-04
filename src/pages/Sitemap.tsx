import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import {
  ArrowLeft, ArrowRight, LayoutDashboard, Network, FileText, NotebookPen,
  StickyNote, Pencil, BookOpen, Calendar as CalendarIcon, ListChecks, Target,
  Folder, Mic, PenTool, Brush, Search, Sparkles, Bot, MessageSquare, Users,
  Wrench, Trash2, Settings, Shield, Crown, Plug, Library, GraduationCap,
  Compass, Layers
} from "lucide-react";
import bakuScribeLogoAsset from '@/assets/baku-scribe-logo.png.asset.json';
const pendragonLogo = bakuScribeLogoAsset.url;

type Feature = {
  tab?: string;          // /app/:tab
  to?: string;           // absolute route
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
};

type Section = {
  id: string;
  title: string;
  blurb: string;
  accent: string; // tailwind hue token e.g. "primary" | "secondary"
  features: Feature[];
};

const SECTIONS: Section[] = [
  {
    id: "knowledge",
    title: "Knowledge",
    blurb: "Capture, structure, and explore everything you know.",
    accent: "primary",
    features: [
      { tab: "cards", label: "ZettelCards", desc: "Atomic, linkable knowledge cards organized by Dewey or your own system.", icon: Layers },
      { tab: "notes", label: "Notes & Notebooks", desc: "Long-form, networked notes with backlinks, encryption and spatial layout.", icon: NotebookPen },
      { tab: "graph", label: "Knowledge Graph", desc: "Interactive 2D star-schema graph of your second brain — see how ideas connect.", icon: Network },
      { tab: "knowledge-chat", label: "Knowledge Chat", desc: "NotebookLM-style grounded chat across cards, notes and documents.", icon: MessageSquare },
      { tab: "knowledge-gaps", label: "Knowledge Gaps", desc: "AI scans your library to find conceptual holes and suggests resources.", icon: Compass },
      { tab: "spaces", label: "Spaces", desc: "Top-level workspaces that group related notebooks, projects and cards.", icon: Folder },
    ],
  },
  {
    id: "writing",
    title: "Writing & Capture",
    blurb: "From a quick thought to a published manuscript.",
    accent: "secondary",
    features: [
      { tab: "catalyst", label: "Catalyst Writer", desc: "Distraction-free writing suite with chapters, citations, AI suggestions and snapshots.", icon: Pencil },
      { tab: "scratchpad", label: "Scratchpad", desc: "Always-available text buffer that syncs to your Chrome extension.", icon: PenTool },
      { tab: "stickynotes", label: "Sticky Notes", desc: "Glassmorphic wall of color-coded sticky notes for fleeting thoughts.", icon: StickyNote },
      { tab: "journal", label: "Bullet Journal", desc: "Daily log, monthly log, future log and migration in one keyboard-driven view.", icon: BookOpen },
    ],
  },
  {
    id: "planner",
    title: "Planner",
    blurb: "Time, tasks and habits in one super-calendar.",
    accent: "primary",
    features: [
      { tab: "calendar", label: "Super Calendar", desc: "Unified events, tasks and habits with day/week/month views and meeting tools.", icon: CalendarIcon },
      { tab: "habits", label: "Habit Tracker", desc: "Streaks and consistency tracking integrated with the calendar.", icon: Target },
      { tab: "projects", label: "Projects", desc: "Gantt-style timeline with milestones, dependencies and AI breakdowns.", icon: ListChecks },
    ],
  },
  {
    id: "creative",
    title: "Visual & Creative",
    blurb: "Think spatially, sketch ideas, record media.",
    accent: "secondary",
    features: [
      { tab: "canvas", label: "Canvas Studio", desc: "Whiteboard + Mind Map hybrid with notes, checklists, highlighter and shapes.", icon: Brush },
      { tab: "recorder", label: "Recorder Studio", desc: "Audio/video capture with AI transcription and a built-in media library.", icon: Mic },
      { tab: "files", label: "File Manager", desc: "Cloud storage for everything you import or attach to your knowledge base.", icon: Folder },
    ],
  },
  {
    id: "intelligence",
    title: "Intelligence",
    blurb: "AI that augments every workflow.",
    accent: "primary",
    features: [
      { tab: "search", label: "Unified Search", desc: "Search cards, notes, files and the web with grounded AI answers.", icon: Search },
      { tab: "catalyst", label: "Agents (in Catalyst)", desc: "Autonomous research, synthesis and writing agents — now embedded directly in the Catalyst writing studio.", icon: Bot },
      { tab: "learning", label: "Learning Hub", desc: "Courses, videos, books and AI-generated mock exams for any subject.", icon: GraduationCap },
    ],
  },
  {
    id: "social",
    title: "Collaboration",
    blurb: "Work with friends, share documents, sync across devices.",
    accent: "secondary",
    features: [
      { tab: "collab", label: "Collab Studio", desc: "Friends, chat, and live multi-user editing on shared documents.", icon: Users },
      { to: "/shared", label: "Shared with Me", desc: "Inbox of every item another user has shared with your account.", icon: Library },
      { tab: "integrations", label: "Integrations", desc: "Connect Notion, Google Drive, Slack, Todoist, Zapier and more.", icon: Plug },
    ],
  },
  {
    id: "system",
    title: "System & Account",
    blurb: "Your control panel.",
    accent: "primary",
    features: [
      { tab: "dashboard", label: "Dashboard", desc: "Customizable command center with widgets, quick capture and stats.", icon: LayoutDashboard },
      { to: "/settings", label: "Settings", desc: "Themes, performance, security log and account management.", icon: Settings },
      { to: "/subscription", label: "Subscription", desc: "Free, Monthly and Lifetime plans with a 7-day premium trial.", icon: Crown },
      { tab: "recycle", label: "Recycle Bin", desc: "Restore or permanently delete anything you've removed.", icon: Trash2 },
      { to: "/install", label: "Install / PWA", desc: "Install Baku Scribe as a desktop or mobile app with offline support.", icon: Wrench },
    ],
  },
];

// Explicit integration paths between tools — the "how things talk to each other" map.
const CONNECTIONS: { from: string; to: string; how: string }[] = [
  { from: "Scratchpad", to: "ZettelCards", how: "Promote any scratchpad block into a permanent card with one click." },
  { from: "Sticky Notes", to: "ZettelCards", how: "Convert a sticky note into a fully tagged card." },
  { from: "Notes", to: "Catalyst Writer", how: "Pull selected notes into a Catalyst document as source material." },
  { from: "ZettelCards", to: "Catalyst Writer", how: "Synthesize multiple cards into a master document automatically." },
  { from: "ZettelCards", to: "Knowledge Graph", how: "Every card becomes a node clustered around its Dewey category hub." },
  { from: "Notes", to: "Knowledge Graph", how: "Notes appear alongside cards with backlink-driven edges." },
  { from: "Knowledge Chat", to: "Cards / Notes / Files", how: "Grounded answers cite the exact source items used." },
  { from: "Recorder", to: "Notes", how: "Transcribed recordings can be saved directly as notes or summarized." },
  { from: "Calendar", to: "Tasks & Habits", how: "Tasks (rose/green) and habits (teal) render as dots on the calendar." },
  { from: "Projects", to: "Calendar", how: "Project milestones surface on the calendar timeline." },
  { from: "Agents", to: "Findings → Notebook", how: "Agents save research into chosen notebooks and notify you." },
  { from: "Knowledge Gaps", to: "Learning Hub", how: "Detected gaps suggest courses, videos and AI-generated study guides." },
  { from: "Search", to: "Everything", how: "Unified search spans cards, notes, sticky notes, files and the web." },
  { from: "Canvas", to: "Notes / Cards", how: "Drop notes and cards onto the whiteboard for spatial planning." },
  { from: "Integrations", to: "Notes / Files", how: "Imported items from Notion / Drive / Evernote land as native content." },
];

export default function Sitemap() {
  const navigate = useNavigate();

  const goToFeature = (f: Feature) => {
    if (f.to) navigate(f.to);
    else if (f.tab) navigate(`/app/${f.tab}`);
  };

  return (
    <>
      <SEOHead
        title="Baku Scribe Sitemap — Every Feature, Visualized"
        description="An interactive map of every Baku Scribe tool, what it does, and how each feature connects to the others."
        canonicalUrl="/sitemap"
      />
      <main className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={pendragonLogo} alt="" className="h-6 w-6 object-contain" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight">Baku Scribe</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 md:px-6 pt-12 pb-8 text-center">
          <Badge variant="secondary" className="mb-4">Sitemap</Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Every feature, in one map
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Baku Scribe is a connected ecosystem. Use this map to discover every tool,
            what it does, and how each part talks to the others.
          </p>
        </section>

        {/* Feature graph — categorized hubs */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {SECTIONS.map((section) => (
              <Card
                key={section.id}
                className="border-border/60 bg-card/40 backdrop-blur-sm hover:border-primary/40 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        section.accent === "primary" ? "bg-primary" : "bg-secondary"
                      }`}
                      aria-hidden="true"
                    />
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">{section.blurb}</p>
                </CardHeader>
                <CardContent className="pt-0 space-y-1.5">
                  {section.features.map((f) => {
                    const Icon = f.icon;
                    return (
                      <button
                        key={f.label}
                        onClick={() => goToFeature(f)}
                        className="w-full text-left rounded-lg p-2.5 hover:bg-accent transition-colors group flex items-start gap-2.5"
                      >
                        <div className="mt-0.5 h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                          <Icon className="h-3.5 w-3.5 text-foreground/80 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{f.label}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                            {f.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Cross-tool connections */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-20">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-3">
              <Sparkles className="h-3 w-3 mr-1" /> How things connect
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Cross-tool connections
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Baku Scribe tools aren't silos. Here's how data flows between them so you
              don't lose a thought between capture and publication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CONNECTIONS.map((c, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-medium mb-1.5 flex-wrap">
                  <span className="text-foreground">{c.from}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-foreground">{c.to}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.how}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pages outside the app */}
        <section className="max-w-5xl mx-auto px-4 md:px-6 pb-20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Public pages
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { to: "/", label: "Home" },
              { to: "/auth", label: "Sign in" },
              { to: "/changelog", label: "Changelog" },
              { to: "/terms", label: "Terms of Service" },
              { to: "/privacy", label: "Privacy Policy" },
              { to: "/install", label: "Install" },
            ].map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className="px-3 py-1.5 rounded-full border border-border/60 bg-card/40 text-xs hover:border-primary/40 hover:bg-accent transition-colors"
              >
                {p.label}
              </Link>
            ))}
          </div>
        </section>

        <footer className="border-t border-border py-6">
          <div className="max-w-5xl mx-auto px-4 md:px-6 text-center text-xs text-muted-foreground">
            Looking for something not on this map?{" "}
            <Link to="/app" className="text-primary hover:underline">Open the workspace</Link>{" "}
            and use unified search.
          </div>
        </footer>
      </main>
    </>
  );
}
