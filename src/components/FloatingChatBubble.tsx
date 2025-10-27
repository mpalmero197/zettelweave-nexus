import { useState, useEffect } from 'react';
import { MessageCircle, X, Users, UserPlus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { ChatPopup } from '@/components/friends/ChatPopup';
import { cn } from '@/lib/utils';

interface Friend {
  id: string;
  display_name: string;
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
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [messageThreads, setMessageThreads] = useState<MessagePreview[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [activeChatFriend, setActiveChatFriend] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadFriends(),
      loadMessageThreads(),
      loadFriendRequests()
    ]);
  };

  const loadFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id_1, user_id_2')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      if (!friendships) return;

      const friendIds = friendships.map(f => 
        f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, user_status')
        .in('user_id', friendIds);

      setFriends(profiles || []);
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

      if (!messages) return;

      const threadMap = new Map<string, MessagePreview>();
      let unreadCount = 0;

      for (const msg of messages) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        if (!threadMap.has(otherUserId)) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', otherUserId)
            .single();

          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', otherUserId)
            .eq('receiver_id', user.id)
            .is('read_at', null);

          threadMap.set(otherUserId, {
            id: otherUserId,
            sender_id: otherUserId,
            sender_name: profile?.display_name || 'Unknown User',
            sender_avatar: profile?.avatar_url,
            message: msg.message,
            created_at: msg.created_at,
            unread_count: count || 0
          });

          unreadCount += count || 0;
        }
      }

      setMessageThreads(Array.from(threadMap.values()));
      setTotalUnread(unreadCount);
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

      if (!requests) return;

      const requestsWithProfiles = await Promise.all(
        requests.map(async (req) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', req.sender_id)
            .single();

          return {
            id: req.id,
            sender_id: req.sender_id,
            sender_name: profile?.display_name || 'Unknown User',
            sender_avatar: profile?.avatar_url,
            created_at: req.created_at
          };
        })
      );

      setFriendRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const totalBadgeCount = totalUnread + friendRequests.length;

  return (
    <>
      {/* Floating Chat Bubble - Fixed to viewport */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3" style={{ position: 'fixed' }}>
        {isOpen && (
          <Card className="w-96 shadow-2xl border-2 glass-card animate-fade-in-up">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-semibold">Messages & Friends</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="messages" className="w-full">
                <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
                  <TabsTrigger value="messages" className="relative">
                    Messages
                    {totalUnread > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                        {totalUnread}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="friends">
                    <Users className="h-4 w-4 mr-1" />
                    Friends
                  </TabsTrigger>
                  <TabsTrigger value="requests" className="relative">
                    Requests
                    {friendRequests.length > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                        {friendRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[400px]">
                  <TabsContent value="messages" className="p-4 space-y-2 mt-0">
                    {messageThreads.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No messages yet</p>
                      </div>
                    ) : (
                      messageThreads.map((thread) => (
                        <button
                          key={thread.id}
                          onClick={() => setActiveChatFriend({ id: thread.sender_id, name: thread.sender_name, avatar: thread.sender_avatar })}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                        >
                          <Avatar className="h-10 w-10 ring-2 ring-border">
                            <AvatarImage src={thread.sender_avatar} />
                            <AvatarFallback>{thread.sender_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm truncate">{thread.sender_name}</p>
                              {thread.unread_count > 0 && (
                                <Badge variant="destructive" className="h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                                  {thread.unread_count}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{thread.message}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="friends" className="p-4 space-y-2 mt-0">
                    {friends.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No friends yet</p>
                      </div>
                    ) : (
                      friends.map((friend) => (
                        <button
                          key={friend.id}
                          onClick={() => setActiveChatFriend({ id: friend.id, name: friend.display_name, avatar: friend.avatar_url })}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                        >
                          <div className="relative">
                            <Avatar className="h-10 w-10 ring-2 ring-border">
                              <AvatarImage src={friend.avatar_url} />
                              <AvatarFallback>{friend.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card",
                              friend.user_status === 'online' ? 'bg-green-500' :
                              friend.user_status === 'idle' ? 'bg-yellow-500' : 'bg-gray-400'
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

                  <TabsContent value="requests" className="p-4 space-y-2 mt-0">
                    {friendRequests.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No pending requests</p>
                      </div>
                    ) : (
                      friendRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={request.sender_avatar} />
                            <AvatarFallback>{request.sender_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{request.sender_name}</p>
                            <p className="text-xs text-muted-foreground">Sent friend request</p>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full shadow-2xl relative"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              <MessageCircle className="h-6 w-6" />
              {totalBadgeCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-6 min-w-6 p-0 flex items-center justify-center text-xs rounded-full"
                >
                  {totalBadgeCount}
                </Badge>
              )}
            </>
          )}
        </Button>
      </div>

      {/* Active Chat Popup */}
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