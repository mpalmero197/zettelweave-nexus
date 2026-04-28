import { ReactNode } from "react";
import { Quote, BookOpen, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitationBlockProps {
  variant?: "citation" | "quote" | "authority";
  source: string;
  sourceUrl?: string;
  author?: string;
  authorTitle?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Specialized callout for citations, expert quotes, and source linking.
 * Uses schema.org Citation/Quotation microdata to substantiate claims and
 * reinforce entity consistency for E-E-A-T signals.
 */
export function CitationBlock({
  variant = "citation",
  source,
  sourceUrl,
  author,
  authorTitle,
  children,
  className,
}: CitationBlockProps) {
  const Icon = variant === "quote" ? Quote : variant === "authority" ? Award : BookOpen;
  const itemType =
    variant === "quote"
      ? "https://schema.org/Quotation"
      : "https://schema.org/CreativeWork";

  return (
    <figure
      className={cn(
        "my-6 rounded-lg border border-border bg-card/50 p-4 backdrop-blur-sm",
        "border-l-4 border-l-primary",
        className,
      )}
      itemScope
      itemType={itemType}
      data-aeo={variant}
    >
      <div className="flex gap-3">
        <Icon className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <div className="flex-1 space-y-2">
          <blockquote className="text-foreground/90 leading-relaxed" itemProp="text">
            {children}
          </blockquote>
          <figcaption className="text-xs text-muted-foreground" itemProp="citation">
            {author && (
              <span itemProp="author" itemScope itemType="https://schema.org/Person">
                <span itemProp="name" className="font-medium text-foreground">{author}</span>
                {authorTitle && <span className="text-muted-foreground">, {authorTitle}</span>}
                {" — "}
              </span>
            )}
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
                itemProp="url"
              >
                <span itemProp="name">{source}</span>
              </a>
            ) : (
              <span itemProp="name">{source}</span>
            )}
          </figcaption>
        </div>
      </div>
    </figure>
  );
}
