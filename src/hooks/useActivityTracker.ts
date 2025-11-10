import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useActivityTracker = () => {
  const { user } = useAuth();

  const trackActivity = useCallback(async (
    activityType: string,
    resourceId?: string,
    resourceType?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;

    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();

    try {
      await supabase.from('user_activity_logs').insert({
        user_id: user.id,
        activity_type: activityType,
        resource_id: resourceId,
        resource_type: resourceType,
        hour_of_day: hourOfDay,
        day_of_week: dayOfWeek,
        metadata: metadata || {}
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }, [user]);

  return { trackActivity };
};
