import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

type Style = 'apa' | 'mla' | 'chicago' | 'harvard';

function format(s: Style, f: Record<string, string>): string {
  const { author, title, year, publisher, url } = f;
  const a = author || 'Unknown Author';
  const t = title || 'Untitled';
  const y = year || 'n.d.';
  const p = publisher || '';
  switch (s) {
    case 'apa': return `${a} (${y}). ${t}.${p ? ` ${p}.` : ''}${url ? ` ${url}` : ''}`;
    case 'mla': return `${a}. "${t}."${p ? ` ${p},` : ''} ${y}.${url ? ` ${url}.` : ''}`;
    case 'chicago': return `${a}. ${t}.${p ? ` ${p},` : ''} ${y}.${url ? ` ${url}.` : ''}`;
    case 'harvard': return `${a} (${y}) ${t}.${p ? ` ${p}.` : ''}${url ? ` Available at: ${url}.` : ''}`;
  }
}

export function CitationPlugin({ onClose }: PluginProps) {
  const [fields, setFields] = useState({ author: '', title: '', year: '', publisher: '', url: '' });
  const [style, setStyle] = useState<Style>('apa');
  const [copied, setCopied] = useState(false);

  const upd = (k: string, v: string) => setFields(p => ({ ...p, [k]: v }));
  const citation = format(style, fields);

  const copy = () => {
    navigator.clipboard.writeText(citation);
    setCopied(true); toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Author(s)" value={fields.author} onChange={e => upd('author', e.target.value)} />
        <Input placeholder="Year" value={fields.year} onChange={e => upd('year', e.target.value)} />
        <Input placeholder="Title" value={fields.title} onChange={e => upd('title', e.target.value)} className="col-span-2" />
        <Input placeholder="Publisher" value={fields.publisher} onChange={e => upd('publisher', e.target.value)} />
        <Input placeholder="URL" value={fields.url} onChange={e => upd('url', e.target.value)} />
      </div>

      <div className="flex gap-1.5">
        {(['apa', 'mla', 'chicago', 'harvard'] as Style[]).map(s => (
          <Button key={s} size="sm" variant={style === s ? 'default' : 'outline'} onClick={() => setStyle(s)}
            className="text-xs flex-1 uppercase">{s}</Button>
        ))}
      </div>

      <div className="bg-muted rounded-lg p-3 text-sm italic">{citation}</div>

      <Button onClick={copy} className="w-full" size="sm">
        {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
        {copied ? 'Copied' : 'Copy Citation'}
      </Button>
    </div>
  );
}
