import { useEffect, useState, useCallback } from "react";
import { Sun, ArrowUpRight, CheckSquare, Calendar, Brain, NotebookPen, Sparkles, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

type BriefingItem = {
  kind: "task" | "event" | "card" | "note" | "focus";
  id?: string;
  title: string;
  subtitle?: string;
  route: string;
  time?: string;
};

interface Props {
  onNavigate?: (tab: string) => void;
}

const ICONS: Record<BriefingItem["kind"], typeof CheckSquare> = {
  task: CheckSquare,
  event: Calendar,
  card: Brain,
  note: NotebookPen,
  focus: Sparkles,
};

export function DailyBriefingWidget({ onNavigate }: Props) {
  const { user } = useAuth();
  const [headline, setHeadline] = useState<string>("Your daily briefing");
  const [items, setItems] = useState<BriefingItem[]>([]);
  const [briefingId, setBriefingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchBriefing = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("daily_briefings")
      .select("id, headline, items, read_at")
      .eq("user_id", user.id)
      .eq("briefing_date", today)
      .maybeSingle();

    if (data) {
      setBriefingId(data.id);
      setHeadline(data.headline);
      setItems((data.items as BriefingItem[]) || []);
      // Mark as read
      if (!data.read_at) {
        supabase.from("daily_briefings").update({ read_at: new Date().toISOString() }).eq("id", data.id);
      }
    } else {
      setBriefingId(null);
      setItems([]);
      setHeadline("No briefing yet for today");
    }
    setLoading(false);
  }, [user, today]);

  useEffect(() => { fetchBriefing(); }, [fetchBriefing]);

  const generateNow = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("generate-daily-briefing", {
        body: { user_id: user.id },
      });
      if (error) throw error;
      toast.success("Briefing generated");
      await fetchBriefing();
    } catch (e: any) {
      toast.error(e?.message || "Could not generate briefing");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-header-left">
          <Sun className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-medium text-foreground">Today</h3>
        </div>
        <button
          className="widget-header-link inline-flex items-center gap-1"
          onClick={generateNow}
          disabled={generating}
          aria-label="Refresh briefing"
        >
          <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
          {briefingId ? "Refresh" : "Generate"}
        </button>
      </div>

      <div className="widget-body">
        <p className="text-xs text-muted-foreground mb-2 px-1">{headline}</p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted/40 rounded-md animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Nothing scheduled. Click Generate to build today's briefing.
          </p>
        ) : (
          items.slice(0, 6).map((item, idx) => {
            const Icon = ICONS[item.kind] || Sparkles;
            return (
              <button
                key={`${item.kind}-${item.id ?? idx}`}
                onClick={() => onNavigate?.(item.route)}
                className="w-full flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md transition-colors text-left group"
                aria-label={`Open ${item.title} in ${item.route}`}
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                  )}
                </div>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
