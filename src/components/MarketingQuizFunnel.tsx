import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, Gift, CheckCircle2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const POPUP_STORAGE_KEY = "pendragon-quiz-popup-state";
const POPUP_DELAY_MS = 5000;
const POPUP_DISMISS_HOURS = 24;

export function MarketingQuizPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Don't show if already converted or dismissed recently
    try {
      const raw = localStorage.getItem(POPUP_STORAGE_KEY);
      if (raw) {
        const { dismissedAt, completed } = JSON.parse(raw);
        if (completed) return;
        if (dismissedAt && Date.now() - dismissedAt < POPUP_DISMISS_HOURS * 3600 * 1000) return;
      }
    } catch {}

    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setOpen(true);
    };

    // Time-based trigger (5s)
    const timer = setTimeout(trigger, POPUP_DELAY_MS);

    // Exit-intent trigger (desktop only)
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };
    if (window.matchMedia("(min-width: 768px)").matches) {
      document.addEventListener("mouseleave", onMouseLeave);
    }

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  const handleClose = (val: boolean) => {
    setOpen(val);
    if (!val) {
      try {
        localStorage.setItem(
          POPUP_STORAGE_KEY,
          JSON.stringify({ dismissedAt: Date.now(), completed: false })
        );
      } catch {}
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem(
        POPUP_STORAGE_KEY,
        JSON.stringify({ dismissedAt: Date.now(), completed: true })
      );
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-0 bg-transparent shadow-none">
        <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-2xl shadow-primary/20">
          {/* Decorative glow */}
          <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
          <div className="relative max-h-[85vh] overflow-y-auto p-6 md:p-8">
            <MarketingQuizFunnel variant="popup" onComplete={handleComplete} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const COUPON_CODE = "PENDRAGON50";

const TOOLS = [
  "Notion", "Obsidian", "Roam Research", "Evernote",
  "OneNote", "Apple Notes", "Google Keep", "Other",
];

const DURATIONS = [
  "Less than 6 months",
  "6 months – 1 year",
  "1 – 3 years",
  "3+ years",
  "I don't use any yet",
];

const SATISFACTION = [
  { value: "love", label: "I love it" },
  { value: "like", label: "It's okay" },
  { value: "dislike", label: "Not satisfied" },
  { value: "none", label: "I'm not using anything" },
];

const PRIORITIES = [
  "AI-powered features",
  "Privacy & encryption",
  "Ease of use",
  "Offline access",
  "Knowledge graph / linking",
  "Collaboration",
  "Affordability",
  "Import/export flexibility",
];

type Step = 0 | 1 | 2 | 3 | 4 | 5;

interface MarketingQuizFunnelProps {
  variant?: "section" | "popup";
  onComplete?: () => void;
}

export function MarketingQuizFunnel({ variant = "section", onComplete }: MarketingQuizFunnelProps = {}) {
  const [step, setStep] = useState<Step>(variant === "popup" ? 1 : 0);
  const [tools, setTools] = useState<string[]>([]);
  const [duration, setDuration] = useState("");
  const [satisfaction, setSatisfaction] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const animation = useScrollAnimation(0.2);

  const toggleTool = (t: string) =>
    setTools((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const togglePriority = (p: string) =>
    setPriorities((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const canNext = (): boolean => {
    if (step === 1) return tools.length > 0;
    if (step === 2) return !!duration;
    if (step === 3) return !!satisfaction;
    if (step === 4) return priorities.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("quiz_funnel_leads" as any).insert({
        email,
        tools_used: tools,
        usage_duration: duration,
        satisfaction,
        priorities,
        coupon_code: COUPON_CODE,
      } as any);
      if (error) throw error;
      setDone(true);
      setStep(5);
      onComplete?.();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const progress = step === 0 ? 0 : Math.min((step / 5) * 100, 100);

  const StepIndicator = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        <span>Step {Math.min(step, 5)} of 5</span>
        <span className="text-primary">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-accent transition-all duration-500 shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );

  const optionBase = "group relative flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]";
  const optionIdle = "border-border/60 bg-card/40 hover:border-primary/50 hover:bg-primary/5";
  const optionActive = "border-primary bg-gradient-to-r from-primary/10 to-accent/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]";

  if (done) {
    return (
      <section ref={animation.ref} className={cn(variant === "popup" ? "" : "py-20 md:py-28")}>
        <div className={cn(
          "max-w-xl mx-auto transition-all duration-700",
          variant === "popup" ? "" : "px-4",
          animation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <div className="relative overflow-hidden rounded-2xl p-8 md:p-10 text-center border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.15),transparent_60%)] pointer-events-none" />
            <div className="relative">
              <div className="inline-flex p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-5 ring-1 ring-primary/30">
                <Gift className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Your discount is ready! 🎉
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Use the code below at checkout to get <span className="font-bold text-primary">50% off</span> your first 3 months of PendragonX Premium.
              </p>
              <div className="inline-block bg-background/80 backdrop-blur border-2 border-dashed border-primary rounded-xl px-8 py-4 mb-6 shadow-lg shadow-primary/10">
                <span className="text-2xl font-mono font-bold tracking-[0.3em] text-primary">{COUPON_CODE}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                That's just <span className="font-semibold text-foreground">$2.50/month</span> instead of $4.99 — for 3 full months.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={animation.ref} id="quiz" className={cn(variant === "popup" ? "" : "py-20 md:py-28")}>
      <div className={cn(
        "max-w-xl mx-auto transition-all duration-700",
        variant === "popup" ? "" : "px-4",
        animation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        {step === 0 ? (
          <div className="text-center space-y-5">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-primary/30 mb-2">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Find out if PendragonX is right for you
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Take a 30-second quiz and unlock <span className="font-semibold text-primary">50% off</span> your first 3 months of Premium.
            </p>
            <Button size="lg" className="mt-2 group bg-gradient-to-r from-primary to-accent hover:opacity-90" onClick={() => setStep(1)}>
              Start Quiz
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        ) : (
          <div className={cn(variant === "popup" ? "" : "rounded-2xl border border-border bg-card p-6 md:p-8")}>
            {variant === "popup" && (
              <div className="flex items-center gap-2 mb-5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-primary/30">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">PendragonX Quiz</span>
              </div>
            )}
            <StepIndicator />

            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <div>
                  <h3 className="text-xl font-bold text-foreground tracking-tight">Which note-taking tools do you use?</h3>
                  <p className="text-sm text-muted-foreground mt-1">Select all that apply.</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {TOOLS.map((t) => (
                    <label key={t} className={cn(optionBase, tools.includes(t) ? optionActive : optionIdle)}>
                      <Checkbox checked={tools.includes(t)} onCheckedChange={() => toggleTool(t)} />
                      <span className="text-sm font-medium">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <h3 className="text-xl font-bold text-foreground tracking-tight">How long have you used tools like these?</h3>
                <RadioGroup value={duration} onValueChange={setDuration} className="space-y-2">
                  {DURATIONS.map((d) => (
                    <label key={d} className={cn(optionBase, duration === d ? optionActive : optionIdle)}>
                      <RadioGroupItem value={d} />
                      <span className="text-sm font-medium">{d}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <h3 className="text-xl font-bold text-foreground tracking-tight">How do you feel about your current tool?</h3>
                <RadioGroup value={satisfaction} onValueChange={setSatisfaction} className="space-y-2">
                  {SATISFACTION.map((s) => (
                    <label key={s.value} className={cn(optionBase, satisfaction === s.value ? optionActive : optionIdle)}>
                      <RadioGroupItem value={s.value} />
                      <span className="text-sm font-medium">{s.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <div>
                  <h3 className="text-xl font-bold text-foreground tracking-tight">What matters most to you?</h3>
                  <p className="text-sm text-muted-foreground mt-1">Select all that apply.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRIORITIES.map((p) => (
                    <label key={p} className={cn(optionBase, priorities.includes(p) ? optionActive : optionIdle)}>
                      <Checkbox checked={priorities.includes(p)} onCheckedChange={() => togglePriority(p)} />
                      <span className="text-sm font-medium">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/60">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>

              {step < 4 ? (
                <Button
                  size="sm"
                  disabled={!canNext()}
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  className="gap-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={!canNext()}
                  onClick={() => setStep(5 as Step)}
                  className="gap-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  Almost done <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Email step */}
        {step === 5 && !done && (
          <div className={cn(variant === "popup" ? "" : "rounded-2xl border border-border bg-card p-6 md:p-8")}>
            <StepIndicator />
            <div className="space-y-4 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-primary/30">
                <Gift className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">
                Unlock your 50% discount
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Enter your email and we'll send your exclusive code for <span className="font-semibold text-primary">50% off the first 3 months</span>.
              </p>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="max-w-sm mx-auto h-11 text-center bg-background/50 border-border/60 focus-visible:ring-primary"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                size="lg"
                className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30"
              >
                {submitting ? "Submitting…" : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Get My Discount
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
            </div>
            <div className="flex items-center mt-4 pt-4 border-t border-border/60">
              <Button variant="ghost" size="sm" onClick={() => setStep(4)} className="gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
