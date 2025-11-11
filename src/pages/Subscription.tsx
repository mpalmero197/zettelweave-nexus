import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Crown, Calendar, CreditCard, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function Subscription() {
  const { user, loading: authLoading } = useAuth();
  const { status, loading, startCheckout, manageBilling, hasPremium } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getSourceBadge = () => {
    if (!status) return null;
    
    switch (status.source) {
      case 'admin':
        return <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>;
      case 'admin_license':
        return <Badge variant="secondary" className="gap-1"><Crown className="h-3 w-3" /> Licensed</Badge>;
      case 'stripe':
        return <Badge variant="default" className="gap-1"><CreditCard className="h-3 w-3" /> Active</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Subscription Management
          </h1>
          <p className="text-muted-foreground">
            Manage your PendragonX subscription and billing
          </p>
        </div>

        {/* Current Status Card */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {hasPremium ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Premium Active
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    Free Plan
                  </>
                )}
              </CardTitle>
              {getSourceBadge()}
            </div>
            <CardDescription>
              {hasPremium 
                ? 'You have full access to all premium features'
                : 'Notes and notebooks are free. Subscribe for full access to all features.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status?.subscription_end && status.source === 'stripe' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Renews on {format(new Date(status.subscription_end), 'MMMM d, yyyy')}
                </span>
              </div>
            )}
            
            {status?.subscription_end && status.source === 'admin_license' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {status.subscription_end 
                    ? `License expires on ${format(new Date(status.subscription_end), 'MMMM d, yyyy')}`
                    : 'Lifetime license'
                  }
                </span>
              </div>
            )}

            <div className="flex gap-3">
              {!hasPremium && (
                <Button onClick={startCheckout} className="flex-1">
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Premium - $4.99/month
                </Button>
              )}
              
              {hasPremium && status?.source === 'stripe' && (
                <Button onClick={manageBilling} variant="outline" className="flex-1">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Billing
                </Button>
              )}
              
              <Button onClick={() => navigate('/')} variant="outline">
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Premium Features Card */}
        <Card>
          <CardHeader>
            <CardTitle>Premium Features</CardTitle>
            <CardDescription>
              Unlock all features with a premium subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <FeatureItem 
                title="Interactive Whiteboard" 
                description="Infinite canvas for brainstorming and visual thinking"
                included={hasPremium}
              />
              <FeatureItem 
                title="Knowledge Graph" 
                description="3D visualization of your connected ideas"
                included={hasPremium}
              />
              <FeatureItem 
                title="Catalyst Writing Suite" 
                description="AI-powered long-form writing and research tools"
                included={hasPremium}
              />
              <FeatureItem 
                title="Habit Tracker" 
                description="Build and maintain productive habits"
                included={hasPremium}
              />
              <FeatureItem 
                title="Audio/Video Recording" 
                description="Record meetings and capture ideas on the go"
                included={hasPremium}
              />
              <FeatureItem 
                title="Advanced Analytics" 
                description="Deep insights into your knowledge base"
                included={hasPremium}
              />
            </div>
          </CardContent>
        </Card>

        {/* Free Features Card */}
        <Card>
          <CardHeader>
            <CardTitle>Always Free</CardTitle>
            <CardDescription>
              Core features available to all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <FeatureItem 
                title="Unlimited Notes" 
                description="Create and organize unlimited notes"
                included={true}
                alwaysFree
              />
              <FeatureItem 
                title="Notebooks" 
                description="Organize notes into customizable notebooks"
                included={true}
                alwaysFree
              />
              <FeatureItem 
                title="Cloud Sync" 
                description="Access your notes from anywhere"
                included={true}
                alwaysFree
              />
              <FeatureItem 
                title="End-to-End Encryption" 
                description="Optional encryption for sensitive data"
                included={true}
                alwaysFree
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface FeatureItemProps {
  title: string;
  description: string;
  included: boolean;
  alwaysFree?: boolean;
}

function FeatureItem({ title, description, included, alwaysFree }: FeatureItemProps) {
  return (
    <div className="flex gap-3">
      {included ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
      )}
      <div>
        <h4 className="font-medium flex items-center gap-2">
          {title}
          {alwaysFree && <Badge variant="secondary" className="text-xs">Free</Badge>}
        </h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
