import { useState, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, Clock, FileText, Layers, X, Search, Link2, GripVertical } from 'lucide-react';
import { ZettelCard } from '@/types/zettel';

export interface FocusTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  timeLimit?: number;
  completed: boolean;
  linkedCardIds: string[];
  linkedNoteIds: string[];
  pomodoroMinutes: number;
}

interface FocusTaskListProps {
  tasks: FocusTask[];
  onTasksChange: (tasks: FocusTask[]) => void;
  activeTaskId: string | null;
  onSetActiveTask: (id: string | null) => void;
  cards: ZettelCard[];
  notes: any[];
  onViewCard: (card: ZettelCard) => void;
  onViewNote: (note: any) => void;
}

const priorityColors = {
  high: 'rgb(239,68,68)',
  medium: 'rgb(251,191,36)',
  low: 'rgb(74,222,128)',
};

// Generic drag-reorder hook for lists
function useDragReorder<T>(items: T[], onReorder: (items: T[]) => void) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragData = useRef({ startY: 0, itemHeight: 0 });

  const onDragStart = useCallback((idx: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = (e.target as HTMLElement).closest('[data-drag-item]') as HTMLElement;
    if (el) dragData.current.itemHeight = el.getBoundingClientRect().height;
    dragData.current.startY = e.clientY;
    setDragIdx(idx);
    setOverIdx(idx);

    const onMove = (ev: PointerEvent) => {
      const dy = ev.clientY - dragData.current.startY;
      const shift = Math.round(dy / Math.max(dragData.current.itemHeight, 30));
      const newIdx = Math.max(0, Math.min(items.length - 1, idx + shift));
      setOverIdx(newIdx);
    };

    const onUp = () => {
      setDragIdx(null);
      setOverIdx(prev => {
        if (prev !== null && prev !== idx) {
          const arr = [...items];
          const [moved] = arr.splice(idx, 1);
          arr.splice(prev, 0, moved);
          onReorder(arr);
        }
        return null;
      });
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [items, onReorder]);

  return { dragIdx, overIdx, onDragStart };
}

function LinkPicker({
  cards,
  notes,
  linkedCardIds,
  linkedNoteIds,
  onLink,
  onUnlink,
}: {
  cards: ZettelCard[];
  notes: any[];
  linkedCardIds: string[];
  linkedNoteIds: string[];
  onLink: (type: 'card' | 'note', id: string) => void;
  onUnlink: (type: 'card' | 'note', id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const matchedCards = cards
      .filter(c => !linkedCardIds.includes(c.id) && c.title.toLowerCase().includes(q))
      .slice(0, 4)
      .map(c => ({ type: 'card' as const, id: c.id, title: c.title }));
    const matchedNotes = notes
      .filter(n => !linkedNoteIds.includes(n.id) && n.title.toLowerCase().includes(q))
      .slice(0, 4)
      .map(n => ({ type: 'note' as const, id: n.id, title: n.title }));
    return [...matchedCards, ...matchedNotes].slice(0, 5);
  }, [query, cards, notes, linkedCardIds, linkedNoteIds]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors mt-1"
      >
        <Link2 className="h-2.5 w-2.5" /> Link card or note…
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center gap-1">
        <Search className="h-2.5 w-2.5 text-white/30 flex-shrink-0" />
        <Input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search cards & notes…"
          className="h-6 text-[10px] bg-white/5 border-white/10 placeholder:text-white/20 px-1.5"
        />
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setQuery(''); }} className="h-5 w-5 p-0 text-white/30">
          <X className="h-2.5 w-2.5" />
        </Button>
      </div>
      {results.length > 0 && (
        <div className="flex flex-col gap-0.5 max-h-[100px] overflow-y-auto">
          {results.map(r => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => { onLink(r.type, r.id); setQuery(''); }}
              className="flex items-center gap-1.5 text-left text-[10px] p-1 rounded hover:bg-white/5 transition-colors text-white/60 hover:text-white/90"
            >
              {r.type === 'card'
                ? <Layers className="h-2.5 w-2.5 text-cyan-400/70 flex-shrink-0" />
                : <FileText className="h-2.5 w-2.5 text-emerald-400/70 flex-shrink-0" />
              }
              <span className="truncate">{r.title}</span>
              <span className="ml-auto text-[9px] text-white/20">{r.type}</span>
            </button>
          ))}
        </div>
      )}
      {query.trim() && results.length === 0 && (
        <p className="text-[10px] text-white/20 italic pl-1">No matches</p>
      )}
    </div>
  );
}

// Draggable linked item row
function DraggableLinkedItem({
  idx, isDragging, isOver, onDragStart, children,
}: {
  idx: number;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: (idx: number, e: React.PointerEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      data-drag-item
      className={`flex items-center gap-0.5 transition-all ${
        isDragging ? 'opacity-40 scale-95' : ''
      } ${isOver ? 'border-t border-cyan-400/30' : ''}`}
    >
      <button
        onPointerDown={e => onDragStart(idx, e)}
        className="cursor-grab active:cursor-grabbing text-white/15 hover:text-white/40 p-0.5 touch-none"
      >
        <GripVertical className="h-2.5 w-2.5" />
      </button>
      {children}
    </div>
  );
}

export function FocusTaskList({
  tasks, onTasksChange, activeTaskId, onSetActiveTask,
  cards, notes, onViewCard, onViewNote
}: FocusTaskListProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Separate incomplete tasks for drag reordering
  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  const reorderTasks = useCallback((reordered: FocusTask[]) => {
    onTasksChange([...reordered, ...completedTasks]);
  }, [completedTasks, onTasksChange]);

  const { dragIdx: taskDragIdx, overIdx: taskOverIdx, onDragStart: onTaskDragStart } = useDragReorder(incompleteTasks, reorderTasks);

  const addTask = () => {
    if (!newTitle.trim()) return;
    const task: FocusTask = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      priority: newPriority,
      completed: false,
      linkedCardIds: [],
      linkedNoteIds: [],
      pomodoroMinutes: 0,
    };
    onTasksChange([...tasks, task]);
    setNewTitle('');
  };

  const toggleComplete = (id: string) => {
    onTasksChange(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    if (activeTaskId === id) onSetActiveTask(null);
  };

  const removeTask = (id: string) => {
    onTasksChange(tasks.filter(t => t.id !== id));
    if (activeTaskId === id) onSetActiveTask(null);
  };

  const linkItem = (taskId: string, type: 'card' | 'note', itemId: string) => {
    onTasksChange(tasks.map(t => {
      if (t.id !== taskId) return t;
      if (type === 'card') {
        return { ...t, linkedCardIds: [...t.linkedCardIds, itemId] };
      }
      return { ...t, linkedNoteIds: [...t.linkedNoteIds, itemId] };
    }));
  };

  const unlinkItem = (taskId: string, type: 'card' | 'note', itemId: string) => {
    onTasksChange(tasks.map(t => {
      if (t.id !== taskId) return t;
      if (type === 'card') {
        return { ...t, linkedCardIds: t.linkedCardIds.filter(id => id !== itemId) };
      }
      return { ...t, linkedNoteIds: t.linkedNoteIds.filter(id => id !== itemId) };
    }));
  };

  const reorderLinkedItems = (taskId: string, newCardIds: string[], newNoteIds: string[]) => {
    onTasksChange(tasks.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, linkedCardIds: newCardIds, linkedNoteIds: newNoteIds };
    }));
  };

  const getLinkedCards = (task: FocusTask) =>
    cards.filter(c => task.linkedCardIds.includes(c.id));

  const getLinkedNotes = (task: FocusTask) =>
    notes.filter(n => task.linkedNoteIds.includes(n.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add task…"
          className="h-7 text-xs bg-white/5 border-white/10 placeholder:text-white/30"
        />
        <select
          value={newPriority}
          onChange={e => setNewPriority(e.target.value as any)}
          className="h-7 text-[10px] bg-white/5 border border-white/10 rounded px-1 text-white/70"
        >
          <option value="high">H</option>
          <option value="medium">M</option>
          <option value="low">L</option>
        </select>
        <Button size="sm" variant="ghost" onClick={addTask} className="h-7 w-7 p-0 text-white/50 hover:text-white">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="max-h-[300px]">
        <div className="flex flex-col gap-1">
          {incompleteTasks.map((task, idx) => {
            const linkedCards = getLinkedCards(task);
            const linkedNotes = getLinkedNotes(task);
            const linkedCount = linkedCards.length + linkedNotes.length;

            // Merge linked items into a unified list for reordering
            const linkedItems = [
              ...task.linkedCardIds.map(id => ({ type: 'card' as const, id })),
              ...task.linkedNoteIds.map(id => ({ type: 'note' as const, id })),
            ];

            return (
              <Collapsible key={task.id}>
                <div
                  data-drag-item
                  className={`group flex items-start gap-1 p-2 rounded-lg transition-all cursor-pointer ${
                    taskDragIdx === idx ? 'opacity-40 scale-[0.97]' : ''
                  } ${taskOverIdx === idx && taskDragIdx !== null && taskDragIdx !== idx ? 'border-t-2 border-cyan-400/40' : ''} ${
                    activeTaskId === task.id
                      ? 'bg-white/10 ring-1 ring-cyan-400/30'
                      : 'bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                  onClick={() => onSetActiveTask(activeTaskId === task.id ? null : task.id)}
                >
                  {/* Drag handle */}
                  <button
                    onPointerDown={e => onTaskDragStart(idx, e)}
                    onClick={e => e.stopPropagation()}
                    className="cursor-grab active:cursor-grabbing text-white/15 hover:text-white/40 p-0.5 mt-0.5 touch-none"
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>

                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleComplete(task.id)}
                    onClick={e => e.stopPropagation()}
                    className="mt-0.5 border-white/30 data-[state=checked]:bg-white/20"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-white/90 truncate">{task.title}</span>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: priorityColors[task.priority] }} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.pomodoroMinutes > 0 && (
                        <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />{task.pomodoroMinutes}m
                        </span>
                      )}
                      {linkedCount > 0 && (
                        <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                          <Link2 className="h-2.5 w-2.5" />{linkedCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm" variant="ghost"
                    onClick={e => { e.stopPropagation(); removeTask(task.id); }}
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/60"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <CollapsibleTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-white/30 hover:text-white/60">
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="pl-8 pr-2 pb-1">
                  {/* Linked items with drag reorder */}
                  {linkedItems.length > 0 && (
                    <LinkedItemsList
                      task={task}
                      linkedItems={linkedItems}
                      cards={cards}
                      notes={notes}
                      onViewCard={onViewCard}
                      onViewNote={onViewNote}
                      onUnlink={unlinkItem}
                      onReorder={(newCardIds, newNoteIds) => reorderLinkedItems(task.id, newCardIds, newNoteIds)}
                    />
                  )}

                  {/* Link picker */}
                  <LinkPicker
                    cards={cards}
                    notes={notes}
                    linkedCardIds={task.linkedCardIds}
                    linkedNoteIds={task.linkedNoteIds}
                    onLink={(type, id) => linkItem(task.id, type, id)}
                    onUnlink={(type, id) => unlinkItem(task.id, type, id)}
                  />
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {completedTasks.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <span className="text-[10px] uppercase tracking-wider text-white/20">Completed</span>
              {completedTasks.map(task => (
                <div key={task.id} className="flex items-center gap-2 p-1.5 opacity-40">
                  <Checkbox
                    checked
                    onCheckedChange={() => toggleComplete(task.id)}
                    className="border-white/20"
                  />
                  <span className="text-xs line-through text-white/50 truncate">{task.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Sub-component for draggable linked items within a task
function LinkedItemsList({
  task, linkedItems, cards, notes, onViewCard, onViewNote, onUnlink, onReorder,
}: {
  task: FocusTask;
  linkedItems: { type: 'card' | 'note'; id: string }[];
  cards: ZettelCard[];
  notes: any[];
  onViewCard: (card: ZettelCard) => void;
  onViewNote: (note: any) => void;
  onUnlink: (taskId: string, type: 'card' | 'note', itemId: string) => void;
  onReorder: (newCardIds: string[], newNoteIds: string[]) => void;
}) {
  const reorderLinked = useCallback((reordered: { type: 'card' | 'note'; id: string }[]) => {
    const newCardIds = reordered.filter(i => i.type === 'card').map(i => i.id);
    const newNoteIds = reordered.filter(i => i.type === 'note').map(i => i.id);
    onReorder(newCardIds, newNoteIds);
  }, [onReorder]);

  const { dragIdx, overIdx, onDragStart } = useDragReorder(linkedItems, reorderLinked);

  return (
    <div className="flex flex-col gap-0.5 mt-1">
      {linkedItems.map((item, idx) => {
        if (item.type === 'card') {
          const card = cards.find(c => c.id === item.id);
          if (!card) return null;
          return (
            <DraggableLinkedItem
              key={`card-${item.id}`}
              idx={idx}
              isDragging={dragIdx === idx}
              isOver={overIdx === idx && dragIdx !== null && dragIdx !== idx}
              onDragStart={onDragStart}
            >
              <button
                onClick={() => onViewCard(card)}
                className="flex items-center gap-1.5 text-left text-[11px] text-cyan-300/80 hover:text-cyan-300 p-1 rounded hover:bg-white/5 transition-colors flex-1 min-w-0"
              >
                <Layers className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{card.title}</span>
              </button>
              <button
                onClick={() => onUnlink(task.id, 'card', card.id)}
                className="text-white/20 hover:text-white/50 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </DraggableLinkedItem>
          );
        } else {
          const note = notes.find(n => n.id === item.id);
          if (!note) return null;
          return (
            <DraggableLinkedItem
              key={`note-${item.id}`}
              idx={idx}
              isDragging={dragIdx === idx}
              isOver={overIdx === idx && dragIdx !== null && dragIdx !== idx}
              onDragStart={onDragStart}
            >
              <button
                onClick={() => onViewNote(note)}
                className="flex items-center gap-1.5 text-left text-[11px] text-emerald-300/80 hover:text-emerald-300 p-1 rounded hover:bg-white/5 transition-colors flex-1 min-w-0"
              >
                <FileText className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{note.title}</span>
              </button>
              <button
                onClick={() => onUnlink(task.id, 'note', note.id)}
                className="text-white/20 hover:text-white/50 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </DraggableLinkedItem>
          );
        }
      })}
    </div>
  );
}
