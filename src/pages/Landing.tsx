import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Brain, Layout, FileText, Check, Crown, ArrowRight, ChevronDown, HelpCircle, BookOpen, PenTool, Link2, Search } from "lucide-react";
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
  { name: "Create Your Account", text: "Sign up for a free PendragonX account using your email. No credit card required.", icon: BookOpen },
  { name: "Create Your First Card", text: "Click the 'New Card' button and write a single, atomic idea. Keep it focused on one concept.", icon: PenTool },
  { name: "Add Tags and Categories", text: "Organize your card with relevant tags and select a category using the Dewey or Luhmann system.", icon: FileText },
  { name: "Link Related Ideas", text: "Connect your card to related cards using the link feature. PendragonX will also suggest connections automatically.", icon: Link2 },
  { name: "Explore Your Knowledge Graph", text: "View your growing network of ideas in the 3D knowledge graph. Discover unexpected connections between concepts.", icon: Search }
];

const howToSchema = createHowToSchema({
  name: "How to Create Your First Zettelkasten Card in PendragonX",
  description: "Learn how to create and connect your first knowledge card in PendragonX's AI-powered Zettelkasten system in just 5 simple steps.",
  steps: howToSteps.map(step => ({ name: step.name, text: step.text }))
});

export default function Landing() {
  const navigate = useNavigate();
  const heroAnimation = useScrollAnimation(0.1);
  const valueAnimation = useScrollAnimation(0.1);
  const featuresAnimation = useScrollAnimation(0.1);
  const galleryAnimation = useScrollAnimation(0.1);
  const howToAnimation = useScrollAnimation(0.1);
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
        title="PendragonX - AI-Powered Knowledge Management & Zettelkasten System"
        description="Transform your thinking with PendragonX. Revolutionary Zettelkasten system featuring AI-powered insights, visual knowledge graphs, connected note-taking, and advanced organizational tools. Start free today."
        keywords="zettelkasten, knowledge management, note-taking, second brain, PKM, personal knowledge management, AI notes, knowledge graph, connected thinking, productivity"
        canonicalUrl="https://pendragonx.com/"
        ogImage={ogImages.home}
        jsonLd={[createFAQSchema(faqs), howToSchema]}
      />

      {/* Skip to content */}
      <a href="#main-hero" className="skip-to-main focus-visible:ring-2 focus-visible:ring-offset-2">
        Skip to main content
      </a>

      {/* Header */}
      <header className="fixed top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-border" role="banner">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <img src={pendragonLogo} alt="" className="h-7 w-7 object-contain" aria-hidden="true" />
            <span className="hidden sm:inline text-lg font-semibold tracking-tight">PendragonX</span>
          </div>
          
          <nav className="hidden md:flex gap-8" aria-label="Main navigation">
            <button onClick={() => scrollToSection('features')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</button>
            <button onClick={() => scrollToSection('pricing')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => scrollToSection('faq')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</button>
            <button onClick={() => navigate('/changelog')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Changelog</button>
          </nav>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Sign In</Button>
            <Button size="sm" onClick={() => navigate('/auth')}>
              Get Started
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
              Think
              <span className="block text-primary">Brilliantly</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Transform scattered thoughts into an intelligent knowledge network. 
              Visualize connections. Unlock insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button size="lg" className="h-11 px-8" onClick={() => navigate('/auth')}>
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-11 px-8" onClick={() => scrollToSection('features')}>
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
                10,000+ knowledge workers
              </span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
          <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
        </div>
      </section>

      {/* Value Proposition */}
      <section ref={valueAnimation.ref} className={cn(
        "py-20 md:py-28 transition-all duration-700",
        valueAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="max-w-lg mb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Why PendragonX</p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              Everything you need. Nothing you don't.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
            {[
              { icon: Brain, title: "Ideas That Connect", description: "Watch your thoughts weave together automatically. Surface forgotten insights and reveal hidden patterns." },
              { icon: Network, title: "See Your Mind", description: "Navigate your knowledge in stunning 3D. Discover connections and watch your understanding grow." },
              { icon: Layout, title: "Your Way", description: "Sketch freely, organize precisely, or let thoughts flow. PendragonX adapts to how you think." }
            ].map((item, i) => (
              <div key={i} className={cn(
                "bg-card p-8 transition-all duration-500",
                valueAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )} style={{ transitionDelay: `${i * 100}ms` }}>
                <item.icon className="h-5 w-5 text-muted-foreground mb-4" aria-hidden="true" />
                <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" ref={featuresAnimation.ref} className={cn(
        "py-20 md:py-28 bg-muted/30 transition-all duration-700",
        featuresAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Capabilities</p>
            <h2 className="text-3xl md:text-4xl font-bold">Built for Brilliant Minds</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Network, title: "Knowledge Graph", description: "Navigate your mind in 3D. Watch ideas cluster and discover surprising connections." },
              { icon: Brain, title: "AI Assistant", description: "An AI that knows you. Ask anything, get smart answers from your own notes." },
              { icon: Layout, title: "Infinite Canvas", description: "Sketch, diagram, and dream on a canvas that never ends." },
              { icon: FileText, title: "Unified Notes", description: "Notebooks, captures, sticky notes, and cards. All connected, all in one place." }
            ].map((feature, i) => (
              <div key={i} className={cn(
                "p-6 rounded-lg border border-border bg-card transition-all duration-500",
                featuresAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )} style={{ transitionDelay: `${i * 80}ms` }}>
                <feature.icon className="h-5 w-5 text-muted-foreground mb-3" aria-hidden="true" />
                <h3 className="text-base font-semibold mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section ref={galleryAnimation.ref} className={cn(
        "py-20 md:py-28 transition-all duration-700",
        galleryAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">In Action</p>
            <h2 className="text-3xl md:text-4xl font-bold">See It. Believe It.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: "Knowledge Graph", desc: "3D visualization of your connected thoughts", screenshot: "graph-view" },
              { title: "Zettelkasten Cards", desc: "Atomic notes with bidirectional links", screenshot: "zettelkasten-ui" },
              { title: "Infinite Whiteboard", desc: "Boundless space for your ideas", screenshot: "whiteboard" },
              { title: "AI Search", desc: "Find anything, understand everything", screenshot: "ai-search" }
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

      {/* How To */}
      <section id="how-to" ref={howToAnimation.ref} className={cn(
        "py-20 md:py-28 bg-muted/30 transition-all duration-700",
        howToAnimation.isVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Get Started</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">5 Simple Steps</h2>
            <p className="text-muted-foreground">Building your second brain is easier than you think</p>
          </div>

          <div className="space-y-3">
            {howToSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border border-border bg-card transition-all duration-500",
                  howToAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )} style={{ transitionDelay: `${index * 80}ms` }}>
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-0.5">{step.name}</h3>
                    <p className="text-sm text-muted-foreground">{step.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Button size="lg" className="h-11 px-8" onClick={() => navigate('/auth')}>
              Start Building Your Knowledge
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Start Free. Scale Infinitely.</h2>
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
              <p className="text-sm text-muted-foreground mb-6">Perfect for exploring connected thinking.</p>
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
              <p className="text-sm text-muted-foreground mb-6">For serious thinkers and creators.</p>
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
            Your Ideas Deserve
            <span className="block text-primary">a Better Home</span>
          </h2>
          <p className="text-muted-foreground mb-6">
            Stop letting brilliant thoughts vanish. Build a knowledge system that grows with you.
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
