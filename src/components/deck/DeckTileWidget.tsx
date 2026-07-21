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
