import { FileText, ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface Note {
  id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

interface RecentNotesWidgetProps {
  onOpenNote?: (note: Note) => void;
  onNavigate?: (tab: string) => void;
}

export function RecentNotesWidget({ onOpenNote, onNavigate }: RecentNotesWidgetProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    if (!user) return;
    try {
      const [{ data }, { count }] = await Promise.all([
        supabase.from('notes').select('*').eq('user_id', user.id).is('deleted_at', null).order('updated_at', { ascending: false }).limit(4),
        supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null),
      ]);
      setNotes(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: false });
  const remaining = Math.max(0, total - 4);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-header-left">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-medium text-foreground">Recent Notes</h3>
        </div>
        {onNavigate && (
          <button className="widget-header-link" onClick={() => onNavigate('notes')}>
            View all →
          </button>
        )}
      </div>
      <div className="widget-body">
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted/50 rounded-md animate-pulse" />
            ))}
          </div>
        ) : notes.length > 0 ? (
          notes.map((note) => (
            <button
              key={note.id}
              className="w-full flex items-center justify-between p-2 hover:bg-accent/50 rounded-md transition-colors text-left group"
              onClick={() => onOpenNote?.(note)}
              aria-label={`Open note: ${note.title}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{note.title}</p>
                <p className="text-[11px] text-muted-foreground">{timeAgo(note.updated_at)} ago</p>
              </div>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" aria-hidden="true" />
            </button>
          ))
        ) : (
          <p className="text-xs text-muted-foreground py-6 text-center">No notes yet</p>
        )}
      </div>
      {remaining > 0 && (
        <div className="widget-footer">{remaining} more note{remaining !== 1 ? 's' : ''}</div>
      )}
    </div>
  );
}
