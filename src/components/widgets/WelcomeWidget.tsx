import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Plus, Calendar, X, FileText, CheckSquare, Clock, Timer, ChevronDown, ChevronUp } from "lucide-react";
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

interface CommandData {
  latestWork: { id: string; title: string; type: 'note' | 'card' } | null;
  nextTask: { id: string; name: string; priority: string } | null;
  nextEvent: { id: string; title: string; time: string | null } | null;
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
  const [showActions, setShowActions] = useState(false);
  const [commandData, setCommandData] = useState<CommandData>({ latestWork: null, nextTask: null, nextEvent: null });

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';

  const fetchCommandData = useCallback(async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');

    const [notesRes, cardsRes, tasksRes, eventsRes] = await Promise.all([
      supabase.from('notes').select('id, title, updated_at').eq('user_id', user.id)
        .is('deleted_at', null).order('updated_at', { ascending: false }).limit(1),
      supabase.from('zettel_cards').select('id, title, updated_at').eq('user_id', user.id)
        .order('updated_at', { ascending: false }).limit(1),
      supabase.from('project_tasks').select('id, name, priority').eq('user_id', user.id)
        .neq('status', 'done').is('parent_task_id', null)
        .order('due_date').order('priority', { ascending: false }).limit(1),
      supabase.from('calendar_events').select('id, title, event_time').eq('user_id', user.id)
        .gte('event_date', today).order('event_date').order('event_time').limit(1),
    ]);

    const note = notesRes.data?.[0];
    const card = cardsRes.data?.[0];
    let latestWork: CommandData['latestWork'] = null;
    if (note && card) {
      latestWork = new Date(note.updated_at) > new Date(card.updated_at)
        ? { id: note.id, title: note.title, type: 'note' }
        : { id: card.id, title: card.title, type: 'card' };
    } else if (note) {
      latestWork = { id: note.id, title: note.title, type: 'note' };
    } else if (card) {
      latestWork = { id: card.id, title: card.title, type: 'card' };
    }

    setCommandData({
      latestWork,
      nextTask: tasksRes.data?.[0] ? { id: tasksRes.data[0].id, name: tasksRes.data[0].name, priority: tasksRes.data[0].priority } : null,
      nextEvent: eventsRes.data?.[0] ? { id: eventsRes.data[0].id, title: eventsRes.data[0].title, time: eventsRes.data[0].event_time } : null,
    });
  }, [user]);

  useEffect(() => { fetchCommandData(); }, [fetchCommandData]);

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
    fetchCommandData();
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
    fetchCommandData();
    close();
  };

  const completeTask = async () => {
    if (!commandData.nextTask) return;
    const { error } = await supabase.from('project_tasks').update({ status: 'done' }).eq('id', commandData.nextTask.id);
    if (error) { toast.error('Failed'); return; }
    toast.success('Task completed');
    fetchCommandData();
  };

  const formatTime = (t: string | null) => {
    if (!t) return null;
    try { return format(new Date(`2000-01-01T${t}`), 'h:mm a'); } catch { return t; }
  };

  const hasCommandData = commandData.latestWork || commandData.nextTask || commandData.nextEvent;

  return (
    <div className="hero-banner p-4 md:p-5">
      <div className="relative z-10 space-y-3">
        {/* Greeting line */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-foreground tracking-tight">
              {getGreeting()}{displayName ? `, ${displayName}` : ''}
            </h1>
            <p className="text-xs text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
          <StatsWidget onNavigate={onNavigate} />
        </div>

        {/* Command Row — 3 smart action cards */}
        {hasCommandData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Continue Writing */}
            <button
              onClick={() => {
                if (commandData.latestWork) {
                  onNavigate?.(commandData.latestWork.type === 'note' ? 'notes' : 'cards');
                }
              }}
              className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-card/60 hover:bg-accent/60 transition-colors text-left group"
              disabled={!commandData.latestWork}
            >
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Resume</p>
                <p className="text-xs text-foreground truncate mt-0.5">
                  {commandData.latestWork?.title || 'No recent work'}
                </p>
              </div>
            </button>

            {/* Next Task */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-card/60 text-left">
              <CheckSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Next Task</p>
                {commandData.nextTask ? (
                  <div className="mt-0.5">
                    <p className="text-xs text-foreground truncate">{commandData.nextTask.name}</p>
                    <div className="flex gap-1 mt-1.5">
                      <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={completeTask}>
                        ✓ Done
                      </Button>
                      <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] gap-0.5" onClick={() => onNavigate?.('tasks')}>
                        <Timer className="h-2.5 w-2.5" /> Focus
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">All tasks done!</p>
                )}
              </div>
            </div>

            {/* Upcoming Event */}
            <button
              onClick={() => onNavigate?.('calendar')}
              className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-card/60 hover:bg-accent/60 transition-colors text-left"
            >
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Upcoming</p>
                {commandData.nextEvent ? (
                  <div className="mt-0.5">
                    <p className="text-xs text-foreground truncate">{commandData.nextEvent.title}</p>
                    {commandData.nextEvent.time && (
                      <p className="text-[10px] text-muted-foreground">{formatTime(commandData.nextEvent.time)}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">No upcoming events</p>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Collapsible quick-add row */}
        {mode === null && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1"
              onClick={() => setShowActions(!showActions)}
            >
              <Plus className="h-3 w-3" />
              {showActions ? 'Close' : 'Quick Add'}
              {showActions ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            </Button>
            {showActions && (
              <div className="flex gap-1.5 animate-in fade-in slide-in-from-left-2 duration-200">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => { setMode('capture'); setShowActions(false); }}>
                  <Send className="h-3 w-3" /> Capture
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => { setMode('task'); setShowActions(false); }}>
                  <CheckSquare className="h-3 w-3" /> Task
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => { setMode('event'); setShowActions(false); }}>
                  <Calendar className="h-3 w-3" /> Event
                </Button>
              </div>
            )}
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
