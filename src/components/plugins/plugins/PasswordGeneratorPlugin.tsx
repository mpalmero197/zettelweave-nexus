import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Copy, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export function PasswordGeneratorPlugin({ onClose }: PluginProps) {
  const [length, setLength] = useState(16);
  const [sets, setSets] = useState({ uppercase: true, lowercase: true, numbers: true, symbols: true });
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    let pool = '';
    if (sets.uppercase) pool += CHARSETS.uppercase;
    if (sets.lowercase) pool += CHARSETS.lowercase;
    if (sets.numbers) pool += CHARSETS.numbers;
    if (sets.symbols) pool += CHARSETS.symbols;
    if (!pool) { toast.error('Select at least one character set'); return; }
    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    setPassword(Array.from(arr, v => pool[v % pool.length]).join(''));
  }, [length, sets]);

  const copy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true); toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const poolSize = Object.entries(sets).reduce((s, [k, v]) => s + (v ? CHARSETS[k as keyof typeof CHARSETS].length : 0), 0);
  const entropy = poolSize > 0 ? Math.round(length * Math.log2(poolSize)) : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">Length: {length}</span>
          <Badge variant="secondary">{entropy} bits entropy</Badge>
        </div>
        <input type="range" min={4} max={64} value={length} onChange={e => setLength(+e.target.value)}
          className="w-full accent-primary" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(sets).map(([key, val]) => (
          <Button key={key} size="sm" variant={val ? 'default' : 'outline'}
            onClick={() => setSets(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
            className="text-xs capitalize">{key}</Button>
        ))}
      </div>

      <Button onClick={generate} className="w-full"><RefreshCw className="h-4 w-4 mr-1" />Generate</Button>

      {password && (
        <div className="flex gap-2">
          <Input value={password} readOnly className="font-mono text-sm flex-1" />
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
