import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sparkles, User as UserIcon, Palette, LayoutDashboard, Plus, Pencil,
  Upload, FileText, Bot, PartyPopper, ChevronRight, ChevronLeft, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- */
/* Types                                                            */
/* ---------------------------------------------------------------- */

type StepKey =
  | "welcome" | "profile" | "theme" | "dashboard" | "create-card"
  | "edit-card" | "import" | "catalyst" | "alice" | "done";

interface Step {
  key: StepKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Element to highlight on desktop (CSS selector). */
  desktopTarget?: string;
  /** Element to highlight on mobile (CSS selector). */
  mobileTarget?: string;
  /** Tab to navigate to before pointing. */
  navigateTab?: string;
  /** Optional custom body for steps without a target (welcome/profile/done). */
  body?: React.ReactNode;
}

/* ---------------------------------------------------------------- */
/* Hooks                                                            */
/* ---------------------------------------------------------------- */

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

/** Find an element by selector, polling briefly while it mounts. */
function useTargetRect(selector: string | undefined, deps: unknown[] = []) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!selector) { setRect(null); return; }
    let raf = 0;
    let attempts = 0;
    const tick = () => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        // Make sure the element is visible inside the viewport before measuring.
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        // Defer one frame so any scrolling settles.
        raf = requestAnimationFrame(() => setRect(el.getBoundingClientRect()));
        return;
      }
      if (attempts++ < 30) { raf = requestAnimationFrame(tick); }
      else setRect(null);
    };
    tick();

    const onChange = () => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, ...deps]);

  return rect;
}

/* ---------------------------------------------------------------- */
/* Spotlight + tooltip                                              */
/* ---------------------------------------------------------------- */

interface SpotlightProps {
  rect: DOMRect | null;
  children: React.ReactNode;
}

/** Renders a dimmed overlay with a glowing cutout around the target rect. */
function Spotlight({ rect, children }: SpotlightProps) {
  // Padding around the target so the highlight isn't flush.
  const PAD = 8;
  const r = rect
    ? {
        top: Math.max(rect.top - PAD, 0),
        left: Math.max(rect.left - PAD, 0),
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dim with a hole punched out via 4 absolute divs (works without SVG masks) */}
      {r ? (
        <>
          <div className="absolute bg-foreground/60 backdrop-blur-[1px] pointer-events-auto" style={{ top: 0, left: 0, right: 0, height: r.top }} />
          <div className="absolute bg-foreground/60 backdrop-blur-[1px] pointer-events-auto" style={{ top: r.top + r.height, left: 0, right: 0, bottom: 0 }} />
          <div className="absolute bg-foreground/60 backdrop-blur-[1px] pointer-events-auto" style={{ top: r.top, left: 0, width: r.left, height: r.height }} />
          <div className="absolute bg-foreground/60 backdrop-blur-[1px] pointer-events-auto" style={{ top: r.top, left: r.left + r.width, right: 0, height: r.height }} />
          {/* Glow ring */}
          <div
            className="absolute rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse pointer-events-none"
            style={{ top: r.top, left: r.left, width: r.width, height: r.height, transition: "all 250ms ease" }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-foreground/60 backdrop-blur-[1px] pointer-events-auto" />
      )}
      {children}
    </div>,
    document.body,
  );
}

/* ---------------------------------------------------------------- */
/* Tooltip card placement                                           */
/* ---------------------------------------------------------------- */

function placeTooltip(rect: DOMRect | null) {
  const W = 340;
  const H = 220;
  const M = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!rect) {
    return { top: vh / 2 - H / 2, left: vw / 2 - W / 2, arrow: null as null | "top" | "bottom" | "left" | "right" };
  }
  // Prefer below, then above, then right, then left
  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;
  const spaceRight = vw - rect.right;
  const spaceLeft = rect.left;
  let top = 0, left = 0; let arrow: "top" | "bottom" | "left" | "right" = "top";
  if (spaceBelow >= H + M) {
    top = rect.bottom + M; left = clamp(rect.left + rect.width / 2 - W / 2, M, vw - W - M); arrow = "top";
  } else if (spaceAbove >= H + M) {
    top = rect.top - H - M; left = clamp(rect.left + rect.width / 2 - W / 2, M, vw - W - M); arrow = "bottom";
  } else if (spaceRight >= W + M) {
    left = rect.right + M; top = clamp(rect.top + rect.height / 2 - H / 2, M, vh - H - M); arrow = "left";
  } else if (spaceLeft >= W + M) {
    left = rect.left - W - M; top = clamp(rect.top + rect.height / 2 - H / 2, M, vh - H - M); arrow = "right";
  } else {
    top = vh / 2 - H / 2; left = vw / 2 - W / 2; arrow = "top";
  }
  return { top, left, arrow };
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/* ---------------------------------------------------------------- */
/* Main component                                                   */
/* ---------------------------------------------------------------- */

export function OnboardingTutorial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobile, setMobile] = useState(isMobile());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkedRef = useRef(false);

  // First-login detection
  useEffect(() => {
    if (!user || checkedRef.current) return;
    checkedRef.current = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data || !data.onboarding_completed) {
        setDisplayName(data?.display_name ?? "");
        setAvatarUrl(data?.avatar_url ?? "");
        setOpen(true);
      }
    })();
  }, [user]);

  // Track viewport changes (so a window-resize switches between desktop/mobile targets).
  useEffect(() => {
    const onResize = () => setMobile(isMobile());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (e: any) {
      toast.error(e?.message || "Could not upload avatar");
    } finally { setUploading(false); }
  };

  const saveProfile = async () => {
    if (!user) return false;
    if (!displayName.trim()) { toast.error("Please enter a display name"); return false; }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, display_name: displayName.trim(), avatar_url: avatarUrl || null }, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const finish = async () => {
    if (!user) return;
    await supabase.from("profiles").upsert({ user_id: user.id, onboarding_completed: true }, { onConflict: "user_id" });
    setOpen(false);
    toast.success("You're all set — welcome to PendragonX!");
  };

  const skip = async () => {
    if (user) {
      await supabase.from("profiles").upsert({ user_id: user.id, onboarding_completed: true }, { onConflict: "user_id" });
    }
    setOpen(false);
  };

  /* ---------- Tutorial steps ---------- */

  const steps: Step[] = [
    {
      key: "welcome",
      title: "Welcome — let's beat the blank page",
      description: "A 2-minute guided path so you know exactly where to begin.",
      icon: Sparkles,
      body: (
        <div className="space-y-2.5 text-sm text-muted-foreground">
          <p>
            PendragonX can feel like a lot at first. So here's the <span className="text-foreground font-medium">one path</span> we recommend for your first 10 minutes:
          </p>
          <ol className="space-y-1 pl-4 list-decimal marker:text-primary marker:font-semibold">
            <li><span className="text-foreground">Set your profile</span> — so collaborators recognize you.</li>
            <li><span className="text-foreground">Pick a theme</span> — make it yours in one click.</li>
            <li><span className="text-foreground">Create one card</span> — the smallest unit of thought.</li>
            <li><span className="text-foreground">Link it to another</span> — that's where the magic starts.</li>
            <li><span className="text-foreground">Ask ALICE something</span> — your AI knows your knowledge.</li>
          </ol>
          <p className="text-[11px]">Skip anytime — you can replay this tour from Settings.</p>
        </div>
      ),
    },
    {
      key: "profile",
      title: "Step 1 — Your identity",
      description: "Takes 15 seconds. How collaborators and ALICE address you.",
      icon: UserIcon,
      body: (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>{displayName.slice(0, 2).toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Display name (e.g. your first name)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                className="h-8"
              />
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="h-7 text-xs">
                {uploading ? "Uploading…" : avatarUrl ? "Change avatar" : "Upload avatar"}
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ALICE will greet you by name and your avatar shows up on shared cards, Collab chats, and project comments. Change anytime in Settings → Account.
          </p>
        </div>
      ),
    },
    {
      key: "theme",
      title: "Step 2 — Make it yours",
      description: "Tap the palette to switch color schemes. Try a dark theme for night writing or a warm theme for journaling — it changes the whole feel.",
      icon: Palette,
      desktopTarget: '[data-onboarding="theme-switcher"]',
      mobileTarget: '[data-onboarding="mobile-nav-fab"]',
    },
    {
      key: "dashboard",
      title: "Step 3 — Your home base",
      description: "This Dashboard is your daily launchpad. Every widget is clickable: Resume picks up your last note, Next Task starts a focus timer, Upcoming jumps to your calendar. When in doubt, come back here — it always shows what to do next.",
      icon: LayoutDashboard,
      navigateTab: "dashboard",
      desktopTarget: '#main-content',
      mobileTarget: '#main-content',
    },
    {
      key: "create-card",
      title: "Step 4 — Write one card",
      description: "Cards are atomic ideas — one thought per card (a quote, a definition, a half-formed thesis). Click + and type anything. ALICE auto-suggests tags, category, and related cards while you write. Don't overthink it: a 2-sentence card is perfect.",
      icon: Plus,
      navigateTab: "cards",
      desktopTarget: '[data-onboarding="create-card-button"]',
      mobileTarget: '[data-onboarding="create-card-button"]',
    },
    {
      key: "edit-card",
      title: "Step 5 — Link cards with [[wikilinks]]",
      description: "This is the superpower. Inside any card, type [[ and the title of another card — PendragonX connects them. Linked cards form your knowledge graph, surface as backlinks, and feed ALICE's answers. Two cards + one link = a second brain.",
      icon: Pencil,
      navigateTab: "cards",
      desktopTarget: '[data-onboarding="nav-cards"]',
      mobileTarget: '[data-onboarding="mobile-nav-fab"]',
    },
    {
      key: "import",
      title: "Already have notes? Bring them in",
      description: "Open the Toolbox to import from Obsidian (.md), Notion, Evernote (.enex), Google Docs, OneDrive, or paste a URL. Wikilinks are preserved and resolved after import. Start with one notebook — you don't have to migrate everything at once.",
      icon: Upload,
      desktopTarget: '[data-onboarding="toolbox-button"]',
      mobileTarget: '[data-onboarding="mobile-nav-fab"]',
    },
    {
      key: "catalyst",
      title: "When cards aren't enough — Catalyst",
      description: "Catalyst is for long-form: essays, chapters, blog posts. Your cards become reference material in the sidebar, and AI agents (Researcher, Editor, Citer) work alongside you. Use Cards for ideas, Catalyst for the final draft.",
      icon: FileText,
      navigateTab: "catalyst",
      desktopTarget: '[data-onboarding="nav-catalyst"]',
      mobileTarget: '[data-onboarding="mobile-nav-fab"]',
    },
    {
      key: "alice",
      title: "Step 6 — Ask ALICE anything",
      description: 'ALICE reads your whole knowledge base. Try: "What did I write about stoicism?", "Summarize my project notes from this week", or "Remind me tomorrow to finish chapter 3." She cites sources and can run multi-step actions.',
      icon: Bot,
      desktopTarget: '[data-onboarding="alice-fab"]',
      mobileTarget: '[data-onboarding="alice-fab"]',
    },
    {
      key: "done",
      title: "You're set — here's what to do today",
      description: "",
      icon: PartyPopper,
      body: (
        <div className="space-y-2.5 text-sm text-muted-foreground">
          <p className="text-foreground font-medium">Your first session checklist:</p>
          <ul className="space-y-1.5 pl-1">
            <li className="flex gap-2"><span className="text-primary">→</span> Create 3 cards on something you're thinking about</li>
            <li className="flex gap-2"><span className="text-primary">→</span> Link at least 2 of them with [[wikilinks]]</li>
            <li className="flex gap-2"><span className="text-primary">→</span> Ask ALICE to summarize what you wrote</li>
          </ul>
          <p className="text-[11px]">
            Lost later? Click the <span className="text-foreground">?</span> in Settings to replay this tour, or just ask ALICE "where do I start?"
          </p>
        </div>
      ),
    },
  ];

  const step = steps[stepIndex];
  const targetSelector = mobile ? step.mobileTarget : step.desktopTarget;

  // Navigate to the relevant tab before pointing.
  useEffect(() => {
    if (!open) return;
    if (step.navigateTab) {
      navigate(`/app/${step.navigateTab}`);
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: step.navigateTab }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex]);

  const rect = useTargetRect(open ? targetSelector : undefined, [stepIndex, mobile]);

  if (!open) return null;

  const Icon = step.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const isProfileStep = step.key === "profile";

  const handleNext = async () => {
    if (isProfileStep) { const ok = await saveProfile(); if (!ok) return; }
    if (isLast) { await finish(); return; }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const placement = placeTooltip(rect);

  return (
    <Spotlight rect={rect}>
      <div
        role="dialog"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-desc"
        className="absolute pointer-events-auto rounded-lg border border-border bg-card shadow-2xl animate-fade-in"
        style={{
          top: placement.top,
          left: placement.left,
          width: 340,
          maxWidth: "calc(100vw - 24px)",
        }}
      >
        <div className="flex items-start gap-3 p-4 pb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <h2 id="onboarding-title" className="text-base font-semibold leading-tight mt-0.5">{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={skip}
            aria-label="Close tutorial"
            className="text-muted-foreground hover:text-foreground transition-colors -mr-1 -mt-1 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <Progress value={((stepIndex + 1) / steps.length) * 100} className="h-1" />
        </div>

        <div className="px-4 pb-3 max-h-[55vh] overflow-y-auto" id="onboarding-desc">
          {step.body || (
            <p className="text-sm text-muted-foreground">{step.description}</p>
          )}
        </div>

        <div className={cn(
          "flex items-center justify-between gap-2 border-t border-border px-3 py-2",
        )}>
          <Button variant="ghost" size="sm" onClick={() => setStepIndex((i) => Math.max(i - 1, 0))} disabled={isFirst} className="h-8 text-xs">
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
          <button onClick={skip} className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Skip tutorial
          </button>
          <Button size="sm" onClick={handleNext} disabled={saving || uploading} className="h-8 text-xs">
            {isLast ? "Get started" : "Next"}
            {!isLast && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
          </Button>
        </div>

        {/* Arrow */}
        {placement.arrow && rect && (
          <ArrowIndicator side={placement.arrow} />
        )}
      </div>
    </Spotlight>
  );
}

function ArrowIndicator({ side }: { side: "top" | "bottom" | "left" | "right" }) {
  // Position a small triangle on the appropriate edge of the tooltip.
  const base = "absolute h-3 w-3 rotate-45 bg-card border border-border";
  const map: Record<string, string> = {
    top: "left-1/2 -translate-x-1/2 -top-1.5 border-r-0 border-b-0",
    bottom: "left-1/2 -translate-x-1/2 -bottom-1.5 border-l-0 border-t-0",
    left: "top-1/2 -translate-y-1/2 -left-1.5 border-r-0 border-t-0",
    right: "top-1/2 -translate-y-1/2 -right-1.5 border-l-0 border-b-0",
  };
  return <div className={cn(base, map[side])} />;
}
