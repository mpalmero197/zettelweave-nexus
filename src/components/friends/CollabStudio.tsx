import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContactSidebar } from './ContactSidebar';
import { ChatPane } from './ChatPane';
import { DiscoverSheet } from './DiscoverSheet';
import { RequestsSheet } from './RequestsSheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export type UserStatus = 'online' | 'busy' | 'away' | 'dnd' | 'offline';

export interface Friend {
  friend_user_id: string;
  friend_email: string;
  friend_display_name: string;
  friend_avatar_url: string;
  friendship_created_at: string;
  user_status: UserStatus;
  last_activity_at: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  message: string;
  created_at: string;
  sender_email?: string;
  sender_display_name?: string;
  sender_avatar_url?: string;
  request_type?: 'friend' | 'message';
}

export interface SearchResult {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  is_friend: boolean;
  has_pending_request: boolean;
  user_status: UserStatus;
  last_activity_at: string;
}

export function CollabStudio() {
  const isMobile = useIsMobile();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [messageRequests, setMessageRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [myStatus, setMyStatus] = useState<UserStatus>('online');
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const loadFriends = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_friends');
      if (error) throw error;
      setFriends(data || []);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }, []);

  const loadFriendRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [received, messageReqs, sent] = await Promise.all([
        supabase.from('friend_requests').select('*').eq('receiver_id', user.id).eq('status', 'pending').or('message.is.null,message.eq.'),
        supabase.from('friend_requests').select('*').eq('receiver_id', user.id).eq('status', 'pending').not('message', 'is', null).neq('message', ''),
        supabase.from('friend_requests').select('*').eq('sender_id', user.id).eq('status', 'pending'),
      ]);

      setPendingRequests(received.data || []);
      setMessageRequests((messageReqs.data || []).map(r => ({ ...r, request_type: 'message' as const })));
      setSentRequests(sent.data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  }, []);

  const loadMyProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('user_status, is_visible').eq('user_id', user.id).single();
      if (data) {
        setMyStatus(data.user_status || 'online');
        setIsVisible(data.is_visible ?? true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, []);

  const loadUnreadCounts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .is('read_at', null);
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(msg => {
          counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
        });
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadFriends(), loadFriendRequests(), loadMyProfile(), loadUnreadCounts()]);
      setIsLoading(false);
    };
    init();

    // Activity tracking
    const updateActivity = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({ last_activity_at: new Date().toISOString() }).eq('user_id', user.id);
    };
    const events = ['mousemove', 'keypress', 'click'];
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));

    // Realtime
    const channel = supabase
      .channel('collab-studio')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => loadFriendRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => loadFriends())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => loadFriends())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => loadUnreadCounts())
      .subscribe();

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      supabase.removeChannel(channel);
    };
  }, []);

  const updateUserStatus = async (status: UserStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({ user_status: status }).eq('user_id', user.id);
      setMyStatus(status);
      toast.success(`Status: ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const updateVisibility = async (visible: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({ is_visible: visible }).eq('user_id', user.id);
      setIsVisible(visible);
      toast.success(visible ? 'Visible' : 'Invisible');
    } catch {
      toast.error('Failed to update visibility');
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    try {
      await supabase.from('friend_requests').update({ status: accept ? 'accepted' : 'declined' }).eq('id', requestId);
      toast.success(accept ? 'Request accepted!' : 'Request declined');
      loadFriendRequests();
      if (accept) loadFriends();
    } catch {
      toast.error('Failed to respond');
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      await supabase.from('friend_requests').delete().eq('id', requestId);
      toast.success('Request cancelled');
      loadFriendRequests();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    // Clear unread for this friend
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[friend.friend_user_id];
      return next;
    });
  };

  const totalRequestCount = pendingRequests.length + messageRequests.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'collab-studio',
      isMobile ? 'flex flex-col' : 'grid grid-cols-[280px_1fr]',
      'h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-border/50'
    )}>
      {/* Show sidebar always on desktop; on mobile show sidebar OR chat */}
      {(!isMobile || !selectedFriend) && (
        <ContactSidebar
          friends={friends}
          selectedFriend={selectedFriend}
          onSelectFriend={handleSelectFriend}
          myStatus={myStatus}
          isVisible={isVisible}
          onStatusChange={updateUserStatus}
          onVisibilityChange={updateVisibility}
          onOpenDiscover={() => setDiscoverOpen(true)}
          onOpenRequests={() => setRequestsOpen(true)}
          requestCount={totalRequestCount}
          unreadCounts={unreadCounts}
        />
      )}

      {(!isMobile || selectedFriend) && (
        <ChatPane
          friend={selectedFriend}
          onBack={isMobile ? () => setSelectedFriend(null) : undefined}
        />
      )}

      <DiscoverSheet
        open={discoverOpen}
        onOpenChange={setDiscoverOpen}
        sentRequests={sentRequests}
        onRefresh={() => { loadFriendRequests(); loadFriends(); }}
      />

      <RequestsSheet
        open={requestsOpen}
        onOpenChange={setRequestsOpen}
        pendingRequests={pendingRequests}
        messageRequests={messageRequests}
        sentRequests={sentRequests}
        onRespond={respondToRequest}
        onCancel={cancelRequest}
      />
    </div>
  );
}
