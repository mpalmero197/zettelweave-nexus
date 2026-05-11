import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

type StepKey =
  | "welcome" | "profile" | "theme" | "dashboard" | "create-card"
  | "edit-card" | "import" | "catalyst" | "alice" | "done";

interface Step {
  key: StepKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  body: React.ReactNode;
}

export function OnboardingTutorial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkedRef = useRef(false);

  // Detect first login
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
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return false;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { user_id: user.id, display_name: displayName.trim(), avatar_url: avatarUrl || null },
        { onConflict: "user_id" }
      );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    return true;
  };

  const finish = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .upsert({ user_id: user.id, onboarding_completed: true }, { onConflict: "user_id" });
    setOpen(false);
    toast.success("You're all set — welcome to PendragonX!");
  };

  const skip = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .upsert({ user_id: user.id, onboarding_completed: true }, { onConflict: "user_id" });
    }
    setOpen(false);
  };

  const steps: Step[] = [
    {
      key: "welcome",
      title: "Welcome to PendragonX",
      description: "A 2-minute tour to get you productive fast.",
      icon: Sparkles,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>PendragonX is your second brain — cards for atomic ideas, notes for long-form, Catalyst for writing, and ALICE to find anything.</p>
          <p>We'll set up your profile and walk through the essentials. You can skip at any time.</p>
        </div>
      ),
    },
    {
      key: "profile",
      title: "Your display name & avatar",
      description: "How friends and collaborators see you.",
      icon: UserIcon,
      body: (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>{displayName.slice(0, 2).toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Uploading…" : avatarUrl ? "Change avatar" : "Upload avatar"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            You can update these any time in Settings → Account.
          </p>
        </div>
      ),
    },
    {
      key: "theme",
      title: "Pick your theme",
      description: "Light, dark, or one of our variants.",
      icon: Palette,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Look in the top-right corner of the app for the <strong className="text-foreground">palette icon</strong>. Click it to swap themes and accent colors instantly.</p>
          <p>We default to dark mode for long writing sessions, but everything is fully themeable.</p>
        </div>
      ),
    },
    {
      key: "dashboard",
      title: "Your dashboard",
      description: "A live overview of your knowledge.",
      icon: LayoutDashboard,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>The Dashboard is your home base — recent cards, today's agenda, writing streak, and quick actions.</p>
          <p>Every widget is <strong className="text-foreground">interactive</strong>: click anything to jump straight to the underlying note, card, or task. Drag to rearrange — we save your layout automatically.</p>
        </div>
      ),
    },
    {
      key: "create-card",
      title: "Create your first card",
      description: "Atomic notes, organized automatically.",
      icon: Plus,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Open <strong className="text-foreground">Cards</strong> from the top nav and click the <strong className="text-foreground">+ button</strong>. Type a title and content — that's it.</p>
          <p>When you hit <strong className="text-foreground">Create</strong>, PendragonX auto-categorizes it, generates a Zettel number, suggests tags, and writes a description for you.</p>
        </div>
      ),
    },
    {
      key: "edit-card",
      title: "Editing & linking cards",
      description: "Click to edit, [[wikilink]] to connect.",
      icon: Pencil,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Click any card to open the editor. Use <code className="rounded bg-muted px-1">[[Card title]]</code> to link cards together — backlinks appear automatically and show in the Knowledge Graph.</p>
          <p>You can drag cards into Notebooks, share them with friends, or pin favorites to the dashboard.</p>
        </div>
      ),
    },
    {
      key: "import",
      title: "Import from Obsidian, Notion & more",
      description: "Bring your existing knowledge in.",
      icon: Upload,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Open <strong className="text-foreground">Import Studio</strong> from the toolbox. Drop in a folder of Obsidian markdown, a Notion export, an Evernote <code className="rounded bg-muted px-1">.enex</code> file, or PDFs.</p>
          <p>PendragonX preserves wikilinks and folder structure, then resolves cross-references after import.</p>
        </div>
      ),
    },
    {
      key: "catalyst",
      title: "Write in Catalyst",
      description: "Long-form writing with AI inside.",
      icon: FileText,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Catalyst</strong> is your writing studio for chapters, essays, and reports. It pulls your cards in as references and offers AI agents in the sidebar to help you outline, expand, or polish.</p>
          <p>Switch between Web view, Single Page, and Draft view depending on how you like to write.</p>
        </div>
      ),
    },
    {
      key: "alice",
      title: "Meet ALICE",
      description: "Your AI assistant — always one tap away.",
      icon: Bot,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>The floating ALICE button (bottom-right) is your shortcut to find anything, set reminders, summarize, or run multi-step actions.</p>
          <p>Try: <em>"find my notes about postwar economics"</em>, <em>"remind me tomorrow at 9am to revise chapter 3"</em>, or <em>"open my latest draft"</em>.</p>
        </div>
      ),
    },
    {
      key: "done",
      title: "You're ready!",
      description: "Go build something brilliant.",
      icon: PartyPopper,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>That's the tour. Everything you saw lives one click away in the top nav.</p>
          <p>Need a refresher? Open <strong className="text-foreground">Settings → Help</strong> any time, or just ask ALICE.</p>
        </div>
      ),
    },
  ];

  const step = steps[stepIndex];
  const Icon = step.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const isProfileStep = step.key === "profile";

  const handleNext = async () => {
    if (isProfileStep) {
      const ok = await saveProfile();
      if (!ok) return;
    }
    if (isLast) {
      await finish();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) skip(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Step {stepIndex + 1} of {steps.length}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={skip} className="h-7 px-2 text-xs">
                Skip <X className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <Progress value={((stepIndex + 1) / steps.length) * 100} className="h-1" />
            <DialogTitle className="text-xl">{step.title}</DialogTitle>
            <DialogDescription>{step.description}</DialogDescription>
          </DialogHeader>

          <div className="min-h-[140px]">{step.body}</div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
              disabled={isFirst}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button size="sm" onClick={handleNext} disabled={saving || uploading}>
              {isLast ? "Get started" : "Next"}
              {!isLast && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
