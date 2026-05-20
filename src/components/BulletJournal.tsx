import React, { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BookOpen, CalendarDays, CalendarRange, Telescope, Layers, BarChart3, ArrowRightLeft, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ZettelCard as ZettelCardType } from '@/types/zettel';
import { isToday } from 'date-fns';

import { useBuJoStore } from './bullet-journal/useBuJoStore';
import { useHabitsStore } from '@/hooks/useHabitsStore';
import { DailyLog } from './bullet-journal/DailyLog';
import { MonthlyLog } from './bullet-journal/MonthlyLog';
import { FutureLog } from './bullet-journal/FutureLog';
import { IndexView } from './bullet-journal/IndexView';
import { HabitTrackerComponent } from './bullet-journal/HabitTracker';
import { CollectionsView } from './bullet-journal/CollectionsView';
import { MigrationReview } from './bullet-journal/MigrationReview';
import { BulletEntry } from './bullet-journal/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BulletJournalProps {
  onCreateCard?: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
  onAddHabit?: (habitName: string) => void;
}

export const BulletJournal = ({ onCreateCard, onAddHabit }: BulletJournalProps) => {
  const store = useBuJoStore();
  const habitsStore = useHabitsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'task' | 'event' | 'note'>('all');

  // Filtered entries for search
  const filteredEntries = useMemo(() => {
    let result = store.data.entries;
    if (filterType !== 'all') result = result.filter(e => e.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.content.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [store.data.entries, filterType, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const all = store.data.entries;
    const today = all.filter(e => isToday(new Date(e.date)));
    const openTasks = all.filter(e => e.type === 'task' && e.status === 'open');
    const staleTasks = all.filter(e => e.type === 'task' && e.status === 'open' && !isToday(new Date(e.date)));
    return {
      total: all.length,
      todayCount: today.length,
      openTasks: openTasks.length,
      staleTasks: staleTasks.length,
      habits: store.data.habits.length,
      collections: store.data.collections.length,
    };
  }, [store.data]);

  const migrateToCard = (entry: BulletEntry) => {
    if (!onCreateCard) return;
    onCreateCard({
      title: entry.content.length > 50 ? entry.content.substring(0, 50) + '...' : entry.content,
      content: `# ${entry.type.toUpperCase()}\n\n${entry.content}\n\n*Migrated from journal on ${format(new Date(entry.date), 'MMM d, yyyy')}*`,
      description: `Journal ${entry.type}`,
      category: '000',
      number: '',
      tags: ['journal', entry.type, ...entry.tags],
      linkedCards: [],
    });
    store.updateEntry(entry.id, { status: 'migrated' });
    toast.success('Migrated to card');
  };

  const handleAddEntry = (entry: BulletEntry) => {
    store.addEntry(entry);
    if (entry.type === 'task' && onAddHabit) {
      onAddHabit(entry.content);
    }
  };

  const tabs = [
    { value: 'daily', label: 'Daily', icon: CalendarDays },
    { value: 'monthly', label: 'Monthly', icon: CalendarRange },
    { value: 'future', label: 'Future', icon: Telescope },
    { value: 'migrate', label: 'Migrate', icon: ArrowRightLeft, badge: stats.staleTasks || undefined },
    { value: 'habits', label: 'Habits', icon: BarChart3 },
    { value: 'collections', label: 'Collections', icon: Layers },
    { value: 'index', label: 'Index', icon: BookOpen },
  ];

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Bullet Journal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total} entries · {stats.openTasks} open tasks
            {stats.habits > 0 && ` · ${stats.habits} habits`}
          </p>
        </div>
      </div>

      {/* Search + Filter (global) */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search all entries…"
            className="pl-8 h-8 text-sm border-border/50 bg-card/60"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5" />
              {filterType === 'all' ? 'All' : filterType.charAt(0).toUpperCase() + filterType.slice(1) + 's'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(['all', 'task', 'event', 'note'] as const).map(opt => (
              <DropdownMenuItem key={opt} onClick={() => setFilterType(opt)} className={filterType === opt ? 'bg-accent' : ''}>
                {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1) + 's'}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="w-full flex overflow-x-auto bg-muted/50 h-auto p-1 rounded-xl">
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {tab.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="daily">
          <DailyLog
            entries={filteredEntries}
            onAdd={handleAddEntry}
            onUpdate={store.updateEntry}
            onDelete={store.deleteEntry}
            onMigrate={onCreateCard ? migrateToCard : undefined}
          />
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlyLog
            entries={filteredEntries}
            onAdd={handleAddEntry}
            onUpdate={store.updateEntry}
            onDelete={store.deleteEntry}
          />
        </TabsContent>

        <TabsContent value="future">
          <FutureLog
            entries={filteredEntries}
            onAdd={handleAddEntry}
            onUpdate={store.updateEntry}
            onDelete={store.deleteEntry}
          />
        </TabsContent>

        <TabsContent value="migrate">
          <MigrationReview
            entries={store.data.entries}
            onUpdate={store.updateEntry}
            onDelete={store.deleteEntry}
          />
        </TabsContent>

        <TabsContent value="habits">
          <HabitTrackerComponent
            habits={habitsStore.habits}
            onAdd={habitsStore.addHabit}
            onToggle={habitsStore.toggleHabitDay}
            onDelete={habitsStore.deleteHabit}
          />
        </TabsContent>


        <TabsContent value="collections">
          <CollectionsView
            collections={store.data.collections}
            entries={store.data.entries}
            onAddCollection={store.addCollection}
            onDeleteCollection={store.deleteCollection}
            onAddEntry={handleAddEntry}
            onUpdateEntry={store.updateEntry}
            onDeleteEntry={store.deleteEntry}
          />
        </TabsContent>

        <TabsContent value="index">
          <IndexView entries={store.data.entries} collections={store.data.collections} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BulletJournal;
