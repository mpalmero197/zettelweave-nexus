import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  source: 'admin' | 'admin_license' | 'stripe' | 'none';
}

export const useSubscription = () => {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const hasShownError = useState(false)[0];

  const checkSubscription = async (silent = false) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setStatus(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to check subscription status',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription(false);
    
    // Refresh every 5 minutes silently
    const interval = setInterval(() => checkSubscription(true), 300000);
    
    return () => clearInterval(interval);
  }, []);

  const startCheckout = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout process',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const manageBilling = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast({
        title: 'Error',
        description: 'Failed to open billing management',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    status,
    loading,
    checkSubscription,
    startCheckout,
    manageBilling,
    hasPremium: status?.subscribed || false,
  };
};
