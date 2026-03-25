import React, { useState, useMemo } from 'react';
import { BulletEntry } from './types';
import { BulletEntryRow } from './BulletEntryRow';
import { RapidLogger } from './RapidLogger';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek, startOfDay } from 'date-fns';

interface DailyLogProps {
  entries: BulletEntry[];
  onAdd: (entry: BulletEntry) => void;
  onUpdate: (id: string, patch: Partial<BulletEntry>) => void;
  onDelete: (id: string) => void;
  onMigrate?: (entry: BulletEntry) => void;
}

function groupByDate(items: BulletEntry[]) {
  const groups: Record<string, BulletEntry[]> = {};
  items.forEach(item => {
    const day = startOfDay(new Date(item.date)).toISOString();
    if (!groups[day]) groups[day] = [];
    groups[day].push(item);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([key, entries]) => {
      const d = new Date(key);
      let label: string;
      if (isToday(d)) label = 'Today';
      else if (isYesterday(d)) label = 'Yesterday';
      else if (isThisWeek(d)) label = format(d, 'EEEE');
      else label = format(d, 'MMM d, yyyy');
      return { label, key, entries };
    });
}

export const DailyLog: React.FC<DailyLogProps> = ({ entries, onAdd, onUpdate, onDelete, onMigrate }) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const dailyEntries = useMemo(() =>
    entries.filter(e => !e.collection),
    [entries]
  );

  const groups = useMemo(() => groupByDate(dailyEntries), [dailyEntries]);

  // Stats
  const todayEntries = useMemo(() => dailyEntries.filter(e => isToday(new Date(e.date))), [dailyEntries]);
  const todayTasks = todayEntries.filter(e => e.type === 'task');
  const completedToday = todayTasks.filter(e => e.status === 'completed').length;

  const toggle = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Today's progress */}
      {todayTasks.length > 0 && (
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Today's progress</span>
            <span className="text-xs font-semibold text-foreground">
              {completedToday}/{todayTasks.length} tasks
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(completedToday / todayTasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <RapidLogger onAdd={onAdd} />

      {groups.length > 0 ? (
        <div className="space-y-2">
          {groups.map(group => (
            <div key={group.key} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
              <button
                onClick={() => toggle(group.key)}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left hover:bg-accent/30 transition-colors"
              >
                {collapsed.has(group.key)
                  ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                }
                <span className="text-sm font-semibold text-foreground">{group.label}</span>
                <span className="text-xs text-muted-foreground">({group.entries.length})</span>
              </button>
              {!collapsed.has(group.key) && (
                <div className="border-t border-border/30">
                  {group.entries.map((entry, idx) => (
                    <BulletEntryRow
                      key={entry.id}
                      entry={entry}
                      isLast={idx === group.entries.length - 1}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onMigrate={onMigrate}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="Start rapid logging. Type above and press Enter." />
      )}
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);
