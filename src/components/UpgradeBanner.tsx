import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function UpgradeBanner() {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed) return null;

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-2xl opacity-50 animate-pulse" />
      <Card className="relative bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 backdrop-blur-xl border-2 border-primary/30 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="relative p-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-background/20"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <div className="p-4 bg-gradient-primary rounded-2xl shadow-lg animate-bounce">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Unlock Premium Features
              </h3>
              <p className="text-muted-foreground">
                Upgrade to access advanced AI features, unlimited storage, and powerful collaboration tools for just <span className="font-semibold text-primary">$4.99/month</span>
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Advanced AI Tools</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Unlimited Cards</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Priority Support</span>
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <Button
                size="lg"
                className="bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                onClick={() => navigate('/subscription')}
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
