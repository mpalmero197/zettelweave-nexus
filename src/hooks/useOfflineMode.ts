import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface PendingOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

const OFFLINE_STORAGE_KEY = 'pendragon_offline_data';
const PENDING_OPS_KEY = 'pendragon_pending_operations';
const MAX_RETRIES = 3;

export const useOfflineMode = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Load pending operations from localStorage
  useEffect(() => {
    if (!user) return;
    
    try {
      const stored = localStorage.getItem(`${PENDING_OPS_KEY}_${user.id}`);
      if (stored) {
        setPendingOperations(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading pending operations:', error);
    }
  }, [user]);

  // Save pending operations to localStorage
  useEffect(() => {
    if (!user) return;
    
    try {
      localStorage.setItem(
        `${PENDING_OPS_KEY}_${user.id}`,
        JSON.stringify(pendingOperations)
      );
    } catch (error) {
      console.error('Error saving pending operations:', error);
    }
  }, [pendingOperations, user]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing changes...', {
        duration: 3000,
      });
      syncPendingOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('You are offline. Changes will be saved locally.', {
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Queue an operation for later sync
  const queueOperation = useCallback((
    type: 'insert' | 'update' | 'delete',
    table: string,
    data: any
  ) => {
    const operation: PendingOperation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    setPendingOperations(prev => {
      const updated = [...prev, operation];
      
      toast.info(`Change queued for sync (${updated.length} pending)`, {
        duration: 2000,
      });

      return updated;
    });

    return operation.id;
  }, []);

  // Sync pending operations when online
  const syncPendingOperations = useCallback(async () => {
    if (!isOnline || !user || pendingOperations.length === 0) return;

    setIsSyncing(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const results = [];
      const failed = [];

      for (const op of pendingOperations) {
        try {
          let result;

          switch (op.type) {
            case 'insert': {
              const insertData = { ...op.data };
              delete insertData.id; // Remove temp ID
              result = await (supabase as any).from(op.table).insert(insertData);
              break;
            }
            case 'update': {
              const updateData = { ...op.data };
              const recordId = updateData.id;
              delete updateData.id;
              result = await (supabase as any)
                .from(op.table)
                .update(updateData)
                .eq('id', recordId);
              break;
            }
            case 'delete':
              result = await (supabase as any)
                .from(op.table)
                .delete()
                .eq('id', op.data.id);
              break;
          }

          if (result.error) {
            throw result.error;
          }

          results.push(op.id);
        } catch (error) {
          console.error(`Error syncing operation ${op.id}:`, error);
          
          if (op.retryCount < MAX_RETRIES) {
            failed.push({ ...op, retryCount: op.retryCount + 1 });
          } else {
            toast.error(`Failed to sync ${op.type} on ${op.table} after ${MAX_RETRIES} attempts`);
          }
        }
      }

      // Remove successful operations and update failed ones
      setPendingOperations(failed);
      setLastSyncTime(Date.now());

      if (results.length > 0) {
        toast.success(`Synced ${results.length} change(s)`, {
          duration: 3000,
        });
      }

      if (failed.length > 0) {
        toast.warning(`${failed.length} change(s) failed to sync and will retry`, {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error during sync:', error);
      toast.error('Failed to sync changes. Will retry when online.');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, user, pendingOperations]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingOperations.length > 0) {
      syncPendingOperations();
    }
  }, [isOnline, pendingOperations.length]);

  // Store data offline
  const storeOffline = useCallback((key: string, data: any) => {
    if (!user) return;
    
    try {
      const storageKey = `${OFFLINE_STORAGE_KEY}_${user.id}_${key}`;
      localStorage.setItem(storageKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error storing offline data:', error);
    }
  }, [user]);

  // Retrieve offline data
  const getOfflineData = useCallback((key: string) => {
    if (!user) return null;
    
    try {
      const storageKey = `${OFFLINE_STORAGE_KEY}_${user.id}_${key}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.data;
      }
    } catch (error) {
      console.error('Error retrieving offline data:', error);
    }
    
    return null;
  }, [user]);

  // Clear offline data
  const clearOfflineData = useCallback((key?: string) => {
    if (!user) return;
    
    try {
      if (key) {
        const storageKey = `${OFFLINE_STORAGE_KEY}_${user.id}_${key}`;
        localStorage.removeItem(storageKey);
      } else {
        // Clear all offline data for this user
        const prefix = `${OFFLINE_STORAGE_KEY}_${user.id}_`;
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith(prefix)) {
            localStorage.removeItem(k);
          }
        });
      }
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }, [user]);

  return {
    isOnline,
    isSyncing,
    pendingOperations,
    pendingCount: pendingOperations.length,
    lastSyncTime,
    queueOperation,
    syncPendingOperations,
    storeOffline,
    getOfflineData,
    clearOfflineData
  };
};
