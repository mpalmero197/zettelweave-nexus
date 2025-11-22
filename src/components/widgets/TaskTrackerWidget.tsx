import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckSquare, Plus, Trash2, Clock } from 'lucide-react';
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

const priorityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export function TaskTrackerWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');

  useEffect(() => {
    // Load tasks from localStorage
    const savedTasks = localStorage.getItem('taskTrackerWidgetTasks');
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (error) {
        console.error('Error loading saved tasks:', error);
      }
    }
  }, []);

  const saveTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    localStorage.setItem('taskTrackerWidgetTasks', JSON.stringify(updatedTasks));
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      priority: newTaskPriority,
      created_at: new Date().toISOString(),
    };

    saveTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    toast.success('Task added successfully!');
  };

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          completed: !task.completed,
          completed_at: !task.completed ? new Date().toISOString() : undefined,
        };
      }
      return task;
    });
    saveTasks(updatedTasks);
  };

  const deleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    saveTasks(updatedTasks);
    toast.success('Task deleted!');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  return (
    <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Quick Tasks
          </div>
          <Badge variant="outline" className="text-xs">
            {pendingTasks.length} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new task */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a quick task..."
              className="text-xs h-8"
            />
            <Button
              onClick={addTask}
              disabled={!newTaskTitle.trim()}
              size="icon"
              className="h-8 w-8 shrink-0"
            >
              <Plus className="h-3 w-3" />
              <span className="sr-only">Add task</span>
            </Button>
          </div>
          
          <div className="flex gap-1">
            {(['low', 'medium', 'high'] as const).map((priority) => (
              <Button
                key={priority}
                variant={newTaskPriority === priority ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewTaskPriority(priority)}
                className="text-xs h-6 px-2 capitalize"
              >
                {priority}
              </Button>
            ))}
          </div>
        </div>

        {/* Task list */}
        <ScrollArea className="h-full max-h-[250px]">
          <div className="space-y-3">
            {/* Pending tasks */}
            {pendingTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Pending</h4>
                {pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2 w-2" />
                          {format(new Date(task.created_at), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTask(task.id)}
                      className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Delete task</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Completed</h4>
                {completedTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg opacity-60">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate line-through">{task.title}</p>
                      {task.completed_at && (
                        <span className="text-xs text-muted-foreground">
                          Completed {format(new Date(task.completed_at), 'MMM d')}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTask(task.id)}
                      className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Delete task</span>
                    </Button>
                  </div>
                ))}
                {completedTasks.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{completedTasks.length - 3} more completed
                  </p>
                )}
              </div>
            )}

            {tasks.length === 0 && (
              <div className="text-center py-6">
                <CheckSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No tasks yet</p>
                <p className="text-xs text-muted-foreground">Add a task above to get started</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}