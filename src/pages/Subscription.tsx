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

            <div className="flex gap-3 flex-wrap">
              {!hasPremium && (
                <>
                  <Button onClick={() => startCheckout('monthly')} className="flex-1">
                    <Crown className="mr-2 h-4 w-4" />
                    Monthly — $4.99/mo
                  </Button>
                  <Button onClick={() => startCheckout('yearly')} variant="outline" className="flex-1 border-primary/50">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Yearly — $29.99/yr (50% off)
                  </Button>
                </>
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

        {/* Pricing Comparison Chart */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free Plan */}
          <Card className="border border-border/60">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Free Forever</CardTitle>
              <div className="mt-2">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <CardDescription className="mt-2">
                Get started with the essentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: 'Unlimited Notes', included: true },
                { label: 'Notebooks', included: true },
                { label: 'End-to-End Encryption', included: true },
                { label: 'Zettel Cards (50 limit)', included: true },
                { label: 'Calendar', included: true },
                { label: 'File Manager', included: true },
                { label: 'Sticky Notes', included: true },
                { label: 'Scratchpad', included: true },
                { label: 'Habit Tracker', included: true },
                { label: 'Knowledge Graph', included: false },
                { label: 'Canvas Studio', included: false },
                { label: 'Bullet Journal', included: false },
                { label: 'Recorder Studio', included: false },
                { label: 'Collaboration Studio', included: false },
                { label: 'Learning Hub', included: false },
                { label: 'Spaces', included: false },
                { label: 'Project Manager', included: false },
                { label: 'Knowledge Gap Analyzer', included: false },
                { label: 'Integrations Hub', included: false },
                { label: 'AI Agents', included: false },
                { label: 'AI-Powered Features', included: false },
                { label: 'Unlimited Zettel Cards', included: false },
              ].map((feature) => (
                <div key={feature.label} className="flex items-center gap-2">
                  {feature.included ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <span className={feature.included ? '' : 'text-muted-foreground line-through'}>
                    {feature.label}
                  </span>
                </div>
              ))}
              {hasPremium ? (
                <Button variant="outline" className="w-full mt-4" disabled>
                  Current Plan
                </Button>
              ) : (
                <div className="pt-2">
                  <Badge variant="outline" className="w-full justify-center py-1.5">Current Plan</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Plan */}
          <Card className="border-2 border-primary/50 relative">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Monthly
              </CardTitle>
              <div className="mt-2">
                <span className="text-4xl font-bold">$4.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <CardDescription className="mt-2">
                Full access, billed monthly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                'Unlimited Notes',
                'Notebooks',
                'End-to-End Encryption',
                'Unlimited Zettel Cards',
                'Calendar',
                'File Manager',
                'Sticky Notes',
                'Scratchpad',
                'Habit Tracker',
                'Knowledge Graph',
                'Canvas Studio',
                'Bullet Journal',
                'Recorder Studio',
                'Collaboration Studio',
                'Learning Hub',
                'Spaces',
                'Project Manager',
                'Knowledge Gap Analyzer',
                'Integrations Hub',
                'AI Agents',
                'AI-Powered Features',
                'Priority Support',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
              {!hasPremium ? (
                <Button onClick={() => startCheckout('monthly')} className="w-full mt-4">
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade — $4.99/mo
                </Button>
              ) : (
                <Button variant="outline" className="w-full mt-4" disabled>
                  {status?.source === 'stripe' ? 'Current Plan' : 'Active'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card className="border-2 border-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
              BEST VALUE
            </div>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Yearly
              </CardTitle>
              <div className="mt-2">
                <span className="text-4xl font-bold">$29.99</span>
                <span className="text-muted-foreground">/year</span>
              </div>
              <div className="mt-1">
                <span className="text-sm text-muted-foreground line-through mr-2">$59.88/yr</span>
                <Badge variant="default" className="text-xs">Save 50%</Badge>
              </div>
              <CardDescription className="mt-2">
                Everything in Monthly, save big
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                'Unlimited Notes',
                'Notebooks',
                'End-to-End Encryption',
                'Unlimited Zettel Cards',
                'Calendar',
                'File Manager',
                'Sticky Notes',
                'Scratchpad',
                'Habit Tracker',
                'Knowledge Graph',
                'Canvas Studio',
                'Bullet Journal',
                'Recorder Studio',
                'Collaboration Studio',
                'Learning Hub',
                'Spaces',
                'Project Manager',
                'Knowledge Gap Analyzer',
                'Integrations Hub',
                'AI Agents',
                'AI-Powered Features',
                'Priority Support',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
              {!hasPremium ? (
                <Button onClick={() => startCheckout('yearly')} className="w-full mt-4 bg-gradient-primary hover:opacity-90">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upgrade — $29.99/yr
                </Button>
              ) : (
                <Button variant="outline" className="w-full mt-4" disabled>
                  {status?.source === 'stripe' ? 'Current Plan' : 'Active'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Manage Billing */}
        {hasPremium && status?.source === 'stripe' && (
          <div className="text-center">
            <Button onClick={manageBilling} variant="outline" size="lg">
              <CreditCard className="mr-2 h-4 w-4" />
              Manage Billing & Invoices
            </Button>
          </div>
        )}

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
