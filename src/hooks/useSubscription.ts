import { useState, useEffect, useRef } from 'react';
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
  const isMounted = useRef(true);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      if (isMounted.current) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      if (isMounted.current) {
        toast({
          title: 'Error',
          description: 'Failed to check subscription status',
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, []);

  const startCheckout = async (plan: 'monthly' | 'yearly' = 'monthly') => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      if (isMounted.current) {
        toast({
          title: 'Error',
          description: 'Failed to start checkout process',
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
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
      if (isMounted.current) {
        toast({
          title: 'Error',
          description: 'Failed to open billing management',
          variant: 'destructive',
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
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