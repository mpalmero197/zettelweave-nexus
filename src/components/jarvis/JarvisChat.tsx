import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Send, Trash2, ChevronDown, ChevronRight, Sparkles, Search, FileText, StickyNote, CheckSquare, Calendar, Globe, Mic, MicOff, X, CloudSun, Play, ImageIcon, Navigation } from "lucide-react";
import { useJarvis, type JarvisPart } from "@/hooks/useJarvis";
import { toast } from "sonner";
import { AliceActionPlan, type AlicePlan } from "@/components/alice/AliceActionPlan";
import { AliceCardRenderer } from "@/components/jarvis/cards/RichCards";
import { JarvisAttachmentMenu, type JarvisAttachment } from "@/components/jarvis/JarvisAttachmentMenu";
import { cn } from "@/lib/utils";

const TOOL_META: Record<string, { icon: React.ComponentType<any>; label: string }> = {
  search_knowledge: { icon: Search, label: "Searched your knowledge" },
  create_note: { icon: FileText, label: "Created a note" },
  create_card: { icon: StickyNote, label: "Created a card" },
  create_task: { icon: CheckSquare, label: "Created a task" },
  create_event: { icon: Calendar, label: "Scheduled an event" },
  web_search: { icon: Globe, label: "Searched the web" },
  get_weather: { icon: CloudSun, label: "Checked the weather" },
  find_video: { icon: Play, label: "Found videos" },
  generate_image: { icon: ImageIcon, label: "Generated an image" },
  navigate: { icon: Navigation, label: "Navigated" },
};

function ToolPart({ part }: { part: Extract<JarvisPart, { type: "tool" }> }) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[part.name] || { icon: Sparkles, label: part.name };
  const Icon = meta.icon;
  const isError = part.result?.error;
  return (
    <div className="my-2 rounded-md border border-border bg-muted/40 text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted/60"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Icon className={cn("h-3.5 w-3.5", isError ? "text-destructive" : "text-primary")} />
        <span className="font-medium">{meta.label}</span>
        {part.args?.title && <span className="text-muted-foreground truncate">— {part.args.title}</span>}
        {part.args?.query && <span className="text-muted-foreground truncate">— "{part.args.query}"</span>}
        {isError && <span className="ml-auto text-destructive">error</span>}
      </button>
      {open && (
        <div className="border-t border-border p-3 space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Input</div>
            <pre className="text-[11px] overflow-x-auto bg-background/60 p-2 rounded">{JSON.stringify(part.args, null, 2)}</pre>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Result</div>
            <pre className="text-[11px] overflow-x-auto bg-background/60 p-2 rounded">{JSON.stringify(part.result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  /** Optional: render in compact mode (popover/floating panel) */
  compact?: boolean;
}

export function JarvisChat({ compact = false }: Props) {
  const { threads, activeThreadId, messages, sending, sendMessage, newThread, selectThread, deleteThread } = useJarvis();

  const runPlan = async (plan: AlicePlan) => {
    // Ship the structured plan back to ALICE for execution. The edge
    // function recognizes the `executePlan` flag and runs each step.
    await sendMessage(
      `Execute the approved plan "${plan.goal}".\n\n[[ALICE_PLAN_EXECUTE]]${JSON.stringify(plan)}[[/ALICE_PLAN_EXECUTE]]`,
    );
  };

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<JarvisAttachment[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { taRef.current?.focus(); }, [activeThreadId]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const submit = async () => {
    const text = input.trim();
    if (!text && attachments.length === 0) return;
    setInput("");
    const atts = attachments;
    setAttachments([]);
    await sendMessage(text, atts);
    taRef.current?.focus();
  };

  // Speech-to-text (Web Speech API). Tap mic to dictate; tap again to stop and send.
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const baseInputRef = useRef("");

  const toggleDictation = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (listening) {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    baseInputRef.current = input ? input + " " : "";
    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) baseInputRef.current += final + " ";
      setInput((baseInputRef.current + interim).trimStart());
    };
    rec.onerror = (e: any) => {
      if (e?.error && e.error !== "no-speech" && e.error !== "aborted") {
        toast.error(`Voice input error: ${e.error}`);
      }
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = rec;
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  };

  useEffect(() => () => { try { recognitionRef.current?.stop(); } catch { /* ignore */ } }, []);

  return (
    <div className={cn("flex h-full bg-background", compact && "rounded-lg border border-border overflow-hidden")}>
      {/* Thread sidebar */}
      {!compact && (
        <aside className="w-64 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <Button onClick={newThread} variant="outline" size="sm" className="w-full justify-start gap-2">
              <Plus className="h-4 w-4" /> New conversation
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {threads.map((t) => (
                <div key={t.id} className={cn(
                  "group flex items-center rounded-md hover:bg-accent transition-colors",
                  activeThreadId === t.id && "bg-accent",
                )}>
                  <button
                    onClick={() => selectThread(t.id)}
                    className="flex-1 text-left text-sm px-2 py-1.5 truncate"
                  >
                    {t.title}
                  </button>
                  <button
                    onClick={() => deleteThread(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-destructive"
                    aria-label="Delete thread"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {threads.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-4 text-center">No conversations yet.</p>
              )}
            </div>
          </ScrollArea>
        </aside>
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className={cn("max-w-3xl mx-auto space-y-4", compact ? "px-3 py-3" : "px-4 py-6 space-y-6")}>
            {messages.length === 0 && (
              <div className={cn("text-center space-y-2", compact ? "py-6" : "py-12 space-y-3")}>
                <div className={cn("inline-flex items-center justify-center rounded-full bg-primary/10", compact ? "h-9 w-9" : "h-12 w-12")}>
                  <Sparkles className={cn("text-primary", compact ? "h-4 w-4" : "h-6 w-6")} />
                </div>
                <h2 className={cn("font-semibold", compact ? "text-sm" : "text-lg")}>At your service.</h2>
                {!compact && (
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Ask me to find anything in your knowledge base, create notes or cards, schedule tasks, or look something up online.
                  </p>
                )}
                {compact && (
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Find, create, schedule, search.
                  </p>
                )}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}>
                {m.role === "user" ? (
                  <div className={cn(
                    "max-w-[85%] rounded-2xl bg-primary text-primary-foreground whitespace-pre-wrap",
                    compact ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-sm",
                  )}>
                    {m.parts.map((p, i) => {
                      if (p.type !== "text") return null;
                      // Hide the internal plan-execute directive from the bubble UI.
                      const cleaned = p.text.replace(/\[\[ALICE_PLAN_EXECUTE\]\][\s\S]*?\[\[\/ALICE_PLAN_EXECUTE\]\]/g, "").trim();
                      return cleaned ? <span key={i}>{cleaned}</span> : null;
                    })}
                  </div>
                ) : (
                  <div className={cn("max-w-full w-full text-foreground", compact ? "text-[13px]" : "text-sm")}>
                    {m.parts.map((p, i) => {
                      if (p.type === "tool") return <ToolPart key={i} part={p} />;
                      if (p.type === "plan") return (
                        <AliceActionPlan key={i} plan={p.plan} onApprove={runPlan} />
                      );
                      if (p.type === "card") return <AliceCardRenderer key={i} card={p.card} />;
                      return (
                        <div key={i} className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{p.text}</ReactMarkdown>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                <span>Thinking…</span>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className={cn("border-t border-border", compact ? "p-2" : "p-3")}>
          <div className="max-w-3xl mx-auto space-y-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((a, i) => (
                  <div key={i} className="group relative flex items-center gap-1.5 rounded-md border border-border bg-muted/40 pl-1.5 pr-6 py-1 text-xs max-w-[200px]">
                    {a.mime.startsWith("image/") ? (
                      <img src={a.url} alt="" className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="truncate">{a.name}</span>
                    <button
                      onClick={() => setAttachments((as) => as.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-background"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <JarvisAttachmentMenu
                compact={compact}
                disabled={sending}
                onAttach={(a) => setAttachments((as) => [...as, a])}
              />
              <Textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
                }}
                placeholder="Ask ALICE anything…"
                rows={1}
                className={cn("resize-none flex-1", compact ? "min-h-[36px] max-h-28 text-[13px]" : "min-h-[40px] max-h-40")}
                disabled={sending}
              />
            <Button
              type="button"
              onClick={toggleDictation}
              size="icon"
              variant={listening ? "destructive" : "outline"}
              className={cn("shrink-0", compact && "h-9 w-9")}
              aria-label={listening ? "Stop dictation" : "Dictate to ALICE"}
              title={listening ? "Stop dictation" : "Dictate to ALICE"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button onClick={submit} disabled={sending || (!input.trim() && attachments.length === 0)} size="icon" className={cn("shrink-0", compact && "h-9 w-9")}>
              <Send className="h-4 w-4" />
            </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
