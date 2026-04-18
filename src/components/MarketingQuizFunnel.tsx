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
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden border-primary/30">
        <div className="max-h-[85vh] overflow-y-auto p-6 md:p-8">
          <MarketingQuizFunnel variant="popup" onComplete={handleComplete} />
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
    <div className="w-full h-1.5 rounded-full bg-muted mb-6 overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  );

  if (done) {
    return (
      <section ref={animation.ref} className={cn(variant === "popup" ? "" : "py-20 md:py-28")}>
        <div className={cn(
          "max-w-xl mx-auto px-4 transition-all duration-700",
          animation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <Card className="p-8 md:p-10 text-center border-primary/30 bg-primary/5">
            <div className="inline-flex p-4 rounded-full bg-primary/10 mb-5">
              <Gift className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
              Your discount is ready! 🎉
            </h3>
            <p className="text-muted-foreground mb-6">
              Use the code below at checkout to get <span className="font-bold text-primary">50% off</span> your first 3 months of PendragonX Premium.
            </p>
            <div className="inline-block bg-background border-2 border-dashed border-primary rounded-xl px-8 py-4 mb-6">
              <span className="text-2xl font-mono font-bold tracking-widest text-primary">{COUPON_CODE}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              That's just <span className="font-semibold">$2.50/month</span> instead of $4.99 — for 3 full months.
            </p>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section ref={animation.ref} id="quiz" className={cn(variant === "popup" ? "" : "py-20 md:py-28")}>
      <div className={cn(
        "max-w-xl mx-auto px-4 transition-all duration-700",
        animation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        {step === 0 ? (
          <div className="text-center space-y-5">
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-2">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Find out if PendragonX is right for you
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Take a 30-second quiz and unlock <span className="font-semibold text-primary">50% off</span> your first 3 months of Premium.
            </p>
            <Button size="lg" className="mt-2 group" onClick={() => setStep(1)}>
              Start Quiz
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        ) : (
          <Card className="p-6 md:p-8">
            <StepIndicator />

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Which note-taking tools do you use?</h3>
                <p className="text-sm text-muted-foreground">Select all that apply.</p>
                <div className="grid grid-cols-2 gap-3">
                  {TOOLS.map((t) => (
                    <label
                      key={t}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                        tools.includes(t)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <Checkbox
                        checked={tools.includes(t)}
                        onCheckedChange={() => toggleTool(t)}
                      />
                      <span className="text-sm">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">How long have you used tools like these?</h3>
                <RadioGroup value={duration} onValueChange={setDuration} className="space-y-2">
                  {DURATIONS.map((d) => (
                    <label
                      key={d}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        duration === d ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      )}
                    >
                      <RadioGroupItem value={d} />
                      <span className="text-sm">{d}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">How do you feel about your current tool?</h3>
                <RadioGroup value={satisfaction} onValueChange={setSatisfaction} className="space-y-2">
                  {SATISFACTION.map((s) => (
                    <label
                      key={s.value}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        satisfaction === s.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      )}
                    >
                      <RadioGroupItem value={s.value} />
                      <span className="text-sm">{s.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">What matters most to you?</h3>
                <p className="text-sm text-muted-foreground">Select all that apply.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRIORITIES.map((p) => (
                    <label
                      key={p}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                        priorities.includes(p)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <Checkbox
                        checked={priorities.includes(p)}
                        onCheckedChange={() => togglePriority(p)}
                      />
                      <span className="text-sm">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>

              {step < 4 ? (
                <Button
                  size="sm"
                  disabled={!canNext()}
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  className="gap-1"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={!canNext()}
                  onClick={() => setStep(5 as Step)}
                  className="gap-1"
                >
                  Almost done <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Email step (step 5 but before submission) */}
        {step === 5 && !done && (
          <Card className="p-6 md:p-8 mt-0">
            <StepIndicator />
            <div className="space-y-4 text-center">
              <div className="inline-flex p-3 rounded-full bg-primary/10 mb-1">
                <Gift className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Unlock your 50% discount
              </h3>
              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send your exclusive code for <span className="font-semibold text-primary">50% off the first 3 months</span>.
              </p>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="max-w-sm mx-auto"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="gap-2"
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
            <div className="flex items-center mt-4 pt-4 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setStep(4)} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
