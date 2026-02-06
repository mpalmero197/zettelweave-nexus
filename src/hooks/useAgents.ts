import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Agent, AgentRun, AgentFinding, AgentNotification, AgentType, AgentConfig } from '@/types/agents';
import { toast } from 'sonner';

export const useAgents = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [findings, setFindings] = useState<AgentFinding[]>([]);
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAgents = useCallback(async () => {
    if (!user) return;
    
    try {
      // Cast to any since agents table was just created and types haven't been regenerated
      const { data, error } = await (supabase
        .from('agents') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAgents((data || []).map((agent: any) => ({
        ...agent,
        config: agent.config as AgentConfig
      })) as Agent[]);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, [user]);

  const fetchRuns = useCallback(async (agentId?: string) => {
    if (!user) return;
    
    try {
      let query = (supabase
        .from('agent_runs') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(50);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setRuns((data || []) as AgentRun[]);
    } catch (error) {
      console.error('Error fetching agent runs:', error);
    }
  }, [user]);

  const fetchFindings = useCallback(async (agentId?: string, unreadOnly = false) => {
    if (!user) return;
    
    try {
      let query = (supabase
        .from('agent_findings') as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setFindings((data || []).map((f: any) => ({
        ...f,
        metadata: f.metadata as Record<string, unknown>
      })) as AgentFinding[]);
    } catch (error) {
      console.error('Error fetching findings:', error);
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await (supabase
        .from('agent_notifications') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const notifs = (data || []) as AgentNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  const createAgent = useCallback(async (
    agentType: AgentType,
    name: string,
    description: string,
    config: AgentConfig,
    runFrequencyMinutes = 60
  ) => {
    if (!user) return null;

    try {
      // Cast to any since agents table was just created and types haven't been regenerated
      const { data, error } = await (supabase
        .from('agents') as any)
        .insert({
          user_id: user.id,
          agent_type: agentType,
          name,
          description,
          config: config as unknown as Record<string, unknown>,
          run_frequency_minutes: runFrequencyMinutes,
          next_run_at: new Date(Date.now() + runFrequencyMinutes * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success(`Agent "${name}" created successfully`);
      await fetchAgents();
      return data as Agent;
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create agent');
      return null;
    }
  }, [user, fetchAgents]);

  const updateAgent = useCallback(async (
    agentId: string,
    updates: Partial<Pick<Agent, 'name' | 'description' | 'config' | 'is_enabled' | 'run_frequency_minutes'>>
  ) => {
    if (!user) return false;

    try {
      const updatePayload: Record<string, unknown> = { ...updates };
      if (updates.config) {
        updatePayload.config = updates.config as unknown as Record<string, unknown>;
      }
      
      const { error } = await (supabase
        .from('agents') as any)
        .update(updatePayload)
        .eq('id', agentId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success('Agent updated');
      await fetchAgents();
      return true;
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error('Failed to update agent');
      return false;
    }
  }, [user, fetchAgents]);

  const deleteAgent = useCallback(async (agentId: string) => {
    if (!user) return false;

    try {
      const { error } = await (supabase
        .from('agents') as any)
        .delete()
        .eq('id', agentId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success('Agent deleted');
      await fetchAgents();
      return true;
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
      return false;
    }
  }, [user, fetchAgents]);

  const triggerAgentRun = useCallback(async (agentId: string) => {
    if (!user) return null;

    try {
      // Create a new run record
      const { data: run, error: runError } = await (supabase
        .from('agent_runs') as any)
        .insert({
          agent_id: agentId,
          user_id: user.id,
          status: 'running'
        })
        .select()
        .single();

      if (runError) throw runError;

      // Call the agent execution edge function
      const { data, error } = await supabase.functions.invoke('execute-agent', {
        body: { agentId, runId: run.id }
      });

      if (error) {
        // Update run status to failed
        await (supabase
          .from('agent_runs') as any)
          .update({ status: 'failed', error_message: error.message, completed_at: new Date().toISOString() })
          .eq('id', run.id);
        throw error;
      }

      toast.success('Agent run started');
      await fetchRuns(agentId);
      return run as AgentRun;
    } catch (error) {
      console.error('Error triggering agent run:', error);
      toast.error('Failed to start agent run');
      return null;
    }
  }, [user, fetchRuns]);

  const markFindingRead = useCallback(async (findingId: string) => {
    if (!user) return;

    try {
      await (supabase
        .from('agent_findings') as any)
        .update({ is_read: true })
        .eq('id', findingId)
        .eq('user_id', user.id);

      setFindings(prev => prev.map(f => 
        f.id === findingId ? { ...f, is_read: true } : f
      ));
    } catch (error) {
      console.error('Error marking finding as read:', error);
    }
  }, [user]);

  const dismissFinding = useCallback(async (findingId: string) => {
    if (!user) return;

    try {
      await (supabase
        .from('agent_findings') as any)
        .update({ is_dismissed: true })
        .eq('id', findingId)
        .eq('user_id', user.id);

      setFindings(prev => prev.filter(f => f.id !== findingId));
      toast.success('Finding dismissed');
    } catch (error) {
      console.error('Error dismissing finding:', error);
    }
  }, [user]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      await (supabase
        .from('agent_notifications') as any)
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user]);

  const markAllNotificationsRead = useCallback(async () => {
    if (!user) return;

    try {
      await (supabase
        .from('agent_notifications') as any)
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchAgents(),
        fetchRuns(),
        fetchFindings(),
        fetchNotifications()
      ]).finally(() => setLoading(false));
    }
  }, [user, fetchAgents, fetchRuns, fetchFindings, fetchNotifications]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('agent_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new as AgentNotification;
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notifications
          toast.info(notification.title, {
            description: notification.message,
            action: notification.action_url ? {
              label: 'View',
              onClick: () => window.location.hash = notification.action_url || ''
            } : undefined
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    agents,
    runs,
    findings,
    notifications,
    unreadCount,
    loading,
    createAgent,
    updateAgent,
    deleteAgent,
    triggerAgentRun,
    markFindingRead,
    dismissFinding,
    markNotificationRead,
    markAllNotificationsRead,
    refetch: {
      agents: fetchAgents,
      runs: fetchRuns,
      findings: fetchFindings,
      notifications: fetchNotifications
    }
  };
};
