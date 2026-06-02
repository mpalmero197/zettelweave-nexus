/**
 * ALICE rich-media cards — Gemini Spark–style expressive renderers.
 *
 * ALICE may emit a fenced block in her assistant text:
 *   [[ALICE_CARD type=link]]{...json...}[[/ALICE_CARD]]
 *
 * The hook extracts those into structured `card` parts. Each card type
 * below renders a single payload shape.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink, MapPin, FileText, Play, Quote, Table2, FileIcon, X, ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WeatherCard } from "./WeatherCard";

export type AliceCard =
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "map"; lat: number; lng: number; label?: string; zoom?: number }
  | { type: "pdf"; url: string; title: string; pages?: number; thumbnail?: string }
  | { type: "video"; url: string; title?: string; poster?: string; thumbnail?: string; channel?: string; provider?: string; description?: string }
  | { type: "weather"; location: string; current: { condition: string; temperature: string; feels_like?: string; humidity?: string; wind?: string }; forecast?: Array<{ date: string; condition: string; high: string; low: string; precip_chance?: string }> }
  | { type: "spreadsheet"; title?: string; headers: string[]; rows: (string | number)[][]; sourceUrl?: string }
  | { type: "link"; url: string; title: string; description?: string; image?: string; favicon?: string; domain?: string }
  | { type: "quote"; text: string; author?: string; source?: string; sourceUrl?: string }
  | { type: "file"; url: string; name: string; mime?: string; size?: number };

const cardMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] as const },
};

const shellClass =
  "alice-card group relative overflow-hidden rounded-xl border border-border/60 bg-card transition-all hover:border-primary/40 hover:shadow-md my-2";

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split(/[/?#]/)[0] || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/watch")) return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(?:embed|shorts|v)\/([^/?#]+)/);
      if (m) return m[1];
    }
  } catch { /* noop */ }
  return null;
}

function vimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo.com")) return null;
    const m = u.pathname.match(/\/(\d+)/);
    return m ? m[1] : null;
  } catch { return null; }
}

function isDirectMedia(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function ImageCard({ card }: { card: Extract<AliceCard, { type: "image" }> }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div {...cardMotion} className={shellClass}>
      <button onClick={() => setOpen(true)} className="block w-full text-left">
        <img src={card.url} alt={card.alt || card.caption || "Image"} loading="lazy" className="w-full h-auto max-h-[360px] object-cover" />
      </button>
      {card.caption && <div className="px-3 py-2 text-xs text-muted-foreground">{card.caption}</div>}
      {open && (
        <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-background border border-border" aria-label="Close"><X className="h-4 w-4" /></button>
          <img src={card.url} alt={card.alt || ""} className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </motion.div>
  );
}

function MapCard({ card }: { card: Extract<AliceCard, { type: "map" }> }) {
  const zoom = card.zoom ?? 14;
  const d = 0.02 / Math.max(1, zoom / 14);
  const bbox = `${card.lng - d},${card.lat - d},${card.lng + d},${card.lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${card.lat},${card.lng}`;
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${card.lat},${card.lng}`;
  return (
    <motion.div {...cardMotion} className={shellClass}>
      <iframe src={src} className="w-full h-56 border-0" loading="lazy" title={card.label || "Map"} />
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5 text-primary" />{card.label || `${card.lat.toFixed(3)}, ${card.lng.toFixed(3)}`}</div>
        <a href={gmaps} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Open in Maps <ExternalLink className="h-3 w-3" /></a>
      </div>
    </motion.div>
  );
}

function PdfCard({ card }: { card: Extract<AliceCard, { type: "pdf" }> }) {
  return (
    <motion.div {...cardMotion} className={shellClass}>
      <div className="flex gap-3 p-3">
        <div className="flex-shrink-0 w-16 h-20 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden">
          {card.thumbnail ? <img src={card.thumbnail} alt="" className="w-full h-full object-cover" /> : <FileText className="h-7 w-7 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">PDF{card.pages ? ` · ${card.pages} pages` : ""}</div>
          <div className="font-medium truncate">{card.title}</div>
          <a href={card.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">Open PDF <ExternalLink className="h-3 w-3" /></a>
        </div>
      </div>
    </motion.div>
  );
}

function VideoCard({ card }: { card: Extract<AliceCard, { type: "video" }> }) {
  const ytId = youtubeId(card.url);
  const vmId = !ytId ? vimeoId(card.url) : null;
  const direct = !ytId && !vmId && isDirectMedia(card.url);
  const embeddable = Boolean(ytId || vmId || direct);
  const [playing, setPlaying] = useState(false);
  const thumb =
    card.thumbnail ||
    card.poster ||
    (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "");
  const domain = domainOf(card.url);

  return (
    <motion.div {...cardMotion} className={shellClass}>
      <div className="relative aspect-video bg-black">
        {embeddable && playing ? (
          ytId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`}
              title={card.title || "Video"}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : vmId ? (
            <iframe
              src={`https://player.vimeo.com/video/${vmId}?autoplay=1`}
              title={card.title || "Video"}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={card.url} poster={card.poster} controls autoPlay className="w-full h-full" />
          )
        ) : (
          <a
            href={embeddable ? undefined : card.url}
            target={embeddable ? undefined : "_blank"}
            rel="noreferrer"
            onClick={(e) => {
              if (embeddable) { e.preventDefault(); setPlaying(true); }
            }}
            className="group w-full h-full relative block"
          >
            {thumb ? (
              <img src={thumb} alt={card.title || ""} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/55 transition-colors">
              <div className="h-14 w-14 rounded-full bg-primary/95 flex items-center justify-center shadow-lg">
                {embeddable ? (
                  <Play className="h-6 w-6 text-primary-foreground fill-current ml-0.5" />
                ) : (
                  <ExternalLink className="h-6 w-6 text-primary-foreground" />
                )}
              </div>
            </div>
            {!embeddable && domain && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/65 text-white text-[11px]">
                Watch on {domain}
              </div>
            )}
          </a>
        )}
      </div>
      {(card.title || card.channel) && (
        <div className="px-3 py-2">
          {card.title && <div className="text-sm font-medium line-clamp-2">{card.title}</div>}
          {card.channel && <div className="text-[11px] text-muted-foreground mt-0.5">{card.channel}{card.provider ? ` · ${card.provider}` : ""}</div>}
        </div>
      )}
    </motion.div>
  );
}

function SpreadsheetCard({ card }: { card: Extract<AliceCard, { type: "spreadsheet" }> }) {
  return (
    <motion.div {...cardMotion} className={shellClass}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <div className="flex items-center gap-1.5 text-xs font-medium"><Table2 className="h-3.5 w-3.5 text-primary" />{card.title || "Spreadsheet"}</div>
        {card.sourceUrl && <a href={card.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Open full</a>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>{card.headers.map((h, i) => <th key={i} className="px-3 py-1.5 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {card.rows.slice(0, 10).map((row, i) => (
              <tr key={i} className="border-t border-border/40">{row.map((c, j) => <td key={j} className="px-3 py-1.5">{String(c)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function LinkCard({ card }: { card: Extract<AliceCard, { type: "link" }> }) {
  const domain = card.domain || domainOf(card.url);
  const favicon = card.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  return (
    <motion.a {...cardMotion} href={card.url} target="_blank" rel="noreferrer" className={cn(shellClass, "block no-underline")}>
      <div className="flex gap-3 p-3">
        {card.image && (
          <div className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden bg-muted">
            <img src={card.image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <img src={favicon} alt="" className="h-3 w-3" /> {domain}
          </div>
          <div className="font-medium text-sm leading-snug line-clamp-2 mt-0.5">{card.title}</div>
          {card.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{card.description}</div>}
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      </div>
    </motion.a>
  );
}

function QuoteCard({ card }: { card: Extract<AliceCard, { type: "quote" }> }) {
  return (
    <motion.div {...cardMotion} className={cn(shellClass, "bg-gradient-to-br from-primary/5 to-transparent")}>
      <div className="p-4">
        <Quote className="h-5 w-5 text-primary/60 mb-2" />
        <p className="text-base leading-relaxed italic">{card.text}</p>
        {(card.author || card.source) && (
          <div className="mt-3 text-xs text-muted-foreground">
            — {card.author}{card.source && card.author ? ", " : ""}
            {card.sourceUrl ? <a href={card.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">{card.source}</a> : card.source}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function FileCard({ card }: { card: Extract<AliceCard, { type: "file" }> }) {
  const Icon = card.mime?.startsWith("image/") ? ImageIcon : FileIcon;
  return (
    <motion.div {...cardMotion} className={shellClass}>
      <div className="flex items-center gap-3 p-3">
        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center"><Icon className="h-5 w-5 text-muted-foreground" /></div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{card.name}</div>
          <div className="text-[11px] text-muted-foreground">{card.mime || "File"}{card.size ? ` · ${(card.size / 1024).toFixed(1)} KB` : ""}</div>
        </div>
        <a href={card.url} target="_blank" rel="noreferrer" download className="text-xs text-primary hover:underline">Open</a>
      </div>
    </motion.div>
  );
}

export function AliceCardRenderer({ card }: { card: AliceCard }) {
  switch (card.type) {
    case "image": return <ImageCard card={card} />;
    case "map": return <MapCard card={card} />;
    case "pdf": return <PdfCard card={card} />;
    case "video": return <VideoCard card={card} />;
    case "weather": return <WeatherCard data={card} />;
    case "spreadsheet": return <SpreadsheetCard card={card} />;
    case "link": return <LinkCard card={card} />;
    case "quote": return <QuoteCard card={card} />;
    case "file": return <FileCard card={card} />;
    default: return null;
  }
}

/**
 * Parse `[[ALICE_CARD type=...]]{...json...}[[/ALICE_CARD]]` blocks
 * from a text string into ordered text + card chunks.
 */
export function parseCardBlocks(text: string): Array<{ kind: "text"; text: string } | { kind: "card"; card: AliceCard }> {
  const out: Array<{ kind: "text"; text: string } | { kind: "card"; card: AliceCard }> = [];
  // Accept both `[[...]]` and `[...]` brackets on open/close tags — models
  // occasionally drop one bracket on the closing tag.
  const RX = /\[\[?ALICE_CARD(?:\s+type=([a-z]+))?\]\]?([\s\S]*?)\[\[?\/ALICE_CARD\]\]?/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = RX.exec(text)) !== null) {
    const before = text.slice(last, m.index);
    if (before.trim()) out.push({ kind: "text", text: before });
    try {
      const payload = JSON.parse(m[2].trim());
      const card = (m[1] ? { type: m[1], ...payload } : payload) as AliceCard;
      if (card && typeof card === "object" && (card as any).type) out.push({ kind: "card", card });
    } catch { /* skip malformed */ }
    last = m.index + m[0].length;
  }
  const tail = text.slice(last);
  if (tail.trim()) out.push({ kind: "text", text: tail });
  if (out.length === 0) out.push({ kind: "text", text });
  return out;
}
