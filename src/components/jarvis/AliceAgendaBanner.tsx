import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, CheckSquare, AlertTriangle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type AgendaEvent = {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
};
type AgendaTask = {
  id: string;
  name: string;
  due_date: string | null;
  priority: string | null;
  status: string | null;
};

interface Props {
  onAsk: (prompt: string) => void;
  compact?: boolean;
}

/**
 * Bird's-eye agenda surfaced at the top of every ALICE thread so she
 * acts like an actual assistant — no command needed, the user sees
 * what's coming up and what's overdue the moment the chat opens.
 */
export function AliceAgendaBanner({ onAsk, compact }: Props) {
  const { user } = useAuth();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [todayTasks, setTodayTasks] = useState<AgendaTask[]>([]);
  const [overdue, setOverdue] = useState<AgendaTask[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const horizon = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
      const [ev, td, od] = await Promise.all([
        supabase
          .from("calendar_events")
          .select("id,title,event_date,event_time,location")
          .gte("event_date", today)
          .lte("event_date", horizon)
          .neq("status", "cancelled")
          .order("event_date", { ascending: true })
          .order("event_time", { ascending: true })
          .limit(4),
        supabase
          .from("project_tasks")
          .select("id,name,due_date,priority,status")
          .eq("due_date", today)
          .neq("status", "done")
          .limit(5),
        supabase
          .from("project_tasks")
          .select("id,name,due_date,priority,status")
          .lt("due_date", today)
          .neq("status", "done")
          .order("due_date", { ascending: true })
          .limit(5),
      ]);
      if (cancelled) return;
      setEvents((ev.data as AgendaEvent[]) || []);
      setTodayTasks((td.data as AgendaTask[]) || []);
      setOverdue((od.data as AgendaTask[]) || []);
      setLoaded(true);
    };
    load();
    // Refresh every 90s so newly-added items show up without a manual reload.
    const t = setInterval(load, 90_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [user]);

  if (!loaded) return null;
  const total = events.length + todayTasks.length + overdue.length;
  if (total === 0) return null;

  const askBriefing = () => {
    const lines: string[] = ["Give me a 3-sentence briefing on what's coming up."];
    if (events.length) lines.push(`Events: ${events.map((e) => e.title).join(", ")}.`);
    if (todayTasks.length) lines.push(`Tasks due today: ${todayTasks.map((t) => t.name).join(", ")}.`);
    if (overdue.length) lines.push(`Overdue: ${overdue.map((t) => t.name).join(", ")}.`);
    onAsk(lines.join(" "));
  };

  return (
    <div className={cn(
      "alice-glass rounded-2xl border border-white/5 overflow-hidden",
      compact ? "text-[12px]" : "text-[13px]",
    )}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        <Bell className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium tracking-tight">On your radar</span>
        <button
          onClick={askBriefing}
          className="ml-auto text-[11px] opacity-70 hover:opacity-100 underline-offset-2 hover:underline"
        >
          Brief me →
        </button>
      </div>
      <div className="divide-y divide-white/5">
        {overdue.length > 0 && (
          <div className="px-3 py-2 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-destructive/90">
              <AlertTriangle className="h-3 w-3" /> Overdue · {overdue.length}
            </div>
            {overdue.map((t) => (
              <button
                key={t.id}
                onClick={() => onAsk(`Help me handle this overdue task: "${t.name}" (was due ${t.due_date}). What should I do?`)}
                className="block w-full text-left truncate hover:text-foreground/90 opacity-90"
              >
                · {t.name} <span className="opacity-50">({t.due_date})</span>
              </button>
            ))}
          </div>
        )}
        {events.length > 0 && (
          <div className="px-3 py-2 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-60">
              <Calendar className="h-3 w-3" /> Upcoming · {events.length}
            </div>
            {events.map((e) => (
              <button
                key={e.id}
                onClick={() => onAsk(`Prep me for "${e.title}" on ${e.event_date}${e.event_time ? ` at ${e.event_time}` : ""}${e.location ? ` (${e.location})` : ""}. What do I need?`)}
                className="block w-full text-left truncate hover:text-foreground/90 opacity-90"
              >
                · {e.title} <span className="opacity-50">{e.event_date}{e.event_time ? ` · ${e.event_time.slice(0, 5)}` : ""}</span>
              </button>
            ))}
          </div>
        )}
        {todayTasks.length > 0 && (
          <div className="px-3 py-2 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-60">
              <CheckSquare className="h-3 w-3" /> Due today · {todayTasks.length}
            </div>
            {todayTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => onAsk(`Help me knock out "${t.name}" today. Where do I start?`)}
                className="block w-full text-left truncate hover:text-foreground/90 opacity-90"
              >
                · {t.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
