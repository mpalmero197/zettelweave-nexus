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
  const [deltas, setDeltas] = useState({ cards: 0, notes: 0 });

  useEffect(() => {
    if (user) fetchStats();
  }, [user, cards]);

  const fetchStats = async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [notesData, notebooksData, eventsData, recentNotes, recentCards] = await Promise.all([
        supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null),
        supabase.from('notebooks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('calendar_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('event_date', today),
        supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null).gte('created_at', weekAgo),
        supabase.from('zettel_cards').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', weekAgo),
      ]);

      setStats({
        notes: notesData.count || 0,
        notebooks: notebooksData.count || 0,
        events: eventsData.count || 0
      });
      setDeltas({
        cards: recentCards.count || 0,
        notes: recentNotes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const items = [
    { label: 'Cards', value: cards.length, delta: deltas.cards, icon: Brain, tab: 'cards' },
    { label: 'Notes', value: stats.notes, delta: deltas.notes, icon: FileText, tab: 'notes' },
    { label: 'Notebooks', value: stats.notebooks, icon: BookOpen, tab: 'notebooks' },
    { label: 'Events', value: stats.events, icon: Calendar, tab: 'calendar' },
  ];

  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Quick stats">
      {items.map((stat) => (
        <button
          key={stat.label}
          onClick={() => onNavigate?.(stat.tab)}
          className="stat-pill"
          aria-label={`${stat.value} ${stat.label}`}
        >
          <stat.icon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          <span className="font-semibold text-foreground tabular-nums">{stat.value}</span>
          <span className="text-muted-foreground">{stat.label}</span>
          {'delta' in stat && stat.delta > 0 && (
            <span className="text-[10px] text-muted-foreground/70">+{stat.delta} 7d</span>
          )}
        </button>
      ))}
    </nav>
  );
}
