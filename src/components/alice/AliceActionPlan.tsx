import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Check, X, Pencil, Loader2, AlertCircle, ListChecks, Play, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAliceActionLog } from "@/hooks/useAliceActionLog";

export interface AlicePlanStep {
  id: string;
  /** Tool ALICE intends to call, e.g. "create_note", "search_knowledge". */
  tool: string;
  /** Human-readable description of the step. */
  label: string;
  /** Structured arguments. Editable in Modify mode. */
  args: Record<string, unknown>;
  /** Optional natural-language instruction to reverse this step. */
  inverse?: string;
}

export interface AlicePlan {
  id: string;
  goal: string;
  steps: AlicePlanStep[];
}

export type StepStatus = "pending" | "running" | "done" | "failed" | "skipped";
export type PlanStatus = "awaiting" | "approved" | "executing" | "completed" | "cancelled";

interface Props {
  plan: AlicePlan;
  /**
   * Called when the user approves the plan. The component is purely
   * presentational — actual execution happens in the parent (typically
   * by sending a directive message back to ALICE).
   */
  onApprove: (plan: AlicePlan) => Promise<void> | void;
  /** Called if the user cancels before execution. */
  onCancel?: () => void;
  /** Optional: override status from outside (e.g. when execution finishes). */
  externalStatus?: PlanStatus;
  /** Optional: per-step status overrides driven by execution progress. */
  stepStatuses?: Record<string, StepStatus>;
}

export function AliceActionPlan({ plan, onApprove, onCancel, externalStatus, stepStatuses }: Props) {
  const [status, setStatus] = useState<PlanStatus>("awaiting");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AlicePlan>(plan);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { record } = useAliceActionLog();

  useEffect(() => { if (externalStatus) setStatus(externalStatus); }, [externalStatus]);
  useEffect(() => { setDraft(plan); }, [plan]);

  const handleApprove = async () => {
    setStatus("executing");
    setEditing(false);
    // Optimistically log the inverse for each step that declares one — this
    // makes "Undo last action" work even if the network response is slow.
    for (const step of draft.steps) {
      if (step.inverse) {
        record({
          tool: step.tool,
          label: step.label,
          inverseInstruction: step.inverse,
          payload: step.args,
        });
      }
    }
    try {
      await onApprove(draft);
      setStatus((s) => (s === "executing" ? "completed" : s));
    } catch {
      setStatus("awaiting");
    }
  };

  const handleCancel = () => {
    setStatus("cancelled");
    onCancel?.();
  };

  const updateStep = (idx: number, patch: Partial<AlicePlanStep>) => {
    setDraft((d) => {
      const steps = d.steps.slice();
      steps[idx] = { ...steps[idx], ...patch };
      return { ...d, steps };
    });
  };

  const removeStep = (idx: number) => {
    setDraft((d) => ({ ...d, steps: d.steps.filter((_, i) => i !== idx) }));
  };

  const stepStatus = (stepId: string): StepStatus => {
    if (stepStatuses?.[stepId]) return stepStatuses[stepId];
    if (status === "completed") return "done";
    return "pending";
  };

  const StatusBadge = () => {
    const map: Record<PlanStatus, { label: string; cls: string }> = {
      awaiting:   { label: "Needs approval", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
      approved:   { label: "Approved",       cls: "bg-primary/15 text-primary border-primary/30" },
      executing:  { label: "Running",        cls: "bg-primary/15 text-primary border-primary/30" },
      completed:  { label: "Completed",      cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
      cancelled:  { label: "Cancelled",      cls: "bg-muted text-muted-foreground border-border" },
    };
    const m = map[status];
    return <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", m.cls)}>{m.label}</Badge>;
  };

  return (
    <div className="my-3 rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <ListChecks className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Action plan</span>
            <StatusBadge />
          </div>
          {editing ? (
            <Input
              value={draft.goal}
              onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
              className="mt-1 h-7 text-sm"
            />
          ) : (
            <p className="mt-0.5 text-sm font-medium text-foreground">{draft.goal}</p>
          )}
        </div>
      </div>

      {/* Steps */}
      <ol className="divide-y divide-border">
        {draft.steps.map((step, idx) => {
          const s = stepStatus(step.id);
          const isOpen = expanded[step.id];
          return (
            <li key={step.id} className="px-4 py-2.5">
              <div className="flex items-start gap-3">
                <StepIndicator index={idx + 1} status={s} />
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <div className="space-y-2">
                      <Input
                        value={step.label}
                        onChange={(e) => updateStep(idx, { label: e.target.value })}
                        className="h-7 text-sm"
                      />
                      <Textarea
                        value={JSON.stringify(step.args, null, 2)}
                        onChange={(e) => {
                          try { updateStep(idx, { args: JSON.parse(e.target.value) }); }
                          catch { /* ignore until valid JSON */ }
                        }}
                        rows={3}
                        className="text-[11px] font-mono"
                      />
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive" onClick={() => removeStep(idx)}>
                        Remove step
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{step.label}</span>
                        <button
                          type="button"
                          onClick={() => setExpanded((e) => ({ ...e, [step.id]: !e[step.id] }))}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Toggle details"
                        >
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                        <Badge variant="secondary" className="text-[10px] font-mono">{step.tool}</Badge>
                      </div>
                      {isOpen && (
                        <pre className="mt-1.5 text-[11px] font-mono bg-muted/40 rounded p-2 overflow-x-auto">
                          {JSON.stringify(step.args, null, 2)}
                        </pre>
                      )}
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Footer */}
      {(status === "awaiting" || status === "approved") && (
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-border bg-muted/20">
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> {editing ? "Done editing" : "Modify"}
          </Button>
          <Button size="sm" onClick={handleApprove} disabled={draft.steps.length === 0}>
            <Check className="h-3.5 w-3.5 mr-1" /> Approve & run
          </Button>
        </div>
      )}
      {status === "executing" && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> ALICE is executing your plan…
        </div>
      )}
      {status === "completed" && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border bg-emerald-500/5 text-xs text-emerald-600">
          <Check className="h-3.5 w-3.5" /> Plan completed. You can undo the last action from the banner above.
        </div>
      )}
      {status === "cancelled" && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          <X className="h-3.5 w-3.5" /> Plan cancelled — nothing was executed.
        </div>
      )}
    </div>
  );
}

function StepIndicator({ index, status }: { index: number; status: StepStatus }) {
  const base = "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium shrink-0";
  if (status === "running") {
    return <span className={cn(base, "border-primary text-primary")}><Loader2 className="h-3 w-3 animate-spin" /></span>;
  }
  if (status === "done") {
    return <span className={cn(base, "border-emerald-500 bg-emerald-500/10 text-emerald-600")}><Check className="h-3 w-3" /></span>;
  }
  if (status === "failed") {
    return <span className={cn(base, "border-destructive bg-destructive/10 text-destructive")}><AlertCircle className="h-3 w-3" /></span>;
  }
  if (status === "skipped") {
    return <span className={cn(base, "border-border text-muted-foreground line-through")}>{index}</span>;
  }
  return <span className={cn(base, "border-border text-muted-foreground")}>{index}</span>;
}
