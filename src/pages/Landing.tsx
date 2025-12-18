import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Brain, Layout, FileText, Check, Crown, Sparkles, Heart, Zap, Users, ArrowRight, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";
import pendragonLogo from '@/assets/pendragon-logo.png';
import { useEffect, useState } from "react";
import { LandingBackground } from "@/components/LandingBackground";
export default function Landing() {
  const navigate = useNavigate();
  const heroAnimation = useScrollAnimation(0.1);
  const valueAnimation = useScrollAnimation(0.1);
  const featuresAnimation = useScrollAnimation(0.1);
  const galleryAnimation = useScrollAnimation(0.1);
  const pricingAnimation = useScrollAnimation(0.1);
  const ctaAnimation = useScrollAnimation(0.1);
  const currentYear = new Date().getFullYear();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Theme-aware animated background */}
      <LandingBackground />

      {/* Embossed Logo Watermark - Parallax Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] md:w-[1400px] md:h-[1400px] transition-transform duration-700 ease-out"
          style={{
            backgroundImage: `url(${pendragonLogo})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: 0.04,
            filter: 'grayscale(100%) contrast(120%)',
            transform: `translate(calc(-50% + ${mousePosition.x}px), calc(-50% + ${mousePosition.y}px))`,
            mixBlendMode: 'soft-light',
          }}
        />
      </div>

      {/* Persistent Header - Ultra Minimal */}
      <header className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/20">
        <div className="container flex h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={pendragonLogo} alt="PendragonX" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold tracking-tight">
              PendragonX
            </span>
          </div>
          
          <nav className="hidden md:flex gap-8">
            <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </button>
          </nav>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')} className="text-sm">
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')} className="text-sm px-6">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Full Viewport, Dramatic */}
      <section 
        ref={heroAnimation.ref}
        className="min-h-screen flex items-center justify-center relative pt-20"
      >
        <div className="container relative z-10">
          <div 
            className={cn(
              "mx-auto max-w-5xl text-center space-y-8 transition-all duration-1000",
              heroAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
            )}
          >
            {/* Overline */}
            <div className="flex justify-center">
              <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
                <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                Your Second Brain, Evolved
              </Badge>
            </div>

            {/* Main Headline - Dramatic Typography */}
            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9]">
                <span className="block">Think</span>
                <span className="block text-primary">
                  Brilliantly
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
                Transform scattered thoughts into an intelligent knowledge network. 
                Visualize connections. Unlock insights. Create something extraordinary.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="text-lg px-10 h-14 rounded-full"
                onClick={() => navigate('/auth')}
              >
                Start Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-10 h-14 rounded-full"
                onClick={() => scrollToSection('features')}
              >
                See How It Works
              </Button>
            </div>

            {/* Social Proof */}
            <div className="pt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                No credit card required
              </span>
              <span className="hidden sm:flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                10,000+ knowledge workers
              </span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-6 w-6 text-muted-foreground" />
        </div>
      </section>

      {/* Value Grid - Asymmetric Layout */}
      <section 
        ref={valueAnimation.ref}
        className={cn(
          "py-32 transition-all duration-1000",
          valueAnimation.isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="container">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="max-w-2xl mb-20">
              <p className="text-primary font-medium mb-4 tracking-wide uppercase text-sm">Why PendragonX</p>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Everything you need. Nothing you don't.
              </h2>
            </div>

            {/* Asymmetric Value Cards */}
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  title: "Ideas That Connect",
                  description: "Watch your thoughts weave together automatically. PendragonX surfaces forgotten insights and reveals hidden patterns in your thinking.",
                  delay: 0
                },
                {
                  icon: Network,
                  title: "See Your Mind",
                  description: "Navigate your knowledge in stunning 3D. Discover unexpected connections and watch your understanding grow in real-time.",
                  delay: 100
                },
                {
                  icon: Layout,
                  title: "Your Way",
                  description: "Sketch freely, organize precisely, or let thoughts flow. PendragonX adapts to how you think—not the other way around.",
                  delay: 200
                }
              ].map((item, i) => (
                <div 
                  key={i}
                  className={cn(
                    "group relative p-8 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-xl",
                    valueAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                  )}
                  style={{ transitionDelay: `${item.delay}ms` }}
                >
                  <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                      <item.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase - Large Format */}
      <section 
        id="features" 
        ref={featuresAnimation.ref}
        className={cn(
          "py-32 bg-muted/30 transition-all duration-1000",
          featuresAnimation.isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="container">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-20">
              <p className="text-primary font-medium mb-4 tracking-wide uppercase text-sm">Capabilities</p>
              <h2 className="text-4xl md:text-5xl font-bold">
                Built for Brilliant Minds
              </h2>
            </div>

            {/* Feature Grid - 2x2 */}
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: Network,
                  title: "Knowledge Graph",
                  subtitle: "Visualize connections",
                  description: "Navigate your mind in 3D. Watch ideas cluster, discover surprising connections, and see your knowledge universe grow.",
                  accent: "primary"
                },
                {
                  icon: Brain,
                  title: "AI Assistant",
                  subtitle: "Your thinking partner",
                  description: "An AI that actually knows you. Ask anything, get smart answers, and generate content from your own notes.",
                  accent: "secondary"
                },
                {
                  icon: Layout,
                  title: "Infinite Canvas",
                  subtitle: "Unlimited space",
                  description: "Sketch, diagram, and dream on a canvas that never ends. Perfect for brainstorming and visual thinking.",
                  accent: "primary"
                },
                {
                  icon: FileText,
                  title: "Unified Notes",
                  subtitle: "Everything connected",
                  description: "Notebooks, quick captures, sticky notes, and Zettelkasten cards. All talking to each other, all in one place.",
                  accent: "secondary"
                }
              ].map((feature, i) => (
                <div 
                  key={i}
                  className={cn(
                    "group relative p-10 rounded-3xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-500",
                    featuresAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                  )}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-start gap-6">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110",
                      feature.accent === "primary" ? "bg-primary/10" : "bg-secondary/10"
                    )}>
                      <feature.icon className={cn(
                        "h-8 w-8",
                        feature.accent === "primary" ? "text-primary" : "text-secondary"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{feature.subtitle}</p>
                      <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Screenshot Gallery - Editorial Style */}
      <section 
        ref={galleryAnimation.ref}
        className={cn(
          "py-32 transition-all duration-1000",
          galleryAnimation.isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="container">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <p className="text-primary font-medium mb-4 tracking-wide uppercase text-sm">In Action</p>
              <h2 className="text-4xl md:text-5xl font-bold">
                See It. Believe It.
              </h2>
            </div>

            {/* Gallery Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {[
                { 
                  title: "Knowledge Graph", 
                  desc: "3D visualization of your connected thoughts",
                  screenshot: "graph-view"
                },
                { 
                  title: "Zettelkasten Cards", 
                  desc: "Atomic notes with bidirectional links",
                  screenshot: "zettelkasten-ui"
                },
                { 
                  title: "Infinite Whiteboard", 
                  desc: "Boundless space for your ideas",
                  screenshot: "whiteboard"
                },
                { 
                  title: "AI Search", 
                  desc: "Find anything, understand everything",
                  screenshot: "ai-search"
                }
              ].map((item, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "group relative overflow-hidden rounded-2xl bg-muted/50 transition-all duration-500",
                    galleryAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                  )}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <img 
                      src={`/screenshots/${item.screenshot}.jpg`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Clean & Clear */}
      <section 
        id="pricing" 
        ref={pricingAnimation.ref}
        className={cn(
          "py-32 bg-muted/30 transition-all duration-1000",
          pricingAnimation.isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="container">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <p className="text-primary font-medium mb-4 tracking-wide uppercase text-sm">Pricing</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Start Free. Scale Infinitely.
              </h2>
              <p className="text-xl text-muted-foreground">
                No surprises. No hidden fees. Just powerful tools.
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Tier */}
              <Card className="relative border-border/50 p-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">Free</CardTitle>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-bold">$0</span>
                    <span className="text-muted-foreground">forever</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground">Perfect for exploring connected thinking.</p>
                  <ul className="space-y-3">
                    {["Up to 50 Zettelcards", "Full Note-Taking", "Unlimited Notebooks", "Basic Organization"].map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full h-12 rounded-full" 
                    variant="outline"
                    onClick={() => navigate('/auth')}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>

              {/* Premium Tier */}
              <Card className="relative border-primary/50 p-2 shadow-xl">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary border-0 px-4 py-1">
                    <Crown className="h-3.5 w-3.5 mr-1.5" />
                    Most Popular
                  </Badge>
                </div>
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">Premium</CardTitle>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-bold text-primary">$4.99</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground">For serious thinkers and creators.</p>
                  <ul className="space-y-3">
                    {[
                      "Unlimited Zettelcards",
                      "Advanced Knowledge Graph",
                      "Unlimited Whiteboards",
                      "AI-Powered Everything",
                      "Collaboration Features",
                      "Priority Support"
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full h-12 rounded-full"
                    onClick={() => navigate('/auth')}
                  >
                    Try 7 Days Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Dramatic */}
      <section 
        ref={ctaAnimation.ref}
        className="py-32 relative overflow-hidden"
      >
        <div className="container relative z-10">
          <div 
            className={cn(
              "mx-auto max-w-3xl text-center space-y-8 transition-all duration-1000",
              ctaAnimation.isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
          >
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              Your Ideas Deserve
              <span className="block text-primary">a Better Home</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">
              Stop letting brilliant thoughts vanish. Build a knowledge system that grows with you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg"
                className="text-lg px-10 h-14 rounded-full"
                onClick={() => navigate('/auth')}
              >
                <Heart className="h-5 w-5 mr-2" />
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-border/50 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src={pendragonLogo} alt="PendragonX" className="h-8 w-8 object-contain" />
              <span className="font-medium">PendragonX</span>
              <span className="text-muted-foreground">© {currentYear}</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <button onClick={() => scrollToSection('features')} className="hover:text-foreground transition-colors">
                Features
              </button>
              <button onClick={() => scrollToSection('pricing')} className="hover:text-foreground transition-colors">
                Pricing
              </button>
              <button onClick={() => navigate('/terms')} className="hover:text-foreground transition-colors">
                Terms
              </button>
              <button onClick={() => navigate('/privacy')} className="hover:text-foreground transition-colors">
                Privacy
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('openCookieSettings'))} 
                className="hover:text-foreground transition-colors"
              >
                Cookies
              </button>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
