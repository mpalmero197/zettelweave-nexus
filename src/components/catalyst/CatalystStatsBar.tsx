import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Type, FileText, BarChart3, Zap } from 'lucide-react';

interface CatalystStatsBarProps {
  content: string;
  wordCount: number;
  sessionStartWordCount: number;
  sessionStartTime: Date;
}

function calculateReadability(text: string): { score: number; grade: string; label: string } {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => count + countSyllables(word), 0);

  if (sentences.length === 0 || words.length === 0) {
    return { score: 0, grade: '—', label: 'Not enough text' };
  }

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  // Flesch-Kincaid Reading Ease
  const score = Math.round(206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord);
  const clampedScore = Math.max(0, Math.min(100, score));

  // Flesch-Kincaid Grade Level
  const gradeLevel = Math.round(0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59);
  const clampedGrade = Math.max(1, Math.min(18, gradeLevel));

  let label: string;
  if (clampedScore >= 90) label = 'Very Easy';
  else if (clampedScore >= 80) label = 'Easy';
  else if (clampedScore >= 70) label = 'Fairly Easy';
  else if (clampedScore >= 60) label = 'Standard';
  else if (clampedScore >= 50) label = 'Fairly Difficult';
  else if (clampedScore >= 30) label = 'Difficult';
  else label = 'Very Difficult';

  return { score: clampedScore, grade: `Grade ${clampedGrade}`, label };
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');

  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

export function CatalystStatsBar({ content, wordCount, sessionStartWordCount, sessionStartTime }: CatalystStatsBarProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMinutes(Math.floor((Date.now() - sessionStartTime.getTime()) / 60000));
    }, 30000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const plainText = content.replace(/<[^>]*>/g, '');
  const charCount = plainText.length;
  const charCountNoSpaces = plainText.replace(/\s/g, '').length;
  const paragraphCount = plainText.split(/\n\n+/).filter(p => p.trim().length > 0).length || 1;
  const sentenceCount = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 238));
  const speakingTimeMinutes = Math.max(1, Math.ceil(wordCount / 150));
  const readability = calculateReadability(plainText);
  const sessionWords = wordCount - sessionStartWordCount;
  const wordsPerMinute = elapsedMinutes > 0 ? Math.round(Math.max(0, sessionWords) / elapsedMinutes) : 0;

  const readabilityColor = readability.score >= 60
    ? 'text-green-500'
    : readability.score >= 40
    ? 'text-yellow-500'
    : 'text-red-500';

  return (
    <TooltipProvider>
      <div className="flex items-center gap-x-3 gap-y-1.5 px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground flex-wrap" role="status" aria-live="polite" aria-label="Document statistics">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <FileText className="h-3 w-3 shrink-0" />
              <span>{wordCount.toLocaleString()} words</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{charCount.toLocaleString()} characters ({charCountNoSpaces.toLocaleString()} without spaces)</p>
            <p>{paragraphCount} paragraphs · {sentenceCount} sentences</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-3" />

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{readingTimeMinutes} min read</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>~{readingTimeMinutes} min reading time (238 wpm)</p>
            <p>~{speakingTimeMinutes} min speaking time (150 wpm)</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-3" />

        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1.5 whitespace-nowrap ${readabilityColor}`}>
              <BarChart3 className="h-3 w-3 shrink-0" />
              <span>{readability.label} ({readability.score})</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Flesch Reading Ease: {readability.score}/100</p>
            <p>{readability.grade}</p>
            <p className="text-xs mt-1">60-70 = Standard · 70+ = Easy to read</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-3" />

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Zap className="h-3 w-3 shrink-0" />
              <span>+{Math.max(0, sessionWords)} this session</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Session: {elapsedMinutes} min elapsed</p>
            {wordsPerMinute > 0 && <p>{wordsPerMinute} words/min</p>}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
