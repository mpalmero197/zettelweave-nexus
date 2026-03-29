import { useState, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { PluginProps } from '../types';

function analyze(text: string) {
  if (!text.trim()) return null;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = (w: string) => {
    w = w.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) return 1;
    let count = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').match(/[aeiouy]{1,2}/g)?.length || 1;
    return Math.max(count, 1);
  };
  const totalSyllables = words.reduce((s, w) => s + syllables(w), 0);
  const complexWords = words.filter(w => syllables(w) >= 3).length;
  const wc = words.length;
  const sc = Math.max(sentences.length, 1);
  const avgSentLen = wc / sc;
  const avgSyllPerWord = totalSyllables / Math.max(wc, 1);

  const flesch = 206.835 - 1.015 * avgSentLen - 84.6 * avgSyllPerWord;
  const fog = 0.4 * (avgSentLen + 100 * (complexWords / Math.max(wc, 1)));
  const chars = text.replace(/\s/g, '').length;
  const coleman = 0.0588 * (chars / Math.max(wc, 1) * 100) - 0.296 * (sc / Math.max(wc, 1) * 100) - 15.8;

  return { flesch: Math.round(flesch * 10) / 10, fog: Math.round(fog * 10) / 10, coleman: Math.round(coleman * 10) / 10, wc, sc, avgSentLen: Math.round(avgSentLen * 10) / 10 };
}

function gradeLabel(score: number): string {
  if (score >= 90) return '5th grade';
  if (score >= 80) return '6th grade';
  if (score >= 70) return '7th grade';
  if (score >= 60) return '8-9th grade';
  if (score >= 50) return '10-12th grade';
  if (score >= 30) return 'College';
  return 'College graduate';
}

export function ReadabilityPlugin({ onClose }: PluginProps) {
  const [text, setText] = useState('');
  const result = useMemo(() => analyze(text), [text]);

  return (
    <div className="space-y-4">
      <Textarea placeholder="Paste your text here to analyze readability..." value={text}
        onChange={e => setText(e.target.value)} rows={6} />

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="border border-border rounded-lg p-2">
              <div className="text-lg font-bold text-primary">{result.flesch}</div>
              <div className="text-[10px] text-muted-foreground">Flesch-Kincaid</div>
              <Badge variant="secondary" className="text-[9px] mt-1">{gradeLabel(result.flesch)}</Badge>
            </div>
            <div className="border border-border rounded-lg p-2">
              <div className="text-lg font-bold text-primary">{result.fog}</div>
              <div className="text-[10px] text-muted-foreground">Gunning Fog</div>
              <Badge variant="secondary" className="text-[9px] mt-1">Grade {Math.round(result.fog)}</Badge>
            </div>
            <div className="border border-border rounded-lg p-2">
              <div className="text-lg font-bold text-primary">{result.coleman}</div>
              <div className="text-[10px] text-muted-foreground">Coleman-Liau</div>
              <Badge variant="secondary" className="text-[9px] mt-1">Grade {Math.round(result.coleman)}</Badge>
            </div>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground justify-center">
            <span>{result.wc} words</span>
            <span>{result.sc} sentences</span>
            <span>~{result.avgSentLen} words/sentence</span>
          </div>
        </div>
      )}
    </div>
  );
}
