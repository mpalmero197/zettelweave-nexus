import { Brain, Database } from 'lucide-react';
import { useIntelligentCache } from '@/hooks/useIntelligentCache';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export const IntelligentCacheIndicator = () => {
  const { isPreloading, cacheStats, predictions } = useIntelligentCache();

  if (!isPreloading && cacheStats.validEntries === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className="gap-2 cursor-help"
          >
            <Brain className="h-3 w-3" />
            {isPreloading ? (
              <span className="animate-pulse">Learning patterns...</span>
            ) : (
              <>
                <Database className="h-3 w-3" />
                <span>{cacheStats.validEntries} cached</span>
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">Intelligent Cache</p>
            <p className="text-sm">
              Pre-loading {cacheStats.validEntries} items based on your usage patterns
            </p>
            {predictions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {predictions.length} patterns detected
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
