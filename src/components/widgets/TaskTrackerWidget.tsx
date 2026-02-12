import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  completed_at?: string;
}

export function TaskTrackerWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');

  useEffect(() => {
    const saved = localStorage.getItem('taskTrackerWidgetTasks');
    if (saved) { try { setTasks(JSON.parse(saved)); } catch {} }
  }, []);

  const save = (t: Task[]) => { setTasks(t); localStorage.setItem('taskTrackerWidgetTasks', JSON.stringify(t)); };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    save([{ id: Date.now().toString(), title: newTaskTitle.trim(), completed: false, priority: newTaskPriority, created_at: new Date().toISOString() }, ...tasks]);
    setNewTaskTitle('');
    toast.success('Task added');
  };

  const toggleTask = (id: string) => {
    save(tasks.map(t => t.id === id ? { ...t, completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : undefined } : t));
  };

  const deleteTask = (id: string) => { save(tasks.filter(t => t.id !== id)); toast.success('Deleted'); };

  const pending = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  return (
    <div className="widget-card widget-accent-tasks p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-destructive/70" aria-hidden="true" />
          <h3 className="text-sm font-medium text-foreground">Tasks</h3>
        </div>
        {pending.length > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums">{pending.length} pending</span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add task..."
            className="text-xs h-8"
            aria-label="New task title"
          />
          <Button onClick={addTask} disabled={!newTaskTitle.trim()} size="sm" className="h-8 w-8 p-0 shrink-0" aria-label="Add task">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        <div className="flex gap-1">
          {(['low', 'medium', 'high'] as const).map((p) => (
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

        <div className="space-y-0.5 max-h-52 overflow-y-auto">
          {pending.map((task) => (
            <div key={task.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors">
              <Checkbox checked={false} onCheckedChange={() => toggleTask(task.id)} aria-label={`Complete: ${task.title}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{task.title}</p>
                <span className="text-[10px] text-muted-foreground">{format(new Date(task.created_at), 'MMM d')}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id)} className="h-6 w-6 p-0 text-destructive" aria-label="Delete task">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {completed.length > 0 && (
            <>
              <p className="text-[10px] text-muted-foreground pt-2 px-1">Completed</p>
              {completed.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-2 p-2 rounded-md opacity-50">
                  <Checkbox checked onCheckedChange={() => toggleTask(task.id)} aria-label={`Uncomplete: ${task.title}`} />
                  <p className="text-xs truncate line-through flex-1">{task.title}</p>
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
      </div>
    </div>
  );
}
