import { useState, useEffect } from 'react';
import { useSubscription } from './useSubscription';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Centralized premium access hook.
 * Returns `hasAccess = true` when the user is either:
 *  - a paying premium subscriber, OR
 *  - an admin (admins always bypass the paywall).
 */
export const usePremiumAccess = () => {
  const { hasPremium } = useSubscription();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!user) { setIsAdmin(false); return; }
      try {
        const { data } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        });
        setIsAdmin(data === true);
      } catch {
        setIsAdmin(false);
      }
    };
    check();
  }, [user]);

  return {
    /** True if user can access premium features (subscriber OR admin) */
    hasAccess: hasPremium || isAdmin,
    /** True only if the user has a paid subscription */
    hasPremium,
    /** True only if the user has the admin role */
    isAdmin,
  };
};
