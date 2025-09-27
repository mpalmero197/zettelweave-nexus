import { ContentSummarizer } from '@/components/ContentSummarizer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export function ContentSummarizerWidget() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Content Summarizer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ContentSummarizer />
      </CardContent>
    </Card>
  );
}