import { useState, useEffect } from 'react';
import { Brain, FileText, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface WorkItem {
  id: string;
  title: string;
  type: 'card' | 'note';
  updatedAt: string;
}

interface RecentWorkWidgetProps {
  onEdit?: (item: any) => void;
  onOpenNote?: (note: any) => void;
  onNavigate?: (tab: string) => void;
}

export function RecentWorkWidget({ onEdit, onOpenNote, onNavigate }: RecentWorkWidgetProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchRecentWork();
  }, [user]);

  const fetchRecentWork = async () => {
    if (!user) return;
    try {
      const [cardsRes, notesRes] = await Promise.all([
        supabase.from('zettel_cards').select('id, title, updated_at').eq('user_id', user.id)
          .order('updated_at', { ascending: false }).limit(5),
        supabase.from('notes').select('id, title, updated_at').eq('user_id', user.id)
          .is('deleted_at', null).order('updated_at', { ascending: false }).limit(5),
      ]);

      const cards: WorkItem[] = (cardsRes.data || []).map(c => ({
        id: c.id, title: c.title, type: 'card', updatedAt: c.updated_at,
      }));
      const notes: WorkItem[] = (notesRes.data || []).map(n => ({
        id: n.id, title: n.title, type: 'note', updatedAt: n.updated_at,
      }));

      const merged = [...cards, ...notes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

      setItems(merged);
      setTotalCount(cards.length + notes.length);
    } catch (error) {
      console.error('Error fetching recent work:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (item: WorkItem) => {
    if (item.type === 'card') {
      onEdit?.({ id: item.id });
      onNavigate?.('cards');
    } else {
      onOpenNote?.({ id: item.id, title: item.title });
      onNavigate?.('notes');
    }
  };

  const relTime = (d: string) => {
    try { return formatDistanceToNow(parseISO(d), { addSuffix: false }); } catch { return ''; }
  };

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-header-left">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-medium text-foreground">Recent Work</h3>
        </div>
        {onNavigate && (
          <button className="widget-header-link" onClick={() => onNavigate('cards')}>
            View all →
          </button>
        )}
      </div>
      <div className="widget-body">
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-muted/50 rounded-md animate-pulse" />)}
          </div>
        ) : items.length > 0 ? (
          items.map(item => (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => handleClick(item)}
            >
              {item.type === 'card' ? (
                <Brain className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate text-foreground">{item.title}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{relTime(item.updatedAt)}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground py-6 text-center">No recent activity</p>
        )}
      </div>
      {totalCount > 5 && (
        <div className="widget-footer">{totalCount - 5} more items</div>
      )}
    </div>
  );
}
