import { useState } from "react";
import { motion } from "framer-motion";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Droplets,
  StickyNote,
  Check,
  Loader2,
  MapPin,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface WeatherData {
  location: string;
  current: {
    condition: string;
    temperature: string;
    feels_like?: string;
    humidity?: string;
    wind?: string;
  };
  forecast?: Array<{
    date: string;
    condition: string;
    high: string;
    low: string;
    precip_chance?: string;
  }>;
}

function weatherIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return CloudLightning;
  if (c.includes("snow") || c.includes("ice") || c.includes("sleet")) return CloudSnow;
  if (c.includes("rain") || c.includes("shower") || c.includes("drizzle")) return CloudRain;
  if (c.includes("fog") || c.includes("mist") || c.includes("haze")) return CloudFog;
  if (c.includes("cloud") || c.includes("overcast") || c.includes("partly")) return Cloud;
  return Sun;
}

function auroraTint(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return "from-indigo-500/20 via-purple-500/10 to-transparent";
  if (c.includes("snow") || c.includes("ice")) return "from-sky-400/20 via-cyan-300/10 to-transparent";
  if (c.includes("rain") || c.includes("shower") || c.includes("drizzle")) return "from-slate-500/20 via-sky-500/10 to-transparent";
  if (c.includes("fog") || c.includes("mist")) return "from-neutral-400/15 via-slate-300/10 to-transparent";
  if (c.includes("cloud") || c.includes("overcast")) return "from-muted/30 via-slate-400/10 to-transparent";
  return "from-amber-400/15 via-orange-300/10 to-transparent";
}

function formatDay(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { weekday: "short" });
  } catch {
    return dateStr;
  }
}

function formatFullDay(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export interface WeatherCardProps {
  data: WeatherData;
  className?: string;
  showSave?: boolean;
  onSave?: () => void;
}

export function WeatherCard({ data, className, showSave = true, onSave }: WeatherCardProps) {
  const Icon = weatherIcon(data.current.condition);
  const tint = auroraTint(data.current.condition);
  const { user } = useAuth();

  const [topic, setTopic] = useState("weather");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const buildNote = () => {
    const lines: string[] = [];
    lines.push(`# Weather — ${data.location}`);
    lines.push("");
    lines.push(`**${data.current.temperature}** · ${data.current.condition}`);
    if (data.current.feels_like) lines.push(`Feels like ${data.current.feels_like}`);
    const meta: string[] = [];
    if (data.current.humidity) meta.push(`Humidity ${data.current.humidity}`);
    if (data.current.wind) meta.push(`Wind ${data.current.wind}`);
    if (meta.length) lines.push(meta.join(" · "));
    if (data.forecast?.length) {
      lines.push("", "## Forecast");
      for (const d of data.forecast) {
        const day = formatFullDay(d.date);
        lines.push(
          `- **${day}** — ${d.condition}, ${d.high} / ${d.low}${d.precip_chance ? ` (${d.precip_chance} precip)` : ""}`
        );
      }
    }
    lines.push("", `_Captured ${new Date().toLocaleString()} via ALICE._`);
    return lines.join("\n");
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Sign in to save notes");
      return;
    }
    setSaving(true);
    const cleanTopic = topic.trim() || "weather";
    try {
      const { error } = await supabase.from("notes").insert({
        user_id: user.id,
        title: `Weather — ${data.location}`,
        content: buildNote(),
        tags: Array.from(new Set([cleanTopic.toLowerCase(), "weather", data.location.toLowerCase()])),
        is_favorite: false,
      });
      if (error) throw error;
      setSaved(true);
      toast.success(`Saved to notes · #${cleanTopic}`);
      onSave?.();
      setTimeout(() => {
        setPopoverOpen(false);
        setSaved(false);
      }, 1200);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/60 bg-card transition-all hover:border-primary/40 hover:shadow-md",
        className
      )}
    >
      {/* Aurora tint overlay */}
      <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", tint)} />

      <div className="relative p-4">
        {/* Header: location + big icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{data.location}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <div className="text-4xl font-light tracking-tight">{data.current.temperature}</div>
              <div className="text-sm text-muted-foreground">{data.current.condition}</div>
            </div>
            {data.current.feels_like && (
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Feels like {data.current.feels_like}
              </div>
            )}
          </div>
          <motion.div
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <Icon className="h-14 w-14 text-primary/80 flex-shrink-0" strokeWidth={1.5} />
          </motion.div>
        </div>

        {/* Current metrics */}
        <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground">
          {data.current.humidity && (
            <span className="inline-flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1">
              <Droplets className="h-3 w-3" />
              {data.current.humidity}
            </span>
          )}
          {data.current.wind && (
            <span className="inline-flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1">
              <Wind className="h-3 w-3" />
              {data.current.wind}
            </span>
          )}
        </div>

        {/* 3-day forecast */}
        {data.forecast && data.forecast.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/60">
            <div className="grid grid-cols-3 gap-2">
              {data.forecast.slice(0, 3).map((day, i) => {
                const DI = weatherIcon(day.condition);
                const dayLabel = formatDay(day.date);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
                    className="flex flex-col items-center text-center rounded-lg py-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      {dayLabel}
                    </div>
                    <DI className="h-5 w-5 my-1.5 text-primary/70" />
                    <div className="text-xs">
                      <span className="font-medium">{day.high}</span>{" "}
                      <span className="text-muted-foreground">{day.low}</span>
                    </div>
                    {day.precip_chance && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">{day.precip_chance}</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Save action */}
        {showSave && (
          <div className="mt-3 pt-3 border-t border-border/60 flex justify-end">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" /> Save as note
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Link to topic
                </label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. travel, garden, austin"
                  className="h-8 mt-1.5 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                  autoFocus
                />
                <div className="text-[10px] text-muted-foreground mt-1.5">
                  Added as a tag plus #weather and the city.
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2.5 h-8 text-xs gap-1.5"
                  onClick={handleSave}
                  disabled={saving || saved}
                >
                  {saved ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Saved
                    </>
                  ) : saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>Save note</>
                  )}
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default WeatherCard;
