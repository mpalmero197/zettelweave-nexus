import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, Clock, FileText, Layers, X } from 'lucide-react';
import { ZettelCard } from '@/types/zettel';

export interface FocusTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  timeLimit?: number; // minutes
  completed: boolean;
  linkedCardIds: string[];
  linkedNoteIds: string[];
  pomodoroMinutes: number; // accumulated
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

export function FocusTaskList({
  tasks, onTasksChange, activeTaskId, onSetActiveTask,
  cards, notes, onViewCard, onViewNote
}: FocusTaskListProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');

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
          {tasks.filter(t => !t.completed).map(task => (
            <Collapsible key={task.id}>
              <div
                className={`group flex items-start gap-2 p-2 rounded-lg transition-all cursor-pointer ${
                  activeTaskId === task.id
                    ? 'bg-white/10 ring-1 ring-cyan-400/30'
                    : 'bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
                onClick={() => onSetActiveTask(activeTaskId === task.id ? null : task.id)}
              >
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
                  {task.pomodoroMinutes > 0 && (
                    <span className="text-[10px] text-white/30 flex items-center gap-0.5 mt-0.5">
                      <Clock className="h-2.5 w-2.5" />{task.pomodoroMinutes}m logged
                    </span>
                  )}
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
                <div className="text-[10px] uppercase tracking-wider text-white/30 mt-1 mb-0.5 flex items-center gap-1">
                  <Layers className="h-2.5 w-2.5" /> Related Cards & Notes
                </div>
                {getLinkedCards(task).length === 0 && getLinkedNotes(task).length === 0 ? (
                  <p className="text-[10px] text-white/20 italic">No linked content. Drag cards here or use the main workspace.</p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {getLinkedCards(task).map(card => (
                      <button
                        key={card.id}
                        onClick={() => onViewCard(card)}
                        className="flex items-center gap-1.5 text-left text-[11px] text-cyan-300/80 hover:text-cyan-300 p-1 rounded hover:bg-white/5 transition-colors"
                      >
                        <Layers className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{card.title}</span>
                      </button>
                    ))}
                    {getLinkedNotes(task).map(note => (
                      <button
                        key={note.id}
                        onClick={() => onViewNote(note)}
                        className="flex items-center gap-1.5 text-left text-[11px] text-emerald-300/80 hover:text-emerald-300 p-1 rounded hover:bg-white/5 transition-colors"
                      >
                        <FileText className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{note.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}

          {tasks.filter(t => t.completed).length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <span className="text-[10px] uppercase tracking-wider text-white/20">Completed</span>
              {tasks.filter(t => t.completed).map(task => (
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
