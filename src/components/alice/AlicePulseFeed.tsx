import { useEffect, useState, useCallback } from "react";
import { Sparkles, Check, X as XIcon, Loader2, CheckCircle2, AlertCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";


type Pulse = {
  id: string;
  kind: string;
  summary: string;
  status: string;
  created_at: string;
  payload: any;
};

type Run = {
  id: string;
  goal: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  step_count: number;
  max_steps: number;
  result: string | null;
  created_at: string;
};

export function AlicePulseFeed() {
  const { user } = useAuth();
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [open, setOpen] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [launching, setLaunching] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("alice_pulses").select("id, kind, summary, status, created_at, payload").order("created_at", { ascending: false }).limit(15),
      supabase.from("alice_runs").select("id, goal, status, step_count, max_steps, result, created_at").order("created_at", { ascending: false }).limit(8),
    ]);
    setPulses((p as any) || []);
    setRuns((r as any) || []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`alice-pulses-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "alice_pulses", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "alice_runs", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const activeRuns = runs.filter((r) => r.status === "pending" || r.status === "running");
  const unread = pulses.filter((p) => p.status === "pending").length + activeRuns.length;


  const setStatus = async (id: string, status: "seen" | "acted" | "dismissed") => {
    await supabase.from("alice_pulses").update({ status, acted_at: new Date().toISOString() }).eq("id", id);
  };

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v && unread > 0) {
      // Mark all pending as seen
      supabase.from("alice_pulses").update({ status: "seen" }).eq("status", "pending").then(() => load());
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 md:h-10 md:w-10 p-0 rounded-full" aria-label="ALICE proactive pulses">
          <Sparkles className={cn("h-4 w-4", unread > 0 ? "text-primary" : "text-muted-foreground")} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-medium">ALICE Pulse</span>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Proactive</span>
        </div>
        <ScrollArea className="max-h-[420px]">
          {runs.length > 0 && (
            <div className="border-b">
              <div className="px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3" /> Background tasks
              </div>
              <ul className="divide-y">
                {runs.slice(0, 5).map((r) => {
                  const pct = Math.min(100, Math.round((r.step_count / Math.max(1, r.max_steps)) * 100));
                  const Icon = r.status === "completed" ? CheckCircle2
                    : r.status === "failed" || r.status === "cancelled" ? AlertCircle
                    : Loader2;
                  const iconClass = r.status === "completed" ? "text-emerald-500"
                    : r.status === "failed" || r.status === "cancelled" ? "text-destructive"
                    : "text-primary animate-spin";
                  return (
                    <li key={r.id} className="p-3 text-sm space-y-1.5">
                      <div className="flex items-start gap-2">
                        <Icon className={cn("h-3.5 w-3.5 mt-0.5", iconClass)} />
                        <div className="flex-1 min-w-0">
                          <p className="leading-snug line-clamp-2">{r.goal}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.status}</span>
                            <span className="text-[10px] text-muted-foreground">{r.step_count}/{r.max_steps}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                          </div>
                          {(r.status === "pending" || r.status === "running") && (
                            <div className="mt-1.5 h-1 w-full bg-muted rounded overflow-hidden">
                              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                          {r.status === "completed" && r.result && (
                            <p className="text-xs text-muted-foreground leading-snug mt-1 line-clamp-3">{r.result}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {pulses.length === 0 && runs.length === 0 ? (

            <div className="p-6 text-center text-xs text-muted-foreground">
              ALICE is quietly watching. Nudges will appear here when something useful comes up.
            </div>
          ) : (
            <ul className="divide-y">
              {pulses.map((p) => (
                <li key={p.id} className={cn("p-3 text-sm space-y-1.5", p.status === "dismissed" && "opacity-50")}>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-primary mt-0.5">{p.kind}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="leading-snug">{p.summary}</p>
                  {p.payload?.rationale && (
                    <p className="text-xs text-muted-foreground leading-snug">{p.payload.rationale}</p>
                  )}
                  {p.status !== "acted" && p.status !== "dismissed" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setStatus(p.id, "acted")}>
                        <Check className="h-3 w-3 mr-1" /> Got it
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setStatus(p.id, "dismissed")}>
                        <XIcon className="h-3 w-3 mr-1" /> Dismiss
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
