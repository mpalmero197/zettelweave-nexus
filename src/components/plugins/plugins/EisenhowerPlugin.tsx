import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import type { PluginProps } from '../types';

type Quadrant = 'do' | 'schedule' | 'delegate' | 'eliminate';
interface Task { id: string; text: string; quadrant: Quadrant; }

const LABELS: Record<Quadrant, { title: string; color: string }> = {
  do: { title: '🔴 Do First', color: 'border-red-500/30 bg-red-500/5' },
  schedule: { title: '🟡 Schedule', color: 'border-yellow-500/30 bg-yellow-500/5' },
  delegate: { title: '🔵 Delegate', color: 'border-blue-500/30 bg-blue-500/5' },
  eliminate: { title: '⚫ Eliminate', color: 'border-muted bg-muted/30' },
};

export function EisenhowerPlugin({ onClose }: PluginProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [targetQ, setTargetQ] = useState<Quadrant>('do');

  const add = () => {
    if (!input.trim()) return;
    setTasks(p => [...p, { id: crypto.randomUUID(), text: input.trim(), quadrant: targetQ }]);
    setInput('');
  };

  const remove = (id: string) => setTasks(p => p.filter(t => t.id !== id));
  const move = (id: string, q: Quadrant) => setTasks(p => p.map(t => t.id === id ? { ...t, quadrant: q } : t));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Add task..." value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()} className="flex-1" />
        <select value={targetQ} onChange={e => setTargetQ(e.target.value as Quadrant)}
          className="border border-input rounded-md px-2 text-xs bg-background">
          {Object.entries(LABELS).map(([k, v]) => <option key={k} value={k}>{v.title}</option>)}
        </select>
        <Button onClick={add} size="sm"><Plus className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(LABELS) as Quadrant[]).map(q => (
          <div key={q} className={`border rounded-lg p-2 min-h-[120px] ${LABELS[q].color}`}>
            <div className="text-xs font-semibold mb-2">{LABELS[q].title}</div>
            <div className="space-y-1">
              {tasks.filter(t => t.quadrant === q).map(t => (
                <div key={t.id} className="flex items-center gap-1 text-xs bg-background/80 rounded px-2 py-1">
                  <span className="flex-1 truncate">{t.text}</span>
                  <select value={q} onChange={e => move(t.id, e.target.value as Quadrant)}
                    className="text-[10px] bg-transparent border-none p-0 w-16">
                    {(Object.keys(LABELS) as Quadrant[]).map(oq => <option key={oq} value={oq}>{LABELS[oq].title}</option>)}
                  </select>
                  <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
