import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Flame, Trophy, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CatalystWritingGoalsProps {
  documentId: string | null;
  currentWordCount: number;
}

export function CatalystWritingGoals({ documentId, currentWordCount }: CatalystWritingGoalsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dailyTarget, setDailyTarget] = useState(500);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('500');
  const [streak, setStreak] = useState(0);
  const [todayWords, setTodayWords] = useState(0);
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Load writing goal from DB
  useEffect(() => {
    if (!user || !documentId) return;
    
    const loadGoal = async () => {
      const { data } = await supabase
        .from('catalyst_writing_goals')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', user.id)
        .is('chapter_id', null)
        .maybeSingle();
      
      if (data) {
        setDailyTarget(data.target_words);
        setTargetInput(String(data.target_words));
      }
    };
    loadGoal();
  }, [user, documentId]);

  // Track today's words from localStorage
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `catalyst-daily-words`;
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    
    if (!stored[today]) {
      stored[today] = { start: currentWordCount, current: currentWordCount };
    } else {
      stored[today].current = currentWordCount;
    }
    
    localStorage.setItem(key, JSON.stringify(stored));
    setTodayWords(Math.max(0, stored[today].current - stored[today].start));

    // Calculate streak
    let currentStreak = 0;
    const dates = Object.keys(stored).sort().reverse();
    for (let i = 0; i < dates.length; i++) {
      const d = stored[dates[i]];
      const wordsWritten = Math.max(0, d.current - d.start);
      if (wordsWritten >= dailyTarget) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }
    setStreak(currentStreak);

    // Weekly data
    const weekly: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().slice(0, 10);
      const entry = stored[dateKey];
      weekly.push(entry ? Math.max(0, entry.current - entry.start) : 0);
    }
    setWeeklyData(weekly);
  }, [currentWordCount, dailyTarget]);

  const handleSaveTarget = async () => {
    const target = parseInt(targetInput) || 500;
    setDailyTarget(target);
    setEditingTarget(false);

    if (!user || !documentId) return;
    
    const { data: existing } = await supabase
      .from('catalyst_writing_goals')
      .select('id')
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .is('chapter_id', null)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('catalyst_writing_goals')
        .update({ target_words: target })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('catalyst_writing_goals')
        .insert({ document_id: documentId, user_id: user.id, target_words: target });
    }
  };

  const progress = Math.min(100, Math.round((todayWords / dailyTarget) * 100));
  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const maxWeekly = Math.max(...weeklyData, dailyTarget);

  return (
    <div className="space-y-4">
      {/* Daily Target */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Daily Goal</span>
          </div>
          {!editingTarget ? (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditingTarget(true)}>
              {dailyTarget} words
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Input
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="h-6 w-20 text-xs"
                type="number"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTarget()}
              />
              <Button size="sm" className="h-6 text-xs px-2" onClick={handleSaveTarget}>Set</Button>
            </div>
          )}
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{todayWords.toLocaleString()} / {dailyTarget.toLocaleString()}</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
        <div className="flex items-center gap-1.5">
          <Flame className={`h-5 w-5 ${streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
          <span className="text-lg font-bold">{streak}</span>
        </div>
        <div>
          <p className="text-sm font-medium">Day Streak</p>
          <p className="text-xs text-muted-foreground">
            {streak > 0 ? `${streak} consecutive days hitting your target!` : 'Hit your daily target to start a streak'}
          </p>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">This Week</span>
        </div>
        <div className="flex items-end gap-1 h-16">
          {weeklyData.map((words, i) => {
            const height = maxWeekly > 0 ? Math.max(4, (words / maxWeekly) * 100) : 4;
            const hitTarget = words >= dailyTarget;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm transition-all ${hitTarget ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                  style={{ height: `${height}%` }}
                  title={`${words} words`}
                />
                <span className="text-[10px] text-muted-foreground">{dayNames[(new Date().getDay() + i - 6 + 7) % 7]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
