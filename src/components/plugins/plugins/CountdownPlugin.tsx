import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Bell } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

interface Countdown { id: string; name: string; target: string; }
const STORAGE_KEY = 'pendragon-countdowns';

function TimeLeft({ target }: { target: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return <span className="text-primary font-bold text-sm">🎉 Reached!</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return <span className="font-mono text-sm font-bold text-primary">{d}d {h}h {m}m {s}s</span>;
}

export function CountdownPlugin({ onClose }: PluginProps) {
  const [countdowns, setCountdowns] = useState<Countdown[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(countdowns)); }, [countdowns]);

  const add = () => {
    if (!name.trim() || !date) return;
    setCountdowns(p => [...p, { id: crypto.randomUUID(), name: name.trim(), target: date }]);
    setName(''); setDate(''); toast.success('Countdown added!');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input placeholder="Event name..." value={name} onChange={e => setName(e.target.value)} />
        <div className="flex gap-2">
          <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="flex-1" />
          <Button onClick={add} size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
      </div>

      {countdowns.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No countdowns yet.</p>}

      {countdowns.map(c => (
        <div key={c.id} className="flex items-center justify-between border border-border rounded-lg p-3">
          <div>
            <div className="text-sm font-medium">{c.name}</div>
            <TimeLeft target={c.target} />
          </div>
          <Button size="sm" variant="ghost" onClick={() => setCountdowns(p => p.filter(x => x.id !== c.id))}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
}
