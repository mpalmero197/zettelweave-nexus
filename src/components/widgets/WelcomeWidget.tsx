import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Plus, Calendar, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { StatsWidget } from "./StatsWidget";
import { format } from "date-fns";

interface WelcomeWidgetProps {
  onCreateCard?: (card: any) => void;
  onNavigate?: (tab: string) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type ActionMode = null | 'capture' | 'task' | 'event';

export function WelcomeWidget({ onCreateCard, onNavigate }: WelcomeWidgetProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<ActionMode>(null);
  const [captureText, setCaptureText] = useState("");
  const [taskText, setTaskText] = useState("");
  const [eventTitle, setEventTitle] = useState("");

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';

  const close = () => { setMode(null); setCaptureText(""); setTaskText(""); setEventTitle(""); };

  const handleCapture = () => {
    if (!captureText.trim()) return;
    const lines = captureText.split('\n');
    const title = lines[0]?.trim() || "Quick Note";
    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: title.length > 50 ? title.substring(0, 50) + "..." : title,
      content: captureText, description: "Created from quick capture",
      category: "000", number: "", tags: ["quick-capture"], linkedCards: []
    };
    if (onCreateCard) {
      onCreateCard(newCard);
      toast.success("Card created");
    } else {
      localStorage.setItem('quickCapture', captureText);
      toast.success("Note saved");
    }
    close();
  };

  const handleAddTask = async () => {
    if (!user || !taskText.trim()) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const { error } = await supabase.from('project_tasks').insert({
      user_id: user.id, name: taskText.trim(), priority: 'medium', status: 'todo', due_date: today,
    });
    if (error) { toast.error('Failed to add task'); return; }
    toast.success('Task added');
    close();
  };

  const handleAddEvent = async () => {
    if (!user || !eventTitle.trim()) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const { error } = await supabase.from('calendar_events').insert({
      user_id: user.id, title: eventTitle.trim(), event_date: today,
      source_type: 'manual', source_id: crypto.randomUUID(),
    });
    if (error) { toast.error('Failed to add event'); return; }
    toast.success('Event added');
    close();
  };

  return (
    <div className="hero-banner p-4 md:p-5">
      <div className="relative z-10 space-y-3">
        {/* Greeting + Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-foreground tracking-tight">
              {getGreeting()}{displayName ? `, ${displayName}` : ''}
            </h1>
            <p className="text-xs text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
          <StatsWidget onNavigate={onNavigate} />
        </div>

        {/* Quick Actions Bar */}
        {mode === null && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setMode('capture')}>
              <Send className="h-3 w-3" /> Capture
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setMode('task')}>
              <Plus className="h-3 w-3" /> New Task
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setMode('event')}>
              <Calendar className="h-3 w-3" /> New Event
            </Button>
          </div>
        )}

        {/* Capture Mode */}
        {mode === 'capture' && (
          <div className="space-y-1.5">
            <Textarea
              placeholder="What's on your mind? First line → title"
              value={captureText}
              onChange={e => setCaptureText(e.target.value)}
              className="resize-none border-border/50 bg-background/60 text-sm min-h-20"
              autoFocus
              aria-label="Quick capture"
            />
            <div className="flex items-center justify-end gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={close}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleCapture} disabled={!captureText.trim()}>
                <Send className="h-3 w-3" /> Capture
              </Button>
            </div>
          </div>
        )}

        {/* Task Mode */}
        {mode === 'task' && (
          <div className="flex gap-2">
            <Input
              value={taskText}
              onChange={e => setTaskText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') close(); }}
              placeholder="Task name…"
              className="text-sm h-8"
              autoFocus
              aria-label="New task name"
            />
            <Button size="sm" className="h-8 px-3 shrink-0" onClick={handleAddTask} disabled={!taskText.trim()}>Add</Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={close} aria-label="Cancel">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Event Mode */}
        {mode === 'event' && (
          <div className="flex gap-2">
            <Input
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddEvent(); if (e.key === 'Escape') close(); }}
              placeholder="Event title (today)…"
              className="text-sm h-8"
              autoFocus
              aria-label="New event title"
            />
            <Button size="sm" className="h-8 px-3 shrink-0" onClick={handleAddEvent} disabled={!eventTitle.trim()}>Add</Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={close} aria-label="Cancel">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
