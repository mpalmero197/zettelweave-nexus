import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { PluginProps } from '../types';

interface DiffLine { type: 'same' | 'add' | 'del'; text: string; }

function computeDiff(a: string, b: string): DiffLine[] {
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const result: DiffLine[] = [];
  const maxLen = Math.max(linesA.length, linesB.length);

  // Simple line-by-line comparison
  let ia = 0, ib = 0;
  while (ia < linesA.length || ib < linesB.length) {
    if (ia < linesA.length && ib < linesB.length) {
      if (linesA[ia] === linesB[ib]) {
        result.push({ type: 'same', text: linesA[ia] });
        ia++; ib++;
      } else {
        result.push({ type: 'del', text: linesA[ia] });
        result.push({ type: 'add', text: linesB[ib] });
        ia++; ib++;
      }
    } else if (ia < linesA.length) {
      result.push({ type: 'del', text: linesA[ia] });
      ia++;
    } else {
      result.push({ type: 'add', text: linesB[ib] });
      ib++;
    }
  }
  return result;
}

export function DiffCheckerPlugin({ onClose }: PluginProps) {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [showDiff, setShowDiff] = useState(false);

  const diff = useMemo(() => showDiff ? computeDiff(textA, textB) : [], [textA, textB, showDiff]);
  const adds = diff.filter(d => d.type === 'add').length;
  const dels = diff.filter(d => d.type === 'del').length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Original</span>
          <Textarea placeholder="Original text..." value={textA} onChange={e => { setTextA(e.target.value); setShowDiff(false); }}
            rows={6} className="text-xs font-mono" />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Modified</span>
          <Textarea placeholder="Modified text..." value={textB} onChange={e => { setTextB(e.target.value); setShowDiff(false); }}
            rows={6} className="text-xs font-mono" />
        </div>
      </div>

      <Button onClick={() => setShowDiff(true)} className="w-full" size="sm">Compare</Button>

      {showDiff && diff.length > 0 && (
        <>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs text-green-600">+{adds} additions</Badge>
            <Badge variant="secondary" className="text-xs text-red-600">-{dels} deletions</Badge>
          </div>
          <div className="border border-border rounded-lg overflow-hidden max-h-[250px] overflow-y-auto">
            {diff.map((line, i) => (
              <div key={i} className={`px-3 py-0.5 font-mono text-xs ${
                line.type === 'add' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                line.type === 'del' ? 'bg-red-500/10 text-red-700 dark:text-red-400' : ''
              }`}>
                <span className="text-muted-foreground mr-2">{line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}</span>
                {line.text || ' '}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
