import { Card, CardContent } from "@/components/ui/card";
import { Brain, FileText, BookOpen, Calendar } from "lucide-react";
import { useZettelCards } from "@/hooks/useZettelCards";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StatsWidgetProps {
  onNavigate?: (tab: string) => void;
}

export function StatsWidget({ onNavigate }: StatsWidgetProps = {}) {
  const { cards } = useZettelCards();
  const { user } = useAuth();
  const [stats, setStats] = useState({ notes: 0, notebooks: 0, events: 0 });

  useEffect(() => {
    if (user) fetchStats();
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
        notes: notesData.data?.length || 0,
        notebooks: notebooksData.data?.length || 0,
        events: eventsData.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const items = [
    { label: 'Cards', value: cards.length, icon: Brain, tab: 'cards' },
    { label: 'Notes', value: stats.notes, icon: FileText, tab: 'notes' },
    { label: 'Notebooks', value: stats.notebooks, icon: BookOpen, tab: 'notebooks' },
    { label: 'Events', value: stats.events, icon: Calendar, tab: 'calendar' },
  ];

  return (
    <Card className="h-full">
      <CardContent className="p-4 h-full">
        <div className="grid grid-cols-2 gap-3 h-full">
          {items.map((stat) => (
            <button
              key={stat.label}
              onClick={() => onNavigate?.(stat.tab)}
              className="text-left p-3 rounded-md border border-border hover:bg-accent/50 transition-colors"
              aria-label={`${stat.label}: ${stat.value}`}
            >
              <stat.icon className="h-4 w-4 text-muted-foreground mb-2" aria-hidden="true" />
              <p className="text-xl font-bold text-foreground tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
