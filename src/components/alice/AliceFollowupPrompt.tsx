import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, X, Calendar, Bell, CheckSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CreatedContent } from "@/lib/aliceFollowups";

type Suggestion = {
  kind: "event" | "task" | "reminder" | "contact";
  label: string;
  why?: string;
  payload: Record<string, any>;
};

type Pending = {
  source: CreatedContent;
  suggestions: Suggestion[];
};

const KIND_META: Record<Suggestion["kind"], { icon: any; tableHint: string }> = {
  event:    { icon: Calendar,    tableHint: "calendar_events" },
  reminder: { icon: Bell,        tableHint: "tasks" },
  task:     { icon: CheckSquare, tableHint: "tasks" },
  contact:  { icon: Phone,       tableHint: "tasks" },
};

export function AliceFollowupPrompt() {
  const { user } = useAuth();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent<CreatedContent>).detail;
      if (!detail || !detail.title) return;
      let timeZone = "";
      try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { /* ignore */ }
      try {
        const { data } = await supabase.functions.invoke("alice-suggest-followups", {
          body: {
            contentType: detail.contentType,
            title: detail.title,
            content: detail.content || "",
            timeZone,
          },
        });
        if (cancelled) return;
        const suggestions = (data?.suggestions || []) as Suggestion[];
        if (suggestions.length > 0) {
          setPending({ source: detail, suggestions });
        }
      } catch { /* silent */ }
    };
    window.addEventListener("pendragon-content-created", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("pendragon-content-created", handler);
    };
  }, [user]);

  if (!pending || !user) return null;

  const accept = async (idx: number) => {
    const s = pending.suggestions[idx];
    setBusyIdx(idx);
    try {
      if (s.kind === "event") {
        const p = s.payload || {};
        if (!p.title || !p.event_date) throw new Error("Missing event details");
        const { error } = await supabase.from("calendar_events").insert({
          user_id: user.id,
          title: String(p.title).slice(0, 200),
          event_date: p.event_date,
          event_time: p.event_time || null,
          duration_minutes: p.duration_minutes || 60,
          description: p.description || `Auto-suggested from: ${pending.source.title}`,
          source_type: "alice_followup",
          source_id: pending.source.id || crypto.randomUUID(),
        } as any);
        if (error) throw error;
        toast.success("Event scheduled", { description: `${p.title} — ${p.event_date}` });
      } else {
        // task / reminder / contact all map to a task row
        const p = s.payload || {};
        const { error } = await supabase.from("tasks").insert({
          user_id: user.id,
          title: String(p.title || s.label).slice(0, 200),
          due_date: p.due_date || null,
          priority: p.priority || (s.kind === "reminder" ? "medium" : null),
          notes: p.notes || `Suggested by ALICE from your new ${pending.source.contentType.replace("_", " ")}: "${pending.source.title}".`,
        } as any);
        if (error) throw error;
        toast.success(s.kind === "contact" ? "Reminder added" : "Task added", { description: p.title || s.label });
      }
      // Remove the accepted suggestion; close panel if empty
      const remaining = pending.suggestions.filter((_, i) => i !== idx);
      setPending(remaining.length ? { ...pending, suggestions: remaining } : null);
    } catch (err: any) {
      toast.error(err?.message || "Couldn't save");
    } finally {
      setBusyIdx(null);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-4 fade-in">
      <Card className="border-border bg-background/95 backdrop-blur shadow-lg p-3">
        <div className="flex items-start gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium">ALICE noticed something</div>
            <div className="text-[11px] text-muted-foreground truncate">
              In your {pending.source.contentType.replace("_", " ")}: "{pending.source.title}"
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPending(null)}
            aria-label="Dismiss suggestions"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {pending.suggestions.map((s, i) => {
            const Icon = KIND_META[s.kind]?.icon || Sparkles;
            return (
              <div key={i} className="rounded-md border border-border p-2">
                <div className="flex items-start gap-2">
                  <Icon className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium leading-snug">{s.label}</div>
                    {s.why && (
                      <div className="text-[11px] text-muted-foreground mt-0.5 italic line-clamp-2">{s.why}</div>
                    )}
                    {(s.payload?.event_date || s.payload?.due_date) && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {s.payload.event_date || s.payload.due_date}
                        {s.payload.event_time ? ` · ${s.payload.event_time}` : ""}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex gap-1.5 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => {
                      const remaining = pending.suggestions.filter((_, j) => j !== i);
                      setPending(remaining.length ? { ...pending, suggestions: remaining } : null);
                    }}
                  >
                    Not now
                  </Button>
                  <Button
                    size="sm"
                    className={cn("h-6 px-2 text-[11px]")}
                    disabled={busyIdx === i}
                    onClick={() => accept(i)}
                  >
                    {busyIdx === i ? "Saving…" : "Yes, do it"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
