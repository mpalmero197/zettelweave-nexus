import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

export function WordFrequencyPlugin({}: PluginProps) {
  const [text, setText] = useState('');
  const [minCount, setMinCount] = useState(1);

  const analysis = useMemo(() => {
    if (!text.trim()) return null;
    const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
    const freq: Record<string, number> = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const sorted = Object.entries(freq)
      .filter(([, count]) => count >= minCount)
      .sort((a, b) => b[1] - a[1]);
    const maxCount = sorted[0]?.[1] || 1;

    const chars = text.length;
    const charNoSpaces = text.replace(/\s/g, '').length;
    const sentences = (text.match(/[.!?]+/g) || []).length || 1;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
    const uniqueWords = Object.keys(freq).length;
    const avgWordLen = words.length ? (words.reduce((s, w) => s + w.length, 0) / words.length).toFixed(1) : '0';
    const readingTime = Math.max(1, Math.ceil(words.length / 200));

    return { sorted, maxCount, total: words.length, unique: uniqueWords, chars, charNoSpaces, sentences, paragraphs, avgWordLen, readingTime };
  }, [text, minCount]);

  const copyStats = () => {
    if (!analysis) return;
    const lines = analysis.sorted.slice(0, 20).map(([w, c]) => `${w}: ${c}`).join('\n');
    navigator.clipboard.writeText(lines);
    toast.success('Top 20 words copied!');
  };

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Paste text to analyze word frequency..."
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        className="resize-none"
      />

      {analysis && (
        <>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ['Words', analysis.total],
              ['Unique', analysis.unique],
              ['Sentences', analysis.sentences],
              ['~Read', `${analysis.readingTime}m`],
            ].map(([label, val]) => (
              <div key={String(label)} className="bg-muted/30 rounded-lg p-2">
                <div className="text-lg font-bold">{val}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Top words (min {minCount}×)</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 5].map(n => (
                <Button key={n} size="sm" variant={minCount === n ? 'default' : 'outline'}
                  onClick={() => setMinCount(n)} className="h-6 text-[10px] px-2">
                  {n}+
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={copyStats} className="h-6 px-2">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
            {analysis.sorted.slice(0, 50).map(([word, count]) => (
              <div key={word} className="flex items-center gap-2 text-xs">
                <span className="w-20 truncate font-mono text-foreground">{word}</span>
                <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all"
                    style={{ width: `${(count / analysis.maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
