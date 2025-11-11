import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Crown, Calendar, CreditCard, Shield, Check, X, Sparkles, Zap, Brain, FileText, BookOpen, Palette, Mic, BarChart3 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

        {/* Feature Comparison Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Feature Comparison</CardTitle>
            </div>
            <CardDescription>
              See what's included in each plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Feature</TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg font-bold">Free</span>
                        <span className="text-xs text-muted-foreground">$0/month</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center bg-primary/5">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <Crown className="h-4 w-4 text-primary" />
                          <span className="text-lg font-bold">Premium</span>
                        </div>
                        <span className="text-xs text-muted-foreground">$4.99/month</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Unlimited Notes
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center bg-primary/5">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        Notebooks
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center bg-primary/5">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        End-to-End Encryption
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center bg-primary/5">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-muted-foreground" />
                        Zettel Cards
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-muted-foreground">Limited</span>
                    </TableCell>
                    <TableCell className="text-center bg-primary/5">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        Knowledge Graph (3D)
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <X className="h-5 w-5 text-muted-foreground mx-auto" />
                    </TableCell>
                    <TableCell className="text-center bg-primary/5">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-muted-foreground" />
                        Interactive Whiteboard
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <X className="h-5 w-5 text-muted-foreground mx-auto" />
                    </TableCell>
                    <TableCell className="text-center bg-primary/5">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Catalyst Writing Suite
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <X className="h-5 w-5 text-muted-foreground mx-auto" />
                    </TableCell>
                    <TableCell className="text-center bg-primary/5">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-muted-foreground" />
                        Audio/Video Recording
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <X className="h-5 w-5 text-muted-foreground mx-auto" />
                    </TableCell>
                    <TableCell className="text-center bg-primary/5">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        Advanced Analytics
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <X className="h-5 w-5 text-muted-foreground mx-auto" />
                    </TableCell>
                    <TableCell className="text-center bg-primary/5">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        Habit Tracker
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <X className="h-5 w-5 text-muted-foreground mx-auto" />
                    </TableCell>
                    <TableCell className="text-center bg-primary/5">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-muted-foreground" />
                        AI-Powered Features
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <X className="h-5 w-5 text-muted-foreground mx-auto" />
                    </TableCell>
                    <TableCell className="text-center bg-primary/5">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            {!hasPremium && (
              <div className="mt-6 pt-6 border-t text-center">
                <Button size="lg" onClick={startCheckout} className="bg-gradient-primary hover:opacity-90">
                  <Crown className="mr-2 h-5 w-5" />
                  Upgrade to Premium - $4.99/month
                </Button>
              </div>
            )}
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
