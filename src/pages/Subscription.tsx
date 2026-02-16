import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Crown, Calendar, CreditCard, Shield, Check, X, Sparkles, Zap, Brain, FileText, BookOpen, Palette, Mic, BarChart3, HelpCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { SEOHead, ogImages } from '@/components/SEOHead';
import { SEOBreadcrumb } from '@/components/SEOBreadcrumb';

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
    <div className="bg-background p-6">
      <SEOHead 
        title="Subscription - PendragonX"
        description="Manage your PendragonX subscription and billing. Upgrade to Premium for unlimited cards, AI features, and more."
        canonicalUrl="https://pendragonx.com/subscription"
        ogImage={ogImages.subscription}
        noIndex={true}
      />
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <SEOBreadcrumb 
          items={[{ label: "Subscription" }]} 
        />
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">
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

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <CardTitle>Frequently Asked Questions</CardTitle>
            </div>
            <CardDescription>
              Common questions about billing, cancellation, and features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left">
                  How does billing work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Premium subscriptions are billed monthly at $4.99/month. Your first payment is processed immediately upon upgrade, and subsequent payments occur on the same day each month. You'll receive an email receipt for each payment.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left">
                  Can I cancel my subscription anytime?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes! You can cancel your subscription at any time through the "Manage Billing" portal. When you cancel, you'll retain premium access until the end of your current billing period. Your notes and notebooks will always remain accessible on the free plan.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left">
                  What happens to my data if I downgrade to free?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  All your notes and notebooks are always available, regardless of your plan. If you downgrade, you'll simply lose access to premium features like the Knowledge Graph, Whiteboard, and Catalyst writing suite. Your Zettel cards remain accessible, but you won't be able to create new ones on the free plan.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left">
                  Do you offer refunds?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  We offer a 7-day money-back guarantee. If you're not satisfied with Premium within the first week, contact our support team for a full refund. After 7 days, subscriptions are non-refundable, but you can cancel anytime to avoid future charges.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left">
                  What's included in Premium vs Free?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  The Free plan includes unlimited notes and notebooks with cloud sync and encryption. Premium adds Zettel cards, 3D Knowledge Graph visualization, Interactive Whiteboard, Catalyst writing suite, AI-powered features, habit tracking, audio/video recording, and advanced analytics. See the comparison table above for full details.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-left">
                  Can I upgrade or downgrade at any time?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Absolutely! You can upgrade to Premium instantly and start using all features immediately. If you downgrade, premium access continues until the end of your current billing period, then your account automatically switches to the free plan.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger className="text-left">
                  Is my payment information secure?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes! All payments are processed securely through Stripe, an industry-leading payment processor. We never store your credit card information on our servers. Stripe is PCI-DSS compliant and handles billions of dollars in transactions annually.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8">
                <AccordionTrigger className="text-left">
                  What if I'm an admin or have a license?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Admin users and licensed users receive Premium access automatically at no charge. Admins can grant licenses to select users through the admin panel. These premium licenses don't require payment and can be managed by administrators.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9">
                <AccordionTrigger className="text-left">
                  Can I use PendragonX on multiple devices?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes! Your subscription covers all your devices. Sign in with the same account on your phone, tablet, and computer, and your data syncs automatically across all devices. There's no limit to the number of devices you can use.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-10">
                <AccordionTrigger className="text-left">
                  How do I update my payment method?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Click the "Manage Billing" button above to access the Stripe customer portal. There you can update your payment method, view invoice history, and manage all billing details. Changes take effect immediately.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
