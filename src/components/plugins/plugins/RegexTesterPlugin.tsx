import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

export function RegexTesterPlugin({}: PluginProps) {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('gi');
  const [testText, setTestText] = useState('');
  const [error, setError] = useState('');

  let regex: RegExp | null = null;
  let matches: RegExpMatchArray[] = [];

  try {
    if (pattern) {
      regex = new RegExp(pattern, flags);
      matches = [...testText.matchAll(new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'))];
      setError && error && setError('');
    }
  } catch (e: any) {
    if (!error) setError(e.message);
  }

  const highlighted = (() => {
    if (!regex || !testText || error) return testText;
    try {
      const globalRegex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
      let lastIndex = 0;
      const parts: { text: string; match: boolean }[] = [];
      for (const m of testText.matchAll(globalRegex)) {
        if (m.index !== undefined && m.index > lastIndex) {
          parts.push({ text: testText.slice(lastIndex, m.index), match: false });
        }
        parts.push({ text: m[0], match: true });
        lastIndex = (m.index || 0) + m[0].length;
      }
      if (lastIndex < testText.length) {
        parts.push({ text: testText.slice(lastIndex), match: false });
      }
      return parts;
    } catch {
      return testText;
    }
  })();

  const copyPattern = () => {
    navigator.clipboard.writeText(`/${pattern}/${flags}`);
    toast.success('Regex copied!');
  };

  const FLAG_OPTIONS = [
    { flag: 'g', label: 'Global' },
    { flag: 'i', label: 'Case-insensitive' },
    { flag: 'm', label: 'Multiline' },
    { flag: 's', label: 'Dotall' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <span className="text-muted-foreground font-mono">/</span>
        <Input
          placeholder="pattern"
          value={pattern}
          onChange={e => { setPattern(e.target.value); setError(''); }}
          className="font-mono text-sm"
        />
        <span className="text-muted-foreground font-mono">/</span>
        <Input
          value={flags}
          onChange={e => setFlags(e.target.value)}
          className="w-16 font-mono text-sm text-center"
        />
        <Button size="icon" variant="ghost" onClick={copyPattern} title="Copy regex">
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-1.5">
        {FLAG_OPTIONS.map(f => (
          <Button
            key={f.flag}
            size="sm"
            variant={flags.includes(f.flag) ? 'default' : 'outline'}
            onClick={() => setFlags(prev => prev.includes(f.flag) ? prev.replace(f.flag, '') : prev + f.flag)}
            className="h-6 text-[10px] px-2"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <Textarea
        placeholder="Enter test text..."
        value={testText}
        onChange={e => setTestText(e.target.value)}
        rows={5}
        className="resize-none font-mono text-sm"
      />

      {Array.isArray(highlighted) && highlighted.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-3 font-mono text-sm whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
          {highlighted.map((part, i) =>
            part.match
              ? <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{part.text}</mark>
              : <span key={i}>{part.text}</span>
          )}
        </div>
      )}

      {matches.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
          <div className="flex flex-wrap gap-1">
            {matches.slice(0, 20).map((m, i) => (
              <Badge key={i} variant="secondary" className="font-mono text-[10px]">
                {m[0].length > 30 ? m[0].slice(0, 30) + '…' : m[0]}
              </Badge>
            ))}
            {matches.length > 20 && (
              <Badge variant="outline" className="text-[10px]">+{matches.length - 20} more</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
