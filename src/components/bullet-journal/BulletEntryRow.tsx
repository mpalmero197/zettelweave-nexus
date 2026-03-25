import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, ArrowRight, X as XIcon, Tag, CheckCircle2 } from 'lucide-react';
import { BulletEntry, BULLET_SYMBOLS, SIGNIFIER_MAP } from './types';
import { format } from 'date-fns';

interface BulletEntryRowProps {
  entry: BulletEntry;
  isLast: boolean;
  onUpdate: (id: string, patch: Partial<BulletEntry>) => void;
  onDelete: (id: string) => void;
  onMigrate?: (entry: BulletEntry) => void;
}

export const BulletEntryRow: React.FC<BulletEntryRowProps> = ({
  entry, isLast, onUpdate, onDelete, onMigrate,
}) => {
  const isCompleted = entry.status === 'completed';
  const isMigrated = entry.status === 'migrated';
  const isCancelled = entry.status === 'cancelled';
  const isDone = isCompleted || isMigrated || isCancelled;

  const toggleComplete = () => {
    if (entry.type !== 'task') return;
    onUpdate(entry.id, { status: isCompleted ? 'open' : 'completed' });
  };

  // Render the bullet symbol based on type + status
  const renderBullet = () => {
    if (entry.type === 'task') {
      if (isCompleted) return <span className="font-mono text-sm text-muted-foreground select-none">✕</span>;
      if (isMigrated) return <span className="font-mono text-sm text-muted-foreground select-none">›</span>;
      if (isCancelled) return <span className="font-mono text-sm text-muted-foreground line-through select-none">•</span>;
      return (
        <button onClick={toggleComplete} className="font-mono text-sm text-foreground hover:text-primary transition-colors select-none">
          •
        </button>
      );
    }
    return <span className="font-mono text-sm text-muted-foreground select-none">{BULLET_SYMBOLS[entry.type]}</span>;
  };

  return (
    <div className={`group flex items-start gap-3 px-3.5 py-2 hover:bg-accent/20 transition-colors
      ${!isLast ? 'border-b border-border/20' : ''}`}
    >
      {/* Signifier */}
      <div className="w-4 pt-0.5 shrink-0 text-center">
        {entry.signifier && (
          <span className={`text-xs font-bold ${SIGNIFIER_MAP[entry.signifier].color}`}>
            {SIGNIFIER_MAP[entry.signifier].symbol}
          </span>
        )}
      </div>

      {/* Bullet */}
      <div className="pt-0.5 shrink-0 w-4 text-center">{renderBullet()}</div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={`text-sm leading-relaxed ${
          isDone ? 'line-through text-muted-foreground/60' : 'text-foreground'
        } ${isMigrated ? 'italic' : ''}`}>
          {entry.content}
        </p>

        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal gap-0.5">
                <Tag className="h-2 w-2" />{tag}
              </Badge>
            ))}
          </div>
        )}

        <span className="text-[10px] text-muted-foreground/50">
          {format(new Date(entry.date), 'h:mm a')}
        </span>
      </div>

      {/* Status badge */}
      {isMigrated && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-normal text-muted-foreground">
          <ArrowRight className="h-2 w-2 mr-0.5" /> migrated
        </Badge>
      )}

      {/* Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent/80 text-muted-foreground">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {entry.type === 'task' && entry.status === 'open' && (
              <>
                <DropdownMenuItem onClick={toggleComplete}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Complete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdate(entry.id, { status: 'migrated' })}>
                  <ArrowRight className="h-3.5 w-3.5 mr-2" /> Migrate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdate(entry.id, { status: 'cancelled' })}>
                  <XIcon className="h-3.5 w-3.5 mr-2" /> Cancel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {onMigrate && !isMigrated && (
              <DropdownMenuItem onClick={() => onMigrate(entry)}>
                <ArrowRight className="h-3.5 w-3.5 mr-2" /> Migrate to card
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onDelete(entry.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
