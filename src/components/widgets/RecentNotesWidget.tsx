import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Star } from "lucide-react";
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
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const fetchNotes = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
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
    <div className="relative h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl blur-xl opacity-50" />
      <Card className="relative h-full bg-card/70 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            Recent Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-3 overflow-y-auto max-h-80">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse p-4 bg-muted/20 rounded-xl">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : notes.length > 0 ? (
            notes.map((note) => (
              <div 
                key={note.id} 
                className="group flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 rounded-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => onOpenNote?.(note)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onOpenNote?.(note)}
                aria-label={`Open note: ${note.title}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm group-hover:text-blue-600 transition-colors truncate">{note.title}</p>
                  <p className="text-xs text-muted-foreground">{getTimeAgo(note.updated_at)}</p>
                </div>
                {note.is_favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">No notes yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}