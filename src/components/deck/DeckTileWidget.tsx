import { useEffect, useRef, useState } from "react";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import type { DeckTile } from "@/hooks/useDecks";
import {
  Sparkles,
  MessageSquare,
  Keyboard,
  Link2,
  Layers,
  FolderOpen,
  Zap,
  Circle,
  Compass,
  Pause,
  Play,
  RotateCcw,
  Plus,
  Minus,
  Flame,
  BookOpen,
  Bot,
} from "lucide-react";


/**
 * Renders a live preview INSIDE a deck tile for every tile kind — so the
 * phone remote never shows an empty "New tile" square. Widgets stream live
 * data (weather, clock, stopwatch); action tiles show a rich preview of what
 * they will do (prompt text, hotkey, URL host, macro name, etc.).
 */
export function DeckTileWidget({
  tile,
  label,
  fallbackType,
}: {
  tile?: DeckTile;
  label?: string | null;
  /** Legacy: allow rendering just a widget by type (weather/clock/stopwatch). */
  fallbackType?: string | null;
}) {
  const kind = tile?.kind ?? "widget";
  const displayLabel = (label ?? tile?.label ?? "").trim();

  // Live widgets first
  if (kind === "widget") {
    const wt = (tile?.widget_type || fallbackType || inferWidgetFromLabel(displayLabel) || "").toLowerCase();
    if (wt === "weather") return <FullBleed><WeatherWidget /></FullBleed>;
    if (wt === "clock") return <ClockPreview label={displayLabel} />;
    if (wt === "stopwatch") return <StopwatchPreview label={displayLabel} />;
    if (wt === "pomodoro") return <PomodoroPreview label={displayLabel} config={tile?.config} />;
    if (wt === "counter") return <CounterPreview label={displayLabel} tileId={tile?.id} />;
    if (wt === "writing_streak") return <StreakPreview label={displayLabel} />;
    if (wt === "zettel_count") return <ZettelCountPreview label={displayLabel} />;
    if (wt === "alice_status") return <AliceStatusPreview label={displayLabel} />;
    return (
      <TileFrame icon={<Sparkles className="h-5 w-5" />} title={displayLabel || "Live widget"} subtitle={wt || "widget"} />
    );
  }


  if (kind === "alice_chat") {
    const prompt = (tile?.config?.prompt as string) || "";
    return (
      <TileFrame
        icon={<MessageSquare className="h-5 w-5" />}
        title={displayLabel || "Ask ALICE"}
        subtitle={prompt ? `“${truncate(prompt, 90)}”` : "Tap to open ALICE"}
        accent
      />
    );
  }

  if (kind === "hotkey") {
    return (
      <TileFrame
        icon={<Keyboard className="h-5 w-5" />}
        title={displayLabel || "Hotkey"}
        subtitle={tile?.hotkey || "no shortcut set"}
        mono
      />
    );
  }

  if (kind === "url") {
    const url = (tile?.config?.url as string) || "";
    let host = "no URL set";
    try { if (url) host = new URL(url).hostname.replace(/^www\./, ""); } catch { host = url; }
    return (
      <TileFrame
        icon={<Link2 className="h-5 w-5" />}
        title={displayLabel || host}
        subtitle={host}
      />
    );
  }

  if (kind === "macro") {
    return (
      <TileFrame
        icon={<Zap className="h-5 w-5" />}
        title={displayLabel || "Macro"}
        subtitle={tile?.macro_id ? "Ready to run" : "No macro selected"}
        accent
      />
    );
  }

  if (kind === "folder") {
    return (
      <TileFrame
        icon={<FolderOpen className="h-5 w-5" />}
        title={displayLabel || "Folder"}
        subtitle="Group of tiles"
      />
    );
  }

  if (kind === "multi") {
    const steps = Array.isArray(tile?.config?.actions) ? (tile!.config!.actions as unknown[]).length : 0;
    return (
      <TileFrame
        icon={<Layers className="h-5 w-5" />}
        title={displayLabel || "Multi-action"}
        subtitle={steps ? `${steps} step${steps === 1 ? "" : "s"}` : "Chain of actions"}
      />
    );
  }

  // noop / app_route / anything unknown — still show something meaningful.
  const route = (tile?.config?.route as string) || (tile?.config?.path as string) || "";
  return (
    <TileFrame
      icon={<Compass className="h-5 w-5" />}
      title={displayLabel || (route ? "Open page" : kind ?? "Tile")}
      subtitle={route || "No action configured"}
    />
  );
}

function inferWidgetFromLabel(label?: string | null): string | null {
  const l = (label ?? "").toLowerCase();
  if (!l) return null;
  if (l.includes("weather")) return "weather";
  if (l.includes("stopwatch")) return "stopwatch";
  if (l.includes("clock") || l.includes("time")) return "clock";
  return null;
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

function FullBleed({ children }: { children: React.ReactNode }) {
  return <div className="h-full w-full overflow-hidden">{children}</div>;
}

function TileFrame({
  icon, title, subtitle, accent, mono,
}: { icon: React.ReactNode; title: string; subtitle?: string; accent?: boolean; mono?: boolean }) {
  return (
    <div className="flex h-full w-full flex-col justify-between p-1">
      <div className={`flex items-center gap-1.5 ${accent ? "text-primary" : "opacity-80"}`}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{title}</span>
      </div>
      {subtitle && (
        <div className={`mt-1 text-xs leading-snug opacity-70 line-clamp-3 ${mono ? "font-mono" : ""}`}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function ClockPreview({ label }: { label: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
      <div className="tabular-nums text-3xl font-semibold leading-none">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="text-[10px] uppercase tracking-wide opacity-60">
        {now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
      </div>
      {label && <div className="mt-1 text-[10px] opacity-50 truncate max-w-full">{label}</div>}
    </div>
  );
}

function StopwatchPreview({ label }: { label: string }) {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const start = Date.now() - ms;
    const t = setInterval(() => setMs(Date.now() - start), 100);
    return () => clearInterval(t);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
  const secs = Math.floor(ms / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-1"
      onClick={(e) => { e.stopPropagation(); setRunning((r) => !r); }}
      onDoubleClick={(e) => { e.stopPropagation(); setMs(0); setRunning(false); }}
      title="Tap: start/stop · Double-tap: reset"
    >
      <div className="tabular-nums text-3xl font-semibold leading-none">{mm}:{ss}</div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-70">
        <Circle className={`h-2 w-2 ${running ? "fill-emerald-400 text-emerald-400" : "fill-muted-foreground/50 text-muted-foreground/50"}`} />
        {running ? "running" : "tap to start"}
      </div>
      {label && <div className="text-[10px] opacity-50 truncate max-w-full">{label}</div>}
    </div>
  );
}

// -------- Pomodoro --------
function PomodoroPreview({ label, config }: { label: string; config?: Record<string, unknown> | null }) {
  const workMin = Math.max(1, Number((config as any)?.workMinutes) || 25);
  const breakMin = Math.max(1, Number((config as any)?.breakMinutes) || 5);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [remaining, setRemaining] = useState(workMin * 60);
  const [running, setRunning] = useState(false);
  const endRef = useRef<number | null>(null);

  useEffect(() => { setRemaining((mode === "work" ? workMin : breakMin) * 60); }, [mode, workMin, breakMin]);

  useEffect(() => {
    if (!running) { endRef.current = null; return; }
    if (endRef.current == null) endRef.current = Date.now() + remaining * 1000;
    const tick = () => {
      const left = Math.max(0, Math.round((endRef.current! - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        endRef.current = null;
        setMode((m) => (m === "work" ? "break" : "work"));
        try { new Audio("data:audio/wav;base64,UklGRh4AAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=").play().catch(() => {}); } catch {}
      }
    };
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = (mode === "work" ? workMin : breakMin) * 60;
  const pct = 1 - remaining / total;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-1"
      onClick={(e) => { e.stopPropagation(); setRunning((r) => !r); }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setRunning(false);
        endRef.current = null;
        setRemaining((mode === "work" ? workMin : breakMin) * 60);
      }}
      title="Tap: start/pause · Double-tap: reset"
    >
      <div
        className="absolute inset-0 rounded-2xl opacity-30"
        style={{ background: `conic-gradient(hsl(var(--primary)) ${pct * 360}deg, transparent 0)` }}
      />
      <div className="relative z-10 flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-80">
        {mode === "work" ? <Flame className="h-3 w-3" /> : <Play className="h-3 w-3" />} {mode}
      </div>
      <div className="relative z-10 tabular-nums text-3xl font-semibold leading-none">{mm}:{ss}</div>
      <div className="relative z-10 flex items-center gap-1 text-[10px] uppercase opacity-70">
        {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {running ? "running" : "tap to start"}
        <RotateCcw className="ml-1 h-3 w-3 opacity-50" />
      </div>
      {label && <div className="relative z-10 text-[10px] opacity-50 truncate max-w-full">{label}</div>}
    </div>
  );
}

// -------- Counter --------
function CounterPreview({ label, tileId }: { label: string; tileId?: string }) {
  const storageKey = `deck:counter:${tileId ?? label}`;
  const [count, setCount] = useState<number>(() => {
    try { return Number(localStorage.getItem(storageKey)) || 0; } catch { return 0; }
  });
  useEffect(() => { try { localStorage.setItem(storageKey, String(count)); } catch {} }, [count, storageKey]);
  return (
    <div className="flex h-full w-full items-center justify-between gap-2 p-1">
      <button
        onClick={(e) => { e.stopPropagation(); setCount((c) => c - 1); }}
        className="rounded-full bg-background/50 p-1 hover:bg-background"
        aria-label="Decrement"
      ><Minus className="h-4 w-4" /></button>
      <div className="flex flex-col items-center">
        <div className="tabular-nums text-3xl font-semibold leading-none">{count}</div>
        {label && <div className="mt-1 text-[10px] uppercase opacity-60 truncate max-w-[100px]">{label}</div>}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setCount((c) => c + 1); }}
        className="rounded-full bg-background/50 p-1 hover:bg-background"
        aria-label="Increment"
      ><Plus className="h-4 w-4" /></button>
    </div>
  );
}

// -------- Writing streak --------
function StreakPreview({ label }: { label: string }) {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client") as any;
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) { if (!cancelled) setDays(0); return; }
        const since = new Date(); since.setDate(since.getDate() - 30);
        const { data } = await supabase
          .from("content_items")
          .select("updated_at")
          .eq("user_id", uid)
          .gte("updated_at", since.toISOString())
          .order("updated_at", { ascending: false })
          .limit(200);
        const set = new Set<string>();
        (data ?? []).forEach((r: any) => set.add(new Date(r.updated_at).toDateString()));
        let streak = 0;
        const cur = new Date();
        while (set.has(cur.toDateString())) { streak++; cur.setDate(cur.getDate() - 1); }
        if (!cancelled) setDays(streak);
      } catch { if (!cancelled) setDays(0); }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-70">
        <Flame className="h-3 w-3 text-orange-400" /> Streak
      </div>
      <div className="tabular-nums text-3xl font-semibold leading-none">{days ?? "—"}</div>
      <div className="text-[10px] opacity-60">{days === 1 ? "day" : "days"}</div>
      {label && <div className="mt-1 text-[10px] opacity-50 truncate max-w-full">{label}</div>}
    </div>
  );
}

// -------- Zettel count --------
function ZettelCountPreview({ label }: { label: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client") as any;
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) { if (!cancelled) setCount(0); return; }
        const { count: c } = await supabase
          .from("cards")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid);
        if (!cancelled) setCount(c ?? 0);
      } catch { if (!cancelled) setCount(0); }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-70">
        <BookOpen className="h-3 w-3" /> Zettels
      </div>
      <div className="tabular-nums text-3xl font-semibold leading-none">{count ?? "—"}</div>
      {label && <div className="mt-1 text-[10px] opacity-50 truncate max-w-full">{label}</div>}
    </div>
  );
}

// -------- ALICE status --------
function AliceStatusPreview({ label }: { label: string }) {
  const [online, setOnline] = useState<boolean>(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
      <Bot className={`h-6 w-6 ${online ? "text-primary" : "opacity-50"}`} />
      <div className="text-xs font-semibold">{online ? "ALICE ready" : "Offline"}</div>
      <div className="flex items-center gap-1 text-[10px] uppercase opacity-70">
        <Circle className={`h-2 w-2 ${online ? "fill-emerald-400 text-emerald-400" : "fill-muted-foreground/50 text-muted-foreground/50"}`} />
        {online ? "connected" : "waiting"}
      </div>
      {label && <div className="text-[10px] opacity-50 truncate max-w-full">{label}</div>}
    </div>
  );
}

