import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, StickyNote, BookOpen, Calendar, CheckSquare, PenTool, Quote } from 'lucide-react';
import { SourceCategory, SelectedSources } from '@/hooks/useKnowledgeChat';
import { useResearchPromptPrefs } from '@/hooks/useResearchPromptPrefs';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ReactNode> = {
  cards: <FileText className="h-4 w-4" />,
  notes: <StickyNote className="h-4 w-4" />,
  catalystDocs: <BookOpen className="h-4 w-4" />,
  calendarEvents: <Calendar className="h-4 w-4" />,
  tasks: <CheckSquare className="h-4 w-4" />,
  scratchPad: <PenTool className="h-4 w-4" />,
};

interface KnowledgeChatSourcePanelProps {
  sourceCategories: SourceCategory[];
  selectedSources: SelectedSources;
  toggleSource: (key: keyof SelectedSources) => void;
  toggleAllSources: (enabled: boolean) => void;
  enabledSourceCount: number;
  totalSourceCount: number;
  className?: string;
  compact?: boolean;
}

export function KnowledgeChatSourcePanel({
  sourceCategories,
  selectedSources,
  toggleSource,
  toggleAllSources,
  enabledSourceCount,
  totalSourceCount,
  className,
  compact = false,
}: KnowledgeChatSourcePanelProps) {
  const allEnabled = enabledSourceCount === totalSourceCount;
  const { includeCitations, toggle: toggleCitations } = useResearchPromptPrefs();

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sources</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabledSourceCount}/{totalSourceCount} active
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => toggleAllSources(!allEnabled)}
        >
          {allEnabled ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      <ScrollArea className={cn("flex-1", compact ? "max-h-48" : "")}>
        <div className="p-3 space-y-1">
          {sourceCategories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => toggleSource(cat.key as keyof SelectedSources)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                cat.enabled
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-accent/50 border border-transparent"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-md",
                cat.enabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {iconMap[cat.key]}
              </div>
              <span className={cn(
                "flex-1 text-sm font-medium",
                cat.enabled ? "text-foreground" : "text-muted-foreground"
              )}>
                {cat.label}
              </span>
              <Badge variant="secondary" className="text-xs h-5 px-1.5 tabular-nums">
                {cat.count}
              </Badge>
              <Switch
                checked={cat.enabled}
                onCheckedChange={() => toggleSource(cat.key as keyof SelectedSources)}
                className="scale-75"
                onClick={(e) => e.stopPropagation()}
              />
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border/50 p-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-1.5 rounded-md mt-0.5",
            includeCitations ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Quote className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">Include citations</span>
              <Switch checked={includeCitations} onCheckedChange={toggleCitations} className="scale-75" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {includeCitations
                ? "Research replies include source links inline."
                : "Research replies use web results only — no citations."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
