import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScannableListProps {
  ordered?: boolean;
  items: ReactNode[];
  className?: string;
}

/** Bulleted/numbered list wrapper enforcing semantic <ul>/<ol> output. */
export function ScannableList({ ordered, items, className }: ScannableListProps) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={cn(
        "space-y-2 my-4 pl-6 text-foreground/90",
        ordered ? "list-decimal" : "list-disc",
        className,
      )}
      data-aeo="scannable-list"
    >
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">{item}</li>
      ))}
    </Tag>
  );
}

interface DataTableProps {
  caption?: string;
  headers: string[];
  rows: ReactNode[][];
  className?: string;
}

/** Accessible data table with proper <caption>, <thead>, scope attributes. */
export function ScannableTable({ caption, headers, rows, className }: DataTableProps) {
  return (
    <div className={cn("my-6 overflow-x-auto rounded-lg border border-border", className)}>
      <table className="w-full text-sm" data-aeo="data-table">
        {caption && (
          <caption className="px-4 py-2 text-left text-xs text-muted-foreground bg-muted/30">
            {caption}
          </caption>
        )}
        <thead className="bg-muted/50">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="px-4 py-2 text-left font-semibold text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-border/60">
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2 text-foreground/90">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
