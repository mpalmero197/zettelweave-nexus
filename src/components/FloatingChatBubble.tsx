import { useState, useEffect } from 'react';
import { MessageCircle, X, Users, UserPlus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { ChatPopup } from '@/components/friends/ChatPopup';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/chatUtils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Friend {
  id: string;
  user_id: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  user_status?: string;
}

interface MessagePreview {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  message: string;
  created_at: string;
  unread_count: number;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  created_at: string;
}

export function FloatingChatBubble() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [messageThreads, setMessageThreads] = useState<MessagePreview[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [activeChatFriend, setActiveChatFriend] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isDragging || isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isMobile]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const loadData = async () => {
    await Promise.all([
      loadFriends(),
      loadMessageThreads(),
      loadFriendRequests()
    ]);
  };

  const loadFriends = async () => {
    try {
      const { data } = await supabase.rpc('get_my_friends');
      if (data) {
        setFriends((data as any[]).map((f: any) => ({
          id: f.friend_user_id,
          user_id: f.friend_user_id,
          display_name: f.friend_display_name || f.friend_email || 'User',
          email: f.friend_email,
          avatar_url: f.friend_avatar_url,
          user_status: f.user_status,
        })));
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadMessageThreads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: messages } = await supabase
        .from('chat_messages')
        .select('sender_id, receiver_id, message, created_at, read_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (!messages || messages.length === 0) {
        setMessageThreads([]);
        setTotalUnread(0);
        return;
      }

      const threadMap = new Map<string, { message: string; created_at: string }>();
      const otherUserIds: string[] = [];

      for (const msg of messages) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!threadMap.has(otherUserId)) {
          threadMap.set(otherUserId, { message: msg.message, created_at: msg.created_at });
          otherUserIds.push(otherUserId);
        }
      }

      if (otherUserIds.length === 0) {
        setMessageThreads([]);
        setTotalUnread(0);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', otherUserIds);

      const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>();
      for (const p of (profiles || [])) {
        // Use display_name, fall back to matching friend's email, then user_id prefix
        const friendMatch = friends.find(f => f.user_id === p.user_id);
        const name = p.display_name || friendMatch?.email || `User ${p.user_id.substring(0, 6)}`;
        profileMap.set(p.user_id, { display_name: name, avatar_url: p.avatar_url });
      }

      const { data: unreadMessages } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .is('read_at', null)
        .in('sender_id', otherUserIds);

      const unreadMap = new Map<string, number>();
      let totalUnreadCount = 0;
      for (const um of (unreadMessages || [])) {
        const c = (unreadMap.get(um.sender_id) || 0) + 1;
        unreadMap.set(um.sender_id, c);
        totalUnreadCount++;
      }

      const threads: MessagePreview[] = otherUserIds.map(uid => {
        const thread = threadMap.get(uid)!;
        const profile = profileMap.get(uid);
        return {
          id: uid,
          sender_id: uid,
          sender_name: profile?.display_name || `User ${uid.substring(0, 6)}`,
          sender_avatar: profile?.avatar_url ?? undefined,
          message: thread.message,
          created_at: thread.created_at,
          unread_count: unreadMap.get(uid) || 0,
        };
      });

      setMessageThreads(threads);
      setTotalUnread(totalUnreadCount);
    } catch (error) {
      console.error('Error loading message threads:', error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: requests } = await supabase
        .from('friend_requests')
        .select('id, sender_id, created_at')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (!requests || requests.length === 0) {
        setFriendRequests([]);
        return;
      }

      const senderIds = requests.map(r => r.sender_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>();
      for (const p of (profiles || [])) {
        profileMap.set(p.user_id, { display_name: p.display_name || friends.find(f => f.user_id === p.user_id)?.email || `User ${p.user_id.substring(0, 6)}`, avatar_url: p.avatar_url });
      }

      const requestsWithProfiles = requests.map(req => {
        const profile = profileMap.get(req.sender_id);
        return {
          id: req.id,
          sender_id: req.sender_id,
          sender_name: profile?.display_name || 'Unknown User',
          sender_avatar: profile?.avatar_url ?? undefined,
          created_at: req.created_at,
        };
      });

      setFriendRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const getPanelPosition = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const isRight = position.x > viewportWidth / 2;
    const isBottom = position.y > viewportHeight / 2;

    let left: string | undefined;
    let right: string | undefined;
    let top: string | undefined;
    let bottom: string | undefined;

    if (isRight) {
      right = `${viewportWidth - position.x}px`;
    } else {
      left = `${position.x + 60}px`;
    }

    if (isBottom) {
      bottom = `${viewportHeight - position.y}px`;
    } else {
      top = `${position.y + 60}px`;
    }

    return { left, right, top, bottom };
  };

  const totalBadgeCount = totalUnread + friendRequests.length;

  // ── Shared panel content (used in both desktop card and mobile sheet) ──
  const renderPanelContent = () => (
    <Tabs defaultValue="messages" className="w-full flex-1 flex flex-col">
      <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-border bg-transparent h-10 shrink-0">
        <TabsTrigger value="messages" className="relative text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
          Messages
          {totalUnread > 0 && (
            <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] animate-chat-badge-pulse">
              {totalUnread}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="friends" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
          <Users className="h-3.5 w-3.5 mr-1" />
          Friends
        </TabsTrigger>
        <TabsTrigger value="requests" className="relative text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
          Requests
          {friendRequests.length > 0 && (
            <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] animate-chat-badge-pulse">
              {friendRequests.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <ScrollArea className={cn(isMobile ? 'flex-1' : 'h-[380px]')}>
        <TabsContent value="messages" className="p-2 space-y-0.5 mt-0">
          {messageThreads.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1 opacity-70">Start a conversation with a friend</p>
            </div>
          ) : (
            messageThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => {
                  setActiveChatFriend({ id: thread.sender_id, name: thread.sender_name, avatar: thread.sender_avatar });
                  if (isMobile) setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left',
                  'hover:bg-accent/60 active:bg-accent',
                  thread.unread_count > 0 && 'bg-accent/30'
                )}
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={thread.sender_avatar} />
                  <AvatarFallback className="text-xs">{thread.sender_name ? thread.sender_name.substring(0, 2).toUpperCase() : '??'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={cn('text-sm truncate', thread.unread_count > 0 ? 'font-semibold' : 'font-medium')}>
                      {thread.sender_name}
                    </p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                      {formatRelativeTime(thread.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={cn('text-xs truncate', thread.unread_count > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                      {thread.message}
                    </p>
                    {thread.unread_count > 0 && (
                      <Badge variant="destructive" className="h-4 min-w-4 p-0 flex items-center justify-center text-[10px] flex-shrink-0 ml-2 animate-chat-badge-pulse">
                        {thread.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </TabsContent>

        <TabsContent value="friends" className="p-2 space-y-0.5 mt-0">
          {friends.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No friends yet</p>
              <p className="text-xs mt-1 opacity-70">Search for users to connect</p>
            </div>
          ) : (
            friends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => {
                  setActiveChatFriend({ id: friend.id, name: friend.display_name, avatar: friend.avatar_url });
                  if (isMobile) setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/60 active:bg-accent transition-colors text-left"
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={friend.avatar_url} />
                    <AvatarFallback className="text-xs">{friend.display_name ? friend.display_name.substring(0, 2).toUpperCase() : '??'}</AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
                    friend.user_status === 'online' ? 'bg-primary animate-chat-online-pulse' :
                    friend.user_status === 'idle' ? 'bg-accent-foreground/40' : 'bg-muted-foreground/30'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{friend.display_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{friend.user_status || 'offline'}</p>
                </div>
              </button>
            ))
          )}
        </TabsContent>

        <TabsContent value="requests" className="p-2 space-y-0.5 mt-0">
          {friendRequests.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No pending requests</p>
              <p className="text-xs mt-1 opacity-70">Friend requests will appear here</p>
            </div>
          ) : (
            friendRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50"
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={request.sender_avatar} />
                  <AvatarFallback className="text-xs">{request.sender_name ? request.sender_name.substring(0, 2).toUpperCase() : '??'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{request.sender_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(request.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );

  // ── Mobile: small header-integrated button + full-screen Sheet ──
  if (isMobile) {
    return (
      <>
        {/* Small fixed pill — bottom-left to avoid FAB conflict */}
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'md:hidden fixed bottom-6 left-4 z-50 h-11 rounded-full px-3',
            'flex items-center gap-2',
            'bg-card border border-border text-foreground shadow-md',
            'transition-transform duration-200 active:scale-95',
            'focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label="Open messages"
        >
          <MessageCircle className="h-5 w-5" />
          {totalBadgeCount > 0 && (
            <Badge
              variant="destructive"
              className="h-5 min-w-5 p-0 flex items-center justify-center text-[10px] rounded-full animate-chat-badge-pulse"
            >
              {totalBadgeCount}
            </Badge>
          )}
        </button>

        {/* Full-screen sheet for messages */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl h-[85vh] p-0 flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
              <h2 className="text-base font-semibold">Messages</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {renderPanelContent()}
          </SheetContent>
        </Sheet>

        {activeChatFriend && (
          <ChatPopup
            friendId={activeChatFriend.id}
            friendName={activeChatFriend.name}
            friendAvatar={activeChatFriend.avatar}
            onClose={() => setActiveChatFriend(null)}
          />
        )}
      </>
    );
  }

  // ── Desktop: draggable floating bubble + card popup ──
  return (
    <>
      <div
        className="flex flex-col items-end gap-3"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
      >
        {isOpen && (
          <Card
            className={cn(
              'w-96 border border-border bg-card shadow-[var(--shadow-material-5)]',
              'rounded-2xl overflow-hidden',
              'animate-scale-in origin-bottom-left'
            )}
            style={{
              position: 'fixed',
              ...getPanelPosition(),
              zIndex: 9998,
            }}
          >
            <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold">Messages</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={() => setIsOpen(false)}
                aria-label="Close messages panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {renderPanelContent()}
            </CardContent>
          </Card>
        )}

        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'h-14 w-14 rounded-full shadow-[var(--shadow-material-4)] relative',
            'transition-transform duration-200',
            isOpen && 'rotate-0'
          )}
          aria-label={isOpen ? 'Close messages panel' : 'Open messages and friends'}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              <MessageCircle className="h-6 w-6" />
              {totalBadgeCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] rounded-full animate-chat-badge-pulse"
                >
                  {totalBadgeCount}
                </Badge>
              )}
            </>
          )}
        </Button>
      </div>

      {activeChatFriend && (
        <ChatPopup
          friendId={activeChatFriend.id}
          friendName={activeChatFriend.name}
          friendAvatar={activeChatFriend.avatar}
          onClose={() => setActiveChatFriend(null)}
        />
      )}
    </>
  );
}
