import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Network, Brain, Layout, FileText, Check, Crown, ArrowRight,
  ChevronDown, Sparkles, MessageSquare, Link2, PenTool, Zap, Users,
  Shield, Star, BookOpen, Layers, Search, FolderOpen, Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";
import pendragonLogo from "@/assets/pendragon-logo.png";
import { SEOHead, createFAQSchema, createHowToSchema, ogImages } from "@/components/SEOHead";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MarketingQuizFunnel, MarketingQuizPopup } from "@/components/MarketingQuizFunnel";

/* ─── Static Data ─── */

const faqs = [
  { question: "How is PendragonX different from Notion?", answer: "Notion is great for linear databases and templates, but PendragonX automatically builds a living 3D knowledge graph and lets you chat with your own notes using private AI—no manual tagging or folder organization required. Your ideas connect themselves." },
  { question: "Does PendragonX work with Obsidian files?", answer: "Yes—drag-and-drop import from Obsidian vaults (plus Notion and Roam) with duplicate detection. Your existing Zettelkasten works instantly inside PendragonX's 3D graph and AI assistant." },
  { question: "What is the Zettelkasten method?", answer: "Zettelkasten (German for 'slip box') is a personal knowledge management system developed by sociologist Niklas Luhmann. It involves creating atomic notes that are interconnected through links, allowing you to build a 'second brain' that surfaces unexpected connections between ideas." },
  { question: "Is PendragonX free to use?", answer: "Yes! PendragonX offers a generous free tier that includes up to 50 Zettelcards, full note-taking capabilities, unlimited notebooks, and 22+ built-in plugins. Premium features like unlimited cards, AI agents, and advanced 3D knowledge graphs are available for $4.99/month." },
  { question: "How does the private AI assistant work?", answer: "PendragonX's AI assistant is grounded only in your own notes—never the internet. It can answer questions using your knowledge base, suggest connections between ideas, build autonomous agents, and surface relevant insights you may have forgotten." },
  { question: "Can I import notes from other apps?", answer: "Yes! PendragonX supports importing from Obsidian vaults, Notion exports, Roam Research, Evernote, and standard Markdown files with automatic duplicate detection. Your existing knowledge seamlessly integrates into the 3D knowledge graph." },
  { question: "Is my data secure and private?", answer: "Absolutely. PendragonX uses end-to-end zero-knowledge encryption for sensitive content, and your data is stored securely in enterprise-grade cloud infrastructure. You maintain full ownership of your data and can export it anytime." },
  { question: "What makes PendragonX better than OneNote or Evernote?", answer: "OneNote and Evernote are purely linear—they store notes but don't help you think. PendragonX automatically links related ideas, visualizes your entire knowledge base in an interactive 3D graph, and includes a private AI assistant, Canvas/Whiteboard/Mind Map studios, real-time collaboration, and offline PWA support." },
  { question: "What devices does PendragonX work on?", answer: "PendragonX is a progressive web app (PWA) that works on any device with a modern web browser. Install it on your desktop, tablet, or phone for offline access, plus use the Chrome extension for web clipping." },
  { question: "Is PendragonX better than Roam Research?", answer: "Roam Research pioneered bi-directional linking but is text-only and costs $15/month. PendragonX adds 3D spatial visualization, built-in AI chat and agents, Canvas/Whiteboard/Mind Map studios, offline mode, and end-to-end encryption—all starting free." },
  { question: "What is the best AI note-taking app in 2026?", answer: "PendragonX is the leading AI note-taking app in 2026, combining automatic AI linking, a living 3D knowledge graph, private AI chat and agents, visual studios (Canvas, Whiteboard, Mind Maps), and end-to-end encryption. It's the only app that auto-connects ideas and lets you chat with your own notes." },
  { question: "Can PendragonX replace Notion for teams?", answer: "Yes. PendragonX supports real-time collaboration, shared whiteboards, and project management — but goes further with automatic AI linking, a 3D knowledge graph, and private AI agents. Teams get structured thinking tools that Notion doesn't offer." },
  { question: "What is a 3D knowledge graph?", answer: "A 3D knowledge graph is an interactive three-dimensional visualization that maps every note and its connections spatially. Unlike flat 2D graphs (as in Obsidian), a 3D graph reveals clusters, depth, and hidden relationships across your entire knowledge base. PendragonX is the first note-taking app to offer this natively." },
];

const howToSteps = [
  { name: "Capture anything", text: "Write notes, import content from Obsidian or Notion, or just think freely. Every idea gets a home.", icon: PenTool },
  { name: "AI connects everything", text: "Related ideas link automatically into a living knowledge graph. No manual tagging required.", icon: Link2 },
  { name: "Ask your knowledge", text: "Query your notes like ChatGPT. Get real insights drawn from your own thinking.", icon: MessageSquare },
];

const howToSchema = createHowToSchema({
  name: "How to Build Your Second Brain with PendragonX",
  description: "Start using PendragonX to capture ideas, connect them with AI, and query your knowledge in 3 simple steps.",
  steps: howToSteps.map((step) => ({ name: step.name, text: step.text })),
});

/* ─── Rotating Words Banner ─── */

const ROTATING_WORDS = [
  "authors", "thinkers", "bloggers", "students", "researchers",
  "scholars", "writers", "essayists", "note-takers", "journalists",
  "academics", "learners", "storytellers", "poets", "novelists",
  "educators", "diarists", "philosophers", "bookworms", "scribes",
  "dreamers", "readers", "creators", "deep thinkers",
];

function BuiltForBanner() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const [done, setDone] = useState(false);
  const [displayWord, setDisplayWord] = useState(ROTATING_WORDS[0]);
  const animation = useScrollAnimation(0.3);

  const total = ROTATING_WORDS.length;

  const getDelay = (i: number) => {
    const mid = (total - 1) / 2;
    const dist = Math.abs(i - mid) / mid;
    const ease = 0.15 + 0.85 * dist * dist;
    return Math.round(ease * 1400 + 100);
  };

  const getTransitionDuration = (i: number) => {
    const mid = (total - 1) / 2;
    const dist = Math.abs(i - mid) / mid;
    return Math.round(120 + 380 * dist);
  };

  useEffect(() => {
    if (done || !animation.isVisible) return;

    const delay = getDelay(index);
    const dur = getTransitionDuration(index);

    const timer = setTimeout(() => {
      setPhase("exit");

      setTimeout(() => {
        if (index < total - 1) {
          const next = index + 1;
          setDisplayWord(ROTATING_WORDS[next]);
          setIndex(next);
        } else {
          setDisplayWord("you.");
          setDone(true);
        }
        setPhase("enter");
      }, dur);
    }, delay);

    return () => clearTimeout(timer);
  }, [index, done, animation.isVisible]);

  const transDur = done && phase === "enter" ? 600 : getTransitionDuration(index);

  return (
    <section ref={animation.ref} className="py-16 md:py-20 relative overflow-hidden">
      <div className="section-divider-glow absolute top-0 left-0 right-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-primary/[0.05] to-primary/[0.03]" />
      <div className="max-w-3xl mx-auto px-4 text-center relative">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance">
          Built for{" "}
          <span className="inline-block relative overflow-hidden h-[1.2em] align-bottom min-w-[220px]">
            <span
              className={cn(
                "inline-block will-change-transform",
                phase === "exit" && "opacity-0 -translate-y-[70%] blur-[2px]",
                phase === "enter" && "opacity-100 translate-y-0 blur-0",
                done && phase === "enter" && "scale-110 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
              )}
              style={{
                transitionProperty: "opacity, transform, filter",
                transitionTimingFunction: done && phase === "enter"
                  ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
                  : phase === "exit"
                    ? "cubic-bezier(0.4, 0, 1, 1)"
                    : "cubic-bezier(0, 0, 0.2, 1)",
                transitionDuration: `${transDur}ms`,
                color: !done ? 'hsl(var(--primary))' : undefined,
              }}
            >
              {displayWord}
            </span>
          </span>
        </h2>
      </div>
      <div className="section-divider-glow absolute bottom-0 left-0 right-0" />
    </section>
  );
}

/* ─── Social Proof Stats with Count-Up ─── */

const stats = [
  { value: "10K+", numericValue: 10, suffix: "K+", label: "Notes created" },
  { value: "50K+", numericValue: 50, suffix: "K+", label: "Connections discovered" },
  { value: "4.9★", numericValue: 4.9, suffix: "★", label: "User rating", decimals: 1 },
  { value: "99.9%", numericValue: 99.9, suffix: "%", label: "Uptime", decimals: 1 },
];

function CountUpStat({ target, suffix, decimals = 0, isVisible }: { target: number; suffix: string; decimals?: number; isVisible: boolean }) {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isVisible, target]);

  return (
    <span>
      {decimals > 0 ? value.toFixed(decimals) : Math.round(value)}
      {suffix}
    </span>
  );
}

const testimonials = [
  { quote: "PendragonX replaced three apps for me. My ideas finally talk to each other.", name: "Sarah M.", role: "Nonfiction Author" },
  { quote: "I found a connection between two papers I'd read a year apart. That's when I knew this was different.", name: "James R.", role: "PhD Researcher" },
  { quote: "The AI search alone is worth it. It's like having a research assistant who's read everything I've ever written.", name: "Priya K.", role: "Content Strategist" },
];

/* ─── Features (Outcome-Based) ─── */

const features = [
  { icon: Link2, title: "Never lose an idea—AI connects everything automatically", description: "Every note links itself to related ideas. Your thoughts build on each other — no filing, no folders, no forgotten drafts. Unlike Notion or OneNote, connections happen without manual work." },
  { icon: Network, title: "Visualize thought evolution in 3D (not just 2D graphs)", description: "A living, interactive 3D knowledge graph reveals how your ideas cluster, evolve, and connect. Go beyond Obsidian's flat 2D graph view." },
  { icon: MessageSquare, title: "Get grounded answers from your personal knowledge base", description: "Chat with your entire knowledge base like ChatGPT — except every answer comes from your own research and writing. Build autonomous AI agents that monitor your knowledge." },
  { icon: Layout, title: "Visual Studios: Canvas, Whiteboard & Mind Maps", description: "Spatial thinking tools that no competitor combines in one app. Arrange ideas on infinite canvases, brainstorm on whiteboards, and map concepts visually." },
  { icon: Layers, title: "Migrate from Notion or Obsidian in seconds", description: "Seamless import from Obsidian vaults, Notion exports, Roam Research, and Markdown with automatic duplicate detection. Nothing gets left behind." },
  { icon: Shield, title: "Collaborate in real time or work fully offline", description: "End-to-end zero-knowledge encryption, offline PWA mode, real-time collaboration, Chrome extension, and 22+ plugins. Privacy-first by design." },
];

/* ─── Audience Personas ─── */

const personas = [
  { icon: PenTool, label: "Writers & Authors", description: "Connect research to narrative. See how themes emerge across chapters, drafts, and sources." },
  { icon: BookOpen, label: "Researchers & Academics", description: "Build a living literature review. Surface connections between papers you read months apart." },
  { icon: Zap, label: "Founders & Strategists", description: "Turn scattered competitive intel, customer insights, and market research into actionable clarity." },
  { icon: Brain, label: "Students & Lifelong Learners", description: "Study smarter by linking concepts across courses. Your knowledge compounds instead of fading." },
  { icon: Users, label: "Content Creators", description: "Repurpose ideas faster. Every note becomes source material for articles, videos, and threads." },
];

/* ─── Main Page ─── */

export default function Landing() {
  const navigate = useNavigate();
  const heroAnimation = useScrollAnimation(0.1);
  const problemAnimation = useScrollAnimation(0.15);
  const solutionAnimation = useScrollAnimation(0.1);
  const howToAnimation = useScrollAnimation(0.1);
  const featuresAnimation = useScrollAnimation(0.1);
  const aliceAnimation = useScrollAnimation(0.1);
  const socialProofAnimation = useScrollAnimation(0.1);
  const audienceAnimation = useScrollAnimation(0.1);
  const pricingAnimation = useScrollAnimation(0.1);
  const faqAnimation = useScrollAnimation(0.1);
  const ctaAnimation = useScrollAnimation(0.1);
  const currentYear = new Date().getFullYear();
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setHeaderScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  const goAuth = () => navigate("/auth");

  return (
    <main className="min-h-screen bg-background landing-noise landing-grid-bg relative overflow-hidden">
      <SEOHead
        title="PendragonX: AI Second Brain with 3D Knowledge Graph & Agents | vs Notion & Obsidian"
        description="PendragonX is the AI-powered second brain that auto-connects every idea in a living 3D knowledge graph, lets you chat with your own notes, build agents, and visualize with Canvas/Mind Maps. Import from Notion or Obsidian instantly. End-to-end encrypted. The smarter alternative to Notion, Obsidian, and OneNote."
        keywords="AI second brain, 3D knowledge graph, PendragonX vs Notion, Obsidian alternative, Notion AI alternative, Zettelkasten app, AI knowledge base, automatic note linking, chat with your notes, canvas mind map studio, AI agents for notes, import from Obsidian Notion, private AI assistant, Roam Research alternative, best AI note taking app with 3D graph 2026, second brain that thinks with you"
        canonicalUrl="https://pendragonx.com/"
        ogImage={ogImages.home}
        jsonLd={[createFAQSchema(faqs), howToSchema]}
      />

      <a href="#main-hero" className="skip-to-main focus-visible:ring-2 focus-visible:ring-offset-2">
        Skip to main content
      </a>

      {/* ────────────────────────── HEADER (Chrome-tab style) ────────────────────────── */}
      <header
        className={cn(
          "fixed top-0 z-50 w-full transition-all duration-300",
          headerScrolled
            ? "bg-background/85 backdrop-blur-xl border-b border-border"
            : "bg-transparent border-b border-transparent"
        )}
        role="banner"
      >
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <img src={pendragonLogo} alt="PendragonX logo" className="h-7 w-7 object-contain" aria-hidden="true" />
            <span
              className="hidden sm:inline text-[17px] tracking-tight"
              style={{ fontFamily: "'Inter',system-ui,sans-serif", fontWeight: 500 }}
            >
              PendragonX
            </span>
          </div>

          <nav className="hidden md:flex gap-1" aria-label="Main navigation">
            {[
              { label: "How it works", id: "how-it-works" },
              { label: "Features", id: "features" },
              { label: "Meet ALICE", id: "alice" },
              { label: "Pricing", id: "pricing" },
              { label: "FAQ", id: "faq" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-full px-3.5 py-1.5 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="sm" onClick={goAuth}>Sign in</Button>
            <Button size="sm" onClick={goAuth} className="shadow-material-1">
              Try it free
            </Button>
          </div>
        </div>
      </header>

      {/* ────────────────────────── 1. HERO — Chrome New Tab feel ────────────────────────── */}
      <section
        id="main-hero"
        ref={heroAnimation.ref}
        className="min-h-[92vh] flex items-center justify-center pt-14 relative"
        aria-labelledby="hero-heading"
      >
        {/* Soft Material You ambient gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(217 89% 51% / 0.10), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 30%, hsl(142 71% 38% / 0.06), transparent 60%), radial-gradient(ellipse 60% 40% at 20% 40%, hsl(4 90% 47% / 0.05), transparent 60%)",
          }}
        />

        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <div
            className={cn(
              "space-y-8 transition-all duration-700",
              heroAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}
          >
            {/* Centered logo, NTP-style */}
            <div className="flex flex-col items-center gap-5">
              <img
                src={pendragonLogo}
                alt=""
                aria-hidden="true"
                className="h-20 w-20 object-contain drop-shadow-sm"
              />
            </div>

            <h1
              id="hero-heading"
              className="text-[44px] sm:text-6xl md:text-7xl tracking-tight leading-[1.05] text-balance"
              style={{ fontFamily: "'Inter',system-ui,sans-serif", fontWeight: 500 }}
            >
              Your second brain,
              <span className="block text-primary">designed for thinking.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
              Automatically links every idea, surfaces hidden patterns, and powers a private AI that
              knows everything you've ever written.
            </p>

            {/* Chrome omnibox-styled CTA */}
            <div className="max-w-xl mx-auto pt-2">
              <button
                onClick={goAuth}
                className="group w-full flex items-center gap-3 h-14 pl-5 pr-2 rounded-full bg-card border border-border shadow-material-2 hover:shadow-material-3 transition-all text-left"
                aria-label="Try PendragonX free"
              >
                <Search className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="flex-1 text-[15px] text-muted-foreground truncate">
                  Ask anything across your notes…
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium group-hover:bg-primary-hover transition-colors">
                  Try it free
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
                <span className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </div>

            <div className="pt-1 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["Free forever", "No credit card", "Imports from Notion & Obsidian", "End-to-end encrypted"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />{t}
                </span>
              ))}
            </div>

            {/* Product Hunt Featured Badge */}
            <div className="flex justify-center pt-2">
              <a
                href="https://www.producthunt.com/products/pendragonx?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-pendragonx"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  alt="PendragonX - Your second brain that actually communicates back to you. | Product Hunt"
                  width="250"
                  height="54"
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1141673&theme=dark&t=1778248257082"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
          <ChevronDown className="h-5 w-5 text-muted-foreground/40" />
        </div>
      </section>

      {/* ────────────────────────── AEO: ANSWER PARAGRAPH (crawlable, visually hidden) ────────────────────────── */}
      <article className="sr-only" aria-hidden="false" id="pendragonx-definition">
        <h2>What is PendragonX?</h2>
        <p>
          <dfn>PendragonX</dfn> is an AI-powered second brain and knowledge management platform that
          automatically connects every idea in a living 3D knowledge graph. It lets users chat with
          their own notes using a private AI assistant, build autonomous AI agents, and visualize
          thinking with Canvas, Whiteboard, and Mind Map studios. PendragonX supports seamless import
          from Notion, Obsidian, Roam Research, and Evernote with duplicate detection, and features
          end-to-end zero-knowledge encryption, offline PWA mode, real-time collaboration, a Chrome
          extension, and 22+ built-in plugins. It is the smarter alternative to Notion, Obsidian,
          OneNote, and Roam Research for writers, researchers, founders, and students.
        </p>
      </article>

      {/* ────────────────────────── 2. BUILT-FOR BANNER ────────────────────────── */}
      <BuiltForBanner />

      {/* ────────────────────────── 3. PROBLEM ────────────────────────── */}
      <section ref={problemAnimation.ref} className={cn(
        "py-20 md:py-28 transition-all duration-700",
        problemAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className={cn(
            "text-xs font-medium text-muted-foreground uppercase tracking-widest mb-8 transition-all duration-500",
            problemAnimation.isVisible ? "opacity-100" : "opacity-0"
          )}>Sound familiar?</p>

          <div className="space-y-4">
            {[
              { text: "You have notes everywhere — but can never find the right one.", opacity: "text-foreground" },
              { text: "You know you've read something relevant — but can't remember where.", opacity: "text-muted-foreground" },
              { text: "Your knowledge sits in folders, siloed and forgotten.", opacity: "text-muted-foreground/60" },
            ].map((line, i) => (
              <p key={i} className={cn(
                "text-2xl sm:text-3xl md:text-4xl font-bold leading-tight transition-all duration-600 text-balance",
                line.opacity,
                problemAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )} style={{ transitionDelay: `${i * 200 + 200}ms` }}>
                {line.text}
              </p>
            ))}
          </div>

          <p className={cn(
            "mt-12 text-muted-foreground text-base md:text-lg max-w-lg mx-auto transition-all duration-500",
            problemAnimation.isVisible ? "opacity-100" : "opacity-0"
          )} style={{ transitionDelay: "800ms" }}>
            Traditional note apps store your thinking. They don't help you think.
          </p>
        </div>
      </section>

      {/* ────────────────────────── 4. SOLUTION ────────────────────────── */}
      <section ref={solutionAnimation.ref} className={cn(
        "py-20 md:py-28 section-alt transition-all duration-700",
        solutionAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">The Solution</p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight max-w-2xl mx-auto text-balance">
              Living 3D Knowledge Graph — <span className="text-primary">Automatic Connections, No Manual Work</span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              It reads everything you write, finds how ideas connect, and gives you a second brain you can actually talk to.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Link2, title: "Auto-links related ideas", description: "No tagging, no filing. AI discovers relationships between your notes — even ones you wrote months apart.", accent: "border-t-2 border-t-primary/20" },
              { icon: Sparkles, title: "Surfaces hidden patterns", description: "See connections across your entire knowledge base that linear note apps make invisible.", accent: "border-t-2 border-t-primary/15" },
              { icon: MessageSquare, title: "Answer questions from your notes", description: "Ask anything. Get answers grounded in your own research — not the internet's.", accent: "border-t-2 border-t-primary/10" },
            ].map((item, i) => (
              <div key={i} className={cn(
                "bg-card/80 backdrop-blur-sm p-8 md:p-10 rounded-xl border border-border card-hover-lift group",
                item.accent,
                "transition-all duration-500",
                solutionAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )} style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                  <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────── 5. HOW IT WORKS ────────────────────────── */}
      <section id="how-it-works" ref={howToAnimation.ref} className={cn(
        "py-20 md:py-28 transition-all duration-700",
        howToAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-balance">Three steps. Zero friction.</h2>
            <p className="text-muted-foreground">From scattered thinking to connected knowledge in minutes.</p>
          </div>

          <div className="space-y-4 step-connector">
            {howToSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className={cn(
                  "flex items-start gap-5 p-6 rounded-xl border border-border bg-card card-hover-lift relative z-10 transition-all duration-500",
                  howToAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )} style={{ transitionDelay: `${i * 120}ms` }}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0 shadow-md">
                    {i + 1}
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-base font-semibold mb-1">{step.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Button size="lg" className="h-11 px-8 cta-glow" onClick={goAuth}>
              Start Building Your Second Brain
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ────────────────────────── 6. FEATURES — OUTCOME-BASED ────────────────────────── */}
      <section id="features" ref={featuresAnimation.ref} className={cn(
        "py-20 md:py-28 section-alt transition-all duration-700",
        featuresAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">What You Get</p>
            <h2 className="text-3xl md:text-4xl font-bold text-balance">Chat With Your Own Notes + AI Agents</h2>
            <p className="text-muted-foreground mt-2">Visual Studios, instant imports, collaboration & privacy-first design.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className={cn(
                "p-6 rounded-xl border border-border bg-card/80 backdrop-blur-sm card-hover-lift group transition-all duration-500",
                featuresAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
                  <f.icon className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────── 6.5 MEET ALICE ────────────────────────── */}
      <section id="alice" ref={aliceAnimation.ref} className={cn(
        "py-20 md:py-28 transition-all duration-700",
        aliceAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3 inline-flex items-center gap-2 justify-center">
              <Sparkles className="h-3 w-3" /> Meet ALICE
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-balance">
              Your AI co-pilot for everything inside PendragonX
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
              ALICE is the assistant living inside PendragonX. Ask her in plain English to find a buried note,
              remind you of a deadline, or finish a task — and she actually does it. Notion has a chatbot.
              Obsidian has plugins. PendragonX has a teammate.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {[
              {
                icon: Search,
                title: "Finds anything in seconds",
                body: "“ALICE, find my notes on Q3 retention.” She searches every card, note, document, and recording across your knowledge base — and opens the right one. No folders, no filters, no hunting.",
              },
              {
                icon: MessageSquare,
                title: "Reminds you at the right moment",
                body: "Tell ALICE what matters. She tracks deadlines, follow-ups, and recurring habits, then nudges you exactly when you need it — across desktop and mobile, even when the app is closed.",
              },
              {
                icon: Zap,
                title: "Actually completes tasks",
                body: "Create cards, schedule events, draft outlines, summarize a notebook, kick off a study guide — ALICE doesn’t just answer, she ships the work and shows you what she did.",
              },
            ].map((f, i) => (
              <div key={i} className={cn(
                "p-6 rounded-xl border border-border bg-card card-hover-lift transition-all duration-500",
                aliceAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )} style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-4">
                  <f.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>

          <div className={cn(
            "rounded-xl border border-border bg-card/80 p-6 md:p-8 transition-all duration-700",
            aliceAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )} style={{ transitionDelay: "320ms" }}>
            <h3 className="text-base md:text-lg font-semibold mb-4 text-center">
              Why ALICE makes PendragonX simpler than the competition
            </h3>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 max-w-3xl mx-auto">
              {[
                "Notion AI summarizes — ALICE searches, schedules, and creates.",
                "Obsidian needs plugins for AI — ALICE is built in and grounded in your notes.",
                "Evernote & OneNote forget — ALICE has long-term memory of your preferences.",
                "Roam has no assistant — ALICE turns your graph into action.",
                "Auto Deep Think routes complex requests to a stronger model — silently.",
                "One assistant across Notes, Cards, Calendar, Catalyst, Whiteboard & Learning Hub.",
              ].map((line, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                  <span className="text-muted-foreground leading-relaxed">{line}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-7">
              <Button onClick={goAuth} size="lg" className="shadow-material-1">
                Try ALICE free <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────── 7. SOCIAL PROOF ────────────────────────── */}
      <section ref={socialProofAnimation.ref} className={cn(
        "py-20 md:py-28 transition-all duration-700",
        socialProofAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          {/* Stats */}
          <div className={cn(
            "grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 transition-all duration-700",
            socialProofAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            {stats.map((s, i) => (
              <div key={i} className="text-center p-6 rounded-xl border border-border bg-card card-hover-lift"
                style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  <CountUpStat
                    target={s.numericValue}
                    suffix={s.suffix}
                    decimals={s.decimals}
                    isVisible={socialProofAnimation.isVisible}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="text-center mb-10">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Loved By</p>
            <h2 className="text-3xl md:text-4xl font-bold text-balance">PendragonX vs Notion, Obsidian, and OneNote: The Thinking Advantage</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <div key={i} className={cn(
                "p-6 rounded-xl border border-border bg-card card-hover-lift testimonial-quote transition-all duration-500",
                socialProofAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )} style={{ transitionDelay: `${i * 100 + 300}ms` }}>
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed mb-4">"{t.quote}"</blockquote>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────── 8. AUDIENCE ────────────────────────── */}
      <section ref={audienceAnimation.ref} className={cn(
        "py-20 md:py-28 section-alt transition-all duration-700",
        audienceAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Built For</p>
            <h2 className="text-3xl md:text-4xl font-bold text-balance">Instant Imports, Collaboration & Privacy-First Design</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personas.map((p, i) => (
              <div key={i} className={cn(
                "p-5 rounded-xl border border-border bg-card card-hover-lift transition-all duration-500",
                audienceAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-lg bg-primary/5 blur-sm" />
                    <p.icon className="h-4 w-4 text-primary relative" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-semibold">{p.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────── 9. PRICING ────────────────────────── */}
      <section id="pricing" ref={pricingAnimation.ref} className={cn(
        "py-20 md:py-28 transition-all duration-700",
        pricingAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-balance">Start free. Think bigger.</h2>
            <p className="text-muted-foreground">No surprises. No hidden fees. Upgrade when you're ready.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {/* Free */}
            <div className={cn(
              "rounded-xl border border-border bg-card p-7 card-hover-lift transition-all duration-500",
              pricingAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )}>
              <h3 className="text-lg font-semibold">Free</h3>
              <div className="flex items-baseline gap-1 mt-2 mb-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-sm text-muted-foreground">forever</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Everything you need to start building your second brain.</p>
              <ul className="space-y-2.5 mb-8">
                {["Up to 50 Zettelcards", "Full Note-Taking", "Unlimited Notebooks", "Basic Knowledge Graph", "22+ Built-In Plugins"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-11" onClick={goAuth}>Get Started Free</Button>
            </div>

            {/* Monthly */}
            <div className={cn(
              "rounded-xl border border-border bg-card p-7 card-hover-lift transition-all duration-500",
              pricingAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )} style={{ transitionDelay: "100ms" }}>
              <h3 className="text-lg font-semibold">Premium Monthly</h3>
              <div className="flex items-baseline gap-1 mt-2 mb-4">
                <span className="text-4xl font-bold">$4.99</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">For serious thinkers who want the full power of AI.</p>
              <ul className="space-y-2.5 mb-8">
                {["Unlimited Zettelcards", "Advanced 3D Knowledge Graph", "Unlimited Whiteboards", "AI-Powered Everything", "Collaboration Features", "Priority Support"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-3.5 w-3.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-11" onClick={goAuth}>
                Try 7 Days Free <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Yearly — Best Value */}
            <div className={cn(
              "rounded-xl bg-card p-7 relative premium-border transition-all duration-500",
              pricingAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )} style={{ transitionDelay: "200ms" }}>
              <Badge className="absolute -top-3 left-5 bg-foreground text-background border-0 text-xs gap-1">
                <Crown className="h-3 w-3" />Best Value
              </Badge>
              <h3 className="text-lg font-semibold">Premium Yearly</h3>
              <div className="flex items-baseline gap-1 mt-2 mb-1">
                <span className="text-4xl font-bold">$29.99</span>
                <span className="text-sm text-muted-foreground">/year</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm line-through text-muted-foreground">$59.88/yr</span>
                <Badge variant="secondary" className="text-xs bg-primary/15 text-primary border-0">Save 50%</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Same premium features — half the price. Just $2.50/mo.</p>
              <ul className="space-y-2.5 mb-8">
                {["Unlimited Zettelcards", "Advanced 3D Knowledge Graph", "Unlimited Whiteboards", "AI-Powered Everything", "Collaboration Features", "Priority Support"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-3.5 w-3.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-11 cta-glow" onClick={goAuth}>
                Try 7 Days Free <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────── 10. FAQ ────────────────────────── */}
      <section id="faq" ref={faqAnimation.ref} className={cn(
        "py-20 md:py-28 section-alt transition-all duration-700",
        faqAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold text-balance">Frequently asked questions</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}
                className={cn(
                  "border border-border rounded-xl px-5 bg-card card-hover-lift transition-all duration-500",
                  faqAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
                style={{ transitionDelay: `${i * 50}ms` }}>
                <AccordionTrigger className="text-left hover:no-underline py-4 text-sm font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Quiz funnel now triggered as popup after delay/exit-intent */}
      <MarketingQuizPopup />

      {/* ────────────────────────── 12. FINAL CTA ────────────────────────── */}
      <section ref={ctaAnimation.ref} className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 hero-glow pointer-events-none" />
        <div className="floating-orb w-[400px] h-[400px] bg-primary bottom-[0%] right-[-10%]" style={{ animationDelay: '-5s' }} />
        <div className={cn(
          "max-w-2xl mx-auto px-4 text-center relative z-10 transition-all duration-700",
          ctaAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-5 text-balance">
            Why linear apps fall short.
            <span className="block bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent mt-1">Start thinking in 3D.</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-lg mx-auto text-balance">
            Join writers, researchers, and founders who've replaced Notion, Obsidian, and OneNote with an AI second brain that actually thinks.
          </p>
          <Button size="lg" className="h-12 px-10 text-base cta-glow group" onClick={goAuth}>
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">Free forever plan · No credit card required</p>
        </div>
      </section>

      {/* ────────────────────────── FOOTER ────────────────────────── */}
      <footer className="py-8 relative" role="contentinfo">
        <div className="gradient-divider absolute top-0 left-0 right-0" />
        <div className="max-w-5xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <img src={pendragonLogo} alt="PendragonX logo" className="h-5 w-5 object-contain" aria-hidden="true" />
            <span className="font-medium" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>PendragonX</span>
            <span className="text-muted-foreground">© {currentYear}</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground" aria-label="Footer navigation">
            <button onClick={() => scrollToSection("features")} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => scrollToSection("pricing")} className="hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
            <button onClick={() => navigate("/changelog")} className="hover:text-foreground transition-colors">Changelog</button>
            <button onClick={() => navigate("/sitemap")} className="hover:text-foreground transition-colors">Sitemap</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent("openCookieSettings"))} className="hover:text-foreground transition-colors">Cookies</button>
          </nav>
        </div>
      </footer>
    </main>
  );
}
