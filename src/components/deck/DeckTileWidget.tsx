import { useEffect, useState } from "react";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";

/**
 * Renders a live widget INSIDE a deck tile — so a "Weather" tile actually
 * shows the weather instead of being a button that navigates somewhere.
 */
export function DeckTileWidget({ type, label }: { type: string | null; label?: string | null }) {
  // If widget_type wasn't picked, infer from the label so a tile called
  // "Weather" or "Stopwatch" still lights up as a live widget.
  const resolved = type || inferFromLabel(label);

  if (resolved === "weather") {
    return (
      <div className="h-full w-full overflow-hidden">
        <WeatherWidget />
      </div>
    );
  }
  if (resolved === "clock") return <ClockWidget />;
  if (resolved === "stopwatch") return <StopwatchWidget />;

  // Fallback: show the label so the tile still communicates what it is.
  return (
    <div className="flex h-full w-full flex-col items-center justify-center text-center">
      <div className="text-xs uppercase tracking-wide opacity-60">{resolved ?? "widget"}</div>
      <div className="mt-1 truncate text-sm font-semibold">{label ?? ""}</div>
    </div>
  );
}

function inferFromLabel(label?: string | null): string | null {
  const l = (label ?? "").toLowerCase();
  if (!l) return null;
  if (l.includes("weather")) return "weather";
  if (l.includes("stopwatch")) return "stopwatch";
  if (l.includes("clock") || l.includes("time")) return "clock";
  return null;
}

function ClockWidget() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="tabular-nums text-2xl font-semibold">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="text-[10px] uppercase tracking-wide opacity-60">
        {now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
      </div>
    </div>
  );
}

function StopwatchWidget() {
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
      className="flex h-full w-full flex-col items-center justify-center"
      onClick={(e) => { e.stopPropagation(); setRunning((r) => !r); }}
      onDoubleClick={(e) => { e.stopPropagation(); setMs(0); setRunning(false); }}
      title="Tap: start/stop · Double-tap: reset"
    >
      <div className="tabular-nums text-2xl font-semibold">{mm}:{ss}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-60">{running ? "running" : "tap to start"}</div>
    </div>
  );
}
