import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface InAppNotification {
  id: string;
  title: string;
  body: string | null;
  item_type: string | null;
  item_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ReminderInput {
  item_type: string;
  item_id: string;
  item_title: string;
  offset_minutes: number;
  event_time: Date; // the time of the event/task
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// VAPID public key — generated for this project
const VAPID_PUBLIC_KEY = 'BBKkcuLT9-2qSiL9bLimabuP8fUWZ2plftqkErTy8D3BgXAztxuhYnoVeRW8V38U25NpQNzo3mastd79n5ztMgQ';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Check push support
  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  // Load notifications
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data as InAppNotification[]);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
    };

    fetchNotifications();

    // Subscribe to realtime
    const channel = supabase
      .channel('in_app_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'in_app_notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as InAppNotification;
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
        toast(newNotif.title, { description: newNotif.body || undefined });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Check if push is already enabled
  useEffect(() => {
    if (!pushSupported || !user) return;
    navigator.serviceWorker?.getRegistration('/push-sw.js').then(reg => {
      if (reg) {
        reg.pushManager.getSubscription().then(sub => {
          setPushEnabled(!!sub);
        });
      }
    });
  }, [pushSupported, user]);

  const enablePush = useCallback(async () => {
    if (!pushSupported || !user) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return false;
      }

      const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();

      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth: subJson.keys!.auth!,
      }, { onConflict: 'user_id,endpoint' });

      setPushEnabled(true);
      toast.success('Push notifications enabled!');

      // Send an immediate confirmation push notification
      try {
        await registration.showNotification('Push Notifications Enabled 🔔', {
          body: 'You will now receive reminders and alerts from Baku Scribe.',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'push-enabled-confirmation',
        } as NotificationOptions);
      } catch (notifErr) {
        console.warn('Confirmation notification failed:', notifErr);
      }

      return true;
    } catch (err) {
      console.error('Push setup failed:', err);
      toast.error('Failed to enable push notifications');
      return false;
    }
  }, [pushSupported, user]);

  const disablePush = useCallback(async () => {
    if (!user) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration('/push-sw.js');
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
      setPushEnabled(false);
      toast.success('Push notifications disabled');
    } catch (err) {
      console.error('Push disable failed:', err);
    }
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('in_app_notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('in_app_notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    await supabase.from('in_app_notifications').delete().eq('user_id', user.id);
    setNotifications([]);
    setUnreadCount(0);
  }, [user]);

  // Add reminders for an item
  const addReminders = useCallback(async (inputs: ReminderInput[]) => {
    if (!user) return;
    const rows = inputs.map(input => ({
      user_id: user.id,
      item_type: input.item_type,
      item_id: input.item_id,
      item_title: input.item_title,
      offset_minutes: input.offset_minutes,
      remind_at: new Date(input.event_time.getTime() - input.offset_minutes * 60000).toISOString(),
    }));

    const { error } = await supabase.from('reminders').insert(rows);
    if (error) {
      toast.error('Failed to save reminders');
    } else {
      toast.success(`${rows.length} reminder(s) set`);
    }
  }, [user]);

  // Remove reminders for an item
  const removeReminders = useCallback(async (itemType: string, itemId: string) => {
    if (!user) return;
    await supabase.from('reminders').delete().eq('user_id', user.id).eq('item_type', itemType).eq('item_id', itemId);
  }, [user]);

  // Get reminders for an item
  const getReminders = useCallback(async (itemType: string, itemId: string) => {
    if (!user) return [];
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .order('offset_minutes', { ascending: true });
    return data || [];
  }, [user]);

  return {
    notifications,
    unreadCount,
    pushSupported,
    pushEnabled,
    enablePush,
    disablePush,
    markAsRead,
    markAllRead,
    clearAll,
    addReminders,
    removeReminders,
    getReminders,
  };
}
