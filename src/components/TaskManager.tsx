import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Timer, Clock, Check, X, Play, Pause, RotateCcw, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReminderPicker } from '@/components/notifications/ReminderPicker';

interface Task {
  id: string;
  title: string;
  notes?: string;
  estimatedTime: number; // in minutes
  actualTime: number; // in minutes
  isCompleted: boolean;
  isActive: boolean;
  startTime?: number;
  completedAt?: Date;
  list: string;
}

interface TaskList {
  id: string;
  name: string;
  color: string;
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<TaskList[]>([
    { id: 'default', name: 'Today', color: 'blue' },
    { id: 'work', name: 'Work', color: 'green' },
    { id: 'personal', name: 'Personal', color: 'purple' }
  ]);
  const [activeList, setActiveList] = useState('default');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskEstimate, setNewTaskEstimate] = useState(30);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const { toast } = useToast();

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      notes: newTaskNotes,
      estimatedTime: newTaskEstimate,
      actualTime: 0,
      isCompleted: false,
      isActive: false,
      list: activeList
    };

    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
    setNewTaskNotes('');
    setNewTaskEstimate(30);

    toast({
      title: "Task Created",
      description: `"${newTaskTitle}" added to ${lists.find(l => l.id === activeList)?.name}`,
    });
  };

  const startTimer = (taskId: string) => {
    // Stop any currently active timers
    setTasks(prev => prev.map(task => ({
      ...task,
      isActive: false
    })));

    // Start the selected task
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, isActive: true, startTime: Date.now() }
        : task
    ));
  };

  const pauseTimer = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.startTime) {
      const additionalTime = Math.floor((Date.now() - task.startTime) / 60000);
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, isActive: false, actualTime: t.actualTime + additionalTime, startTime: undefined }
          : t
      ));
    }
  };

  const completeTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.isActive && task.startTime) {
      const additionalTime = Math.floor((Date.now() - task.startTime) / 60000);
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { 
              ...t, 
              isCompleted: true, 
              isActive: false, 
              actualTime: t.actualTime + additionalTime,
              completedAt: new Date(),
              startTime: undefined
            }
          : t
      ));
    } else {
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, isCompleted: true, completedAt: new Date() }
          : t
      ));
    }

    const taskTitle = task?.title || '';
    toast({
      title: "Task Completed! 💥",
      description: `Well done on finishing "${taskTitle}"`,
    });
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const getCurrentTime = (task: Task) => {
    if (task.isActive && task.startTime) {
      const currentSessionTime = Math.floor((currentTime - task.startTime) / 60000);
      return task.actualTime + currentSessionTime;
    }
    return task.actualTime;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getProgressPercentage = (task: Task) => {
    if (task.estimatedTime === 0) return 0;
    return Math.min((getCurrentTime(task) / task.estimatedTime) * 100, 100);
  };

  const filteredTasks = tasks.filter(task => task.list === activeList);
  const completedTasks = filteredTasks.filter(task => task.isCompleted);
  const activeTasks = filteredTasks.filter(task => !task.isCompleted);

  return (
    <div className="space-y-6">
      {/* List Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {lists.map(list => (
          <Button
            key={list.id}
            variant={activeList === list.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveList(list.id)}
            className="whitespace-nowrap"
          >
            {list.name}
            <Badge variant="secondary" className="ml-2 text-xs">
              {tasks.filter(t => t.list === list.id && !t.isCompleted).length}
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
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
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
        
        {activeTasks.map(task => (
          <Card key={task.id} className={`transition-all ${task.isActive ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium">{task.title}</h4>
                  {task.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <ReminderPicker
                    compact
                    itemType="task"
                    itemId={task.id}
                    itemTitle={task.title}
                    eventTime={new Date(Date.now() + task.estimatedTime * 60000)}
                  />
                  {!task.isActive ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startTimer(task.id)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => pauseTimer(task.id)}
                    >
                      <Pause className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    onClick={() => completeTask(task.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteTask(task.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Progress value={getProgressPercentage(task)} className="h-2" />
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Est: {formatTime(task.estimatedTime)}
                  </span>
                  <span className={`font-mono ${getCurrentTime(task) > task.estimatedTime ? 'text-orange-500' : 'text-primary'}`}>
                    {formatTime(getCurrentTime(task))}
                    {getCurrentTime(task) > task.estimatedTime && (
                      <span className="text-orange-500 ml-1">
                        (+{formatTime(getCurrentTime(task) - task.estimatedTime)} over)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            Completed
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {completedTasks.length}
            </Badge>
          </h3>
          
          {completedTasks.map(task => (
            <Card key={task.id} className="opacity-75">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium line-through text-muted-foreground">{task.title}</h4>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>Est: {formatTime(task.estimatedTime)}</span>
                      <span>Done: {formatTime(task.actualTime)}</span>
                      {task.actualTime <= task.estimatedTime ? (
                        <span className="text-green-600">
                          ✓ {formatTime(task.estimatedTime - task.actualTime)} under
                        </span>
                      ) : (
                        <span className="text-orange-500">
                          {formatTime(task.actualTime - task.estimatedTime)} over
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteTask(task.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}