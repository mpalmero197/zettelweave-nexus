import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Brain, Layout, FileText, Check, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";
import pendragonLogo from '@/assets/pendragon-logo.png';

export default function Landing() {
  const navigate = useNavigate();
  const heroAnimation = useScrollAnimation(0.1);
  const valueAnimation = useScrollAnimation(0.1);
  const featuresAnimation = useScrollAnimation(0.1);
  const galleryAnimation = useScrollAnimation(0.1);
  const pricingAnimation = useScrollAnimation(0.1);
  const ctaAnimation = useScrollAnimation(0.1);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Persistent Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={pendragonLogo} alt="PendragonX" className="h-8 w-8 object-contain" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
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

      {/* Hero Section */}
      <section 
        ref={heroAnimation.ref}
        className={cn(
          "relative overflow-hidden py-20 md:py-32 transition-all duration-1000",
          heroAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.1),transparent_50%)]" />
        
        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Stop Organizing.{" "}
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
                  Start Connecting.
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                PendragonX is the all-in-one knowledge engine that transforms your scattered notes into a visual, intelligent, and interconnected second brain.
              </p>
            </div>

            <div className="pt-8">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-lg px-8"
                onClick={() => scrollToSection('pricing')}
              >
                Start Building Your Mind
              </Button>
            </div>
          </div>
        </div>

        {/* Animated background effect */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent rounded-full blur-3xl animate-pulse delay-1000" />
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
              <h2 className="text-3xl md:text-4xl font-bold">The End of App-Switching</h2>
              <p className="text-lg text-muted-foreground">
                You shouldn't need three different tools to manage your life's work. PendragonX unifies the fragmented parts of your knowledge workflow into one powerful, streamlined system.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-primary/20 hover:border-primary/50 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-xl">From Silos to Synthesis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Move beyond static, buried files. Our platform is built to link, visualize, and <em>generate</em> new insights from your existing knowledge, turning notes into essays, books, or entire projects.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-accent/20 hover:border-accent/50 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-xl">A Graph That Understands You</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Don't just store information, <em>see</em> it. Our world-class, responsive network graph reveals the hidden patterns and relationships between every thought you've ever had.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 hover:border-primary/50 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-xl">Your Ideas, Infinite Space</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Combine the structure of notes, the freedom of an infinite collaborative whiteboard, and the power of a Zettelkasten. All in one place.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section 
        id="features" 
        ref={featuresAnimation.ref}
        className={cn(
          "py-20 bg-gradient-to-b from-background to-primary/5 transition-all duration-1000 delay-300",
          featuresAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}
      >
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">A Toolset for Deep Thinkers</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300">
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
                    A high-performance visual graph to navigate your Zettelkasten. Filter, group, and explore the connections between your notes.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg hover:shadow-accent/20 transition-all duration-300">
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
                    Use your <em>entire</em> knowledge base to generate long-form content. Ask questions in natural language, even with misspellings.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300">
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
                    Brainstorm, plan, and map ideas with your team (or just yourself) on an endless whiteboard that lives alongside your notes.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg hover:shadow-accent/20 transition-all duration-300">
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
                    Notebooks, standalone notes, a quick scratchpad, and bi-directional linking. All the tools you expect, finally working together.
                  </CardDescription>
                </CardContent>
              </Card>
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
              <h2 className="text-3xl md:text-4xl font-bold">See the Platform in Action</h2>
              <p className="text-lg text-muted-foreground">
                Explore the powerful features that make PendragonX the ultimate knowledge management system.
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
                  screenshot: "zettelkasten"
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
                      : "opacity-0 translate-y-10",
                    `delay-[${i * 100}ms]`
                  )}
                >
                  <div className="aspect-video overflow-hidden bg-gradient-to-br from-background to-muted">
                    <img 
                      src={`/screenshots/${item.screenshot}.jpg`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
          "py-20 bg-gradient-to-b from-background to-accent/5 transition-all duration-1000 delay-200",
          pricingAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}
      >
        <div className="container">
          <div className="mx-auto max-w-5xl space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">Choose Your Path</h2>
              <p className="text-lg text-muted-foreground">
                Start for free and upgrade when you're ready for limitless power.
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
                    For organizing your ideas and making new connections.
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
              <Card className="border-primary/50 shadow-lg shadow-primary/20 relative">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent border-0">
                  <Crown className="h-3 w-3 mr-1" />
                  Best Value
                </Badge>
                <CardHeader>
                  <CardTitle className="text-2xl">Premium</CardTitle>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      $4.99
                    </span>
                    <span className="text-muted-foreground">per month</span>
                  </div>
                  <CardDescription className="text-base">
                    For professionals, creators, and power-users.
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
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    onClick={() => navigate('/auth')}
                  >
                    Go Premium
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
                Your Second Brain is Waiting.
              </h2>
              <p className="text-xl text-muted-foreground">
                Stop letting your best ideas fade away. Give them a home. Connect them. Build something lasting.
              </p>
            </div>
            <Button 
              size="lg"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-lg px-8"
              onClick={() => navigate('/auth')}
            >
              Sign Up Now (It's Free)
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/pendragon-logo.png" alt="PendragonX" className="h-6 w-6" />
              <span className="text-sm text-muted-foreground">© 2024 PendragonX. All rights reserved.</span>
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
