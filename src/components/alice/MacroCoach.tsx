import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink, X, Sparkles, Pause } from "lucide-react";

interface Step {
  action: string;
  selector?: string;
  text?: string;
  value?: string;
  url?: string;
  ms?: number;
  prompt?: string;
  note?: string;
}

interface Macro {
  id: string;
  name: string;
  description: string | null;
  start_url: string;
  steps: Step[];
}

/**
 * MacroCoach — native (no-extension) ALICE coach overlay.
 *
 * Listens for `alice:open-macro-coach` window events with a macro id.
 * Loads the macro from `alice_macros`, opens its start_url in a new tab,
 * and renders an in-app step list the user can check off. Pause steps
 * are visually distinguished so the user knows when to enter their info.
 */
export function MacroCoach() {
  const [macro, setMacro] = useState<Macro | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());

  useEffect(() => {
    const handler = async (e: Event) => {
      const id = (e as CustomEvent<{ macroId: string }>).detail?.macroId;
      if (!id) return;
      const { data, error } = await supabase
        .from("alice_macros")
        .select("id,name,description,start_url,steps")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return;
      setMacro({ ...data, steps: Array.isArray(data.steps) ? (data.steps as unknown as Step[]) : [] });
      setDone(new Set());
      try { window.open(data.start_url, "_blank", "noopener,noreferrer"); } catch {}
    };
    window.addEventListener("alice:open-macro-coach", handler as EventListener);
    return () => window.removeEventListener("alice:open-macro-coach", handler as EventListener);
  }, []);

  if (!macro) return null;

  const toggle = (i: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const describeStep = (s: Step) => {
    if (s.action === "pause") return s.prompt || s.note || "Enter your information here, then continue.";
    if (s.action === "navigate") return `Go to ${s.url}`;
    if (s.action === "click") return `Click ${s.text || s.selector || "the element"}`;
    if (s.action === "fill" || s.action === "type") return `Type "${s.value ?? ""}" into ${s.selector || "the field"}`;
    if (s.action === "select") return `Select "${s.value}" from ${s.selector}`;
    if (s.action === "submit") return "Submit the form";
    if (s.action === "wait") return `Wait ${s.ms || 500}ms`;
    return `${s.action} ${s.selector || s.text || ""}`.trim();
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[360px] max-h-[70vh] rounded-2xl border border-violet-500/30 bg-slate-950/95 backdrop-blur shadow-2xl shadow-violet-500/20 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-slate-800">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-100 truncate">{macro.name}</div>
          <div className="text-[11px] text-slate-400 truncate">ALICE coach · {macro.steps.length} step{macro.steps.length === 1 ? "" : "s"}</div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => window.open(macro.start_url, "_blank")} title="Reopen page">
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMacro(null)}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {macro.steps.map((s, i) => {
          const isDone = done.has(i);
          const isPause = s.action === "pause";
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`w-full flex items-start gap-2 text-left p-2 rounded-lg transition-colors ${
                isDone ? "bg-slate-900/50 text-slate-500" : isPause ? "bg-amber-500/10 hover:bg-amber-500/15 text-amber-100" : "bg-slate-900 hover:bg-slate-800 text-slate-200"
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                isDone ? "bg-violet-500/20 text-violet-300" : isPause ? "bg-amber-500/30 text-amber-200" : "bg-slate-800 text-slate-400"
              }`}>
                {isDone ? <Check className="w-3 h-3" /> : isPause ? <Pause className="w-3 h-3" /> : i + 1}
              </div>
              <div className={`text-xs leading-snug ${isDone ? "line-through" : ""}`}>{describeStep(s)}</div>
            </button>
          );
        })}
      </div>
      <div className="p-2 border-t border-slate-800 text-[10px] text-slate-500 text-center">
        Install the Baku Scribe extension to let ALICE drive these steps automatically.
      </div>
    </div>
  );
}
