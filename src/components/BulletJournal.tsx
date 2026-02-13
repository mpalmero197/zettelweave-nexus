import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Plus, Search, BookOpen, CalendarDays, CheckCircle2, Circle, Minus, ArrowRight,
  MoreHorizontal, Trash2, Tag, X, Filter, Sparkles, ChevronDown, ChevronRight
} from 'lucide-react';
import { ZettelCard as ZettelCardType } from '@/types/zettel';
import { toast } from 'sonner';
import { format, isToday, isYesterday, isThisWeek, startOfDay } from 'date-fns';

/* ─── Types ─── */

interface BulletItem {
  id: string;
  type: 'task' | 'event' | 'note' | 'migration';
  content: string;
  completed?: boolean;
  date: string; // ISO string for serialization
  tags: string[];
}

interface BulletJournalProps {
  onCreateCard?: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
  onAddHabit?: (habitName: string) => void;
}

type FilterType = 'all' | 'task' | 'event' | 'note';

const BULLET_TYPES = [
  { type: 'task' as const, label: 'Task', icon: CheckCircle2, color: 'text-blue-500' },
  { type: 'event' as const, label: 'Event', icon: CalendarDays, color: 'text-amber-500' },
  { type: 'note' as const, label: 'Note', icon: Minus, color: 'text-emerald-500' },
] as const;

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'task', label: 'Tasks' },
  { value: 'event', label: 'Events' },
  { value: 'note', label: 'Notes' },
];

/* ─── Helpers ─── */

function groupByDate(items: BulletItem[]): { label: string; key: string; items: BulletItem[] }[] {
  const groups: Record<string, BulletItem[]> = {};
  items.forEach(item => {
    const day = startOfDay(new Date(item.date)).toISOString();
    if (!groups[day]) groups[day] = [];
    groups[day].push(item);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([key, items]) => {
      const d = new Date(key);
      let label: string;
      if (isToday(d)) label = 'Today';
      else if (isYesterday(d)) label = 'Yesterday';
      else if (isThisWeek(d)) label = format(d, 'EEEE');
      else label = format(d, 'MMM d, yyyy');
      return { label, key, items };
    });
}

/* ─── Main Component ─── */

export const BulletJournal = ({ onCreateCard, onAddHabit }: BulletJournalProps) => {
  const [items, setItems] = useState<BulletItem[]>([]);
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [selectedType, setSelectedType] = useState<BulletItem['type']>('task');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bulletJournal');
    if (saved) {
      try { setItems(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const persist = (updated: BulletItem[]) => {
    setItems(updated);
    localStorage.setItem('bulletJournal', JSON.stringify(updated));
  };

  // Stats
  const stats = useMemo(() => {
    const today = items.filter(i => isToday(new Date(i.date)));
    const tasks = today.filter(i => i.type === 'task');
    const completed = tasks.filter(i => i.completed);
    return {
      total: items.length,
      todayCount: today.length,
      tasksToday: tasks.length,
      completedToday: completed.length,
    };
  }, [items]);

  const addItem = () => {
    const text = newContent.trim();
    if (!text) return;

    const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
    const item: BulletItem = {
      id: crypto.randomUUID(),
      type: selectedType,
      content: text,
      completed: false,
      date: new Date().toISOString(),
      tags,
    };

    persist([item, ...items]);
    setNewContent('');
    setNewTags('');
    inputRef.current?.focus();
    toast.success('Entry added');

    if (selectedType === 'task' && onAddHabit) {
      onAddHabit(text);
    }
  };

  const toggleTask = (id: string) => {
    persist(items.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  };

  const deleteItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item && item.content.trim()) {
      setDeleteConfirmId(id);
    } else {
      persist(items.filter(i => i.id !== id));
      toast.success('Entry removed');
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    persist(items.filter(i => i.id !== deleteConfirmId));
    setDeleteConfirmId(null);
    toast.success('Entry removed');
  };

  const migrateToCard = (item: BulletItem) => {
    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content,
      content: `# ${item.type.toUpperCase()}\n\n${item.content}\n\n*Migrated from journal on ${format(new Date(item.date), 'MMM d, yyyy')}*`,
      description: `Journal ${item.type}`,
      category: '000',
      number: '',
      tags: ['journal', item.type, ...item.tags],
      linkedCards: [],
    };
    onCreateCard?.(newCard);
    persist(items.map(i => i.id === item.id ? { ...i, type: 'migration' as const } : i));
    toast.success('Migrated to card');
  };

  const addTagToItem = (itemId: string, tag: string) => {
    if (!tag.trim()) return;
    persist(items.map(i => i.id === itemId ? { ...i, tags: [...i.tags, tag.trim()] } : i));
  };

  const removeTagFromItem = (itemId: string, tagToRemove: string) => {
    persist(items.map(i => i.id === itemId ? { ...i, tags: i.tags.filter(t => t !== tagToRemove) } : i));
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Filter + search
  const processed = useMemo(() => {
    let result = [...items];
    if (filterType !== 'all') result = result.filter(i => i.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.content.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, filterType, searchQuery]);

  const groups = useMemo(() => groupByDate(processed), [processed]);

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Journal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total} {stats.total === 1 ? 'entry' : 'entries'}
            {stats.todayCount > 0 && ` · ${stats.todayCount} today`}
            {stats.tasksToday > 0 && ` · ${stats.completedToday}/${stats.tasksToday} done`}
          </p>
        </div>
      </div>

      {/* Progress bar for today's tasks */}
      {stats.tasksToday > 0 && (
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Today's progress</span>
            <span className="text-xs font-semibold text-primary">
              {stats.tasksToday > 0 ? Math.round((stats.completedToday / stats.tasksToday) * 100) : 0}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${stats.tasksToday > 0 ? (stats.completedToday / stats.tasksToday) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick-add area */}
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-3 shadow-sm space-y-2.5">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem(); } }}
            placeholder="What's on your mind? Press Enter to add…"
            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-9 text-sm"
          />
          <Button size="sm" onClick={addItem} disabled={!newContent.trim()} className="h-8 px-3 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Add</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Type selector */}
          <div className="flex gap-1">
            {BULLET_TYPES.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                  ${selectedType === type
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Tags input */}
          <Input
            value={newTags}
            onChange={e => setNewTags(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem(); } }}
            placeholder="Tags (comma-separated)…"
            className="flex-1 min-w-[140px] border-0 bg-transparent shadow-none focus-visible:ring-0 h-7 text-xs"
          />
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search entries…"
            className="pl-8 h-8 text-sm border-border/50 bg-card/60"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5" />
              {FILTER_OPTIONS.find(f => f.value === filterType)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {FILTER_OPTIONS.map(opt => (
              <DropdownMenuItem key={opt.value} onClick={() => setFilterType(opt.value)} className={filterType === opt.value ? 'bg-accent' : ''}>
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Journal entries grouped by date */}
      {groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map(group => (
            <div key={group.key} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
              {/* Date header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left hover:bg-accent/30 transition-colors"
              >
                {collapsedGroups.has(group.key)
                  ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                }
                <span className="text-sm font-semibold text-foreground">{group.label}</span>
                <span className="text-xs text-muted-foreground">({group.items.length})</span>
              </button>

              {!collapsedGroups.has(group.key) && (
                <div className="border-t border-border/30">
                  {group.items.map((item, idx) => (
                    <JournalEntry
                      key={item.id}
                      item={item}
                      isLast={idx === group.items.length - 1}
                      onToggle={toggleTask}
                      onDelete={deleteItem}
                      onMigrate={migrateToCard}
                      onAddTag={addTagToItem}
                      onRemoveTag={removeTagFromItem}
                      onCreateCard={onCreateCard}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {searchQuery || filterType !== 'all' ? 'No entries found' : 'Start your journal'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {searchQuery || filterType !== 'all'
              ? 'Try a different search or filter.'
              : 'Capture tasks, events, and notes. Type above and press Enter to begin.'}
          </p>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>This entry has content. Are you sure you want to delete it?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ─── Journal Entry ─── */

interface JournalEntryProps {
  item: BulletItem;
  isLast: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMigrate: (item: BulletItem) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onCreateCard?: BulletJournalProps['onCreateCard'];
}

const JournalEntry: React.FC<JournalEntryProps> = ({
  item, isLast, onToggle, onDelete, onMigrate, onAddTag, onRemoveTag,
}) => {
  const typeConfig = BULLET_TYPES.find(t => t.type === item.type) || BULLET_TYPES[0];
  const TypeIcon = item.type === 'migration' ? ArrowRight : typeConfig.icon;
  const isMigrated = item.type === 'migration';

  return (
    <div className={`group flex items-start gap-3 px-3.5 py-2.5 hover:bg-accent/20 transition-colors
      ${!isLast ? 'border-b border-border/20' : ''}`}
    >
      {/* Bullet / checkbox area */}
      <div className="pt-0.5 shrink-0">
        {item.type === 'task' && !isMigrated ? (
          <Checkbox
            checked={item.completed}
            onCheckedChange={() => onToggle(item.id)}
            className="h-4 w-4"
          />
        ) : (
          <TypeIcon className={`h-4 w-4 ${isMigrated ? 'text-muted-foreground' : typeConfig.color}`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className={`text-sm leading-relaxed ${
          item.completed ? 'line-through text-muted-foreground' : 'text-foreground'
        } ${isMigrated ? 'italic text-muted-foreground' : ''}`}>
          {item.content}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 items-center">
          {item.tags.map((tag, idx) => (
            <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex items-center gap-0.5 font-normal">
              <Tag className="h-2 w-2" />
              {tag}
              <button onClick={() => onRemoveTag(item.id, tag)} className="ml-0.5 hover:text-destructive">
                <X className="h-2 w-2" />
              </button>
            </Badge>
          ))}
          <input
            type="text"
            placeholder="+ tag"
            className="text-[10px] bg-transparent border-none outline-none placeholder:text-muted-foreground/40 w-10 opacity-0 group-hover:opacity-100 transition-opacity"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement;
                onAddTag(item.id, target.value);
                target.value = '';
              }
            }}
          />
        </div>

        {/* Time */}
        <span className="text-[10px] text-muted-foreground/60">
          {format(new Date(item.date), 'h:mm a')}
        </span>
      </div>

      {/* Type badge */}
      {!isMigrated && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-normal capitalize">
          {item.type}
        </Badge>
      )}
      {isMigrated && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-normal text-muted-foreground">
          <Sparkles className="h-2 w-2 mr-0.5" />
          migrated
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
          <DropdownMenuContent align="end" className="w-36">
            {!isMigrated && (
              <DropdownMenuItem onClick={() => onMigrate(item)}>
                <ArrowRight className="h-3.5 w-3.5 mr-2" />
                Migrate to card
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default BulletJournal;
