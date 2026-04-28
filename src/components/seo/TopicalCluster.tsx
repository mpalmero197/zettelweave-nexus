import { Link } from "react-router-dom";
import { ArrowRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClusterTopic {
  title: string;
  description?: string;
  href: string;
  /** Anchor text — defaults to title but can be overridden for keyword variation. */
  anchor?: string;
}

interface TopicalClusterProps {
  pillarTitle: string;
  pillarHref: string;
  topics: ClusterTopic[];
  className?: string;
}

/**
 * Internal linking module that groups subtopic pages under a pillar. Renders
 * descriptive anchor text for every link to reinforce topical authority and
 * help crawlers/LLMs map relationships between content.
 */
export function TopicalCluster({ pillarTitle, pillarHref, topics, className }: TopicalClusterProps) {
  return (
    <nav
      aria-label={`Related topics in ${pillarTitle}`}
      className={cn(
        "my-8 rounded-xl border border-border bg-card/40 p-5 backdrop-blur-sm",
        className,
      )}
      data-aeo="topical-cluster"
    >
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-4 w-4 text-primary" />
        <Link
          to={pillarHref}
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          Explore the {pillarTitle} pillar →
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {topics.map((t) => (
          <li key={t.href}>
            <Link
              to={t.href}
              className="group flex items-start gap-2 rounded-lg p-2 hover:bg-accent/40 transition-colors"
            >
              <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="min-w-0">
                <span className="block text-sm font-medium text-foreground truncate">
                  {t.anchor ?? t.title}
                </span>
                {t.description && (
                  <span className="block text-xs text-muted-foreground line-clamp-1">
                    {t.description}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
