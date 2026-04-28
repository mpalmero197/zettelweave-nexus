import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Intent = "what" | "who" | "when" | "where" | "why" | "how";

interface ConversationalHeadingProps {
  level: 2 | 3;
  intent: Intent;
  children: ReactNode;
  id?: string;
  className?: string;
}

/**
 * Semantic heading optimized for long-tail conversational queries. Each
 * heading is tagged with its question intent so LLMs and crawlers can map
 * directly to user search patterns.
 */
export function ConversationalHeading({
  level,
  intent,
  children,
  id,
  className,
}: ConversationalHeadingProps) {
  const Tag = (`h${level}` as unknown) as keyof JSX.IntrinsicElements;
  const slug =
    id ??
    (typeof children === "string"
      ? children.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      : undefined);

  return (
    <Tag
      id={slug}
      data-question-intent={intent}
      className={cn(
        level === 2
          ? "text-2xl font-semibold tracking-tight text-foreground mt-8 mb-3"
          : "text-xl font-semibold tracking-tight text-foreground mt-6 mb-2",
        "scroll-mt-20",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
