import { Card, CardContent } from "@/components/ui/card";
import { Brain, FileText, BookOpen, Calendar } from "lucide-react";
import { useZettelCards } from "@/hooks/useZettelCards";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Stats {
  cards: number;
  notes: number;
  notebooks: number;
  todaysEvents: number;
}

export function StatsWidget() {
  const { cards } = useZettelCards();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    cards: 0,
    notes: 0,
    notebooks: 0,
    todaysEvents: 0
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, cards]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const [notesData, notebooksData, eventsData] = await Promise.all([
        supabase.from('notes').select('id').eq('user_id', user.id),
        supabase.from('notebooks').select('id').eq('user_id', user.id),
        supabase.from('calendar_events').select('id').eq('user_id', user.id).gte('event_date', new Date().toISOString().split('T')[0])
      ]);

      setStats({
        cards: cards.length,
        notes: notesData.data?.length || 0,
        notebooks: notebooksData.data?.length || 0,
        todaysEvents: eventsData.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const statItems = [
    { 
      label: 'Zettel Cards', 
      value: stats.cards, 
      icon: Brain, 
      color: 'primary',
      gradientFrom: 'primary/20',
      gradientTo: 'primary/10'
    },
    { 
      label: 'Notes', 
      value: stats.notes, 
      icon: FileText, 
      color: 'blue-600',
      gradientFrom: 'blue-500/20',
      gradientTo: 'blue-500/10'
    },
    { 
      label: 'Notebooks', 
      value: stats.notebooks, 
      icon: BookOpen, 
      color: 'green-600',
      gradientFrom: 'green-500/20',
      gradientTo: 'green-500/10'
    },
    { 
      label: "Today's Events", 
      value: stats.todaysEvents, 
      icon: Calendar, 
      color: 'orange-600',
      gradientFrom: 'orange-500/20',
      gradientTo: 'orange-500/10'
    }
  ];

  return (
    <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
      <CardContent className="p-6 h-full">
        <div className="grid grid-cols-2 gap-4 h-full">
          {statItems.map((stat, index) => (
            <div key={stat.label} className="group relative">
              <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color === 'primary' ? 'primary' : stat.color.split('-')[0] + '-500'}/10 to-transparent rounded-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500`} />
              <div className={`relative h-full p-4 rounded-xl border border-${stat.color === 'primary' ? 'primary' : stat.color.split('-')[0] + '-500'}/20 bg-background/50 backdrop-blur-sm transition-all duration-300 hover:border-${stat.color === 'primary' ? 'primary' : stat.color.split('-')[0] + '-500'}/40`}>
                <div className="flex items-center justify-between h-full">
                  <div className="space-y-2">
                    <div className={`p-2 bg-${stat.color === 'primary' ? 'primary' : stat.color.split('-')[0] + '-500'}/10 rounded-lg group-hover:scale-105 transition-transform duration-300 w-fit`}>
                      <stat.icon className={`h-5 w-5 text-${stat.color}`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold text-${stat.color}`}>{stat.value}</p>
                      <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}