import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface PremiumGateProps {
  featureName: string;
  children: React.ReactNode;
  hasAccess: boolean;
}

export function PremiumGate({ featureName, children, hasAccess }: PremiumGateProps) {
  if (hasAccess) return <>{children}</>;

  return (
    <div className="text-center py-12 space-y-4">
      <div className="inline-flex p-3 rounded-full bg-primary/10">
        <Lock className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Premium Feature</h2>
      <p className="text-muted-foreground text-sm max-w-sm mx-auto">
        {featureName} is available for premium subscribers only.
      </p>
      <Button size="sm" onClick={() => window.location.href = '/subscription'}>
        Upgrade to Premium
      </Button>
    </div>
  );
}
