import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Play, X, Loader2, CheckCircle2, AlertCircle, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type Run = {
  id: string;
  goal: string;
  plan: { title?: string; starting_url?: string; steps?: string[] };
  status: string;
  paused_reason: string | null;
  error: string | null;
  step_count: number;
  current_url: string | null;
  updated_at: string;
};

export function AgentPanel() {
  const [goal, setGoal] = useState('');
  const [planning, setPlanning] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from('alice_agent_runs')
      .select('id, goal, plan, status, paused_reason, error, step_count, current_url, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20);
    setRuns((data as Run[]) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('alice_agent_runs_panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alice_agent_runs' }, () => load())
      .subscribe();
    const i = setInterval(load, 4000);
    return () => { supabase.removeChannel(ch); clearInterval(i); };
  }, []);

  const plan = async () => {
    if (!goal.trim()) return;
    setPlanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('alice-plan-task', { body: { goal: goal.trim() } });
      if (error) throw error;
      toast.success('Plan ready — review and approve below');
      setGoal('');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not plan task');
    } finally {
      setPlanning(false);
    }
  };

  const approve = async (id: string) => {
    const { error } = await supabase.from('alice_agent_runs').update({ status: 'running' }).eq('id', id);
    if (error) toast.error(error.message);
    else toast.success('Approved — install the extension and open the target page if needed');
  };

  const cancel = async (id: string) => {
    await supabase.from('alice_agent_runs').update({ status: 'cancelled' }).eq('id', id);
  };

  const resume = async (id: string) => {
    await supabase.from('alice_agent_runs').update({ status: 'running', paused_reason: null }).eq('id', id);
    toast.success('Resuming — switch back to the tab if needed');
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string; Icon: any }> = {
      awaiting_approval: { label: 'Awaiting approval', cls: 'text-yellow-400 bg-yellow-500/10', Icon: AlertCircle },
      running: { label: 'Running', cls: 'text-violet-300 bg-violet-500/15', Icon: Loader2 },
      paused_for_user: { label: 'Paused for you', cls: 'text-blue-300 bg-blue-500/15', Icon: Pause },
      succeeded: { label: 'Done', cls: 'text-emerald-300 bg-emerald-500/15', Icon: CheckCircle2 },
      failed: { label: 'Failed', cls: 'text-rose-300 bg-rose-500/15', Icon: AlertCircle },
      cancelled: { label: 'Cancelled', cls: 'text-muted-foreground bg-muted/30', Icon: X },
    };
    const m = map[s] || map.failed;
    const Icon = m.Icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${m.cls}`}>
        <Icon className={`h-3 w-3 ${s === 'running' ? 'animate-spin' : ''}`} />
        {m.label}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-semibold">Tell ALICE a goal</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          She'll research it, draft a plan for you to approve, then click & type her way through it in your browser.
          She always pauses for passwords.
        </p>
        <Textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Set up OAuth for my Notion workspace, or — Find and star the 5 latest React repos on GitHub"
          className="text-sm min-h-[80px]"
        />
        <Button onClick={plan} disabled={planning || !goal.trim()} size="sm" className="w-full">
          {planning ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Planning…</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Plan this task</>}
        </Button>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Recent runs</h4>
        {runs.length === 0 && <p className="text-xs text-muted-foreground italic">No runs yet.</p>}
        {runs.map((r) => (
          <div key={r.id} className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-medium leading-tight">{r.plan?.title || r.goal}</div>
              {statusBadge(r.status)}
            </div>
            {r.plan?.steps?.length ? (
              <ol className="text-xs text-muted-foreground space-y-0.5 pl-4 list-decimal">
                {r.plan.steps.slice(0, 6).map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            ) : null}
            {r.status === 'running' && <p className="text-[11px] text-violet-300">Step {r.step_count} · {r.current_url ? new URL(r.current_url).hostname : '…'}</p>}
            {r.status === 'paused_for_user' && <p className="text-[11px] text-blue-300">⏸ {r.paused_reason}</p>}
            {r.status === 'failed' && <p className="text-[11px] text-rose-300">{r.error}</p>}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}</span>
              <div className="flex gap-1">
                {r.status === 'awaiting_approval' && (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => cancel(r.id)}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs" onClick={() => approve(r.id)}><Play className="h-3 w-3 mr-1" /> Approve & run</Button>
                  </>
                )}
                {r.status === 'paused_for_user' && (
                  <Button size="sm" className="h-7 text-xs" onClick={() => resume(r.id)}><Play className="h-3 w-3 mr-1" /> Resume</Button>
                )}
                {r.status === 'running' && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => cancel(r.id)}>Stop</Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
