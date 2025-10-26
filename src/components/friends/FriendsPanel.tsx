import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  UserPlus, 
  Users, 
  MessageCircle, 
  Check, 
  X, 
  Loader2,
  Circle,
  Clock,
  Minus,
  Moon,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UserStatus = 'online' | 'busy' | 'away' | 'dnd' | 'offline';

interface Friend {
  friend_user_id: string;
  friend_email: string;
  friend_display_name: string;
  friend_avatar_url: string;
  friendship_created_at: string;
  user_status: UserStatus;
  last_activity_at: string;
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
  user_status: UserStatus;
  last_activity_at: string;
}

interface FriendsPanelProps {
  onOpenChat: (friendId: string, friendName: string) => void;
}

const getStatusColor = (status: UserStatus) => {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'busy': return 'bg-yellow-500';
    case 'away': return 'bg-orange-500';
    case 'dnd': return 'bg-red-500';
    case 'offline': return 'bg-gray-400';
    default: return 'bg-gray-400';
  }
};

const getStatusIcon = (status: UserStatus) => {
  switch (status) {
    case 'online': return <Circle className="h-3 w-3" />;
    case 'busy': return <Minus className="h-3 w-3" />;
    case 'away': return <Clock className="h-3 w-3" />;
    case 'dnd': return <Moon className="h-3 w-3" />;
    case 'offline': return <Circle className="h-3 w-3" />;
    default: return <Circle className="h-3 w-3" />;
  }
};

const getStatusLabel = (status: UserStatus) => {
  switch (status) {
    case 'online': return 'Online';
    case 'busy': return 'Busy';
    case 'away': return 'Away';
    case 'dnd': return 'Do Not Disturb';
    case 'offline': return 'Offline';
    default: return 'Offline';
  }
};

export function FriendsPanel({ onOpenChat }: FriendsPanelProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [allUsers, setAllUsers] = useState<SearchResult[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [myStatus, setMyStatus] = useState<UserStatus>('online');
  const [isVisible, setIsVisible] = useState(true);
  const [activityTimer, setActivityTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadInitialData();
    subscribeToRealtime();
    startActivityTracking();

    return () => {
      if (activityTimer) clearInterval(activityTimer);
    };
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadFriends(),
      loadFriendRequests(),
      loadAllUsers(),
      loadMyProfile()
    ]);
    setIsLoading(false);
  };

  const loadMyProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('user_status, is_visible')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setMyStatus(data.user_status || 'online');
        setIsVisible(data.is_visible ?? true);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    }
  };

  const startActivityTracking = () => {
    // Update activity on user interactions
    const updateActivity = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('user_id', user.id);
    };

    // Track mouse and keyboard activity
    const events = ['mousemove', 'keypress', 'click', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Auto-away after 5 minutes
    const timer = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || myStatus !== 'online') return;

      const { data } = await supabase
        .from('profiles')
        .select('last_activity_at')
        .eq('user_id', user.id)
        .single();

      if (data?.last_activity_at) {
        const lastActivity = new Date(data.last_activity_at);
        const now = new Date();
        const diff = (now.getTime() - lastActivity.getTime()) / 1000 / 60;
        
        if (diff >= 5) {
          await updateUserStatus('away');
        }
      }
    }, 30000); // Check every 30 seconds

    setActivityTimer(timer);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      if (timer) clearInterval(timer);
    };
  };

  const updateUserStatus = async (status: UserStatus) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ user_status: status })
        .eq('user_id', user.id);

      if (error) throw error;
      setMyStatus(status);
      toast.success(`Status set to ${getStatusLabel(status)}`);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const updateVisibility = async (visible: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ is_visible: visible })
        .eq('user_id', user.id);

      if (error) throw error;
      setIsVisible(visible);
      toast.success(visible ? 'You are now visible to others' : 'You are now invisible');
    } catch (error: any) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

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
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => {
          loadFriends(); // Refresh to get updated statuses
          loadAllUsers();
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
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_visible_users');
      
      if (error) throw error;
      setAllUsers(data || []);
    } catch (error: any) {
      console.error('Error loading all users:', error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: received, error: receivedError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (receivedError) throw receivedError;

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
      searchUsers();
      loadAllUsers();
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

  const renderUserCard = (user: Friend | SearchResult, isFriend: boolean = false) => {
    const status = user.user_status || 'offline';
    const userId = 'friend_user_id' in user ? user.friend_user_id : user.user_id;
    const displayName = 'friend_display_name' in user ? user.friend_display_name : user.display_name;
    const email = 'friend_email' in user ? user.friend_email : user.email;
    const avatarUrl = 'friend_avatar_url' in user ? user.friend_avatar_url : user.avatar_url;
    const lastActivity = user.last_activity_at;
    
    const getLastOnlineText = () => {
      if (!lastActivity) return 'Never';
      const date = new Date(lastActivity);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (status === 'online') return 'Online now';
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };
    
    return (
      <Card key={userId} className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar>
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>
                  {getUserInitials(displayName, email)}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(status)} flex items-center justify-center`}>
                {getStatusIcon(status)}
              </div>
            </div>
            <div>
              <p className="font-medium">
                {displayName || email}
              </p>
              <p className="text-xs text-muted-foreground">
                {email}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {getStatusLabel(status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  • {getLastOnlineText()}
                </span>
              </div>
            </div>
          </div>
          {isFriend ? (
            <Button
              size="sm"
              onClick={() => onOpenChat(userId, displayName || email)}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Chat
            </Button>
          ) : (
            <>
              {'is_friend' in user && user.is_friend ? (
                <Badge variant="secondary">Friends</Badge>
              ) : 'has_pending_request' in user && user.has_pending_request ? (
                <Badge>Pending</Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => sendFriendRequest(userId)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </>
          )}
        </div>
      </Card>
    );
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
          Collaboration Hub
        </CardTitle>
        
        {/* Status & Visibility Settings */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="status-select" className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              My Status
            </Label>
            <Select value={myStatus} onValueChange={(val) => updateUserStatus(val as UserStatus)}>
              <SelectTrigger id="status-select" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">
                  <div className="flex items-center gap-2">
                    <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                    Online
                  </div>
                </SelectItem>
                <SelectItem value="busy">
                  <div className="flex items-center gap-2">
                    <Minus className="h-3 w-3 text-yellow-500" />
                    Busy
                  </div>
                </SelectItem>
                <SelectItem value="dnd">
                  <div className="flex items-center gap-2">
                    <Moon className="h-3 w-3 text-red-500" />
                    Do Not Disturb
                  </div>
                </SelectItem>
                <SelectItem value="offline">
                  <div className="flex items-center gap-2">
                    <Circle className="h-3 w-3 fill-gray-400 text-gray-400" />
                    Appear Offline
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="visibility-switch" className="text-sm font-medium flex items-center gap-2">
              {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Visibility
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isVisible ? 'Visible' : 'Invisible'}
              </span>
              <Switch
                id="visibility-switch"
                checked={isVisible}
                onCheckedChange={updateVisibility}
              />
            </div>
          </div>
        </div>
        <Separator className="mt-4" />
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="friends">
              Friends {friends.length > 0 && `(${friends.length})`}
            </TabsTrigger>
            <TabsTrigger value="discover">
              Discover
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
            <ScrollArea className="h-[400px]">
              {friends.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No friends yet. Discover users to connect!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => renderUserCard(friend, true))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="discover" className="space-y-4">
            <ScrollArea className="h-[450px]">
              {allUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allUsers.map((user) => renderUserCard(user, false))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <ScrollArea className="h-[450px]">
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

            <ScrollArea className="h-[400px]">
              {searchResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Search for users to connect with</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((result) => renderUserCard(result, false))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
