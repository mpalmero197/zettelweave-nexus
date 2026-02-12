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
    <nav className="flex flex-wrap gap-2" aria-label="Quick stats">
      {items.map((stat) => (
        <button
          key={stat.label}
          onClick={() => onNavigate?.(stat.tab)}
          className="stat-pill"
          aria-label={`${stat.value} ${stat.label} — click to view`}
        >
          <stat.icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="font-semibold text-foreground tabular-nums">{stat.value}</span>
          <span className="text-muted-foreground">{stat.label}</span>
        </button>
      ))}
    </nav>
  );
}
