import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AliceTraceMeta } from "@/hooks/useJarvis";

const TIER_LABEL: Record<AliceTraceMeta["tier"], string> = {
  quick_answer: "Quick",
  research: "Research",
  reasoning: "Deep Think",
  agentic: "Agentic",
};

const TIER_COLOR: Record<AliceTraceMeta["tier"], string> = {
  quick_answer: "text-sky-300 border-sky-400/30 bg-sky-500/10",
  research: "text-violet-300 border-violet-400/30 bg-violet-500/10",
  reasoning: "text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10",
  agentic: "text-amber-300 border-amber-400/30 bg-amber-500/10",
};

/**
 * Collapsible "How ALICE thought about this" panel. Displays which model tier
 * was chosen for the turn, why, how many steps it took, and which tools ran.
 */
export function AliceTracePanel({ trace }: { trace: AliceTraceMeta }) {
  const [open, setOpen] = useState(false);
  const duration = trace.duration_ms ? `${(trace.duration_ms / 1000).toFixed(1)}s` : null;

  return (
    <div className="mt-1 flex flex-col gap-1 text-[11px] leading-tight">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 self-start rounded-md px-1.5 py-0.5 text-muted-foreground/70 transition-colors hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Sparkles className="h-3 w-3" />
        <span>How ALICE thought about this</span>
        <span className={cn("ml-1 rounded border px-1.5 py-px text-[10px] font-medium", TIER_COLOR[trace.tier])}>
          {TIER_LABEL[trace.tier]}
        </span>
        {duration && <span className="ml-0.5 text-muted-foreground/60">· {duration}</span>}
      </button>
      {open && (
        <div className="ml-4 max-w-full rounded-md border border-border/40 bg-background/40 p-2 text-muted-foreground/90">
          <div className="mb-1">
            <span className="text-foreground/80">Model:</span>{" "}
            <code className="text-[10px]">{trace.model}</code>
          </div>
          <div className="mb-1">
            <span className="text-foreground/80">Why:</span> {trace.reason}
          </div>
          {trace.signals?.length > 0 && (
            <div className="mb-1 flex flex-wrap gap-1">
              {trace.signals.map((s) => (
                <span key={s} className="rounded bg-muted/50 px-1 py-px text-[10px]">{s}</span>
              ))}
            </div>
          )}
          <div className="mb-1">
            <span className="text-foreground/80">Steps:</span> {trace.steps}
            {trace.tools_called.length > 0 && (
              <>
                {" · "}
                <span className="text-foreground/80">Tools:</span>{" "}
                {trace.tools_called.join(", ")}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
