import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Link2, ArrowDownLeft, ArrowUpRight, Layers, Hash, FileText, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkedItem {
  id: string;
  title: string;
  type: "card" | "note";
  number?: string;
  category?: string;
  snippet?: string;
}

interface Buckets {
  backlinks: LinkedItem[];
  outgoing: LinkedItem[];
  siblings: LinkedItem[];
  related: LinkedItem[];
}

interface LinkedItemsPanelProps {
  itemId: string;
  itemType: "card" | "note";
  itemTitle: string;
  category?: string;
  tags?: string[];
  outgoingIds?: string[];
  onNavigate?: (id: string, type: "card" | "note") => void;
  className?: string;
}

const SNIPPET_LEN = 100;

function extractSnippet(content: string | null | undefined, needle: string): string | undefined {
  if (!content) return undefined;
  const text = content.replace(/<[^>]+>/g, " ");
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return undefined;
  const start = Math.max(0, idx - SNIPPET_LEN / 2);
  const end = Math.min(text.length, start + SNIPPET_LEN);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}

export function LinkedItemsPanel({
  itemId,
  itemType,
  itemTitle,
  category,
  tags = [],
  outgoingIds = [],
  onNavigate,
  className,
}: LinkedItemsPanelProps) {
  const [buckets, setBuckets] = useState<Buckets>({ backlinks: [], outgoing: [], siblings: [], related: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const next: Buckets = { backlinks: [], outgoing: [], siblings: [], related: [] };

      try {
        const wikiNeedle = `[[${itemTitle}]]`;

        const notesBLP = supabase
          .from("notes")
          .select("id, title, content")
          .ilike("content", `%${wikiNeedle}%`)
          .is("deleted_at", null)
          .limit(20)
          .then(r => r);

        const cardsBLP = supabase
          .from("zettel_cards")
          .select("id, title, number, category, content")
          .contains("linked_cards", [itemId])
          .is("deleted_at", null)
          .limit(20)
          .then(r => r);

        const outgoingP = outgoingIds.length > 0
          ? supabase
              .from("zettel_cards")
              .select("id, title, number, category")
              .in("id", outgoingIds)
              .is("deleted_at", null)
              .then(r => r)
          : Promise.resolve({ data: [] as any[] });

        const siblingsP = category
          ? supabase
              .from("zettel_cards")
              .select("id, title, number, category")
              .eq("category", category)
              .neq("id", itemId)
              .is("deleted_at", null)
              .order("updated_at", { ascending: false })
              .limit(8)
              .then(r => r)
          : Promise.resolve({ data: [] as any[] });

        const relatedP = tags.length > 0
          ? supabase
              .from("zettel_cards")
              .select("id, title, number, category, tags")
              .overlaps("tags", tags)
              .neq("id", itemId)
              .is("deleted_at", null)
              .limit(8)
              .then(r => r)
          : Promise.resolve({ data: [] as any[] });

        const [notesBL, cardsBL, outgoing, siblings, related] = await Promise.all([
          notesBLP, cardsBLP, outgoingP, siblingsP, relatedP,
        ]);

        (notesBL.data || []).forEach((n: any) => {
          next.backlinks.push({
            id: n.id,
            title: n.title || "Untitled",
            type: "note",
            snippet: extractSnippet(n.content, wikiNeedle),
          });
        });
        (cardsBL.data || []).forEach((c: any) => {
          next.backlinks.push({
            id: c.id,
            title: c.title,
            type: "card",
            number: c.number,
            category: c.category,
            snippet: extractSnippet(c.content, itemTitle),
          });
        });
        next.outgoing = (outgoing.data || []).map((c: any) => ({
          id: c.id, title: c.title, type: "card" as const, number: c.number, category: c.category,
        }));
        next.siblings = (siblings.data || []).map((c: any) => ({
          id: c.id, title: c.title, type: "card" as const, number: c.number, category: c.category,
        }));
        next.related = (related.data || []).map((c: any) => ({
          id: c.id, title: c.title, type: "card" as const, number: c.number, category: c.category,
        }));

        if (!cancelled) setBuckets(next);
      } catch (e) {
        console.error("LinkedItemsPanel load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [itemId, itemType, itemTitle, category, tags.join(","), outgoingIds.join(",")]);

  const total = buckets.backlinks.length + buckets.outgoing.length + buckets.siblings.length + buckets.related.length;

  if (loading) {
    return <div className={cn("text-sm text-muted-foreground p-4", className)}>Finding connections…</div>;
  }
  if (total === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground p-4 border border-dashed border-border/40 rounded-lg", className)}>
        No linked items yet. Use <code className="text-xs px-1 py-0.5 rounded bg-muted">[[wikilinks]]</code> to connect ideas.
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      <Section icon={<ArrowDownLeft className="h-4 w-4" />} title="Backlinks" items={buckets.backlinks} onNavigate={onNavigate} showSnippet />
      <Section icon={<ArrowUpRight className="h-4 w-4" />} title="Outgoing" items={buckets.outgoing} onNavigate={onNavigate} />
      <Section icon={<Layers className="h-4 w-4" />} title="Same category" items={buckets.siblings} onNavigate={onNavigate} />
      <Section icon={<Hash className="h-4 w-4" />} title="Related by tag" items={buckets.related} onNavigate={onNavigate} />
    </div>
  );
}

function Section({
  icon, title, items, onNavigate, showSnippet,
}: {
  icon: React.ReactNode;
  title: string;
  items: LinkedItem[];
  onNavigate?: (id: string, type: "card" | "note") => void;
  showSnippet?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {icon}
        <span>{title}</span>
        <span className="text-muted-foreground/60">({items.length})</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={`${item.type}-${item.id}`}
            onClick={() => onNavigate?.(item.id, item.type)}
            className="w-full text-left p-2.5 rounded-md border border-border/40 bg-card/40 hover:bg-muted/50 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-start gap-2">
              {item.type === "card" ? (
                <Link2 className="h-3.5 w-3.5 text-primary/70 mt-0.5 flex-shrink-0" />
              ) : item.title.length > 100 ? (
                <FileText className="h-3.5 w-3.5 text-accent/70 mt-0.5 flex-shrink-0" />
              ) : (
                <StickyNote className="h-3.5 w-3.5 text-accent/70 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {item.number && <span className="text-muted-foreground font-mono text-xs mr-1.5">{item.number}</span>}
                  {item.title}
                </div>
                {showSnippet && item.snippet && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{item.snippet}"</div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
