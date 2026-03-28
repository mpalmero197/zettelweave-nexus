import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { CheckSquare, Plus, Trash2, RefreshCw, Pencil, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react';
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
  parent_task_id: string | null;
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

  // Expanded state: which parent task IDs are expanded to show subtasks
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Edit sheet
  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editFields, setEditFields] = useState({
    name: '', priority: 'medium', notes: '', due_date: '', repeat_type: 'none', repeat_until: ''
  });

  // Add subtask inline
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
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
      parent_task_id: null,
    });
    if (error) { toast.error('Failed to add task'); return; }
    setNewTaskTitle('');
    toast.success('Task added');
    fetchTasks();
  };

  const addSubtask = async (parentId: string) => {
    if (!user || !subtaskTitle.trim()) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const { error } = await supabase.from('project_tasks').insert({
      user_id: user.id,
      name: subtaskTitle.trim(),
      priority: 'medium',
      status: 'todo',
      due_date: today,
      parent_task_id: parentId,
    });
    if (error) { toast.error('Failed to add subtask'); return; }
    setSubtaskTitle('');
    setAddingSubtaskFor(null);
    toast.success('Subtask added');
    fetchTasks();
  };

  const updateParentStatus = async (parentId: string, allTasks: Task[]) => {
    const siblings = allTasks.filter(t => t.parent_task_id === parentId);
    if (siblings.length === 0) return;

    const allDone = siblings.every(s => s.status === 'done');
    const anyInProgress = siblings.some(s => s.status === 'in_progress');
    const anyActive = siblings.some(s => s.status !== 'done' && s.status !== 'todo');

    let parentStatus: string;
    if (allDone) parentStatus = 'done';
    else if (anyInProgress || anyActive) parentStatus = 'in_progress';
    else if (siblings.some(s => s.status === 'done')) parentStatus = 'in_progress';
    else parentStatus = 'todo';

    await supabase.from('project_tasks').update({ status: parentStatus }).eq('id', parentId);
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const { error } = await supabase
      .from('project_tasks')
      .update({ status: newStatus })
      .eq('id', task.id);
    if (error) { toast.error('Failed to update task'); return; }

    // Auto-update parent status based on children
    if (task.parent_task_id) {
      const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
      await updateParentStatus(task.parent_task_id, updatedTasks);
    }

    if (newStatus === 'done' && task.repeat_type !== 'none' && task.due_date && !task.parent_task_id) {
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
          parent_task_id: null,
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

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Build task tree: root tasks + subtask map
  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const sortTasks = (a: Task, b: Task) => {
    // 1. Sort by due_date ascending (earliest first, null last)
    if (a.due_date && b.due_date) {
      const diff = a.due_date.localeCompare(b.due_date);
      if (diff !== 0) return diff;
    } else if (a.due_date && !b.due_date) return -1;
    else if (!a.due_date && b.due_date) return 1;

    // 2. Sort by priority descending (high > medium > low)
    return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
  };

  const rootTasks = tasks.filter(t => !t.parent_task_id);
  const subtaskMap = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (t.parent_task_id) {
      acc[t.parent_task_id] = [...(acc[t.parent_task_id] || []), t].sort(sortTasks);
    }
    return acc;
  }, {});

  const [showCompleted, setShowCompleted] = useState(false);

  const pendingRoot = rootTasks.filter(t => t.status !== 'done').sort(sortTasks);
  const completedRoot = rootTasks.filter(t => t.status === 'done');

  const renderTask = (task: Task, depth = 0) => {
    const subs = subtaskMap[task.id] || [];
    const hasSubs = subs.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const isAddingSub = addingSubtaskFor === task.id;

    return (
      <div key={task.id} className={depth > 0 ? 'ml-5 border-l border-border/40 pl-2' : ''}>
        <div className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-accent/50 transition-colors group">
          {/* Expand/collapse subtasks */}
          <button
            className="w-4 h-4 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => hasSubs ? toggleExpand(task.id) : null}
            aria-label={hasSubs ? (isExpanded ? 'Collapse subtasks' : 'Expand subtasks') : undefined}
          >
            {hasSubs ? (
              isExpanded
                ? <ChevronDown className="h-3 w-3" />
                : <ChevronRight className="h-3 w-3" />
            ) : (
              <span className="w-3" />
            )}
          </button>

          <Checkbox
            checked={task.status === 'done'}
            onCheckedChange={() => toggleTask(task)}
            aria-label={`Toggle: ${task.name}`}
            className="shrink-0"
          />

          {/* Task body — clicking navigates to tasks tab */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => onNavigate?.('tasks')}
          >
            <div className="flex items-center gap-1">
              <p className={`text-xs truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                {task.name}
              </p>
              {task.repeat_type !== 'none' && (
                <span title={`Repeats ${task.repeat_type}`}><RefreshCw className="h-2.5 w-2.5 text-muted-foreground shrink-0" /></span>
              )}
              {hasSubs && (
                <span className="text-[9px] text-muted-foreground shrink-0">
                  {subs.filter(s => s.status === 'done').length}/{subs.length}
                </span>
              )}
            </div>
            {depth === 0 && (
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] capitalize ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                <span className="text-[10px] text-muted-foreground">{format(parseISO(task.due_date), 'MMM d')}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity shrink-0 gap-0.5">
            {depth === 0 && (
              <Button
                variant="ghost" size="sm"
                onClick={() => { setAddingSubtaskFor(isAddingSub ? null : task.id); setSubtaskTitle(''); toggleExpand(task.id); }}
                className="h-5 w-5 p-0" aria-label="Add subtask"
                title="Add subtask"
              >
                <Plus className="h-2.5 w-2.5 text-muted-foreground" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(task); }} className="h-5 w-5 p-0" aria-label="Edit task">
              <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id)} className="h-5 w-5 p-0 text-destructive" aria-label="Delete task">
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>

        {/* Inline subtask add form */}
        {isAddingSub && (
          <div className="ml-5 pl-2 pr-1 pb-1 flex gap-1">
            <Input
              value={subtaskTitle}
              onChange={e => setSubtaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addSubtask(task.id);
                if (e.key === 'Escape') { setAddingSubtaskFor(null); setSubtaskTitle(''); }
              }}
              placeholder="Subtask name..."
              className="text-xs h-7"
              autoFocus
            />
            <Button onClick={() => addSubtask(task.id)} disabled={!subtaskTitle.trim()} size="sm" className="h-7 px-2 shrink-0">
              Add
            </Button>
          </div>
        )}

        {/* Subtasks */}
        {isExpanded && subs.map(sub => renderTask(sub, depth + 1))}
      </div>
    );
  };

  const totalRoot = rootTasks.length;
  const doneCount = completedRoot.length;
  const progressPct = totalRoot > 0 ? Math.round((doneCount / totalRoot) * 100) : 0;

  return (
    <>
      <div className="widget-card">
        <div className="widget-header">
          <div className="widget-header-left">
            <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-medium text-foreground">Tasks</h3>
            {pendingRoot.filter(t => {
              const d = parseISO(t.due_date);
              return d < new Date(new Date().toISOString().split('T')[0]);
            }).length > 0 && (
              <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                {pendingRoot.filter(t => parseISO(t.due_date) < new Date(new Date().toISOString().split('T')[0])).length} overdue
              </span>
            )}
          </div>
          {onNavigate && (
            <button className="widget-header-link" onClick={() => onNavigate('tasks')}>
              View all →
            </button>
          )}
        </div>

        {/* Progress bar */}
        {totalRoot > 0 && (
          <div className="px-4 pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground tabular-nums">{doneCount}/{totalRoot} done</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{progressPct}%</span>
            </div>
            <div className="progress-micro">
              <div className="progress-micro-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        <div className="widget-body space-y-2">
          <div className="flex gap-2 px-1.5">
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


          {loading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">Loading…</div>
          ) : (
            <div className="space-y-0 max-h-56 overflow-y-auto">
              {pendingRoot.slice(0, 5).map(task => renderTask(task))}

              {completedRoot.length > 0 && (
                <>
                  <button
                    className="text-[10px] text-muted-foreground pt-2 px-1 hover:text-foreground transition-colors flex items-center gap-1"
                    onClick={() => setShowCompleted(v => !v)}
                  >
                    {showCompleted ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                    Completed ({completedRoot.length})
                  </button>
                  {showCompleted && completedRoot.slice(0, 3).map(task => renderTask(task))}
                </>
              )}

              {rootTasks.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center">No tasks yet</p>
              )}
            </div>
          )}
        </div>

        {pendingRoot.length > 5 && (
          <div className="widget-footer">{pendingRoot.length - 5} more pending</div>
        )}
      </div>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle className="text-sm">
              {editTask?.parent_task_id ? 'Edit Subtask' : 'Edit Task'}
            </SheetTitle>
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
            {!editTask?.parent_task_id && (
              <>
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
              </>
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
