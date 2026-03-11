import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Link, Youtube, FileImage, Loader2, Sparkles, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SummaryResult {
  title: string;
  summary: string;
  keyPoints: string[];
  contentType: 'article' | 'video' | 'pdf' | 'document';
  sourceUrl?: string;
}

export function ContentSummarizer() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [summaries, setSummaries] = useState<SummaryResult[]>([]);
  const { toast } = useToast();

  const detectContentType = (url: string): 'article' | 'video' | 'pdf' | 'document' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'video';
    if (url.includes('.pdf')) return 'pdf';
    if (url.includes('docs.google.com')) return 'document';
    return 'article';
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Youtube className="h-4 w-4" />;
      case 'pdf': return <FileImage className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <Link className="h-4 w-4" />;
    }
  };

  const handleSummarize = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to summarize",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Fetch the URL content
      const { data: fetchData, error: fetchError } = await supabase.functions.invoke('fetch-url-content', {
        body: { url: url.trim() }
      });

      if (fetchError || !fetchData?.success) {
        throw new Error(fetchData?.error || fetchError?.message || 'Failed to fetch URL content');
      }

      const pageContent = fetchData.data.content?.substring(0, 12000) || '';
      const pageTitle = fetchData.data.title || url;

      // Step 2: Summarize with AI
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-assistant-chat', {
        body: {
          messages: [
            {
              role: 'user',
              content: `Summarize the following web content. Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{"title":"<concise title>","summary":"<2-3 sentence summary>","keyPoints":["point 1","point 2","point 3","point 4"]}

Page title: ${pageTitle}
Content:
${pageContent}`
            }
          ]
        }
      });

      if (aiError) throw new Error(aiError.message || 'AI summarization failed');

      // Parse the AI response - handle both streaming and non-streaming
      let responseText = '';
      if (typeof aiData === 'string') {
        // SSE stream response - extract content from data lines
        const lines = aiData.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
              responseText += content;
            } catch { /* skip unparseable lines */ }
          }
        }
      } else if (aiData?.choices?.[0]?.message?.content) {
        responseText = aiData.choices[0].message.content;
      } else if (aiData?.content) {
        responseText = aiData.content;
      }

      // Clean and parse JSON from the response
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        // Fallback if AI didn't return valid JSON
        parsed = {
          title: pageTitle,
          summary: responseText.substring(0, 500),
          keyPoints: ['See full summary above']
        };
      }

      const contentType = detectContentType(url);
      const newSummary: SummaryResult = {
        title: parsed.title || pageTitle,
        summary: parsed.summary || 'Summary could not be generated.',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : ['No key points extracted'],
        contentType,
        sourceUrl: url
      };

      setSummaries(prev => [newSummary, ...prev]);
      setUrl('');
      
      toast({
        title: "Content Summarized",
        description: "Successfully processed and summarized the content"
      });
    } catch (error: any) {
      console.error('Summarization error:', error);
      toast({
        title: "Summarization Failed",
        description: error?.message || "Failed to process the content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCard = (summary: SummaryResult) => {
    // Integration with existing card system would go here
    toast({
      title: "Card Created",
      description: "Summary has been saved as a new card"
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Content Summarizer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-col sm:flex-row">
            <Input
              placeholder="Paste URL (YouTube, articles, PDFs, Google Docs...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSummarize()}
              className="flex-1"
            />
            <Button 
              onClick={handleSummarize}
              disabled={isLoading}
              size="icon"
              className="sm:w-auto sm:px-4 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="sr-only sm:not-sr-only sm:ml-2">Summarize</span>
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              <Youtube className="h-3 w-3 mr-1" />
              YouTube
            </Badge>
            <Badge variant="outline" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Articles
            </Badge>
            <Badge variant="outline" className="text-xs">
              <FileImage className="h-3 w-3 mr-1" />
              PDFs
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Link className="h-3 w-3 mr-1" />
              Google Docs
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {summaries.map((summary, index) => (
          <Card key={index} className="border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {getContentIcon(summary.contentType)}
                  {summary.title}
                </CardTitle>
                <Badge variant="secondary" className="capitalize">
                  {summary.contentType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {summary.summary}
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Key Points:</h4>
                <ul className="space-y-1">
                  {summary.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t">
                {summary.sourceUrl && (
                  <a 
                    href={summary.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate max-w-xs"
                  >
                    {summary.sourceUrl}
                  </a>
                )}
                <Button 
                  size="icon" 
                  onClick={() => handleCreateCard(summary)}
                  className="ml-auto sm:w-auto sm:px-4"
                >
                  <BookOpen className="h-3 w-3" />
                  <span className="sr-only sm:not-sr-only sm:ml-2">Create Card</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}