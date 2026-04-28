import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LastUpdatedProps {
  /** ISO date string from database record. */
  date: string | Date;
  /** ISO date string for original publish. */
  published?: string | Date;
  className?: string;
}

const fmt = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Renders a visible "Last updated" timestamp and emits machine-readable
 * <time> elements. Reads from the database record's updated_at field so the
 * value refreshes automatically when content changes.
 */
export function LastUpdated({ date, published, className }: LastUpdatedProps) {
  const updatedIso = (typeof date === "string" ? new Date(date) : date).toISOString();
  const publishedIso = published
    ? (typeof published === "string" ? new Date(published) : published).toISOString()
    : undefined;

  return (
    <div
      className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}
      data-aeo="freshness"
    >
      <Clock className="h-3.5 w-3.5" />
      {publishedIso && (
        <>
          <span>
            Published <time dateTime={publishedIso} itemProp="datePublished">{fmt(published!)}</time>
          </span>
          <span className="text-border">·</span>
        </>
      )}
      <span>
        Last updated{" "}
        <time dateTime={updatedIso} itemProp="dateModified" className="font-medium text-foreground">
          {fmt(date)}
        </time>
      </span>
    </div>
  );
}
