import React, { useMemo } from 'react';
import { BulletEntry, SIGNIFIER_MAP } from './types';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, X, AlertCircle } from 'lucide-react';
import { isThisMonth } from 'date-fns';

interface MigrationReviewProps {
  entries: BulletEntry[];
  onUpdate: (id: string, patch: Partial<BulletEntry>) => void;
  onDelete: (id: string) => void;
}

export const MigrationReview: React.FC<MigrationReviewProps> = ({ entries, onUpdate, onDelete }) => {
  // Find open tasks that are NOT from this month (stale tasks needing migration)
  const staleTasks = useMemo(() =>
    entries.filter(e =>
      e.type === 'task' &&
      e.status === 'open' &&
      !isThisMonth(new Date(e.date)) &&
      !e.collection
    ),
    [entries]
  );

  if (staleTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">All caught up</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          No stale tasks to migrate. Tasks from previous months that are still open will appear here for review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-foreground">
            {staleTasks.length} task{staleTasks.length !== 1 ? 's' : ''} need attention
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Review each task: <strong>Migrate</strong> it forward, <strong>Complete</strong> it, or <strong>Cancel</strong> it.
        </p>
      </div>

      <div className="space-y-2">
        {staleTasks.map(task => (
          <div key={task.id} className="rounded-xl border border-border/40 bg-card/60 p-3">
            <div className="flex items-start gap-2 mb-2">
              {task.signifier && (
                <span className={`text-xs font-bold ${SIGNIFIER_MAP[task.signifier].color}`}>
                  {SIGNIFIER_MAP[task.signifier].symbol}
                </span>
              )}
              <p className="text-sm text-foreground flex-1">{task.content}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => onUpdate(task.id, { status: 'migrated', date: new Date().toISOString() })}
              >
                <ArrowRight className="h-3 w-3" /> Migrate
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => onUpdate(task.id, { status: 'completed' })}
              >
                <CheckCircle2 className="h-3 w-3" /> Done
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => onUpdate(task.id, { status: 'cancelled' })}
              >
                <X className="h-3 w-3" /> Cancel
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
