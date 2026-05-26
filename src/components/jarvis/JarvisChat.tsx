import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import {
  Plus, Send, Trash2, ChevronDown, ChevronRight, Sparkles, Search, FileText,
  StickyNote, CheckSquare, Calendar, Globe, Mic, MicOff, X, CloudSun, Play,
  ImageIcon, Navigation, Menu,
} from "lucide-react";
import { useJarvis, type JarvisPart } from "@/hooks/useJarvis";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { AliceActionPlan, type AlicePlan } from "@/components/alice/AliceActionPlan";
import { AliceCardRenderer } from "@/components/jarvis/cards/RichCards";
import { JarvisAttachmentMenu, type JarvisAttachment } from "@/components/jarvis/JarvisAttachmentMenu";
import { cn } from "@/lib/utils";
import "./alice-theme.css";

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
    <div className="alice-tool my-2 text-xs alice-msg-in">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 rounded-[12px] hover:bg-white/5 transition-colors"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
        <span className="alice-tool-icon-glow inline-flex h-6 w-6 items-center justify-center rounded-md">
          <Icon className={cn("h-3.5 w-3.5", isError && "text-destructive")} />
        </span>
        <span className="font-medium">{meta.label}</span>
        {part.args?.title && <span className="opacity-60 truncate">— {part.args.title}</span>}
        {part.args?.query && <span className="opacity-60 truncate">— "{part.args.query}"</span>}
        {isError && <span className="ml-auto text-destructive">error</span>}
      </button>
      {open && (
        <div className="border-t border-white/5 p-3 space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-wide opacity-60 mb-1">Input</div>
            <pre className="text-[11px] overflow-x-auto bg-black/30 p-2 rounded">{JSON.stringify(part.args, null, 2)}</pre>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide opacity-60 mb-1">Result</div>
            <pre className="text-[11px] overflow-x-auto bg-black/30 p-2 rounded">{JSON.stringify(part.result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveThinkingStream() {
  // Honest indicator: no cycling fake phases. Show a single shimmer label
  // with an elapsed-seconds counter so the user can see real progress, and
  // surface the latest activity hint if upstream code dispatches one via
  // `window.dispatchEvent(new CustomEvent("alice-activity", { detail: "..." }))`.
  const [seconds, setSeconds] = useState(0);
  const [activity, setActivity] = useState<string>("Working");
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    const onAct = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string" && detail.trim()) setActivity(detail.trim());
    };
    window.addEventListener("alice-activity", onAct as EventListener);
    return () => {
      clearInterval(t);
      window.removeEventListener("alice-activity", onAct as EventListener);
    };
  }, []);
  return (
    <div className="flex items-center gap-3 py-2 alice-msg-in">
      <div className="alice-orb h-6 w-6" />
      <div className="flex items-center gap-2">
        <span className="alice-live-dot" />
        <span className="alice-shimmer text-sm">{activity}…</span>
        <span className="text-xs opacity-50 tabular-nums">{seconds}s</span>
      </div>
    </div>
  );
}


const STARTER_PROMPTS = [
  "What's on my plate today?",
  "Summarize my latest notes",
  "Show me the weather",
  "Find a video on Zettelkasten",
];

interface Props {
  /** Optional: render in compact mode (popover/floating panel) */
  compact?: boolean;
}

export function JarvisChat({ compact = false }: Props) {
  const { threads, activeThreadId, messages, sending, sendMessage, newThread, selectThread, deleteThread } = useJarvis();
  const isMobile = useIsMobile();
  const [threadSheetOpen, setThreadSheetOpen] = useState(false);
  // On mobile (or compact popup) collapse the sidebar entirely and surface
  // threads via a Sheet trigger — gives the conversation full width.
  const showSidebar = !compact && !isMobile;

  const runPlan = async (plan: AlicePlan) => {
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
  // Allow the FAB shell to re-focus the input after it expands from minimized.
  useEffect(() => {
    const onFocus = () => {
      // Small delay so the height transition has begun before keyboard pops up.
      setTimeout(() => taRef.current?.focus(), 60);
    };
    window.addEventListener("alice-focus-input", onFocus);
    return () => window.removeEventListener("alice-focus-input", onFocus);
  }, []);

  const submit = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text && attachments.length === 0) return;
    setInput("");
    const atts = attachments;
    setAttachments([]);
    await sendMessage(text, atts);
    taRef.current?.focus();
  };

  // Speech-to-text (Web Speech API).
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const baseInputRef = useRef("");

  const finalizedIndicesRef = useRef<Set<number>>(new Set());
  const toggleDictation = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice input isn't supported in this browser. Try Chrome or Edge."); return; }
    if (listening) { try { recognitionRef.current?.stop(); } catch { /* ignore */ } return; }
    const rec = new SR();
    // Mobile Chrome duplicates words when continuous=true (each onresult repeats prior finals).
    // Detect mobile and use non-continuous mode + restart on end to avoid duplication.
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    rec.continuous = !isMobile;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = navigator.language || "en-US";
    baseInputRef.current = input ? (input.endsWith(" ") ? input : input + " ") : "";
    finalizedIndicesRef.current = new Set();
    let manuallyStopped = false;
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0]?.transcript ?? "";
        if (r.isFinal) {
          if (!finalizedIndicesRef.current.has(i)) {
            finalizedIndicesRef.current.add(i);
            const needsSpace = baseInputRef.current && !/\s$/.test(baseInputRef.current);
            baseInputRef.current += (needsSpace ? " " : "") + text.trim() + " ";
          }
        } else {
          interim += text;
        }
      }
      setInput((baseInputRef.current + interim).replace(/\s+/g, " ").trimStart());
    };
    rec.onerror = (e: any) => {
      if (e?.error && e.error !== "no-speech" && e.error !== "aborted") toast.error(`Voice input error: ${e.error}`);
    };
    rec.onend = () => {
      // On mobile, auto-restart to simulate continuous listening without duplication.
      if (!manuallyStopped && isMobile && recognitionRef.current === rec) {
        finalizedIndicesRef.current = new Set();
        try { rec.start(); return; } catch { /* fall through */ }
      }
      setListening(false);
      recognitionRef.current = null;
    };
    const origStop = rec.stop.bind(rec);
    rec.stop = () => { manuallyStopped = true; origStop(); };
    recognitionRef.current = rec; setListening(true);
    try { rec.start(); } catch { setListening(false); }
  };

  useEffect(() => () => { try { recognitionRef.current?.stop(); } catch { /* ignore */ } }, []);

  // Dynamic transcript width: widen when assistant cards are present
  const hasRichCards = useMemo(
    () => messages.some((m) => m.role === "assistant" && m.parts.some((p) => p.type === "card")),
    [messages],
  );
  const transcriptMaxW = hasRichCards ? "max-w-4xl" : "max-w-3xl";

  return (
    <div className={cn("alice-surface alice-body flex h-full", compact && "rounded-2xl overflow-hidden")}>
      {/* Thread sidebar — desktop only */}
      {showSidebar && (
        <aside className="w-64 alice-glass flex flex-col border-r border-white/5">
          <div className="p-3 border-b border-white/5 flex items-center gap-2">
            <div className="alice-orb h-7 w-7" aria-hidden />
            <div className="flex-1">
              <div className="text-sm font-semibold tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>ALICE</div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-60">Aurora · Online</div>
            </div>
          </div>
          <div className="p-3">
            <Button
              onClick={newThread}
              size="sm"
              className="w-full justify-start gap-2 alice-send border-0"
            >
              <Plus className="h-4 w-4" /> New conversation
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {threads.map((t) => (
                <div key={t.id} className={cn(
                  "group flex items-center rounded-md transition-colors hover:bg-white/5",
                  activeThreadId === t.id && "alice-thread-active",
                )}>
                  <button
                    onClick={() => selectThread(t.id)}
                    className="flex-1 text-left text-sm px-3 py-2 truncate"
                  >
                    {t.title}
                  </button>
                  <button
                    onClick={() => deleteThread(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-destructive transition-opacity"
                    aria-label="Delete thread"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {threads.length === 0 && (
                <p className="text-xs opacity-60 px-2 py-4 text-center">No conversations yet.</p>
              )}
            </div>
          </ScrollArea>
        </aside>
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with thread drawer + new-chat shortcut.
            Hidden inside the compact popup (it already has its own chrome). */}
        {!showSidebar && !compact && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/5 alice-glass">
            <Sheet open={threadSheetOpen} onOpenChange={setThreadSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
                  <Menu className="h-4 w-4" />
                  <span className="text-sm font-medium truncate max-w-[160px]">
                    {threads.find((t) => t.id === activeThreadId)?.title || "ALICE"}
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-sm p-0 flex flex-col">
                <SheetHeader className="p-3 border-b">
                  <SheetTitle className="flex items-center gap-2 text-base">
                    <div className="alice-orb h-6 w-6" aria-hidden />
                    Conversations
                  </SheetTitle>
                </SheetHeader>
                <div className="p-3">
                  <Button
                    onClick={() => { newThread(); setThreadSheetOpen(false); }}
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    <Plus className="h-4 w-4" /> New conversation
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-0.5">
                    {threads.map((t) => (
                      <div key={t.id} className={cn(
                        "group flex items-center rounded-md transition-colors hover:bg-muted",
                        activeThreadId === t.id && "bg-muted",
                      )}>
                        <button
                          onClick={() => { selectThread(t.id); setThreadSheetOpen(false); }}
                          className="flex-1 text-left text-sm px-3 py-2.5 truncate"
                        >
                          {t.title}
                        </button>
                        <button
                          onClick={() => deleteThread(t.id)}
                          className="p-2 hover:text-destructive"
                          aria-label="Delete thread"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {threads.length === 0 && (
                      <p className="text-xs opacity-60 px-2 py-4 text-center">No conversations yet.</p>
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <Button
              variant="ghost"
              size="sm"
              onClick={newThread}
              className="h-9 w-9 p-0"
              aria-label="New conversation"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div ref={scrollRef} className="flex-1 overflow-y-auto alice-transcript">
          <div className={cn(
            "mx-auto space-y-4 md:space-y-5",
            transcriptMaxW,
            compact ? "px-3 py-4" : "px-3 py-5 md:px-6 md:py-8",
          )}>
            {messages.length === 0 && (
              <div className={cn("text-center", compact ? "py-6 space-y-3" : "py-10 md:py-16 space-y-4 md:space-y-5")}>
                <div className={cn("alice-orb mx-auto", compact ? "h-12 w-12" : "h-16 w-16 md:h-20 md:w-20")} />
                <h2
                  className={cn("font-semibold tracking-tight", compact ? "text-lg" : "text-2xl md:text-3xl")}
                  style={{ fontFamily: '"Space Grotesk", sans-serif' }}
                >
                  Hello. I'm ALICE.
                </h2>
                {!compact && (
                  <p className="text-sm opacity-70 max-w-md mx-auto px-4">
                    Your second-brain co-pilot. Ask, create, schedule, search — I'll show my work as I go.
                  </p>
                )}
                <div className={cn("flex flex-wrap justify-center gap-2 pt-2 px-2", compact && "pt-1")}>
                  {STARTER_PROMPTS.slice(0, compact ? 2 : 4).map((p) => (
                    <button key={p} className="alice-chip" onClick={() => submit(p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex flex-col gap-1 alice-msg-in", m.role === "user" ? "items-end" : "items-start")}>
                {m.role === "user" ? (
                  <div className={cn(
                    "alice-user-bubble rounded-2xl whitespace-pre-wrap break-words",
                    // Wider cap on phones — 85% looks cramped beside the orb-free right edge.
                    "max-w-[92%] md:max-w-[85%]",
                    compact ? "px-3.5 py-2 text-[13px]" : "px-3.5 py-2 text-[14px] md:px-4 md:py-2.5 md:text-sm",
                  )}>
                    {m.parts.map((p, i) => {
                      if (p.type !== "text") return null;
                      const cleaned = p.text.replace(/\[\[ALICE_PLAN_EXECUTE\]\][\s\S]*?\[\[\/ALICE_PLAN_EXECUTE\]\]/g, "").trim();
                      return cleaned ? <span key={i}>{cleaned}</span> : null;
                    })}
                  </div>
                ) : (
                  <div className="flex gap-2 md:gap-3 w-full">
                    <div className="alice-orb alice-orb-static h-6 w-6 md:h-7 md:w-7 shrink-0 mt-0.5" aria-hidden />
                    <div className={cn(
                      "flex-1 min-w-0",
                      compact ? "text-[13px]" : "text-[14px] md:text-[15px] leading-relaxed",
                    )}>
                      {m.parts.map((p, i) => {
                        if (p.type === "tool") return <ToolPart key={i} part={p} />;
                        if (p.type === "plan") return (
                          <AliceActionPlan key={i} plan={p.plan} onApprove={runPlan} />
                        );
                        if (p.type === "card") return <div key={i} className="my-2"><AliceCardRenderer card={p.card} /></div>;
                        return (
                          <div key={i} className="prose prose-sm dark:prose-invert max-w-none break-words">
                            <ReactMarkdown>{p.text}</ReactMarkdown>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {sending && <LiveThinkingStream />}
          </div>
        </div>

        {/* Composer */}
        <div className={cn(
          compact ? "p-2" : "p-2 md:p-4",
          // Respect iOS safe-area on phones so the composer doesn't sit under the home indicator.
          "pb-[max(env(safe-area-inset-bottom),0.5rem)] md:pb-4",
        )}>
          <div className={cn("mx-auto space-y-2", transcriptMaxW)}>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((a, i) => (
                  <div key={i} className="alice-glass group relative flex items-center gap-1.5 rounded-md pl-1.5 pr-6 py-1 text-xs max-w-[200px]">
                    {a.mime.startsWith("image/") ? (
                      <img src={a.url} alt="" className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 opacity-60" />
                    )}
                    <span className="truncate">{a.name}</span>
                    <button
                      onClick={() => setAttachments((as) => as.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="alice-composer">
              <div className="alice-composer-inner flex gap-2 items-end p-2">
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
                  className={cn("resize-none flex-1 shadow-none focus-visible:ring-0", compact ? "min-h-[36px] max-h-28 text-[13px]" : "min-h-[44px] max-h-40 text-[15px]")}
                  disabled={sending}
                />
                <Button
                  type="button"
                  onClick={toggleDictation}
                  size="icon"
                  variant="ghost"
                  className={cn("shrink-0 rounded-full hover:bg-white/10", listening && "text-destructive", compact && "h-9 w-9")}
                  aria-label={listening ? "Stop dictation" : "Dictate to ALICE"}
                  title={listening ? "Stop dictation" : "Dictate to ALICE"}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={() => submit()}
                  disabled={sending || (!input.trim() && attachments.length === 0)}
                  size="icon"
                  className={cn("shrink-0 alice-send rounded-full", compact && "h-9 w-9")}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
