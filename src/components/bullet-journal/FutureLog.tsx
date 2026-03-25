import React, { useMemo } from 'react';
import { BulletEntry, SIGNIFIER_MAP } from './types';
import { RapidLogger } from './RapidLogger';
import { format, addMonths, startOfMonth, isSameMonth } from 'date-fns';

interface FutureLogProps {
  entries: BulletEntry[];
  onAdd: (entry: BulletEntry) => void;
  onUpdate: (id: string, patch: Partial<BulletEntry>) => void;
  onDelete: (id: string) => void;
}

export const FutureLog: React.FC<FutureLogProps> = ({ entries, onAdd, onUpdate, onDelete }) => {
  const now = new Date();
  const futureMonths = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => startOfMonth(addMonths(now, i + 1))),
    []
  );

  const getMonthEntries = (month: Date) =>
    entries.filter(e => isSameMonth(new Date(e.date), month) && !e.collection);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Plan ahead — log future tasks and events into upcoming months.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {futureMonths.map(month => {
          const monthEntries = getMonthEntries(month);
          return (
            <div key={month.toISOString()} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-border/30 bg-muted/20">
                <h3 className="text-sm font-semibold text-foreground">{format(month, 'MMMM yyyy')}</h3>
              </div>
              <div className="p-2 min-h-[80px]">
                {monthEntries.length > 0 ? (
                  <div className="space-y-1">
                    {monthEntries.slice(0, 8).map(entry => (
                      <div key={entry.id} className="flex items-center gap-1.5 px-1">
                        {entry.signifier && (
                          <span className={`text-[10px] ${SIGNIFIER_MAP[entry.signifier].color}`}>
                            {SIGNIFIER_MAP[entry.signifier].symbol}
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                          {entry.type === 'task' ? '•' : entry.type === 'event' ? '○' : '—'}
                        </span>
                        <span className={`text-xs truncate ${entry.status === 'completed' ? 'line-through text-muted-foreground/50' : 'text-foreground'}`}>
                          {entry.content}
                        </span>
                      </div>
                    ))}
                    {monthEntries.length > 8 && (
                      <p className="text-[10px] text-muted-foreground/50 px-1">+{monthEntries.length - 8} more</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground/30 text-center py-4">No entries yet</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <RapidLogger onAdd={(entry) => {
        // Future log entries get dated to next month by default
        const futureDate = addMonths(new Date(), 1);
        onAdd({ ...entry, date: futureDate.toISOString() });
      }} />
    </div>
  );
};
