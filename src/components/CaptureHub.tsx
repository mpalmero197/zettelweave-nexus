import { lazy, Suspense, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PenLine, Layers, StickyNote, HelpCircle } from "lucide-react";
import { useZettelCards } from "@/hooks/useZettelCards";
import type { ZettelCard as ZettelCardType } from "@/types/zettel";

const ScratchPad = lazy(() => import("@/components/ScratchPad").then(m => ({ default: m.ScratchPad })));
const CardsNotesWorkspace = lazy(() => import("@/components/workspaces/CardsNotesWorkspace").then(m => ({ default: m.CardsNotesWorkspace })));
const StickyNotesSimple = lazy(() => import("@/components/StickyNotesSimple").then(m => ({ default: m.StickyNotesSimple })));

type HubTab = "scratchpad" | "workspace" | "stickynotes";

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
    when: "Quick ideas, web snippets, brain dumps you don't want to lose.",
    limit: "≤ 500 characters",
    accent: "text-amber-600",
  },
  {
    id: "workspace",
    label: "Cards & Notes",
    icon: Layers,
    tagline: "Atomic ideas → long-form",
    when: "Unified split-pane workspace. Atomic cards (≤1,500 chars) live alongside long-form notes. Type [[ to link, drop cards into notes to cite, and promote cards to notes when they outgrow the card limit.",
    limit: "Cards ≤ 1,500 · Notes unlimited",
    accent: "text-sky-600",
  },
  {
    id: "stickynotes",
    label: "Sticky Notes",
    icon: StickyNote,
    tagline: "Reminders & tasks",
    when: "Quick reminders, follow-ups, and short to-dos.",
    limit: "Short",
    accent: "text-rose-600",
  },
];

export function CaptureHub() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("hub");
  const initial: HubTab = raw === "cards" || raw === "notes" || raw === "workspace"
    ? "workspace"
    : raw === "stickynotes" ? "stickynotes" : "scratchpad";
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
                Pick the shape that fits. Cards & Notes share one split-pane workspace — promote a card to a note the moment it outgrows 1,500 characters.
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
          <TabsContent value="workspace" className="mt-0">
            <CardsNotesWorkspace />
          </TabsContent>
          <TabsContent value="stickynotes" className="mt-0">
            <StickyNotesSimple />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}

