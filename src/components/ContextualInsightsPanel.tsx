import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, BookOpen, MessageSquare, HelpCircle } from 'lucide-react';

interface ContextualData {
  relatedResources: Array<{
    title: string;
    description: string;
    relevance: string;
  }>;
  definitions: Array<{
    term: string;
    definition: string;
  }>;
  counterArguments: Array<{
    perspective: string;
    summary: string;
  }>;
  followUpQuestions: string[];
}

interface ContextualInsightsPanelProps {
  data: ContextualData | null;
  isLoading?: boolean;
}

export function ContextualInsightsPanel({ data, isLoading }: ContextualInsightsPanelProps) {
  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-primary" />
            Contextual Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-muted/50 animate-pulse rounded-lg" />
            <div className="h-20 bg-muted/50 animate-pulse rounded-lg" />
            <div className="h-20 bg-muted/50 animate-pulse rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-primary" />
          Contextual Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {/* Related Resources */}
            {data.relatedResources && data.relatedResources.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Related Resources</h3>
                </div>
                <div className="space-y-3">
                  {data.relatedResources.map((resource, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm">{resource.title}</h4>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {resource.relevance}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{resource.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Definitions */}
            {data.definitions && data.definitions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Key Definitions</h3>
                </div>
                <div className="space-y-3">
                  {data.definitions.map((def, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <h4 className="font-semibold text-sm text-primary mb-1">{def.term}</h4>
                      <p className="text-xs text-muted-foreground">{def.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Counter Arguments */}
            {data.counterArguments && data.counterArguments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Alternative Perspectives</h3>
                </div>
                <div className="space-y-3">
                  {data.counterArguments.map((arg, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <h4 className="font-medium text-sm mb-1">{arg.perspective}</h4>
                      <p className="text-xs text-muted-foreground">{arg.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Follow-up Questions */}
            {data.followUpQuestions && data.followUpQuestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Suggested Questions</h3>
                </div>
                <div className="space-y-2">
                  {data.followUpQuestions.map((question, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-muted/30 border border-border/50 text-xs hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      {question}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
