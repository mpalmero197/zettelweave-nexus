import React, { useMemo, useState } from 'react';
import { BulletEntry, BULLET_SYMBOLS, SIGNIFIER_MAP } from './types';
import { RapidLogger } from './RapidLogger';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonthlyLogProps {
  entries: BulletEntry[];
  onAdd: (entry: BulletEntry) => void;
  onUpdate: (id: string, patch: Partial<BulletEntry>) => void;
  onDelete: (id: string) => void;
}

export const MonthlyLog: React.FC<MonthlyLogProps> = ({ entries, onAdd, onUpdate, onDelete }) => {
  const [month, setMonth] = useState(new Date());

  const days = useMemo(() =>
    eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }),
    [month]
  );

  const monthEntries = useMemo(() =>
    entries.filter(e => isSameMonth(new Date(e.date), month) && !e.collection),
    [entries, month]
  );

  const taskList = useMemo(() =>
    monthEntries.filter(e => e.type === 'task' && e.status === 'open'),
    [monthEntries]
  );

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(m => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground">{format(month, 'MMMM yyyy')}</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(m => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Calendar page — numbered day list */}
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Calendar</h3>
          <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
            {days.map(day => {
              const dayEntries = monthEntries.filter(e => isSameDay(new Date(e.date), day));
              const events = dayEntries.filter(e => e.type === 'event');
              return (
                <div key={day.toISOString()} className="flex items-start gap-2 py-1 px-1 rounded hover:bg-accent/20 transition-colors">
                  <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0 pt-0.5">
                    {format(day, 'd')}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 w-8 shrink-0 pt-0.5">
                    {format(day, 'EEE')}
                  </span>
                  <div className="flex-1 min-w-0">
                    {events.length > 0 ? (
                      events.map(ev => (
                        <p key={ev.id} className="text-xs text-foreground truncate">
                          {ev.signifier && <span className={`${SIGNIFIER_MAP[ev.signifier].color} mr-1`}>{SIGNIFIER_MAP[ev.signifier].symbol}</span>}
                          {ev.content}
                        </p>
                      ))
                    ) : (
                      <span className="text-[10px] text-muted-foreground/30">—</span>
                    )}
                  </div>
                  {dayEntries.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/40 shrink-0">{dayEntries.length}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Task list page */}
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tasks</h3>
          {taskList.length > 0 ? (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {taskList.map(task => (
                <div key={task.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-accent/20 group">
                  <button
                    onClick={() => onUpdate(task.id, { status: 'completed' })}
                    className="font-mono text-sm text-foreground hover:text-primary shrink-0"
                  >
                    •
                  </button>
                  <span className="text-xs text-foreground flex-1 truncate">{task.content}</span>
                  {task.signifier && (
                    <span className={`text-[10px] ${SIGNIFIER_MAP[task.signifier].color}`}>
                      {SIGNIFIER_MAP[task.signifier].symbol}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50 py-4 text-center">No open tasks this month</p>
          )}
        </div>
      </div>

      <RapidLogger onAdd={onAdd} />
    </div>
  );
};
