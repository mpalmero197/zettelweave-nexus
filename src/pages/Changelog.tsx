import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import pendragonLogo from "@/assets/pendragon-logo.png";
import { SEOHead } from "@/components/SEOHead";
import { useEffect, useRef, useState } from "react";

const changelogData = [
  { date: "Sep 2, 2025", title: "Project Launch", description: "Core Zettelkasten card system, notes, notebooks, and authentication" },
  { date: "Sep 7, 2025", title: "Database Foundation", description: "User preferences, profiles, file storage, and RLS security policies" },
  { date: "Sep 26, 2025", title: "Knowledge Graph", description: "2D/3D graph visualization, card linking, and Dewey/Luhmann organization" },
  { date: "Sep 27, 2025", title: "Calendar & Events", description: "Calendar integration linked to cards and notes" },
  { date: "Sep 29, 2025", title: "AI Search", description: "Vector embeddings and semantic search across knowledge base" },
  { date: "Oct 1, 2025", title: "File Manager", description: "Document uploads (PDF, DOCX, XLSX) with built-in viewer" },
  { date: "Oct 2, 2025", title: "Recycle Bin", description: "Soft-delete with configurable auto-cleanup (7/15/30/60 days)" },
  { date: "Oct 3, 2025", title: "AI Assistant", description: "Context-aware AI chat using your own notes" },
  { date: "Oct 5, 2025", title: "Whiteboard", description: "Infinite canvas with drawing tools, shapes, and sticky notes" },
  { date: "Oct 7, 2025", title: "Audio & Recording", description: "Meeting recorder with AI transcription" },
  { date: "Oct 18, 2025", title: "Bullet Journal & Habits", description: "Daily planning and habit tracking with streaks" },
  { date: "Oct 20, 2025", title: "Dashboard Widgets", description: "Customizable drag-and-drop dashboard with 15+ widgets" },
  { date: "Oct 24, 2025", title: "Admin Panel", description: "User management, content monitoring, security audit logs" },
  { date: "Oct 25, 2025", title: "Catalyst Writing Platform", description: "Long-form writing with hierarchical chapters" },
  { date: "Oct 26, 2025", title: "Catalyst AI Tools", description: "AI chapter generation, citation management, writing goals, export (PDF/DOCX/EPUB)" },
  { date: "Oct 29, 2025", title: "Mobile Optimization", description: "Touch-optimized whiteboard, responsive layouts, PWA support" },
  { date: "Nov 2, 2025", title: "Theme System", description: "8 theme options with live preview and performance preferences" },
  { date: "Nov 10, 2025", title: "Encryption & Security", description: "End-to-end encryption toggle, security activity log" },
  { date: "Nov 11, 2025", title: "Smart Linking", description: "AI-powered content recommendations and similar content detection" },
  { date: "Nov 24, 2025", title: "Import System", description: "Obsidian vault, Notion, Roam Research, and markdown import" },
  { date: "Nov 25, 2025", title: "Offline Mode", description: "Intelligent caching, offline data manager, PWA install prompt" },
  { date: "Dec 8, 2025", title: "Workflow Automation", description: "Automated workflows and agent pipeline builder" },
  { date: "Dec 16, 2025", title: "Landing Page Redesign", description: "SEO optimization, FAQ schema, Open Graph images" },
  { date: "Dec 20, 2025", title: "Friends & Collaboration", description: "Chat, contact sidebar, collaborative studio" },
  { date: "Feb 5, 2026", title: "Account Management Overhaul", description: "Avatar editor, profile settings, debug logs" },
  { date: "Feb 6, 2026", title: "Subscription System", description: "Stripe integration, premium tiers, card limits" },
  { date: "Feb 9, 2026", title: "Agents Feature", description: "AI agent creation, pipeline builder, activity feed" },
  { date: "Feb 11, 2026", title: "Agent Command Center", description: "Fleet dashboard with SVG status rings and unified timeline" },
  { date: "Feb 15, 2026", title: "Persistent Navigation", description: "Shared AppLayout with consistent header/sidebar across all pages" },
  { date: "Feb 16, 2026", title: "Mind Map Studio", description: "Premium mind mapping with minimap, 3 layout modes, context menus, and organic branches" },
  { date: "Feb 16, 2026", title: "Online/Offline Indicator", description: "Green/amber status dot with pulse animation in header" },
  { date: "Mar 15, 2026", title: "Plugin Hub Expansion", description: "Expanded from 7 to 22 plugins — Pomodoro Timer, Habit Streaks, Eisenhower Matrix, Citation Generator, Readability Analyzer, JSON Formatter, Diff Checker, Password Generator, and more" },
  { date: "Mar 22, 2026", title: "Focus Mode Sidebar", description: "Distraction-free reading view, focus task list, Pomodoro timer ring, and mobile focus sheet" },
  { date: "Mar 25, 2026", title: "Spaces & Object System", description: "Structured knowledge spaces with custom object types, relation definitions, and configurable set views" },
  { date: "Mar 27, 2026", title: "Learning Hub", description: "Courses, books, video search, topic maps, and mock exam generator for structured learning" },
  { date: "Mar 29, 2026", title: "Landing Page Rewrite", description: "Conversion-optimized structure with rotating 'Built for' banner, social proof section, outcome-based features, and audience persona cards" },
];

function TimelineEntry({ entry, index }: { entry: typeof changelogData[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); observer.unobserve(e.target); } },
      { threshold: 0.15, rootMargin: "40px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  const isEven = index % 2 === 0;

  return (
    <div ref={ref} className="relative flex items-start md:items-center group">
      {/* Desktop: alternating left/right */}
      <div className={cn(
        "hidden md:flex w-full items-center",
        isEven ? "flex-row" : "flex-row-reverse"
      )}>
        {/* Content side */}
        <div className={cn(
          "w-[calc(50%-20px)] transition-all duration-600",
          isEven ? "text-right pr-8" : "text-left pl-8",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        )} style={{ transitionDelay: `${Math.min(index * 60, 400)}ms` }}>
          <div className={cn(
            "inline-block rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-300",
            isEven ? "ml-auto" : "mr-auto"
          )}>
            <span className="inline-block text-[11px] font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5 mb-2">
              {entry.date}
            </span>
            <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xs">{entry.description}</p>
          </div>
        </div>

        {/* Center dot */}
        <div className="relative z-10 flex items-center justify-center w-10 shrink-0">
          <div className={cn(
            "w-3 h-3 rounded-full border-2 border-primary bg-background transition-all duration-500",
            visible ? "scale-100" : "scale-0",
            "group-hover:bg-primary group-hover:scale-125"
          )} style={{ transitionDelay: `${Math.min(index * 60, 400)}ms` }} />
        </div>

        {/* Empty side */}
        <div className="w-[calc(50%-20px)]" />
      </div>

      {/* Mobile: single column */}
      <div className="flex md:hidden items-start gap-4 w-full">
        <div className="relative z-10 flex flex-col items-center shrink-0 mt-1">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full border-2 border-primary bg-background transition-all duration-500",
            visible ? "scale-100" : "scale-0"
          )} />
        </div>
        <div className={cn(
          "flex-1 pb-6 transition-all duration-500",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )} style={{ transitionDelay: `${Math.min(index * 40, 300)}ms` }}>
          <span className="inline-block text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 mb-1.5">
            {entry.date}
          </span>
          <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{entry.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function Changelog() {
  const navigate = useNavigate();
  const headerAnim = useScrollAnimation(0.1);
  const currentYear = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-background">
      <SEOHead
        title="Changelog - PendragonX Updates & Release History"
        description="See every update and feature added to PendragonX since launch. Follow our journey from a simple Zettelkasten tool to a full AI-powered knowledge management platform."
        keywords="pendragonx changelog, updates, release notes, version history"
        canonicalUrl="https://pendragonx.com/changelog"
      />

      {/* Header */}
      <header className="fixed top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <img src={pendragonLogo} alt="" className="h-7 w-7 object-contain" aria-hidden="true" />
              <span className="hidden sm:inline text-lg font-semibold tracking-tight">PendragonX</span>
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section ref={headerAnim.ref} className="pt-28 pb-16 md:pt-32 md:pb-20">
        <div className={cn(
          "max-w-3xl mx-auto px-4 text-center transition-all duration-700",
          headerAnim.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Release History</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            What's New in <span className="text-primary">PendragonX</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Every feature, improvement, and milestone since day one. Follow our journey of building the ultimate knowledge platform.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="pb-24 md:pb-32">
        <div className="max-w-4xl mx-auto px-4 md:px-6 relative">
          {/* Vertical line - desktop */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 changelog-line" aria-hidden="true" />
          {/* Vertical line - mobile */}
          <div className="md:hidden absolute left-[4.5px] top-0 bottom-0 changelog-line" aria-hidden="true" />

          <div className="space-y-2 md:space-y-4">
            {changelogData.map((entry, i) => (
              <TimelineEntry key={i} entry={entry} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6" role="contentinfo">
        <div className="max-w-5xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <img src={pendragonLogo} alt="" className="h-5 w-5 object-contain" aria-hidden="true" />
            <span className="font-medium">PendragonX</span>
            <span className="text-muted-foreground">© {currentYear}</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground" aria-label="Footer navigation">
            <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors">Home</button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
          </nav>
        </div>
      </footer>
    </main>
  );
}
