import { useState, useEffect } from 'react';
import { useFocusState } from '@/components/focus-sidebar/useFocusState';
import { FocusTaskList } from '@/components/focus-sidebar/FocusTaskList';
import { useZettelCards } from '@/hooks/useZettelCards';
import { FocusReadingView } from '@/components/focus-sidebar/FocusReadingView';
import { ZettelCard } from '@/types/zettel';
import { ListTodo } from 'lucide-react';

export function TasksPanel() {
  const { tasks, setTasks, activeTaskId, setActiveTaskId } = useFocusState();
  const { cards } = useZettelCards();
  const [notes, setNotes] = useState<any[]>([]);
  const [readingCard, setReadingCard] = useState<ZettelCard | null>(null);
  const [readingNote, setReadingNote] = useState<any>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('notes')
          .select('id, title, content, tags')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(50);
        if (data) setNotes(data);
      } catch {}
    };
    fetchNotes();
  }, []);

  const remaining = tasks.filter(t => !t.completed).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
        <ListTodo className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">Tasks</span>
        {remaining > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground">{remaining} remaining</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 relative">
        {(readingCard || readingNote) && (
          <FocusReadingView card={readingCard} note={readingNote} onClose={() => { setReadingCard(null); setReadingNote(null); }} />
        )}
        <FocusTaskList
          tasks={tasks}
          onTasksChange={setTasks}
          activeTaskId={activeTaskId}
          onSetActiveTask={setActiveTaskId}
          cards={cards}
          notes={notes}
          onViewCard={setReadingCard}
          onViewNote={setReadingNote}
        />
      </div>
    </div>
  );
}
