import { lazy, Suspense, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PenLine, FileText, BookOpen, StickyNote, Info } from "lucide-react";
import { useZettelCards } from "@/hooks/useZettelCards";
import type { ZettelCard as ZettelCardType } from "@/types/zettel";

const ScratchPad = lazy(() => import("@/components/ScratchPad").then(m => ({ default: m.ScratchPad })));
const CardsWorkspace = lazy(() => import("@/components/CardsWorkspace").then(m => ({ default: m.CardsWorkspace })));
const NotesWorkspace = lazy(() => import("@/components/NotesWorkspace").then(m => ({ default: m.NotesWorkspace })));
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
    <div className="px-2 sm:px-4 py-3 space-y-3">
      {/* Explainer header — taxonomy overview */}
      <Card className="border-border/60 bg-card/60">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-semibold text-foreground">One place to capture everything.</span>{" "}
              <span className="text-muted-foreground">
                Pick the shape that fits what you're capturing — short to long. ALICE will suggest a promotion (e.g. Scratchpad → Card) if your content outgrows its home.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {TAXONOMY.map((t) => {
              const Icon = t.icon;
              const isActive = t.id === tab;
              return (
                <button
                  key={t.id}
                  onClick={() => handleChange(t.id)}
                  className={`text-left rounded-lg border p-2.5 transition-all ${
                    isActive
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border/60 bg-background hover:border-border hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`h-3.5 w-3.5 ${t.accent}`} />
                    <span className="text-xs font-semibold">{t.label}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">{t.tagline}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1 tabular-nums">{t.limit}</div>
                </button>
              );
            })}
          </div>

          {/* Contextual explainer for active tab */}
          <div className="mt-3 pt-3 border-t border-border/60 text-[11px] sm:text-xs text-muted-foreground">
            <span className={`font-medium ${active.accent}`}>{active.label}:</span> {active.when}
          </div>
        </CardContent>
      </Card>

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
