import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Youtube, Globe, Send, Play, Sparkles, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useZettelCards } from "@/hooks/useZettelCards";
import { toast } from "sonner";

type Source = { kind: "youtube"; videoId: string; title: string; channel?: string; description?: string; hasTranscript: boolean; segments: Array<{ start: number; dur: number; text: string }>; fullText: string; }
             | { kind: "article"; url: string; title: string; hostname: string; content: string; image?: string; description?: string; }
             | null;

type ChatMsg = { role: "user" | "assistant"; content: string };

function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s) && !s.includes(".")) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1, 12);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/\/(shorts|embed)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {}
  return null;
}

function fmtTime(s: number): string {
  const total = Math.floor(s);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function transcriptWindow(segments: Array<{ start: number; dur: number; text: string }>, t: number, span = 120): string {
  if (!segments.length) return "";
  const start = Math.max(0, t - span);
  const end = t + span;
  return segments
    .filter(s => s.start + s.dur >= start && s.start <= end)
    .map(s => `[${fmtTime(s.start)}] ${s.text}`)
    .join("\n");
}

export default function WatchAsk() {
  const [params, setParams] = useSearchParams();
  const [url, setUrl] = useState(params.get("url") || "");
  const [source, setSource] = useState<Source>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { createCard } = useZettelCards();

  // Listen to YouTube postMessage for currentTime
  useEffect(() => {
    if (source?.kind !== "youtube") return;
    const handler = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;
      try {
        const data = JSON.parse(e.data);
        if (data.event === "infoDelivery" && typeof data.info?.currentTime === "number") {
          setCurrentTime(data.info.currentTime);
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    const poll = setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening" }), "*"
      );
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "getCurrentTime", args: [] }), "*"
      );
    }, 1500);
    return () => { window.removeEventListener("message", handler); clearInterval(poll); };
  }, [source]);

  const seek = useCallback((seconds: number) => {
    if (source?.kind !== "youtube") return;
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "seekTo", args: [seconds, true] }), "*"
    );
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*"
    );
  }, [source]);

  const load = useCallback(async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setSource(null);
    setMessages([]);
    const next = new URLSearchParams(params);
    next.set("url", targetUrl);
    setParams(next, { replace: true });

    const ytId = extractYouTubeId(targetUrl);
    try {
      if (ytId) {
        const { data, error } = await supabase.functions.invoke("youtube-transcript", {
          body: { videoId: ytId },
        });
        if (error) throw error;
        setSource({
          kind: "youtube",
          videoId: ytId,
          title: data.title || "YouTube video",
          channel: data.channel,
          description: data.description || "",
          hasTranscript: !!data.hasTranscript,
          segments: data.segments || [],
          fullText: data.fullText || "",
        });
      } else {
        const { data, error } = await supabase.functions.invoke("fetch-url-content", {
          body: { url: targetUrl },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Failed to load page");
        setSource({
          kind: "article",
          url: targetUrl,
          title: data.data.title,
          hostname: data.data.hostname,
          content: data.data.content || "",
          image: data.data.image,
          description: data.data.description,
        });
      }
    } catch (e: any) {
      console.error("Watch load failed", e);
      toast.error(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params, setParams]);

  // Auto-load from ?url= on mount
  useEffect(() => {
    const u = params.get("url");
    if (u && !source && !loading) load(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);




  const ask = useCallback(async (question: string, mode: "chat" | "summary" | "chapters" | "deep" | "study" | "quotes" | "factcheck" | "actions" = "chat") => {
    if (!source) return;
    if (mode === "chat" && !question.trim()) return;
    const userLabel = mode === "chat"
      ? question
      : ({
          summary: "Give me a structured summary.",
          chapters: "Reconstruct the chapters/outline.",
          deep: "Deep-dive analysis.",
          study: "Turn this into study notes.",
          quotes: "Pull the top quotes.",
          factcheck: "Fact-check the main claims.",
          actions: "Extract actionable takeaways.",
        } as const)[mode];
    const nextMessages = [...messages, { role: "user" as const, content: userLabel }];
    setMessages(nextMessages);
    if (mode === "chat") setInput("");
    setAsking(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-watch", {
        body: {
          source: source.kind === "youtube"
            ? {
                kind: "youtube",
                title: source.title,
                channel: source.channel,
                description: source.description,
                segments: source.segments,
              }
            : {
                kind: "article",
                title: source.title,
                url: source.url,
                description: source.description,
                content: source.content,
              },
          question: mode === "chat" ? question : "",
          mode,
          currentTime,
          history: messages.slice(-8),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const answer = data?.response || "";
      setMessages(m => [...m, { role: "assistant", content: answer || "(no response)" }]);
    } catch (e: any) {
      console.error("ask failed", e);
      toast.error(e?.message || "ALICE couldn't answer");
      setMessages(m => [...m, { role: "assistant", content: "Sorry — I couldn't answer that just now." }]);
    } finally {
      setAsking(false);
    }
  }, [source, messages, currentTime]);

  const saveAsCard = useCallback((content: string, title: string) => {
    if (!source) return;
    createCard({
      title: title.slice(0, 80),
      content,
      description: source.kind === "youtube" ? `From YouTube: ${source.title}` : `From ${source.hostname}`,
      category: "000",
      number: "",
      tags: ["watch-ask", source.kind],
      linkedCards: [],
    });
    toast.success("Saved as Zettel card");
  }, [source, createCard]);

  const renderAssistant = (text: string) => {
    if (source?.kind !== "youtube") return <span>{text}</span>;
    const parts = text.split(/(\[\d{1,2}:\d{2}(?::\d{2})?\])/g);
    return parts.map((p, i) => {
      const m = p.match(/^\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]$/);
      if (!m) return <span key={i}>{p}</span>;
      const h = m[3] ? parseInt(m[1], 10) : 0;
      const mm = m[3] ? parseInt(m[2], 10) : parseInt(m[1], 10);
      const ss = m[3] ? parseInt(m[3], 10) : parseInt(m[2], 10);
      const t = h * 3600 + mm * 60 + ss;
      return (
        <button
          key={i}
          onClick={() => seek(t)}
          className="mx-0.5 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/25"
        >
          {p.slice(1, -1)}
        </button>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] p-3 gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && load(url)}
          placeholder="Paste a YouTube link or any web URL…"
          className="flex-1 min-w-[220px]"
        />
        <Button onClick={() => load(url)} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
        </Button>
        {source && (
          <Badge variant="secondary" className="gap-1">
            {source.kind === "youtube" ? <Youtube className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
            {source.kind === "youtube" ? "YouTube" : source.hostname}
          </Badge>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0">
        {/* LEFT: Player / Reader */}
        <Card className="p-3 flex flex-col min-h-0 overflow-hidden">
          {!source && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground text-sm gap-2 p-6">
              <Play className="h-8 w-8 opacity-60" />
              <p>Paste a URL above to watch a video or read an article, then chat with ALICE about it.</p>
            </div>
          )}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {source?.kind === "youtube" && (
            <>
              <div className="aspect-video w-full rounded overflow-hidden bg-black">
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${source.videoId}?enablejsapi=1&rel=0`}
                  title={source.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="mt-2 text-sm font-semibold truncate">{source.title}</div>
              {source.channel && <div className="text-xs text-muted-foreground">{source.channel}</div>}
              <div className="text-xs text-muted-foreground mt-1">
                {source.hasTranscript ? `Transcript loaded (${source.segments.length} segments)` : "No captions available — ALICE will use description + title."}
                {" · "}Now: {fmtTime(currentTime)}
              </div>
              {source.description && (
                <details className="mt-2 text-xs" open={!source.hasTranscript}>
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                    Description ({source.description.length.toLocaleString()} chars) — used as ALICE context
                  </summary>
                  <ScrollArea className="mt-1 max-h-40 rounded border border-border/50 bg-muted/30 p-2">
                    <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                      {source.description}
                    </div>
                  </ScrollArea>
                </details>
              )}
            </>

          )}
          {source?.kind === "article" && (
            <ScrollArea className="flex-1 pr-3">
              <div className="text-lg font-semibold">{source.title}</div>
              <div className="text-xs text-muted-foreground mb-3">{source.hostname}</div>
              {source.image && (
                <img src={source.image} alt="" className="rounded mb-3 max-h-64 w-full object-cover" />
              )}
              <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap max-w-none">
                {source.content}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* RIGHT: Chat */}
        <Card className="p-3 flex flex-col min-h-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Button size="sm" variant="outline" disabled={!source || asking} onClick={() => ask("", "summary")}>
              <Sparkles className="h-3 w-3 mr-1" />Summary
            </Button>
            {source?.kind === "youtube" && (
              <Button size="sm" variant="outline" disabled={!source || asking} onClick={() => ask("", "chapters")}>
                Chapters
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={!source || asking} onClick={() => ask("", "deep")}>
              Deep dive
            </Button>
            <Button size="sm" variant="outline" disabled={!source || asking} onClick={() => ask("", "study")}>
              Study notes
            </Button>
            <Button size="sm" variant="outline" disabled={!source || asking} onClick={() => ask("", "quotes")}>
              Key quotes
            </Button>
            <Button size="sm" variant="outline" disabled={!source || asking} onClick={() => ask("", "factcheck")}>
              Fact-check
            </Button>
            <Button size="sm" variant="outline" disabled={!source || asking} onClick={() => ask("", "actions")}>
              Actions
            </Button>
            {source?.kind === "youtube" && (
              <Button size="sm" variant="outline" disabled={!source || asking} onClick={() => ask(`What is being said right around ${fmtTime(currentTime)}? Explain in plain terms.`)}>
                This moment
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 pr-2">
            {messages.length === 0 && source && (
              <div className="text-xs text-muted-foreground p-2">
                Ask a question about this {source.kind === "youtube" ? "video" : "page"}.
              </div>
            )}
            <div className="space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary/10 ml-6" : "bg-muted mr-6"}`}>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    {m.role === "user" ? "You" : "ALICE"}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {m.role === "assistant" ? renderAssistant(m.content) : m.content}
                  </div>
                  {m.role === "assistant" && (
                    <div className="mt-1.5 flex justify-end">
                      <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1"
                        onClick={() => saveAsCard(m.content, source?.title || "Watch note")}>
                        <Save className="h-3 w-3" /> Save as card
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {asking && (
                <div className="rounded-lg px-3 py-2 bg-muted mr-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> ALICE is thinking…
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="mt-2 flex items-end gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
              placeholder={source ? "Ask about this content…" : "Load a URL first"}
              disabled={!source || asking}
            />
            <Button onClick={() => ask(input)} disabled={!source || asking || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
