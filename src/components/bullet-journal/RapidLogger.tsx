import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BulletType, Signifier, BulletEntry, BULLET_SYMBOLS, SIGNIFIER_MAP } from './types';
import { Plus, Star, Lightbulb, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RapidLoggerProps {
  onAdd: (entry: BulletEntry) => void;
  collection?: string;
}

export const RapidLogger: React.FC<RapidLoggerProps> = ({ onAdd, collection }) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<BulletType>('task');
  const [signifier, setSignifier] = useState<Signifier>(null);
  const [tagInput, setTagInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const text = content.trim();
    if (!text) return;

    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    const entry: BulletEntry = {
      id: crypto.randomUUID(),
      type,
      content: text,
      status: 'open',
      signifier,
      date: new Date().toISOString(),
      tags,
      collection,
    };
    onAdd(entry);
    setContent('');
    setTagInput('');
    setSignifier(null);
    inputRef.current?.focus();
    toast.success('Entry logged');
  };

  const types: { value: BulletType; symbol: string; label: string }[] = [
    { value: 'task', symbol: BULLET_SYMBOLS.task, label: 'Task' },
    { value: 'event', symbol: BULLET_SYMBOLS.event, label: 'Event' },
    { value: 'note', symbol: BULLET_SYMBOLS.note, label: 'Note' },
  ];

  const signifiers: { value: Signifier; icon: React.ElementType; label: string }[] = [
    { value: 'priority', icon: Star, label: 'Priority' },
    { value: 'inspiration', icon: Lightbulb, label: 'Inspiration' },
    { value: 'explore', icon: HelpCircle, label: 'Explore' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-3 space-y-2.5">
      {/* Main input */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-mono w-6 text-center text-muted-foreground select-none">
          {signifier ? SIGNIFIER_MAP[signifier].symbol : BULLET_SYMBOLS[type]}
        </span>
        <Input
          ref={inputRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Rapid log — type and press Enter…"
          className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-9 text-sm"
        />
        <Button size="sm" onClick={submit} disabled={!content.trim()} className="h-8 px-3 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">Log</span>
        </Button>
      </div>

      {/* Type + Signifier selectors */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Bullet type */}
        <div className="flex gap-1">
          {types.map(t => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                ${type === t.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              <span className="font-mono text-[11px]">{t.symbol}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Signifiers */}
        <div className="flex gap-1">
          {signifiers.map(s => {
            const Icon = s.icon;
            const active = signifier === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setSignifier(active ? null : s.value)}
                title={s.label}
                className={`p-1.5 rounded-md transition-all ${
                  active
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Tags */}
        <Input
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Tags…"
          className="flex-1 min-w-[100px] border-0 bg-transparent shadow-none focus-visible:ring-0 h-7 text-xs"
        />
      </div>
    </div>
  );
};
