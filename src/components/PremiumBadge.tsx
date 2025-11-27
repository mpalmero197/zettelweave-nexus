import { Crown, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PremiumBadgeProps {
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
  showTooltip?: boolean;
}

export function PremiumBadge({ 
  variant = 'default', 
  className,
  showTooltip = true 
}: PremiumBadgeProps) {
  const badge = (
    <Badge 
      variant="secondary" 
      className={cn(
        "gap-1 bg-primary/20 border-primary/30 text-primary font-semibold",
        variant === 'compact' && "text-xs px-2 py-0",
        variant === 'icon-only' && "p-1",
        className
      )}
    >
      {variant === 'icon-only' ? (
        <Crown className="h-3 w-3" />
      ) : (
        <>
          <Crown className="h-3 w-3" />
          {variant === 'default' && 'Premium'}
          {variant === 'compact' && 'Pro'}
        </>
      )}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>Premium feature - Upgrade to unlock</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PremiumLockProps {
  className?: string;
}

export function PremiumLock({ className }: PremiumLockProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "inline-flex items-center justify-center p-1.5 rounded-lg bg-primary/10 text-primary",
            className
          )}>
            <Lock className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Premium feature - Subscribe to unlock</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
