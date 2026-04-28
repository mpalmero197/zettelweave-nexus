import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnswerBlockProps {
  /** 40-60 word definitive summary (TL;DR). Required for AEO. */
  summary: string;
  /** Long-form analysis rendered after the summary. */
  children?: ReactNode;
  /** Optional heading rendered above the summary. */
  heading?: string;
  /** Heading level for semantic correctness. */
  as?: "h1" | "h2" | "h3";
  className?: string;
}

/**
 * Inverted-pyramid content block. The 40-60 word summary renders immediately
 * below the heading so LLMs and search snippets can extract a definitive answer
 * before any long-form analysis.
 */
export function AnswerBlock({
  summary,
  children,
  heading,
  as: Heading = "h2",
  className,
}: AnswerBlockProps) {
  const wordCount = summary.trim().split(/\s+/).length;
  if (import.meta.env.DEV && (wordCount < 30 || wordCount > 75)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[AnswerBlock] Summary should be 40-60 words for optimal AEO. Got ${wordCount}.`,
    );
  }

  return (
    <section
      className={cn("space-y-4", className)}
      itemScope
      itemType="https://schema.org/Answer"
    >
      {heading && (
        <Heading className="text-2xl font-semibold tracking-tight text-foreground">
          {heading}
        </Heading>
      )}
      <p
        className="text-base leading-relaxed text-foreground bg-muted/40 border-l-4 border-primary px-4 py-3 rounded-r-md"
        itemProp="text"
        data-aeo="summary"
      >
        {summary}
      </p>
      {children && (
        <div className="prose prose-sm max-w-none text-foreground/90" data-aeo="analysis">
          {children}
        </div>
      )}
    </section>
  );
}
