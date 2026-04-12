import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Timer, Clock, Check, X, Play, Pause, Edit3, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ReminderPicker } from '@/components/notifications/ReminderPicker';

interface Task {
  id: string;
  title: string;
  notes: string;
  estimated_time: number;
  actual_time: number;
  is_completed: boolean;
  is_active: boolean;
  start_time: number | null;
  completed_at: string | null;
  list: string;
  due_date: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface TaskList {
  id: string;
  name: string;
  color: string;
}

const LISTS: TaskList[] = [
  { id: 'default', name: 'Today', color: 'blue' },
  { id: 'work', name: 'Work', color: 'green' },
  { id: 'personal', name: 'Personal', color: 'purple' },
];

export function TaskManager() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState('default');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskEstimate, setNewTaskEstimate] = useState(30);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editEstimate, setEditEstimate] = useState(30);
  const { toast } = useToast();

  // Fetch tasks from Supabase
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTasks((data as Task[]) || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const addTask = async () => {
    if (!newTaskTitle.trim() || !user) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: newTaskTitle,
          notes: newTaskNotes,
          estimated_time: newTaskEstimate,
          list: activeList,
        })
        .select()
        .single();
      if (error) throw error;
      setTasks(prev => [data as Task, ...prev]);
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskEstimate(30);
      toast({ title: "Task Created", description: `"${newTaskTitle}" added` });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    }
  };

  const updateTask = async (taskId: string, patch: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t));
    } catch (err) {
      console.error(err);
    }
  };

  const startTimer = async (taskId: string) => {
    // Pause all other active tasks first
    const activeTasks = tasks.filter(t => t.is_active && t.id !== taskId);
    for (const t of activeTasks) {
      const additionalTime = t.start_time ? Math.floor((Date.now() - t.start_time) / 60000) : 0;
      await updateTask(t.id, {
        is_active: false,
        actual_time: t.actual_time + additionalTime,
        start_time: null,
      });
    }
    await updateTask(taskId, { is_active: true, start_time: Date.now() });
  };

  const pauseTimer = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.start_time) {
      const additionalTime = Math.floor((Date.now() - task.start_time) / 60000);
      await updateTask(taskId, {
        is_active: false,
        actual_time: task.actual_time + additionalTime,
        start_time: null,
      });
    }
  };

  const completeTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const additionalTime = task.is_active && task.start_time
      ? Math.floor((Date.now() - task.start_time) / 60000) : 0;
    await updateTask(taskId, {
      is_completed: true,
      is_active: false,
      actual_time: task.actual_time + additionalTime,
      completed_at: new Date().toISOString(),
      start_time: null,
    });
    toast({ title: "Task Completed! 💥", description: `Well done on finishing "${task.title}"` });
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error(err);
    }
  };

  const saveEdit = async () => {
    if (!editingTask) return;
    await updateTask(editingTask.id, {
      title: editTitle,
      notes: editNotes,
      estimated_time: editEstimate,
    });
    setEditingTask(null);
    toast({ title: "Task Updated" });
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditNotes(task.notes || '');
    setEditEstimate(task.estimated_time);
  };

  const getCurrentTime = (task: Task) => {
    if (task.is_active && task.start_time) {
      return task.actual_time + Math.floor((currentTime - task.start_time) / 60000);
    }
    return task.actual_time;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getProgressPercentage = (task: Task) => {
    if (task.estimated_time === 0) return 0;
    return Math.min((getCurrentTime(task) / task.estimated_time) * 100, 100);
  };

  const filteredTasks = tasks.filter(task => task.list === activeList);
  const completedTasks = filteredTasks.filter(task => task.is_completed);
  const activeTasks = filteredTasks.filter(task => !task.is_completed);

  if (!user) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Sign in to manage your tasks</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* List Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {LISTS.map(list => (
          <Button
            key={list.id}
            variant={activeList === list.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveList(list.id)}
            className="whitespace-nowrap"
          >
            {list.name}
            <Badge variant="secondary" className="ml-2 text-xs">
              {tasks.filter(t => t.list === list.id && !t.is_completed).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Add Task */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Task
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              className="flex-1"
            />
            <div className="flex items-center gap-2 min-w-fit">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={newTaskEstimate}
                onChange={(e) => setNewTaskEstimate(Number(e.target.value))}
                className="w-20"
                min="5"
                step="5"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
            <Button onClick={addTask}>Add</Button>
          </div>
          <Textarea
            placeholder="Add notes, links, or details..."
            value={newTaskNotes}
            onChange={(e) => setNewTaskNotes(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Active Tasks */}
      <div className="space-y-3">
        <h3 className="font-medium flex items-center gap-2">
          Active Tasks
          <Badge variant="outline">{activeTasks.length}</Badge>
        </h3>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading tasks…</p>
        ) : activeTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active tasks. Add one above!</p>
        ) : (
          activeTasks.map(task => (
            <Card key={task.id} className={`transition-all ${task.is_active ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 cursor-pointer" onClick={() => openEdit(task)}>
                    <h4 className="font-medium">{task.title}</h4>
                    {task.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ReminderPicker
                      compact
                      itemType="task"
                      itemId={task.id}
                      itemTitle={task.title}
                      eventTime={new Date(Date.now() + task.estimated_time * 60000)}
                    />
                    <Button size="sm" variant="outline" onClick={() => openEdit(task)}>
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    {!task.is_active ? (
                      <Button size="sm" variant="outline" onClick={() => startTimer(task.id)}>
                        <Play className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => pauseTimer(task.id)}>
                        <Pause className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="sm" onClick={() => completeTask(task.id)} className="bg-green-600 hover:bg-green-700">
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteTask(task.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Progress value={getProgressPercentage(task)} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est: {formatTime(task.estimated_time)}</span>
                    <span className={`font-mono ${getCurrentTime(task) > task.estimated_time ? 'text-orange-500' : 'text-primary'}`}>
                      {formatTime(getCurrentTime(task))}
                      {getCurrentTime(task) > task.estimated_time && (
                        <span className="text-orange-500 ml-1">
                          (+{formatTime(getCurrentTime(task) - task.estimated_time)} over)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            Completed
            <Badge variant="outline" className="bg-green-50 text-green-700">{completedTasks.length}</Badge>
          </h3>
          {completedTasks.map(task => (
            <Card key={task.id} className="opacity-75">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium line-through text-muted-foreground">{task.title}</h4>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>Est: {formatTime(task.estimated_time)}</span>
                      <span>Done: {formatTime(task.actual_time)}</span>
                      {task.actual_time <= task.estimated_time ? (
                        <span className="text-green-600">✓ {formatTime(task.estimated_time - task.actual_time)} under</span>
                      ) : (
                        <span className="text-orange-500">{formatTime(task.actual_time - task.estimated_time)} over</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => deleteTask(task.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Task title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <Textarea
              placeholder="Notes..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
            />
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={editEstimate}
                onChange={(e) => setEditEstimate(Number(e.target.value))}
                className="w-24"
                min="5"
                step="5"
              />
              <span className="text-sm text-muted-foreground">min estimated</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
              <Button onClick={saveEdit}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
