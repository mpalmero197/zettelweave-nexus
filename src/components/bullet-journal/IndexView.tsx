import React, { useMemo } from 'react';
import { BulletEntry, CustomCollection } from './types';
import { format } from 'date-fns';

interface IndexViewProps {
  entries: BulletEntry[];
  collections: CustomCollection[];
}

export const IndexView: React.FC<IndexViewProps> = ({ entries, collections }) => {
  const indexItems = useMemo(() => {
    const items: { label: string; count: number; type: string }[] = [];

    // Daily logs by month
    const months = new Map<string, number>();
    entries.filter(e => !e.collection).forEach(e => {
      const key = format(new Date(e.date), 'MMMM yyyy');
      months.set(key, (months.get(key) || 0) + 1);
    });
    months.forEach((count, label) => {
      items.push({ label: `Daily Log — ${label}`, count, type: 'daily' });
    });

    // Collections
    collections.forEach(col => {
      const count = entries.filter(e => e.collection === col.id).length;
      items.push({ label: `${col.icon} ${col.name}`, count, type: 'collection' });
    });

    return items;
  }, [entries, collections]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Your table of contents — a quick reference to everything in your journal.
      </p>

      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
        {indexItems.length > 0 ? (
          <div className="divide-y divide-border/20">
            {indexItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-accent/20 transition-colors">
                <span className="text-sm text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground font-mono">{item.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Your index will populate as you add entries.</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2"><span className="font-mono">•</span> Task</div>
          <div className="flex items-center gap-2"><span className="font-mono">✕</span> Completed</div>
          <div className="flex items-center gap-2"><span className="font-mono">›</span> Migrated</div>
          <div className="flex items-center gap-2"><span className="font-mono line-through">•</span> Cancelled</div>
          <div className="flex items-center gap-2"><span className="font-mono">○</span> Event</div>
          <div className="flex items-center gap-2"><span className="font-mono">—</span> Note</div>
          <div className="flex items-center gap-2"><span className="text-amber-500 font-bold">★</span> Priority</div>
          <div className="flex items-center gap-2"><span className="text-emerald-500 font-bold">!</span> Inspiration</div>
        </div>
      </div>
    </div>
  );
};
