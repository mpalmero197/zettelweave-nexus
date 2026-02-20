import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { CheckSquare, Plus, Trash2, RefreshCw, Pencil, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, addWeeks, addMonths, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

interface Task {
  id: string;
  name: string;
  status: string;
  priority: string;
  due_date: string;
  notes: string | null;
  repeat_type: string;
  repeat_until: string | null;
  user_id: string;
  created_at: string;
}

interface TaskTrackerWidgetProps {
  onNavigate?: (tab: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-destructive',
  medium: 'text-amber-500',
  low: 'text-muted-foreground',
};

export function TaskTrackerWidget({ onNavigate }: TaskTrackerWidgetProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Edit sheet
  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editFields, setEditFields] = useState({
    name: '', priority: 'medium', notes: '', due_date: '', repeat_type: 'none', repeat_until: ''
  });

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setTasks((data as Task[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async () => {
    if (!user || !newTaskTitle.trim()) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const { error } = await supabase.from('project_tasks').insert({
      user_id: user.id,
      name: newTaskTitle.trim(),
      priority: newTaskPriority,
      status: 'todo',
      due_date: today,
    });
    if (error) { toast.error('Failed to add task'); return; }
    setNewTaskTitle('');
    toast.success('Task added');
    fetchTasks();
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const { error } = await supabase
      .from('project_tasks')
      .update({ status: newStatus })
      .eq('id', task.id);
    if (error) { toast.error('Failed to update task'); return; }

    // If completing a repeating task, create next occurrence
    if (newStatus === 'done' && task.repeat_type !== 'none' && task.due_date) {
      const dueDate = parseISO(task.due_date);
      let nextDue: Date;
      if (task.repeat_type === 'daily') nextDue = addDays(dueDate, 1);
      else if (task.repeat_type === 'weekly') nextDue = addWeeks(dueDate, 1);
      else nextDue = addMonths(dueDate, 1);

      const shouldCreate = !task.repeat_until || nextDue <= parseISO(task.repeat_until);
      if (shouldCreate) {
        await supabase.from('project_tasks').insert({
          user_id: task.user_id,
          name: task.name,
          priority: task.priority,
          status: 'todo',
          due_date: format(nextDue, 'yyyy-MM-dd'),
          notes: task.notes,
          repeat_type: task.repeat_type,
          repeat_until: task.repeat_until,
        });
        toast.success('Next occurrence created');
      }
    }
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('project_tasks').delete().eq('id', id);
    if (error) { toast.error('Failed to delete task'); return; }
    toast.success('Deleted');
    fetchTasks();
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setEditFields({
      name: task.name,
      priority: task.priority,
      notes: task.notes || '',
      due_date: task.due_date,
      repeat_type: task.repeat_type,
      repeat_until: task.repeat_until || '',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTask) return;
    const { error } = await supabase.from('project_tasks').update({
      name: editFields.name,
      priority: editFields.priority,
      notes: editFields.notes || null,
      due_date: editFields.due_date,
      repeat_type: editFields.repeat_type,
      repeat_until: editFields.repeat_until || null,
    }).eq('id', editTask.id);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Task updated');
    setEditOpen(false);
    fetchTasks();
  };

  const pending = tasks.filter(t => t.status !== 'done');
  const completed = tasks.filter(t => t.status === 'done');

  return (
    <>
      <div className="widget-card widget-accent-tasks p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-destructive/70" aria-hidden="true" />
            <button
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              onClick={() => onNavigate?.('tasks')}
            >
              Tasks
            </button>
          </div>
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">{pending.length} pending</span>
            )}
            {onNavigate && (
              <button
                onClick={() => onNavigate('tasks')}
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                aria-label="Open full task manager"
              >
                View all <ExternalLink className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Add task..."
              className="text-xs h-8"
              aria-label="New task title"
            />
            <Button onClick={addTask} disabled={!newTaskTitle.trim()} size="sm" className="h-8 w-8 p-0 shrink-0" aria-label="Add task">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex gap-1">
            {(['low', 'medium', 'high'] as const).map(p => (
              <Button
                key={p}
                variant={newTaskPriority === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewTaskPriority(p)}
                className="text-[10px] h-6 px-2 capitalize"
              >
                {p}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">Loading…</div>
          ) : (
            <div className="space-y-0.5 max-h-52 overflow-y-auto">
              {pending.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors group"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => toggleTask(task)}
                    aria-label={`Complete: ${task.name}`}
                  />
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => openEdit(task)}
                  >
                    <div className="flex items-center gap-1">
                      <p className="text-xs truncate">{task.name}</p>
                      {task.repeat_type !== 'none' && (
                        <span title={`Repeats ${task.repeat_type}`}><RefreshCw className="h-2.5 w-2.5 text-muted-foreground shrink-0" /></span>

                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] capitalize ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                      <span className="text-[10px] text-muted-foreground">{format(parseISO(task.due_date), 'MMM d')}</span>
                    </div>
                  </div>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(task)} className="h-6 w-6 p-0" aria-label="Edit task">
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id)} className="h-6 w-6 p-0 text-destructive" aria-label="Delete task">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {completed.length > 0 && (
                <>
                  <p className="text-[10px] text-muted-foreground pt-2 px-1">Completed</p>
                  {completed.slice(0, 3).map(task => (
                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-md opacity-50">
                      <Checkbox checked onCheckedChange={() => toggleTask(task)} aria-label={`Uncomplete: ${task.name}`} />
                      <p className="text-xs truncate line-through flex-1">{task.name}</p>
                      <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id)} className="h-6 w-6 p-0 text-destructive" aria-label="Delete task">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </>
              )}
              {tasks.length === 0 && (
                <div className="text-center py-6">
                  <CheckSquare className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-xs text-muted-foreground">No tasks yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle className="text-sm">Edit Task</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input
                value={editFields.name}
                onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <div className="flex gap-1">
                {(['low', 'medium', 'high'] as const).map(p => (
                  <Button
                    key={p}
                    variant={editFields.priority === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditFields(f => ({ ...f, priority: p }))}
                    className="text-xs h-7 px-3 capitalize flex-1"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Due Date</label>
              <Input
                type="date"
                value={editFields.due_date}
                onChange={e => setEditFields(f => ({ ...f, due_date: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Repeat</label>
              <Select
                value={editFields.repeat_type}
                onValueChange={v => setEditFields(f => ({ ...f, repeat_type: v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editFields.repeat_type !== 'none' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Repeat Until (optional)</label>
                <Input
                  type="date"
                  value={editFields.repeat_until}
                  onChange={e => setEditFields(f => ({ ...f, repeat_until: e.target.value }))}
                  className="text-sm"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea
                value={editFields.notes}
                onChange={e => setEditFields(f => ({ ...f, notes: e.target.value }))}
                className="text-sm min-h-[80px]"
                placeholder="Add notes..."
              />
            </div>
          </div>
          <SheetFooter className="pt-4">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveEdit} disabled={!editFields.name.trim()}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
