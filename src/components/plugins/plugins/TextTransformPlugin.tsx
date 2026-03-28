import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

const transforms = [
  { id: 'upper', label: 'UPPERCASE', fn: (t: string) => t.toUpperCase() },
  { id: 'lower', label: 'lowercase', fn: (t: string) => t.toLowerCase() },
  { id: 'title', label: 'Title Case', fn: (t: string) => t.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) },
  { id: 'sentence', label: 'Sentence case', fn: (t: string) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() },
  { id: 'reverse', label: 'esreveR', fn: (t: string) => t.split('').reverse().join('') },
  { id: 'slug', label: 'slug-case', fn: (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') },
  { id: 'camel', label: 'camelCase', fn: (t: string) => t.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase()) },
  { id: 'snake', label: 'snake_case', fn: (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') },
  { id: 'dedup', label: 'Remove Duplicates', fn: (t: string) => [...new Set(t.split('\n'))].join('\n') },
  { id: 'sort', label: 'Sort Lines', fn: (t: string) => t.split('\n').sort((a, b) => a.localeCompare(b)).join('\n') },
  { id: 'trim', label: 'Trim Lines', fn: (t: string) => t.split('\n').map(l => l.trim()).join('\n') },
  { id: 'noEmpty', label: 'Remove Empty Lines', fn: (t: string) => t.split('\n').filter(l => l.trim()).join('\n') },
];

export function TextTransformPlugin({}: PluginProps) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const apply = (fn: (t: string) => string) => {
    setOutput(fn(input));
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Paste or type text here..."
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={5}
        className="resize-none"
      />
      
      <div className="flex flex-wrap gap-1.5">
        {transforms.map(t => (
          <Button key={t.id} size="sm" variant="outline" onClick={() => apply(t.fn)} className="text-xs h-7">
            {t.label}
          </Button>
        ))}
      </div>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Result</span>
            <Button size="sm" variant="ghost" onClick={copyOutput} className="h-6 text-xs gap-1">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <Textarea value={output} readOnly rows={5} className="resize-none bg-muted/30" />
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            <span>{output.length} chars</span>
            <span>{output.split(/\s+/).filter(Boolean).length} words</span>
            <span>{output.split('\n').length} lines</span>
          </div>
        </div>
      )}
    </div>
  );
}
