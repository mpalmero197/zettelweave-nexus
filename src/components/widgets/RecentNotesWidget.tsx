import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Star, ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isYesterday } from "date-fns";

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
}

export function RecentNotesWidget({ onOpenNote }: RecentNotesWidgetProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(5);
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          Recent Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5 overflow-y-auto max-h-72">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        ) : notes.length > 0 ? (
          notes.map((note) => (
            <button
              key={note.id}
              className="w-full flex items-center justify-between p-2.5 hover:bg-accent/50 rounded-md transition-colors text-left group"
              onClick={() => onOpenNote?.(note)}
              aria-label={`Open note: ${note.title}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{note.title}</p>
                <p className="text-xs text-muted-foreground">{getTimeAgo(note.updated_at)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {note.is_favorite && <Star className="h-3 w-3 text-foreground fill-foreground" aria-label="Favorited" />}
                <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8">
            <FileText className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
