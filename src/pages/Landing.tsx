import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Brain, Layout, FileText, Check, Crown, Sparkles, Heart, Zap, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";
import pendragonLogo from '@/assets/pendragon-logo.png';
import landingHero from '@/assets/landing-hero.jpg';
import landingProductivity from '@/assets/landing-productivity.jpg';
import landingBrain from '@/assets/landing-brain.jpg';
import landingCollaboration from '@/assets/landing-collaboration.jpg';

export default function Landing() {
  const navigate = useNavigate();
  const heroAnimation = useScrollAnimation(0.1);
  const valueAnimation = useScrollAnimation(0.1);
  const featuresAnimation = useScrollAnimation(0.1);
  const galleryAnimation = useScrollAnimation(0.1);
  const pricingAnimation = useScrollAnimation(0.1);
  const ctaAnimation = useScrollAnimation(0.1);
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Embossed Logo Watermark */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] md:w-[1200px] md:h-[1200px]"
          style={{
            backgroundImage: `url(${pendragonLogo})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: 0.03,
            filter: 'grayscale(100%) contrast(150%)',
          }}
        />
      </div>
      {/* Persistent Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={pendragonLogo} alt="PendragonX" className="h-8 w-8 object-contain" />
            <span className="text-xl font-bold text-primary">
              PendragonX
            </span>
          </div>
          
          <nav className="hidden md:flex gap-6">
            <button onClick={() => scrollToSection('features')} className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium hover:text-primary transition-colors">
              Pricing
            </button>
          </nav>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Login
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Register
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with Image */}
      <section 
        ref={heroAnimation.ref}
        className={cn(
          "relative overflow-hidden py-20 md:py-32 transition-all duration-1000",
          heroAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}
      >
        {/* Hero Background Image */}
        <div className="absolute inset-0">
          <img 
            src={landingHero} 
            alt="Connected knowledge network" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-background/70" />
        </div>
        
        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <div className="space-y-4">
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="h-3 w-3 mr-1" />
                Your Second Brain, Supercharged
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Think Better.{" "}
                <span className="text-primary">
                  Think Together.
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Your thoughts deserve more than folders. PendragonX weaves your ideas into an intelligent network—visualize connections, unlock insights, and watch your knowledge come alive.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Button 
                size="lg" 
                className="text-lg px-8"
                onClick={() => scrollToSection('pricing')}
              >
                <Heart className="h-5 w-5 mr-2" />
                Start Your Journey Free
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8"
                onClick={() => scrollToSection('features')}
              >
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Friendly Intro Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img 
                src={landingProductivity} 
                alt="Organized productivity" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-6">
              <Badge variant="outline" className="text-primary border-primary/30">
                <Users className="h-3 w-3 mr-1" />
                Join 10,000+ thinkers
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Finally, a home for your brilliant ideas
              </h2>
              <p className="text-lg text-muted-foreground">
                We've all been there—a great idea strikes, you jot it down somewhere, and then... it vanishes into the digital void. PendragonX is different. It's where ideas don't just get stored—they get <em>connected</em>.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-primary" />
                  No credit card required
                </div>
                <div className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-primary" />
                  Free forever plan
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section 
        ref={valueAnimation.ref}
        className={cn(
          "py-20 border-t border-border/50 transition-all duration-1000 delay-200",
          valueAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}
      >
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">Everything You Need. Nothing You Don't.</h2>
              <p className="text-lg text-muted-foreground">
                Imagine if your notes, whiteboard, and graph database had a baby with AI superpowers. That's PendragonX—where your scattered thoughts finally become a living, breathing knowledge ecosystem.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Ideas That Connect Themselves</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Say goodbye to buried files. PendragonX automatically links related ideas, surfaces forgotten insights, and helps you <em>generate</em> new content from everything you've ever captured.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-accent/20 hover:border-accent/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                    <Network className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-xl">See What You've Been Missing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Ever wish you could <em>see</em> your thoughts? Our stunning visual network reveals hidden patterns, unexpected connections, and the bigger picture your brain has been building.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Layout className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Freedom Meets Structure</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Sketch on an infinite canvas, organize with precision, or let your thoughts flow freely. PendragonX flexes to match your thinking style—however you work best.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* AI & Brain Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="space-y-6 order-2 md:order-1">
              <Badge variant="outline" className="text-accent border-accent/30">
                <Brain className="h-3 w-3 mr-1" />
                AI-Powered Intelligence
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Your AI assistant that actually knows you
              </h2>
              <p className="text-lg text-muted-foreground">
                Unlike generic AI tools, PendragonX learns from your knowledge base. Ask questions, get smart answers, and generate polished content—all based on your own ideas and research.
              </p>
              <ul className="space-y-3">
                {[
                  "Semantic search across all your content",
                  "Auto-generate summaries and connections",
                  "Smart suggestions based on your writing",
                  "Content generation from your notes"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg order-1 md:order-2">
              <img 
                src={landingBrain} 
                alt="AI-powered brain visualization" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section 
        id="features" 
        ref={featuresAnimation.ref}
        className={cn(
          "py-20 transition-all duration-1000 delay-300",
          featuresAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}
      >
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">Built for Brilliant Minds</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Every feature designed to amplify your thinking, not just organize it.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Network className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Connected Knowledge Graph</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Navigate your mind in 3D. Watch ideas cluster, discover surprising connections, and see your knowledge universe grow in real-time. It's not just pretty—it's powerful.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <Brain className="h-6 w-6 text-accent" />
                    </div>
                    <CardTitle>Generative AI Core</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Your personal AI that actually knows you. Ask anything, get smart answers, and generate polished content from your notes—like having a brilliant writing partner.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Layout className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Infinite Collaborative Canvas</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Sketch, diagram, and dream big on a canvas that never ends. Perfect for brainstorming sessions, project planning, or just letting your creativity run wild.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <FileText className="h-6 w-6 text-accent" />
                    </div>
                    <CardTitle>Unified Knowledge Base</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Traditional notebooks, quick captures, sticky notes, and powerful Zettelkasten cards. Everything talks to everything. No more choosing between tools.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Collaboration Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img 
                src={landingCollaboration} 
                alt="Team collaboration" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-6">
              <Badge variant="outline" className="text-primary border-primary/30">
                <Users className="h-3 w-3 mr-1" />
                Better Together
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Collaborate without the chaos
              </h2>
              <p className="text-lg text-muted-foreground">
                Share your knowledge, work on whiteboards together, and build a collective brain with your team. PendragonX makes collaboration feel natural, not forced.
              </p>
              <ul className="space-y-3">
                {[
                  "Real-time collaborative whiteboards",
                  "Share notes and cards with friends",
                  "Team knowledge bases",
                  "Activity feeds and updates"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshot Gallery */}
      <section 
        ref={galleryAnimation.ref}
        className={cn(
          "py-20 border-t border-border/50 transition-all duration-1000 delay-100",
          galleryAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}
      >
        <div className="container">
          <div className="mx-auto max-w-5xl space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">See It In Action</h2>
              <p className="text-lg text-muted-foreground">
                Real screenshots from PendragonX. What you see is what you get.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { 
                  title: "Visualize Your Connections", 
                  desc: "3D node graph with glowing connections",
                  screenshot: "graph-view"
                },
                { 
                  title: "Link Your Thinking", 
                  desc: "Zettelkasten cards with bidirectional links",
                  screenshot: "zettelkasten-ui"
                },
                { 
                  title: "Expand Your Ideas", 
                  desc: "Infinite whiteboard for brainstorming",
                  screenshot: "whiteboard"
                },
                { 
                  title: "Find Anything, Instantly", 
                  desc: "AI-powered semantic search",
                  screenshot: "ai-search"
                }
              ].map((item, i) => (
                <Card 
                  key={i} 
                  className={cn(
                    "overflow-hidden group hover:shadow-xl transition-all duration-500",
                    galleryAnimation.isVisible 
                      ? "opacity-100 translate-y-0" 
                      : "opacity-0 translate-y-10"
                  )}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img 
                      src={`/screenshots/${item.screenshot}.jpg`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section 
        id="pricing" 
        ref={pricingAnimation.ref}
        className={cn(
          "py-20 bg-muted/30 transition-all duration-1000 delay-200",
          pricingAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}
      >
        <div className="container">
          <div className="mx-auto max-w-5xl space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">Start Free. Grow Limitless.</h2>
              <p className="text-lg text-muted-foreground">
                Everyone starts with powerful tools. Upgrade when you're ready to unlock everything.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Tier */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-2xl">Free</CardTitle>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-muted-foreground">Forever</span>
                  </div>
                  <CardDescription className="text-base">
                    Perfect for getting started and exploring how connected thinking works.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {[
                      "Up to 50 Zettelcards",
                      "Full Note-Taking",
                      "Unlimited Notebooks",
                      "Basic Organization"
                    ].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => navigate('/auth')}
                  >
                    Start for Free
                  </Button>
                </CardContent>
              </Card>

              {/* Premium Tier */}
              <Card className="border-primary/50 shadow-lg relative">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary border-0">
                  <Crown className="h-3 w-3 mr-1" />
                  Best Value
                </Badge>
                <CardHeader>
                  <CardTitle className="text-2xl">Premium</CardTitle>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-primary">
                      $4.99
                    </span>
                    <span className="text-muted-foreground">per month</span>
                  </div>
                  <CardDescription className="text-base">
                    For serious thinkers, creators, and anyone building something big.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    <li className="font-semibold text-foreground">Everything in Free, plus:</li>
                    {[
                      "Unlimited Zettelcards",
                      "Advanced Knowledge Graph",
                      "Unlimited Whiteboards",
                      "Generative AI Content",
                      "AI-Powered Search",
                      "Catalyst Writing Tool",
                      "Collaboration Features",
                      "Priority Support"
                    ].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full"
                    onClick={() => navigate('/auth')}
                  >
                    Try 7 Days Free
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section 
        ref={ctaAnimation.ref}
        className={cn(
          "py-20 border-t border-border/50 transition-all duration-1000",
          ctaAnimation.isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        <div className="container">
          <div className="mx-auto max-w-3xl text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold">
                Your Ideas Deserve Better
              </h2>
              <p className="text-xl text-muted-foreground">
                Stop letting brilliant thoughts vanish into digital void. Build a knowledge system that grows smarter with you—one that connects, surprises, and inspires. Your future self will thank you.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="text-lg px-8"
                onClick={() => navigate('/auth')}
              >
                <Heart className="h-5 w-5 mr-2" />
                Get Started Free
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="text-lg px-8"
                onClick={() => scrollToSection('features')}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 bg-muted/30">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={pendragonLogo} alt="PendragonX" className="h-6 w-6 object-contain" />
              <span className="text-sm text-muted-foreground">© {currentYear} PendragonX. All rights reserved.</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <button onClick={() => scrollToSection('features')} className="hover:text-primary transition-colors">
                Features
              </button>
              <button onClick={() => scrollToSection('pricing')} className="hover:text-primary transition-colors">
                Pricing
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
