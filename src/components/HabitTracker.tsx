import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, 
  Target, 
  Calendar as CalendarIcon, 
  Flame, 
  BarChart3, 
  Trophy,
  CheckCircle2,
  Circle,
  Edit3,
  Trash2,
  TrendingUp,
  Clock,
  Zap,
  Timer
} from "lucide-react";
import { PomodoroTimer } from "./PomodoroTimer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  target: number; // e.g., 1 for daily, 3 for 3 times per week
  category: string;
  color: string;
  createdAt: Date;
  completions: { date: string; completed: boolean; notes?: string }[];
  streak: number;
  bestStreak: number;
}

interface HabitStats {
  totalHabits: number;
  activeStreaks: number;
  completionRate: number;
  longestStreak: number;
}

const HABIT_CATEGORIES = [
  { id: 'health', name: 'Health & Fitness', color: '#22c55e' },
  { id: 'mindfulness', name: 'Mindfulness', color: '#8b5cf6' },
  { id: 'productivity', name: 'Productivity', color: '#3b82f6' },
  { id: 'learning', name: 'Learning', color: '#f59e0b' },
  { id: 'social', name: 'Social', color: '#ec4899' },
  { id: 'creative', name: 'Creative', color: '#06b6d4' },
  { id: 'other', name: 'Other', color: '#6b7280' }
];

const HABIT_COLORS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', 
  '#ec4899', '#06b6d4', '#ef4444', '#84cc16'
];

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<'today' | 'calendar' | 'stats' | 'all' | 'pomodoro'>('today');
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Load habits from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('habit-tracker-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHabits(parsed.map((h: any) => ({
          ...h,
          createdAt: new Date(h.createdAt)
        })));
      } catch (error) {
        console.error('Failed to load habits:', error);
      }
    }
  }, []);

  // Save habits to localStorage
  useEffect(() => {
    if (habits.length > 0) {
      localStorage.setItem('habit-tracker-data', JSON.stringify(habits));
    }
  }, [habits]);

  const createHabit = (habitData: Omit<Habit, 'id' | 'createdAt' | 'completions' | 'streak' | 'bestStreak'>) => {
    const newHabit: Habit = {
      ...habitData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      completions: [],
      streak: 0,
      bestStreak: 0
    };

    setHabits(prev => [...prev, newHabit]);
    setShowCreateForm(false);
    toast(`Habit "${newHabit.name}" created!`);
  };

  const toggleHabitCompletion = (habitId: string, date: Date, completed: boolean) => {
    const dateStr = date.toISOString().split('T')[0];
    
    setHabits(prev => prev.map(habit => {
      if (habit.id !== habitId) return habit;

      const updatedCompletions = habit.completions.filter(c => c.date !== dateStr);
      if (completed) {
        updatedCompletions.push({ date: dateStr, completed: true });
      }

      // Recalculate streak
      const sortedCompletions = updatedCompletions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      
      for (let i = 0; i < sortedCompletions.length; i++) {
        const completion = sortedCompletions[i];
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        const expectedDateStr = expectedDate.toISOString().split('T')[0];
        
        if (completion.date === expectedDateStr && completion.completed) {
          currentStreak++;
        } else {
          break;
        }
      }

      const bestStreak = Math.max(habit.bestStreak, currentStreak);

      return {
        ...habit,
        completions: updatedCompletions,
        streak: currentStreak,
        bestStreak
      };
    }));

    toast(completed ? "Habit completed! 🎉" : "Habit unmarked");
  };

  const deleteHabit = (habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
    toast("Habit deleted");
  };

  const getHabitStats = (): HabitStats => {
    const totalHabits = habits.length;
    const activeStreaks = habits.filter(h => h.streak > 0).length;
    const totalCompletions = habits.reduce((sum, h) => sum + h.completions.filter(c => c.completed).length, 0);
    const totalPossibleCompletions = habits.reduce((sum, h) => {
      const daysSinceCreated = Math.floor((Date.now() - h.createdAt.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + Math.min(daysSinceCreated, 365); // Cap at 1 year for calculation
    }, 0);
    const completionRate = totalPossibleCompletions > 0 ? (totalCompletions / totalPossibleCompletions) * 100 : 0;
    const longestStreak = Math.max(...habits.map(h => h.bestStreak), 0);

    return {
      totalHabits,
      activeStreaks,
      completionRate,
      longestStreak
    };
  };

  const getTodaysHabits = () => {
    const today = selectedDate.toISOString().split('T')[0];
    return habits.map(habit => ({
      ...habit,
      isCompletedToday: habit.completions.some(c => c.date === today && c.completed)
    }));
  };

  const HabitCreateForm = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Habit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          createHabit({
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            frequency: formData.get('frequency') as 'daily' | 'weekly' | 'monthly',
            target: parseInt(formData.get('target') as string),
            category: formData.get('category') as string,
            color: formData.get('color') as string
          });
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="name" placeholder="Habit name" required />
            <Input name="description" placeholder="Description (optional)" />
            
            <Select name="frequency" required>
              <SelectTrigger>
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>

            <Input 
              name="target" 
              type="number" 
              placeholder="Target (e.g., 1 for daily)" 
              min="1" 
              defaultValue="1"
              required 
            />

            <Select name="category" required>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {HABIT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select name="color" required>
              <SelectTrigger>
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                {HABIT_COLORS.map(color => (
                  <SelectItem key={color} value={color}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: color }}
                      />
                      {color}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 mt-4">
            <Button type="submit">Create Habit</Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const TodayView = () => {
    const todaysHabits = getTodaysHabits();
    const completedToday = todaysHabits.filter(h => h.isCompletedToday).length;
    const progressPercentage = todaysHabits.length > 0 ? (completedToday / todaysHabits.length) * 100 : 0;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Today's Progress
              </span>
              <Badge variant={progressPercentage === 100 ? "default" : "secondary"}>
                {completedToday}/{todaysHabits.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              {progressPercentage === 100 ? "🎉 All habits completed!" : 
               `${Math.round(progressPercentage)}% complete`}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {todaysHabits.map(habit => (
            <Card key={habit.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleHabitCompletion(
                        habit.id, 
                        selectedDate, 
                        !habit.isCompletedToday
                      )}
                      className="p-0 h-auto"
                    >
                      {habit.isCompletedToday ? (
                        <CheckCircle2 
                          className="h-6 w-6" 
                          style={{ color: habit.color }}
                        />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </Button>
                    
                    <div>
                      <h3 className={cn(
                        "font-medium",
                        habit.isCompletedToday && "line-through text-muted-foreground"
                      )}>
                        {habit.name}
                      </h3>
                      {habit.description && (
                        <p className="text-sm text-muted-foreground">
                          {habit.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {habit.streak > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        {habit.streak}
                      </Badge>
                    )}
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: habit.color }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const StatsView = () => {
    const stats = getHabitStats();

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stats.totalHabits}</div>
              <div className="text-sm text-muted-foreground">Total Habits</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Flame className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <div className="text-2xl font-bold">{stats.activeStreaks}</div>
              <div className="text-sm text-muted-foreground">Active Streaks</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{Math.round(stats.completionRate)}%</div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{stats.longestStreak}</div>
              <div className="text-sm text-muted-foreground">Best Streak</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Habit Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {habits.map(habit => {
                const category = HABIT_CATEGORIES.find(c => c.id === habit.category);
                const completionRate = habit.completions.filter(c => c.completed).length;
                const daysSinceCreated = Math.floor((Date.now() - habit.createdAt.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const rate = daysSinceCreated > 0 ? (completionRate / Math.min(daysSinceCreated, 365)) * 100 : 0;

                return (
                  <div key={habit.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: habit.color }}
                      />
                      <div>
                        <div className="font-medium">{habit.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {category?.name} • {habit.frequency}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium">{Math.round(rate)}%</div>
                      <div className="text-sm text-muted-foreground">
                        <Flame className="inline h-3 w-3 mr-1" />
                        {habit.streak} current
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const AllHabitsView = () => (
    <div className="space-y-4">
      {habits.map(habit => {
        const category = HABIT_CATEGORIES.find(c => c.id === habit.category);
        
        return (
          <Card key={habit.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: habit.color }}
                  />
                  <div>
                    <h3 className="font-medium">{habit.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {habit.description}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <Badge variant="outline">{category?.name}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {habit.frequency} • Target: {habit.target}
                      </span>
                      {habit.streak > 0 && (
                        <Badge className="flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          {habit.streak} day streak
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingHabit(habit)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteHabit(habit.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Habit Tracker
          </h1>
          <p className="text-muted-foreground">
            Build better habits, one day at a time
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {selectedDate.toLocaleDateString()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Habit
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'today', label: 'Today', icon: Clock },
          { id: 'pomodoro', label: 'Pomodoro', icon: Timer },
          { id: 'stats', label: 'Statistics', icon: BarChart3 },
          { id: 'all', label: 'All Habits', icon: Target }
        ].map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={view === id ? 'default' : 'outline'}
            onClick={() => setView(id as any)}
            className="flex items-center gap-2"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Create Form */}
      {showCreateForm && <HabitCreateForm />}

      {/* Views */}
      {view === 'today' && <TodayView />}
      {view === 'pomodoro' && <PomodoroTimer habits={habits} />}
      {view === 'stats' && <StatsView />}
      {view === 'all' && <AllHabitsView />}

      {/* Empty State */}
      {habits.length === 0 && !showCreateForm && (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No habits yet</h3>
            <p className="text-muted-foreground mb-6">
              Start building better habits by creating your first one!
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Habit
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}