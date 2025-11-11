import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EncryptedBadgeProps {
  variant?: 'default' | 'compact';
}

export function EncryptedBadge({ variant = 'default' }: EncryptedBadgeProps) {
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Lock className="h-3 w-3 text-green-600" />
          </TooltipTrigger>
          <TooltipContent>
            <p>End-to-end encrypted</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700 border-green-500/20">
      <Lock className="h-3 w-3" />
      Encrypted
    </Badge>
  );
}
