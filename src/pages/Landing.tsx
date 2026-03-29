import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Network, Brain, Layout, FileText, Check, Crown, ArrowRight, ChevronDown, Sparkles, MessageSquare, Link2, PenTool, Zap, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";
import pendragonLogo from '@/assets/pendragon-logo.png';
import { SEOHead, createFAQSchema, createHowToSchema, ogImages } from "@/components/SEOHead";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { question: "What is PendragonX?", answer: "PendragonX is an AI-powered knowledge management system based on the Zettelkasten method. It helps you capture, connect, and discover insights across all your notes, ideas, and research using visual knowledge graphs and intelligent AI assistance." },
  { question: "What is the Zettelkasten method?", answer: "Zettelkasten (German for 'slip box') is a personal knowledge management system developed by sociologist Niklas Luhmann. It involves creating atomic notes that are interconnected through links, allowing you to build a 'second brain' that surfaces unexpected connections between ideas." },
  { question: "Is PendragonX free to use?", answer: "Yes! PendragonX offers a generous free tier that includes up to 50 Zettelcards, full note-taking capabilities, and unlimited notebooks. Premium features like unlimited cards, AI assistance, and advanced knowledge graphs are available for $4.99/month." },
  { question: "How does the AI assistant work?", answer: "PendragonX's AI assistant understands the context of your entire knowledge base. It can answer questions using your notes, suggest connections between ideas, help generate content, and surface relevant insights you may have forgotten." },
  { question: "Can I import notes from other apps?", answer: "Yes! PendragonX supports importing from popular note-taking apps including Obsidian vaults, Notion exports, Roam Research, and standard Markdown files. Your existing knowledge seamlessly integrates into the system." },
  { question: "Is my data secure and private?", answer: "Absolutely. PendragonX uses end-to-end encryption for sensitive content, and your data is stored securely in enterprise-grade cloud infrastructure. You maintain full ownership of your data and can export it anytime." },
  { question: "What devices does PendragonX work on?", answer: "PendragonX is a progressive web app (PWA) that works on any device with a modern web browser. Install it on your desktop, tablet, or phone for offline access and a native app-like experience." },
  { question: "How is PendragonX different from other note-taking apps?", answer: "Unlike traditional note-taking apps, PendragonX focuses on knowledge connections. Our 3D knowledge graph visualization, AI-powered linking suggestions, and Zettelkasten-first approach help you see the bigger picture and discover insights that linear note apps miss." }
];

const howToSteps = [
  { name: "Capture anything", text: "Write notes, import content from Obsidian or Notion, or just think freely. Every idea gets a home.", icon: PenTool },
  { name: "AI connects everything", text: "Related ideas link automatically into a living knowledge graph. No manual tagging required.", icon: Link2 },
  { name: "Ask your knowledge", text: "Query your notes like ChatGPT. Get real insights drawn from your own thinking.", icon: MessageSquare }
];

const howToSchema = createHowToSchema({
  name: "How to Build Your Second Brain with PendragonX",
  description: "Start using PendragonX to capture ideas, connect them with AI, and query your knowledge in 3 simple steps.",
  steps: howToSteps.map(step => ({ name: step.name, text: step.text }))
});

export default function Landing() {
  const navigate = useNavigate();
  const heroAnimation = useScrollAnimation(0.1);
  const problemAnimation = useScrollAnimation(0.1);
  const solutionAnimation = useScrollAnimation(0.1);
  const howToAnimation = useScrollAnimation(0.1);
  const featuresAnimation = useScrollAnimation(0.1);
  const audienceAnimation = useScrollAnimation(0.1);
  const galleryAnimation = useScrollAnimation(0.1);
  const pricingAnimation = useScrollAnimation(0.1);
  const faqAnimation = useScrollAnimation(0.1);
  const ctaAnimation = useScrollAnimation(0.1);
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

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

      {/* Header */}
      <header className="fixed top-0 z-50 w-full bg-card/80 backdrop-blur-md border-b border-border" role="banner">
        <div className="max-w-6xl mx-auto flex h-12 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <img src={pendragonLogo} alt="" className="h-6 w-6 object-contain" aria-hidden="true" />
            <span className="hidden sm:inline text-base font-bold tracking-tight">PendragonX</span>
          </div>
          
          <nav className="hidden md:flex gap-8" aria-label="Main navigation">
            <button onClick={() => scrollToSection('how-it-works')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</button>
            <button onClick={() => scrollToSection('features')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</button>
            <button onClick={() => scrollToSection('pricing')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => scrollToSection('faq')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</button>
          </nav>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => navigate('/auth')}>Sign In</Button>
            <Button size="sm" className="rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover" onClick={() => navigate('/auth')}>
              Try It Free
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="main-hero" ref={heroAnimation.ref} className="min-h-[90vh] flex items-center justify-center pt-14" aria-labelledby="hero-heading">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className={cn(
            "space-y-6 transition-all duration-700",
            heroAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            <h1 id="hero-heading" className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              Build a second brain
              <span className="block text-primary">that actually thinks with you</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              PendragonX connects your ideas, surfaces insights, and lets you ask your knowledge anything — powered by AI.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" className="h-11 px-8" onClick={() => navigate('/auth')}>
                Try It Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-11 px-8" onClick={() => scrollToSection('how-it-works')}>
                See How It Works
              </Button>
            </div>

            <div className="pt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                No credit card required
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Free forever plan
              </span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
          <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
        </div>
      </section>

      {/* Problem */}
      <section ref={problemAnimation.ref} className={cn(
        "py-20 md:py-28 transition-all duration-700",
        problemAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className={cn(
          "max-w-3xl mx-auto px-4 text-center space-y-4 transition-all duration-700",
          problemAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-6">Sound familiar?</p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-foreground">
            Your ideas are scattered.
          </p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-muted-foreground/70">
            Your notes don't connect.
          </p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-muted-foreground/40">
            Your knowledge sits there — but never works for you.
          </p>
        </div>
      </section>

      {/* Solution */}
      <section ref={solutionAnimation.ref} className={cn(
        "py-20 md:py-28 bg-muted/30 transition-all duration-700",
        solutionAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">The Fix</p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              PendragonX turns your notes into a living system
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
            {[
              { icon: Link2, title: "Automatically connects related ideas", description: "No manual tagging. AI finds relationships between your notes and links them for you." },
              { icon: Sparkles, title: "Shows patterns you didn't see", description: "Discover hidden connections across your thinking that linear note apps miss entirely." },
              { icon: MessageSquare, title: "Lets you ask your notes questions", description: "Chat with your knowledge base like ChatGPT — except every answer comes from your own work." }
            ].map((item, i) => (
              <div key={i} className={cn(
                "bg-card p-8 transition-all duration-500",
                solutionAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )} style={{ transitionDelay: `${i * 100}ms` }}>
                <item.icon className="h-5 w-5 text-primary mb-4" aria-hidden="true" />
                <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" ref={howToAnimation.ref} className={cn(
        "py-20 md:py-28 transition-all duration-700",
        howToAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">3 Steps. Zero Friction.</h2>
            <p className="text-muted-foreground">From scattered thoughts to connected knowledge in minutes</p>
          </div>

          <div className="space-y-3">
            {howToSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className={cn(
                  "flex items-start gap-4 p-5 rounded-lg border border-border bg-card transition-all duration-500",
                  howToAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )} style={{ transitionDelay: `${index * 100}ms` }}>
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="pt-1">
                    <h3 className="text-base font-semibold mb-1">{step.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Button size="lg" className="h-11 px-8" onClick={() => navigate('/auth')}>
              Start Building Your Second Brain
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features — Outcome-Based */}
      <section id="features" ref={featuresAnimation.ref} className={cn(
        "py-20 md:py-28 bg-muted/30 transition-all duration-700",
        featuresAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold">What You Actually Get</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Link2, title: "Never lose an idea", description: "Notes link themselves automatically. Every thought finds its connections without manual effort." },
              { icon: Brain, title: "Discover hidden patterns", description: "AI surfaces connections across your thinking — insights you'd never find scrolling through folders." },
              { icon: Network, title: "See your mind in 3D", description: "A living knowledge graph shows how your ideas evolve, cluster, and connect over time." },
              { icon: MessageSquare, title: "Ask your notes anything", description: "Chat with your entire knowledge base. Get answers drawn from your own research and thinking." }
            ].map((feature, i) => (
              <div key={i} className={cn(
                "p-6 rounded-lg border border-border bg-card transition-all duration-500",
                featuresAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )} style={{ transitionDelay: `${i * 80}ms` }}>
                <feature.icon className="h-5 w-5 text-primary mb-3" aria-hidden="true" />
                <h3 className="text-base font-semibold mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built For — Target Audience */}
      <section ref={audienceAnimation.ref} className={cn(
        "py-20 md:py-28 transition-all duration-700",
        audienceAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Built For</p>
            <h2 className="text-3xl md:text-4xl font-bold">People Who Think for a Living</h2>
          </div>

          <div className={cn(
            "flex flex-wrap justify-center gap-3 transition-all duration-700",
            audienceAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            {[
              { icon: PenTool, label: "Writers" },
              { icon: FileText, label: "Researchers" },
              { icon: Zap, label: "Founders" },
              { icon: Brain, label: "Students" },
              { icon: Users, label: "Deep Thinkers" }
            ].map((persona, i) => (
              <div key={i} className="flex items-center gap-2.5 px-5 py-3 rounded-full border border-border bg-card text-sm font-medium transition-all hover:border-primary/40 hover:bg-primary/5" style={{ transitionDelay: `${i * 60}ms` }}>
                <persona.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                {persona.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section ref={galleryAnimation.ref} className={cn(
        "py-20 md:py-28 bg-muted/30 transition-all duration-700",
        galleryAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">In Action</p>
            <h2 className="text-3xl md:text-4xl font-bold">See It. Believe It.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: "Knowledge Graph", desc: "Watch your ideas connect in a living 3D network", screenshot: "graph-view" },
              { title: "Zettelkasten Cards", desc: "Atomic notes that link themselves", screenshot: "zettelkasten-ui" },
              { title: "Infinite Whiteboard", desc: "Boundless space to think visually", screenshot: "whiteboard" },
              { title: "AI Search", desc: "Ask your knowledge anything", screenshot: "ai-search" }
            ].map((item, i) => (
              <div key={i} className={cn(
                "group overflow-hidden rounded-lg border border-border bg-card transition-all duration-500",
                galleryAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  <img 
                    src={`/screenshots/${item.screenshot}.jpg`}
                    alt={`Screenshot of PendragonX ${item.title} — ${item.desc}`}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" ref={pricingAnimation.ref} className={cn(
        "py-20 md:py-28 transition-all duration-700",
        pricingAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Start Free. Think Bigger.</h2>
            <p className="text-muted-foreground">No surprises. No hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* Free */}
            <div className="rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold">Free</h3>
              <div className="flex items-baseline gap-1 mt-2 mb-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-sm text-muted-foreground">forever</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Everything you need to start building your second brain.</p>
              <ul className="space-y-2.5 mb-6">
                {["Up to 50 Zettelcards", "Full Note-Taking", "Unlimited Notebooks", "Basic Organization"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-10" onClick={() => navigate('/auth')}>Get Started</Button>
            </div>

            {/* Premium */}
            <div className="rounded-lg border-2 border-foreground p-6 relative">
              <Badge className="absolute -top-3 left-4 bg-foreground text-background border-0 text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Popular
              </Badge>
              <h3 className="text-lg font-semibold">Premium</h3>
              <div className="flex items-baseline gap-1 mt-2 mb-4">
                <span className="text-4xl font-bold">$4.99</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">For serious thinkers who want the full power of AI.</p>
              <ul className="space-y-2.5 mb-6">
                {["Unlimited Zettelcards", "Advanced Knowledge Graph", "Unlimited Whiteboards", "AI-Powered Everything", "Collaboration Features", "Priority Support"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full h-10" onClick={() => navigate('/auth')}>
                Try 7 Days Free
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" ref={faqAnimation.ref} className={cn(
        "py-20 md:py-28 bg-muted/30 transition-all duration-700",
        faqAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`faq-${index}`}
                className={cn(
                  "border border-border rounded-lg px-4 bg-card transition-all duration-500",
                  faqAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
                style={{ transitionDelay: `${index * 40}ms` }}
              >
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

      {/* Final CTA */}
      <section ref={ctaAnimation.ref} className="py-20 md:py-28">
        <div className={cn(
          "max-w-2xl mx-auto px-4 text-center transition-all duration-700",
          ctaAnimation.isVisible ? "opacity-100" : "opacity-0 translate-y-6"
        )}>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
            Stop storing ideas.
            <span className="block text-primary">Start thinking with them.</span>
          </h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of writers, researchers, and thinkers who've built a second brain that actually works.
          </p>
          <Button size="lg" className="h-11 px-8" onClick={() => navigate('/auth')}>
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
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
            <button onClick={() => scrollToSection('features')} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => navigate('/terms')} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate('/privacy')} className="hover:text-foreground transition-colors">Privacy</button>
            <button onClick={() => navigate('/changelog')} className="hover:text-foreground transition-colors">Changelog</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('openCookieSettings'))} className="hover:text-foreground transition-colors">Cookies</button>
          </nav>
        </div>
      </footer>
    </main>
  );
}
