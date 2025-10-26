import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserPlus, Users, MessageCircle, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Friend {
  friend_user_id: string;
  friend_email: string;
  friend_display_name: string;
  friend_avatar_url: string;
  friendship_created_at: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  message: string;
  created_at: string;
  sender_email?: string;
  sender_display_name?: string;
  sender_avatar_url?: string;
}

interface SearchResult {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  is_friend: boolean;
  has_pending_request: boolean;
}

interface FriendsPanelProps {
  onOpenChat: (friendId: string, friendName: string) => void;
}

export function FriendsPanel({ onOpenChat }: FriendsPanelProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
    subscribeToRealtime();
  }, []);

  const subscribeToRealtime = () => {
    const channel = supabase
      .channel('friends-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        () => {
          loadFriendRequests();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => {
          loadFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadFriends = async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_friends');
      
      if (error) throw error;
      setFriends(data || []);
    } catch (error: any) {
      console.error('Error loading friends:', error);
      toast.error('Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get pending requests received
      const { data: received, error: receivedError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (receivedError) throw receivedError;

      // Get sent requests
      const { data: sent, error: sentError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;

      setPendingRequests(received || []);
      setSentRequests(sent || []);
    } catch (error: any) {
      console.error('Error loading friend requests:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_users', {
        _search_query: searchQuery
      });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('friend_requests').insert({
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending'
      });

      if (error) throw error;

      toast.success('Friend request sent!');
      searchUsers(); // Refresh search results
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success(accept ? 'Friend request accepted!' : 'Friend request declined');
      loadFriendRequests();
      if (accept) loadFriends();
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
      toast.error('Failed to respond to request');
    }
  };

  const getUserInitials = (name: string | null, email: string) => {
    if (name) return name.substring(0, 2).toUpperCase();
    return email.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <Card className="w-full h-full">
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Friends & Community
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">
              Friends {friends.length > 0 && `(${friends.length})`}
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            <ScrollArea className="h-[500px]">
              {friends.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No friends yet. Search for users to connect!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <Card key={friend.friend_user_id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={friend.friend_avatar_url} />
                            <AvatarFallback>
                              {getUserInitials(friend.friend_display_name, friend.friend_email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {friend.friend_display_name || friend.friend_email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {friend.friend_email}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => onOpenChat(friend.friend_user_id, friend.friend_display_name || friend.friend_email)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <ScrollArea className="h-[500px]">
              {pendingRequests.length === 0 && sentRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending friend requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Received Requests</h3>
                      <div className="space-y-2">
                        {pendingRequests.map((request) => (
                          <Card key={request.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback>
                                    {request.sender_id.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">New Request</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(request.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => respondToRequest(request.id, true)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => respondToRequest(request.id, false)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {sentRequests.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Sent Requests</h3>
                      <div className="space-y-2">
                        {sentRequests.map((request) => (
                          <Card key={request.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Pending...</p>
                              </div>
                              <Badge variant="secondary">Waiting</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              />
              <Button onClick={searchUsers} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            <ScrollArea className="h-[450px]">
              {searchResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Search for users to connect with</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <Card key={result.user_id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={result.avatar_url} />
                            <AvatarFallback>
                              {getUserInitials(result.display_name, result.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {result.display_name || result.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {result.email}
                            </p>
                          </div>
                        </div>
                        {result.is_friend ? (
                          <Badge variant="secondary">Friends</Badge>
                        ) : result.has_pending_request ? (
                          <Badge>Pending</Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => sendFriendRequest(result.user_id)}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add Friend
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}