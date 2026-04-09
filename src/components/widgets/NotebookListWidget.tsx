import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Notebook {
  id: string;
  name: string;
  description?: string;
  color: string;
  note_count?: number;
}

interface NotebookListWidgetProps {
  onNavigate?: (tab: string) => void;
}

export function NotebookListWidget({ onNavigate }: NotebookListWidgetProps = {}) {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchNotebooks();
  }, [user]);

  const fetchNotebooks = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('notebooks')
        .select('id, name, description, color')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
        .limit(5);

      const withCounts = await Promise.all(
        (data || []).map(async (nb) => {
          const { count } = await supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('notebook_id', nb.id);
          return { ...nb, note_count: count || 0 };
        })
      );
      setNotebooks(withCounts);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-header-left">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-medium text-foreground">Notebooks</h3>
        </div>
        {onNavigate && (
          <button className="widget-header-link" onClick={() => onNavigate('notebooks')}>
            View all →
          </button>
        )}
      </div>
      <div className="widget-body">
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted/50 rounded-md animate-pulse" />)}
          </div>
        ) : notebooks.length > 0 ? (
          notebooks.map((nb) => (
            <button
              key={nb.id}
              className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-accent/50 transition-colors text-left"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-notebook', { detail: nb.id }));
                onNavigate?.('notebooks');
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: nb.color }} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{nb.name}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">{nb.note_count}</Badge>
            </button>
          ))
        ) : (
          <p className="text-xs text-muted-foreground py-6 text-center">No notebooks yet</p>
        )}
      </div>
    </div>
  );
}
