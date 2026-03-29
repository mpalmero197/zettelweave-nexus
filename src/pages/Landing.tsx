import { useState, useEffect } from "react";
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

/* ─── Static Data ─── */

const faqs = [
  { question: "What is PendragonX?", answer: "PendragonX is an AI-powered knowledge management system based on the Zettelkasten method. It helps you capture, connect, and discover insights across all your notes, ideas, and research using visual knowledge graphs and intelligent AI assistance." },
  { question: "What is the Zettelkasten method?", answer: "Zettelkasten (German for 'slip box') is a personal knowledge management system developed by sociologist Niklas Luhmann. It involves creating atomic notes that are interconnected through links, allowing you to build a 'second brain' that surfaces unexpected connections between ideas." },
  { question: "Is PendragonX free to use?", answer: "Yes! PendragonX offers a generous free tier that includes up to 50 Zettelcards, full note-taking capabilities, and unlimited notebooks. Premium features like unlimited cards, AI assistance, and advanced knowledge graphs are available for $4.99/month." },
  { question: "How does the AI assistant work?", answer: "PendragonX's AI assistant understands the context of your entire knowledge base. It can answer questions using your notes, suggest connections between ideas, help generate content, and surface relevant insights you may have forgotten." },
  { question: "Can I import notes from other apps?", answer: "Yes! PendragonX supports importing from popular note-taking apps including Obsidian vaults, Notion exports, Roam Research, and standard Markdown files. Your existing knowledge seamlessly integrates into the system." },
  { question: "Is my data secure and private?", answer: "Absolutely. PendragonX uses end-to-end encryption for sensitive content, and your data is stored securely in enterprise-grade cloud infrastructure. You maintain full ownership of your data and can export it anytime." },
  { question: "What devices does PendragonX work on?", answer: "PendragonX is a progressive web app (PWA) that works on any device with a modern web browser. Install it on your desktop, tablet, or phone for offline access and a native app-like experience." },
  { question: "How is PendragonX different from other note-taking apps?", answer: "Unlike traditional note-taking apps, PendragonX focuses on knowledge connections. Our 3D knowledge graph visualization, AI-powered linking suggestions, and Zettelkasten-first approach help you see the bigger picture and discover insights that linear note apps miss." },
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

const ROTATING_WORDS = ["authors", "creators", "thinkers", "researchers", "scholars", "dreamers", "builders", "storytellers"];

function BuiltForBanner() {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [done, setDone] = useState(false);
  const animation = useScrollAnimation(0.3);

  useEffect(() => {
    if (done || !animation.isVisible) return;
    const timer = setTimeout(() => {
      if (index < ROTATING_WORDS.length - 1) {
        setAnimating(true);
        setTimeout(() => { setIndex((p) => p + 1); setAnimating(false); }, 400);
      } else {
        setAnimating(true);
        setTimeout(() => { setDone(true); setAnimating(false); }, 400);
      }
    }, 1600);
    return () => clearTimeout(timer);
  }, [index, done, animation.isVisible]);

  return (
    <section ref={animation.ref} className="py-16 md:py-20 bg-primary/[0.03] border-y border-border">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          Built for{" "}
          <span className="inline-block relative overflow-hidden h-[1.2em] align-bottom min-w-[200px]">
            <span
              key={done ? "final" : index}
              className={cn(
                "inline-block text-primary transition-all",
                animating ? "opacity-0 -translate-y-full" : "opacity-100 translate-y-0"
              )}
              style={{ transitionDuration: "400ms" }}
            >
              {done ? "you." : ROTATING_WORDS[index]}
            </span>
          </span>
        </h2>
      </div>
    </section>
  );
}

/* ─── Social Proof Stats ─── */

const stats = [
  { value: "10K+", label: "Notes created" },
  { value: "50K+", label: "Connections discovered" },
  { value: "4.9★", label: "User rating" },
  { value: "99.9%", label: "Uptime" },
];

const testimonials = [
  { quote: "PendragonX replaced three apps for me. My ideas finally talk to each other.", name: "Sarah M.", role: "Nonfiction Author" },
  { quote: "I found a connection between two papers I'd read a year apart. That's when I knew this was different.", name: "James R.", role: "PhD Researcher" },
  { quote: "The AI search alone is worth it. It's like having a research assistant who's read everything I've ever written.", name: "Priya K.", role: "Content Strategist" },
];

/* ─── Features (Outcome-Based) ─── */

const features = [
  { icon: Link2, title: "Never lose an idea again", description: "Every note links itself to related ideas automatically. Your thoughts build on each other — no filing, no folders, no forgotten drafts." },
  { icon: Brain, title: "See patterns you'd never notice", description: "AI analyzes your entire knowledge base and surfaces hidden connections — across topics, across time, across projects." },
  { icon: Network, title: "Watch your mind grow in 3D", description: "A living, interactive knowledge graph reveals how your ideas cluster, evolve, and connect as your thinking deepens." },
  { icon: MessageSquare, title: "Ask your notes anything", description: "Chat with your entire knowledge base like ChatGPT — except every answer is grounded in your own research and writing." },
  { icon: Layers, title: "Import everything you've built", description: "Bring your existing notes from Obsidian, Notion, Roam, or plain Markdown. Nothing gets left behind." },
  { icon: Shield, title: "End-to-end encrypted", description: "Your ideas are yours alone. Enterprise-grade encryption protects sensitive content with zero-knowledge architecture." },
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
  const socialProofAnimation = useScrollAnimation(0.1);
  const audienceAnimation = useScrollAnimation(0.1);
  const pricingAnimation = useScrollAnimation(0.1);
  const faqAnimation = useScrollAnimation(0.1);
  const ctaAnimation = useScrollAnimation(0.1);
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  const goAuth = () => navigate("/auth");

  return (
    <main className="min-h-screen bg-background">
      <SEOHead
        title="PendragonX — A Second Brain That Actually Thinks With You"
        description="Connect your ideas, surface insights, and ask your knowledge anything. AI-powered Zettelkasten for writers, researchers, and deep thinkers. Start free today."
        keywords="second brain, zettelkasten, knowledge management, AI note-taking, connected thinking, knowledge graph, PKM, personal knowledge management, obsidian alternative"
        canonicalUrl="https://pendragonx.com/"
        ogImage={ogImages.home}
        jsonLd={[createFAQSchema(faqs), howToSchema]}
      />

      <a href="#main-hero" className="skip-to-main focus-visible:ring-2 focus-visible:ring-offset-2">
        Skip to main content
      </a>

      {/* ────────────────────────── HEADER ────────────────────────── */}
      <header className="fixed top-0 z-50 w-full bg-card/80 backdrop-blur-md border-b border-border" role="banner">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <img src={pendragonLogo} alt="" className="h-6 w-6 object-contain" aria-hidden="true" />
            <span className="hidden sm:inline text-base font-bold tracking-tight">PendragonX</span>
          </div>

          <nav className="hidden md:flex gap-8" aria-label="Main navigation">
            {[
              { label: "How It Works", id: "how-it-works" },
              { label: "Features", id: "features" },
              { label: "Pricing", id: "pricing" },
              { label: "FAQ", id: "faq" },
            ].map((item) => (
              <button key={item.id} onClick={() => scrollToSection(item.id)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={goAuth}>Sign In</Button>
            <Button size="sm" className="rounded-lg" onClick={goAuth}>
              Try It Free <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      {/* ────────────────────────── 1. HERO ────────────────────────── */}
      <section id="main-hero" ref={heroAnimation.ref} className="min-h-[92vh] flex items-center justify-center pt-14 relative" aria-labelledby="hero-heading">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className={cn(
            "space-y-7 transition-all duration-700",
            heroAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          )}>
            <Badge variant="outline" className="mx-auto text-xs px-3 py-1 gap-1.5 border-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              AI-Powered Knowledge System
            </Badge>

            <h1 id="hero-heading" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
              The fastest way to turn
              <span className="block text-primary mt-1">notes into insights</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              PendragonX automatically connects your ideas, surfaces hidden patterns, and lets you
              ask your knowledge anything — so you can think deeper, write better, and create faster.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" className="h-12 px-10 text-base" onClick={goAuth}>
                Start Free — No Credit Card
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => scrollToSection("how-it-works")}>
                See How It Works
              </Button>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["Free forever plan", "No credit card", "Import from Obsidian & Notion"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary/60" aria-hidden="true" />{t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
          <ChevronDown className="h-5 w-5 text-muted-foreground/40" />
        </div>
      </section>

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

          <div className="space-y-3">
            {[
              { text: "You have notes everywhere — but can never find the right one.", opacity: "text-foreground" },
              { text: "You know you've read something relevant — but can't remember where.", opacity: "text-muted-foreground/80" },
              { text: "Your knowledge sits in folders, siloed and forgotten.", opacity: "text-muted-foreground/50" },
            ].map((line, i) => (
              <p key={i} className={cn(
                "text-xl sm:text-2xl md:text-3xl font-bold leading-tight transition-all duration-600",
                line.opacity,
                problemAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )} style={{ transitionDelay: `${i * 150 + 200}ms` }}>
                {line.text}
              </p>
            ))}
          </div>

          <p className={cn(
            "mt-10 text-muted-foreground text-base max-w-lg mx-auto transition-all duration-500",
            problemAnimation.isVisible ? "opacity-100" : "opacity-0"
          )} style={{ transitionDelay: "700ms" }}>
            Traditional note apps store your thinking. They don't help you think.
          </p>
        </div>
      </section>

      {/* ────────────────────────── 4. SOLUTION ────────────────────────── */}
      <section ref={solutionAnimation.ref} className={cn(
        "py-20 md:py-28 bg-muted/30 transition-all duration-700",
        solutionAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">The Solution</p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight max-w-2xl mx-auto">
              PendragonX turns your notes into a <span className="text-primary">living knowledge system</span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              It reads everything you write, finds how ideas connect, and gives you a second brain you can actually talk to.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
            {[
              { icon: Link2, title: "Auto-links related ideas", description: "No tagging, no filing. AI discovers relationships between your notes — even ones you wrote months apart." },
              { icon: Sparkles, title: "Surfaces hidden patterns", description: "See connections across your entire knowledge base that linear note apps make invisible." },
              { icon: MessageSquare, title: "Answer questions from your notes", description: "Ask anything. Get answers grounded in your own research — not the internet's." },
            ].map((item, i) => (
              <div key={i} className={cn(
                "bg-card p-8 md:p-10 transition-all duration-500",
                solutionAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )} style={{ transitionDelay: `${i * 120}ms` }}>
                <item.icon className="h-6 w-6 text-primary mb-5" aria-hidden="true" />
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
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Three steps. Zero friction.</h2>
            <p className="text-muted-foreground">From scattered thinking to connected knowledge in minutes.</p>
          </div>

          <div className="space-y-4">
            {howToSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className={cn(
                  "flex items-start gap-5 p-6 rounded-xl border border-border bg-card transition-all duration-500 hover:border-primary/20",
                  howToAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )} style={{ transitionDelay: `${i * 120}ms` }}>
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0">
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
            <Button size="lg" className="h-11 px-8" onClick={goAuth}>
              Start Building Your Second Brain
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ────────────────────────── 6. FEATURES — OUTCOME-BASED ────────────────────────── */}
      <section id="features" ref={featuresAnimation.ref} className={cn(
        "py-20 md:py-28 bg-muted/30 transition-all duration-700",
        featuresAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">What You Get</p>
            <h2 className="text-3xl md:text-4xl font-bold">Outcomes, not features</h2>
            <p className="text-muted-foreground mt-2">Everything you need to think deeper and create faster.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className={cn(
                "p-6 rounded-xl border border-border bg-card transition-all duration-500 hover:border-primary/20 hover:shadow-sm",
                featuresAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )} style={{ transitionDelay: `${i * 80}ms` }}>
                <f.icon className="h-5 w-5 text-primary mb-4" aria-hidden="true" />
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
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
              <div key={i} className="text-center p-6 rounded-xl border border-border bg-card"
                style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="text-2xl md:text-3xl font-bold text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="text-center mb-10">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Loved By</p>
            <h2 className="text-3xl md:text-4xl font-bold">What thinkers are saying</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <div key={i} className={cn(
                "p-6 rounded-xl border border-border bg-card transition-all duration-500",
                socialProofAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )} style={{ transitionDelay: `${i * 100 + 300}ms` }}>
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-primary text-primary" />
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
        "py-20 md:py-28 bg-muted/30 transition-all duration-700",
        audienceAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Built For</p>
            <h2 className="text-3xl md:text-4xl font-bold">People who think for a living</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personas.map((p, i) => (
              <div key={i} className={cn(
                "p-5 rounded-xl border border-border bg-card transition-all duration-500 hover:border-primary/20",
                audienceAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <p.icon className="h-4 w-4 text-primary" aria-hidden="true" />
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
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Start free. Think bigger.</h2>
            <p className="text-muted-foreground">No surprises. No hidden fees. Upgrade when you're ready.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* Free */}
            <div className={cn(
              "rounded-xl border border-border p-7 transition-all duration-500",
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

            {/* Premium */}
            <div className={cn(
              "rounded-xl border-2 border-foreground p-7 relative transition-all duration-500",
              pricingAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )} style={{ transitionDelay: "100ms" }}>
              <Badge className="absolute -top-3 left-5 bg-foreground text-background border-0 text-xs gap-1">
                <Crown className="h-3 w-3" />Popular
              </Badge>
              <h3 className="text-lg font-semibold">Premium</h3>
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
              <Button className="w-full h-11" onClick={goAuth}>
                Try 7 Days Free <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────── 10. FAQ ────────────────────────── */}
      <section id="faq" ref={faqAnimation.ref} className={cn(
        "py-20 md:py-28 bg-muted/30 transition-all duration-700",
        faqAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold">Frequently asked questions</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}
                className={cn(
                  "border border-border rounded-xl px-5 bg-card transition-all duration-500",
                  faqAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
                style={{ transitionDelay: `${i * 50}ms` }}>
                <AccordionTrigger className="text-left hover:no-underline py-4 text-sm font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ────────────────────────── 11. FINAL CTA ────────────────────────── */}
      <section ref={ctaAnimation.ref} className="py-24 md:py-32">
        <div className={cn(
          "max-w-2xl mx-auto px-4 text-center transition-all duration-700",
          ctaAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-5">
            Stop storing ideas.
            <span className="block text-primary mt-1">Start thinking with them.</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
            Join writers, researchers, and deep thinkers who've built a second brain that actually works.
          </p>
          <Button size="lg" className="h-12 px-10 text-base" onClick={goAuth}>
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">Free forever plan · No credit card required</p>
        </div>
      </section>

      {/* ────────────────────────── FOOTER ────────────────────────── */}
      <footer className="border-t border-border py-8" role="contentinfo">
        <div className="max-w-5xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <img src={pendragonLogo} alt="" className="h-5 w-5 object-contain" aria-hidden="true" />
            <span className="font-medium">PendragonX</span>
            <span className="text-muted-foreground">© {currentYear}</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground" aria-label="Footer navigation">
            <button onClick={() => scrollToSection("features")} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => scrollToSection("pricing")} className="hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
            <button onClick={() => navigate("/changelog")} className="hover:text-foreground transition-colors">Changelog</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent("openCookieSettings"))} className="hover:text-foreground transition-colors">Cookies</button>
          </nav>
        </div>
      </footer>
    </main>
  );
}
