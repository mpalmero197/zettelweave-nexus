import { useState } from 'react';
import { ChevronDown, ChevronUp, History, Clock } from 'lucide-react';
import { FocusSession } from './useFocusState';

interface FocusSessionLogProps {
  sessions: FocusSession[];
  variant?: 'desktop' | 'mobile';
}

export function FocusSessionLog({ sessions, variant = 'desktop' }: FocusSessionLogProps) {
  const [expanded, setExpanded] = useState(false);
  const isDesktop = variant === 'desktop';

  // Show last 10, reversed (most recent first)
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = sessions
    .filter(s => new Date(s.timestamp).toISOString().split('T')[0] === today)
    .reverse()
    .slice(0, 10);

  if (sessions.length === 0) return null;

  const modeLabels: Record<string, string> = {
    work: 'Focus',
    'short-break': 'Short Break',
    'long-break': 'Long Break',
  };

  const modeColors: Record<string, string> = isDesktop
    ? { work: 'text-cyan-400/80', 'short-break': 'text-emerald-400/60', 'long-break': 'text-white/30' }
    : { work: 'text-primary', 'short-break': 'text-emerald-500', 'long-break': 'text-muted-foreground' };

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between ${
          isDesktop
            ? 'text-[10px] uppercase tracking-widest text-white/30 hover:text-white/50'
            : 'text-xs font-semibold text-muted-foreground uppercase tracking-wider'
        } transition-colors`}
      >
        <span className="flex items-center gap-1.5">
          <History className={isDesktop ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
          Session Log ({todaySessions.length})
        </span>
        {expanded
          ? <ChevronUp className={isDesktop ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
          : <ChevronDown className={isDesktop ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
        }
      </button>

      {expanded && (
        <div className={`mt-2 space-y-1 ${isDesktop ? '' : 'pb-2'}`}>
          {todaySessions.length === 0 && (
            <p className={`text-[10px] italic ${isDesktop ? 'text-white/20' : 'text-muted-foreground/50'}`}>
              No sessions today yet.
            </p>
          )}
          {todaySessions.map(s => (
            <div
              key={s.id}
              className={`flex items-center gap-2 py-1.5 px-2 rounded-lg ${
                isDesktop ? 'bg-white/5' : 'bg-muted/30'
              }`}
            >
              <Clock className={`h-2.5 w-2.5 flex-shrink-0 ${modeColors[s.mode]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium ${modeColors[s.mode]}`}>
                    {modeLabels[s.mode]}
                  </span>
                  <span className={`text-[9px] ${isDesktop ? 'text-white/20' : 'text-muted-foreground/50'}`}>
                    {Math.round(s.duration / 60)}m
                  </span>
                </div>
                {s.taskTitle && (
                  <span className={`text-[9px] ${isDesktop ? 'text-white/25' : 'text-muted-foreground/60'} truncate block`}>
                    {s.taskTitle}
                  </span>
                )}
                {s.note && (
                  <span className={`text-[9px] italic ${isDesktop ? 'text-white/20' : 'text-muted-foreground/40'} truncate block`}>
                    "{s.note}"
                  </span>
                )}
              </div>
              <span className={`text-[9px] tabular-nums flex-shrink-0 ${isDesktop ? 'text-white/15' : 'text-muted-foreground/40'}`}>
                {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
