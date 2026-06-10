import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Play, Trash2, Pencil, Check, X, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type Macro = {
  id: string;
  name: string;
  description: string | null;
  start_url: string | null;
  steps: any;
  enabled: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  run_count: number;
};

export function MacrosPanel() {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [runningId, setRunningId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('alice_macros')
      .select('id, name, description, start_url, steps, enabled, last_run_at, last_run_status, run_count')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) toast.error('Failed to load macros');
    else setMacros((data as Macro[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('alice_macros_panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alice_macros' }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alice_macro_runs' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const rename = async (id: string) => {
    const name = editName.trim();
    if (!name) { setEditingId(null); return; }
    const { error } = await supabase.from('alice_macros').update({ name }).eq('id', id);
    if (error) toast.error('Rename failed');
    else toast.success('Renamed');
    setEditingId(null);
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete macro "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('alice_macros').delete().eq('id', id);
    if (error) toast.error('Delete failed');
    else toast.success('Deleted');
  };

  const run = async (m: Macro) => {
    setRunningId(m.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRunningId(null); return; }
    const stepCount = Array.isArray(m.steps) ? m.steps.length : 0;
    const { error } = await supabase.from('alice_macro_runs').insert({
      user_id: user.id,
      macro_id: m.id,
      status: 'pending',
      current_step: 0,
      total_steps: stepCount,
      initiated_by: 'user',
    });
    setRunningId(null);
    if (error) toast.error('Failed to queue run');
    else toast.success('Run queued — the extension will pick it up shortly');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
        <Bot className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">Macros</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {macros.length} saved
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : macros.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8 px-2 space-y-2">
            <p>No macros yet.</p>
            <p className="text-[11px] leading-relaxed">
              Install the Pendragon browser extension, right-click any page and pick
              <span className="font-medium"> "Teach ALICE this task"</span> to record one.
            </p>
          </div>
        ) : (
          macros.map((m) => {
            const stepCount = Array.isArray(m.steps) ? m.steps.length : 0;
            return (
              <div
                key={m.id}
                className="group rounded-lg border border-border/60 bg-card/50 hover:bg-card transition-colors p-2.5 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {editingId === m.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') rename(m.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="h-7 text-xs"
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => rename(m.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-medium truncate">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span>{stepCount} step{stepCount === 1 ? '' : 's'}</span>
                          {m.run_count > 0 && (
                            <>
                              <span>·</span>
                              <span>{m.run_count} run{m.run_count === 1 ? '' : 's'}</span>
                            </>
                          )}
                          {m.last_run_at && (
                            <>
                              <span>·</span>
                              <span title={m.last_run_at}>
                                {formatDistanceToNow(new Date(m.last_run_at), { addSuffix: true })}
                              </span>
                            </>
                          )}
                          {m.last_run_status && (
                            <span
                              className={
                                m.last_run_status === 'completed'
                                  ? 'text-emerald-500'
                                  : m.last_run_status === 'failed'
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                              }
                            >
                              · {m.last_run_status}
                            </span>
                          )}
                        </div>
                        {m.start_url && (
                          <a
                            href={m.start_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-0.5 truncate max-w-full"
                          >
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{new URL(m.start_url).hostname}</span>
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {editingId !== m.id && (
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 px-2.5 text-[11px] flex-1"
                      disabled={runningId === m.id || stepCount === 0}
                      onClick={() => run(m)}
                    >
                      {runningId === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      Run
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => { setEditingId(m.id); setEditName(m.name); }}
                      aria-label="Rename"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(m.id, m.name)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
