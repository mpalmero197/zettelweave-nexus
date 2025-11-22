import { ContentSummarizer } from '@/components/ContentSummarizer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export function ContentSummarizerWidget() {
  return (
    <div className="h-full">
      <ContentSummarizer />
    </div>
  );
}