import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, RotateCcw, Target, Coffee, Plus, Clock, Link2, Layers, FileText, X, Timer } from 'lucide-react';
import { FocusTimerRing } from './FocusTimerRing';
import { useFocusState } from './useFocusState';
import { FocusTask } from './FocusTaskList';
import { useZettelCards } from '@/hooks/useZettelCards';

const DURATION_OPTIONS = [15, 20, 25, 30, 45, 60];

const priorityColors = {
  high: 'rgb(239,68,68)',
  medium: 'rgb(251,191,36)',
  low: 'rgb(74,222,128)',
};

interface MobileFocusSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileFocusSheet({ open, onOpenChange }: MobileFocusSheetProps) {
  const {
    tasks, setTasks, activeTaskId, setActiveTaskId,
    mode, seconds, totalSeconds, isRunning, cycle,
    start, pause, reset, changeMode, setCustomDuration,
  } = useFocusState();
  const [showDurations, setShowDurations] = useState(false);

  const { cards } = useZettelCards();
  const [notes, setNotes] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('notes')
          .select('id, title')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(30);
        if (data) setNotes(data);
      } catch {}
    };
    if (open) fetchNotes();
  }, [open]);

  const addTask = () => {
    if (!newTitle.trim()) return;
    const task: FocusTask = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      priority: 'medium',
      completed: false,
      linkedCardIds: [],
      linkedNoteIds: [],
      pomodoroMinutes: 0,
    };
    setTasks([...tasks, task]);
    setNewTitle('');
  };

  const toggleComplete = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const getLinkedCards = (task: FocusTask) => cards.filter(c => task.linkedCardIds.includes(c.id));
  const getLinkedNotes = (task: FocusTask) => notes.filter(n => task.linkedNoteIds.includes(n.id));

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] px-0 pt-0 pb-0 flex flex-col bg-card border-border">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <ScrollArea className="flex-1 px-5">
          <div className="space-y-5 pb-6">
            {/* Timer */}
            <div className="flex flex-col items-center gap-3">
              <FocusTimerRing
                seconds={seconds}
                totalSeconds={totalSeconds}
                isRunning={isRunning}
                mode={mode}
              />

              {/* Duration picker */}
              {mode === 'work' && (
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => setShowDurations(!showDurations)}
                    className="text-[11px] text-muted-foreground flex items-center gap-1 touch-manipulation"
                  >
                    <Timer className="h-3 w-3" />
                    {Math.round(totalSeconds / 60)} min {showDurations ? '▲' : '▼'}
                  </button>
                  {showDurations && (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {DURATION_OPTIONS.map(d => (
                        <Button
                          key={d}
                          size="sm"
                          variant={totalSeconds === d * 60 ? 'secondary' : 'ghost'}
                          onClick={() => { setCustomDuration(d); setShowDurations(false); }}
                          className="h-8 px-3 text-xs rounded-lg touch-manipulation"
                        >
                          {d}m
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mode toggle */}
              <div className="flex gap-1.5">
                {([['work', 'Focus', Target], ['short-break', 'Short', Coffee], ['long-break', 'Long', Coffee]] as const).map(([m, label, Icon]) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={mode === m ? 'secondary' : 'ghost'}
                    onClick={() => changeMode(m)}
                    className="h-9 text-xs px-3 rounded-xl touch-manipulation"
                  >
                    <Icon className="h-3.5 w-3.5 mr-1" />{label}
                  </Button>
                ))}
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                <Button
                  onClick={isRunning ? pause : start}
                  className="h-11 px-8 text-sm rounded-xl touch-manipulation"
                >
                  {isRunning ? <><Pause className="h-4 w-4 mr-1.5" />Pause</> : <><Play className="h-4 w-4 mr-1.5" />Start</>}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={reset}
                  className="h-11 w-11 rounded-xl touch-manipulation"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {activeTaskId && (
                <p className="text-xs text-muted-foreground text-center">
                  Logging to: <span className="text-foreground font-medium">{tasks.find(t => t.id === activeTaskId)?.title}</span>
                </p>
              )}
              <span className="text-[11px] text-muted-foreground/50">Cycle {cycle}</span>
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Task list */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Priority Tasks</h4>

              <div className="flex flex-col gap-2">
                {activeTasks.map(task => {
                  const linkedCards = getLinkedCards(task);
                  const linkedNotes = getLinkedNotes(task);
                  const linkedCount = linkedCards.length + linkedNotes.length;
                  const isExpanded = expandedTaskId === task.id;

                  return (
                    <div key={task.id} className="space-y-1">
                      <div
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all touch-manipulation min-h-[52px] ${
                          activeTaskId === task.id
                            ? 'bg-accent ring-1 ring-primary/30'
                            : 'bg-muted/50 active:bg-accent'
                        }`}
                        onClick={() => setActiveTaskId(activeTaskId === task.id ? null : task.id)}
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleComplete(task.id)}
                          onClick={e => e.stopPropagation()}
                          className="h-5 w-5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground truncate">{task.title}</span>
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: priorityColors[task.priority] }} />
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {task.pomodoroMinutes > 0 && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />{task.pomodoroMinutes}m
                              </span>
                            )}
                            {linkedCount > 0 && (
                              <button
                                className="text-[11px] text-muted-foreground flex items-center gap-0.5"
                                onClick={(e) => { e.stopPropagation(); setExpandedTaskId(isExpanded ? null : task.id); }}
                              >
                                <Link2 className="h-3 w-3" />{linkedCount}
                              </button>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={e => { e.stopPropagation(); removeTask(task.id); }}
                          className="h-9 w-9 p-0 text-muted-foreground touch-manipulation"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Expanded linked items */}
                      {isExpanded && (linkedCards.length > 0 || linkedNotes.length > 0) && (
                        <div className="pl-11 pr-3 space-y-1">
                          {linkedCards.map(card => (
                            <div key={card.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-muted/30">
                              <Layers className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              <span className="text-xs text-foreground/80 truncate flex-1">{card.title}</span>
                            </div>
                          ))}
                          {linkedNotes.map(note => (
                            <div key={note.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-muted/30">
                              <FileText className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                              <span className="text-xs text-foreground/80 truncate flex-1">{note.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {completedTasks.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground/50">Completed</span>
                    {completedTasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-2 opacity-50 min-h-[44px]">
                        <Checkbox
                          checked
                          onCheckedChange={() => toggleComplete(task.id)}
                          className="h-5 w-5"
                        />
                        <span className="text-sm line-through text-muted-foreground truncate">{task.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Add task input — pinned bottom */}
        <div className="border-t border-border bg-background px-4 py-3">
          <form
            onSubmit={e => { e.preventDefault(); addTask(); }}
            className="flex items-center gap-2"
          >
            <Input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Add task…"
              className="h-11 text-sm rounded-xl flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newTitle.trim()}
              className="h-11 w-11 rounded-xl touch-manipulation"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
