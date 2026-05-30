import { lazy, Suspense, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PenLine, FileText, BookOpen, StickyNote, HelpCircle } from "lucide-react";
import { useZettelCards } from "@/hooks/useZettelCards";
import type { ZettelCard as ZettelCardType } from "@/types/zettel";

const ScratchPad = lazy(() => import("@/components/ScratchPad").then(m => ({ default: m.ScratchPad })));
const CardsWorkspace = lazy(() => import("@/components/workspaces/CardsWorkspace").then(m => ({ default: m.CardsWorkspace })));
const NotesWorkspace = lazy(() => import("@/components/workspaces/NotesWorkspace").then(m => ({ default: m.NotesWorkspace })));
const StickyNotesSimple = lazy(() => import("@/components/StickyNotesSimple").then(m => ({ default: m.StickyNotesSimple })));

type HubTab = "scratchpad" | "cards" | "notes" | "stickynotes";

const TAXONOMY: Array<{
  id: HubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  when: string;
  limit: string;
  accent: string;
}> = [
  {
    id: "scratchpad",
    label: "Scratchpad",
    icon: PenLine,
    tagline: "Napkin scribbles",
    when: "Quick ideas, web snippets, brain dumps you don't want to lose. Use the Toolbox to capture highlights from any page.",
    limit: "≤ 500 characters",
    accent: "text-amber-600",
  },
  {
    id: "cards",
    label: "Cards",
    icon: FileText,
    tagline: "Atomic ideas",
    when: "Anything explainable in a paragraph or two — a quote, a definition, a half-formed thesis. Link cards with [[wikilinks]] to grow your second brain.",
    limit: "≤ 1,500 characters",
    accent: "text-sky-600",
  },
  {
    id: "notes",
    label: "Notes",
    icon: BookOpen,
    tagline: "Long-form thinking",
    when: "Meeting notes, lecture transcripts, multi-section drafts. Group them into notebooks. For books/essays/theses, graduate to Catalyst.",
    limit: "Unlimited",
    accent: "text-emerald-600",
  },
  {
    id: "stickynotes",
    label: "Sticky Notes",
    icon: StickyNote,
    tagline: "Reminders & tasks",
    when: "Quick reminders, follow-ups, and short to-dos. Convert any sticky into a Task or Reminder with one click — ALICE handles the rest.",
    limit: "Short",
    accent: "text-rose-600",
  },
];

export function CaptureHub() {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("hub") as HubTab) || "scratchpad";
  const [tab, setTab] = useState<HubTab>(initial);
  const { createCard } = useZettelCards();

  const handleChange = (val: string) => {
    setTab(val as HubTab);
    const next = new URLSearchParams(params);
    next.set("hub", val);
    setParams(next, { replace: true });
  };

  const active = useMemo(() => TAXONOMY.find(t => t.id === tab)!, [tab]);

  const handleCreateCard = (card: Omit<ZettelCardType, "id" | "created" | "modified">) => {
    createCard(card);
  };

  return (
    <div className="px-2 sm:px-4 py-2 space-y-2">
      {/* Compact segmented picker — single row, fits in ~52px */}
      <div className="flex items-center gap-1.5">
        <div
          role="tablist"
          aria-label="Capture type"
          className="flex flex-1 items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 overflow-x-auto scrollbar-hide"
        >
          {TAXONOMY.map((t) => {
            const Icon = t.icon;
            const isActive = t.id === tab;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleChange(t.id)}
                title={`${t.label} · ${t.tagline} · ${t.limit}`}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "" : t.accent}`} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Info popover — full taxonomy on demand */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label="How capture types work"
              className="shrink-0 rounded-full border border-border/60 bg-card/60 p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-3 space-y-2.5">
            <div className="text-xs">
              <p className="font-semibold text-foreground mb-1">One place to capture everything.</p>
              <p className="text-muted-foreground leading-relaxed">
                Pick the shape that fits — short to long. ALICE suggests a promotion (Scratchpad → Card) when content outgrows its home.
              </p>
            </div>
            <div className="border-t border-border/60 pt-2 space-y-2">
              {TAXONOMY.map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.id} className="flex items-start gap-2">
                    <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${t.accent}`} />
                    <div className="text-[11px] leading-snug">
                      <span className="font-semibold text-foreground">{t.label}</span>
                      <span className="text-muted-foreground/80"> · {t.limit}</span>
                      <p className="text-muted-foreground mt-0.5">{t.when}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active workspace */}
      <Tabs value={tab} onValueChange={handleChange} className="w-full">
        <TabsList className="sr-only">
          {TAXONOMY.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <Suspense fallback={<div className="text-xs text-muted-foreground p-4">Loading…</div>}>
          <TabsContent value="scratchpad" className="mt-0">
            <ScratchPad onCreateCard={handleCreateCard} />
          </TabsContent>
          <TabsContent value="cards" className="mt-0">
            <CardsWorkspace />
          </TabsContent>
          <TabsContent value="notes" className="mt-0">
            <NotesWorkspace />
          </TabsContent>
          <TabsContent value="stickynotes" className="mt-0">
            <StickyNotesSimple />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
