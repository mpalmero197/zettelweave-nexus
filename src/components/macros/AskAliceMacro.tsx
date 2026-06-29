import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Sparkles, Pencil, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Msg = {
  role: "user" | "assistant";
  text: string;
  macro?: any;
  sources?: { url: string; title: string }[];
};

interface Props {
  onCreated?: () => void;
  onEdit?: (macro: any) => void;
}

export default function AskAliceMacro({ onCreated, onEdit }: Props) {
  const { toast } = useToast();
  const [goal, setGoal] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      text:
        "Tell me what you want a macro to do — for example, 'open a Chase checking account' or 'apply to 5 jobs on LinkedIn for me'. I'll research the steps and build a draft macro you can run or edit.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const g = goal.trim();
    if (!g || busy) return;
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: g }]);
    setGoal("");
    try {
      const { data, error } = await supabase.functions.invoke("alice-research-macro", {
        body: { goal: g, target_url: targetUrl.trim() || undefined },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      const macro = (data as any)?.macro;
      const sources = (data as any)?.sources || [];
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          text: `Built "${macro?.name || "macro"}" with ${(macro?.steps || []).length} steps. Review it below, run it, or edit before sharing.`,
          macro,
          sources,
        },
      ]);
      onCreated?.();
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e: any) {
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: `Sorry, I couldn't build that macro: ${e?.message || String(e)}` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const runMacro = (m: any) => {
    window.dispatchEvent(new CustomEvent("alice:run-macro", { detail: { macroId: m.id } }));
    toast({ title: "Open the Toolbox to run this macro." });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.text}
                {m.macro && (
                  <div className="mt-3 border-t border-border/40 pt-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">{m.macro.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {(m.macro.steps || []).length} steps
                      </Badge>
                      {m.macro.target_domain && (
                        <Badge variant="secondary" className="text-xs">
                          {m.macro.target_domain}
                        </Badge>
                      )}
                    </div>
                    {m.macro.description && (
                      <p className="text-xs opacity-80">{m.macro.description}</p>
                    )}
                    <ol className="text-xs space-y-1 max-h-40 overflow-y-auto pl-4 list-decimal">
                      {(m.macro.steps || []).slice(0, 12).map((s: any, idx: number) => (
                        <li key={idx}>
                          <span className="font-mono text-[10px] mr-1 opacity-60">
                            {s.action}
                          </span>
                          {s.url || s.selector || s.prompt || s.text || s.note || ""}
                        </li>
                      ))}
                      {(m.macro.steps || []).length > 12 && (
                        <li className="opacity-60">
                          …{(m.macro.steps || []).length - 12} more
                        </li>
                      )}
                    </ol>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => runMacro(m.macro)}>
                        <Play className="h-3.5 w-3.5 mr-1" /> Run
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onEdit?.(m.macro)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    </div>
                    {!!m.sources?.length && (
                      <div className="text-[10px] opacity-60 pt-1">
                        Sources:{" "}
                        {m.sources.slice(0, 3).map((s, i) => (
                          <a
                            key={i}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline mr-2"
                          >
                            {s.title || s.url}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="space-y-2 border-t pt-3">
          <Input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="Optional starting URL (e.g. https://chase.com)"
            disabled={busy}
          />
          <div className="flex gap-2">
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What should the macro do?"
              rows={2}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
            />
            <Button onClick={send} disabled={busy || !goal.trim()} className="self-end">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Tip: ⌘/Ctrl + Enter to send. ALICE will research, draft steps, and save the macro to your library.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
