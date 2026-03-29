import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

type Algo = 'SHA-256' | 'SHA-512' | 'SHA-1';

async function computeHash(text: string, algo: Algo): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest(algo, data);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function HashGeneratorPlugin({ onClose }: PluginProps) {
  const [input, setInput] = useState('');
  const [algo, setAlgo] = useState<Algo>('SHA-256');
  const [hash, setHash] = useState('');

  const generate = async () => {
    if (!input) return;
    const h = await computeHash(input, algo);
    setHash(h);
  };

  const copy = () => { navigator.clipboard.writeText(hash); toast.success('Copied!'); };

  return (
    <div className="space-y-3">
      <Textarea placeholder="Enter text to hash..." value={input} onChange={e => setInput(e.target.value)} rows={4} />

      <div className="flex gap-1.5">
        {(['SHA-256', 'SHA-512', 'SHA-1'] as Algo[]).map(a => (
          <Button key={a} size="sm" variant={algo === a ? 'default' : 'outline'} onClick={() => setAlgo(a)}
            className="text-xs flex-1">{a}</Button>
        ))}
      </div>

      <Button onClick={generate} className="w-full" size="sm">Generate Hash</Button>

      {hash && (
        <div className="flex gap-2">
          <Input value={hash} readOnly className="font-mono text-[10px] flex-1" />
          <Button size="sm" variant="outline" onClick={copy}><Copy className="h-3 w-3" /></Button>
        </div>
      )}
    </div>
  );
}
