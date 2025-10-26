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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
  Settings,
  Mail,
  UserCheck
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
  request_type?: 'friend' | 'message'; // New field to distinguish types
}

interface MessageRequest extends FriendRequest {
  request_type: 'message';
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
  const [messageRequests, setMessageRequests] = useState<MessageRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [myStatus, setMyStatus] = useState<UserStatus>('online');
  const [isVisible, setIsVisible] = useState(true);
  const [activityTimer, setActivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [messageText, setMessageText] = useState('');

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

      // Load received friend requests (no message)
      const { data: received, error: receivedError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .or('message.is.null,message.eq.');

      if (receivedError) throw receivedError;

      // Load received message requests (with message)
      const { data: messageReqs, error: messageError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .not('message', 'is', null)
        .neq('message', '');

      if (messageError) throw messageError;

      // Load sent requests
      const { data: sent, error: sentError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;

      console.log('Received requests:', received);
      console.log('Message requests:', messageReqs);
      console.log('Sent requests:', sent);

      setPendingRequests(received || []);
      setMessageRequests((messageReqs || []).map(req => ({ ...req, request_type: 'message' as const })));
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

  const sendMessageRequest = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setShowMessageDialog(true);
  };

  const submitMessageRequest = async () => {
    if (!messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for existing request
      const { data: existing } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        toast.error('A request already exists between you and this user');
        return;
      }

      const { error } = await supabase.from('friend_requests').insert({
        sender_id: user.id,
        receiver_id: selectedUserId,
        status: 'pending',
        message: messageText.trim()
      });

      if (error) throw error;

      toast.success('Message request sent!');
      setShowMessageDialog(false);
      setMessageText('');
      searchUsers();
      loadAllUsers();
      loadFriendRequests();
    } catch (error: any) {
      console.error('Error sending message request:', error);
      if (error.code === '23505') {
        toast.error('A request already exists');
      } else {
        toast.error('Failed to send message request');
      }
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for existing request in either direction
      const { data: existing } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        toast.error('A friend request already exists between you and this user');
        return;
      }

      const { error } = await supabase.from('friend_requests').insert({
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending'
      });

      if (error) throw error;

      toast.success('Friend request sent!');
      searchUsers();
      loadAllUsers();
      loadFriendRequests();
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      if (error.code === '23505') {
        toast.error('A friend request already exists');
      } else {
        toast.error('Failed to send friend request');
      }
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

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request cancelled');
      loadFriendRequests();
      searchUsers();
      loadAllUsers();
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request');
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
    
    // Find the pending request ID if there is one
    const pendingRequest = 'has_pending_request' in user && user.has_pending_request
      ? sentRequests.find(req => req.receiver_id === userId)
      : null;
    
    const getLastOnlineText = () => {
      if (!lastActivity) return 'Unknown';
      
      const date = new Date(lastActivity);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (status === 'online' && diffMins < 2) return 'Online now';
      if (diffDays > 30) return 'Unknown';
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };
    
    return (
      <Card key={userId} className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-background/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
                    {getUserInitials(displayName, email)}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${getStatusColor(status)} flex items-center justify-center transition-all duration-300 group-hover:scale-110`}>
                  <div className="h-2 w-2">{getStatusIcon(status)}</div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate group-hover:text-primary transition-colors">
                  {displayName || email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {email}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50">
                    {getStatusLabel(status)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    • {getLastOnlineText()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0 ml-3">
              {isFriend ? (
                <Button
                  size="sm"
                  onClick={() => onOpenChat(userId, displayName || email)}
                  className="gap-2 group-hover:shadow-md transition-all"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Chat</span>
                </Button>
              ) : (
                <>
                  {'is_friend' in user && user.is_friend ? (
                    <Badge variant="secondary" className="shadow-sm">Friends</Badge>
                  ) : pendingRequest ? (
                    <div className="flex items-center gap-2">
                      <Badge className="shadow-sm animate-pulse">Pending</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelRequest(pendingRequest.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => sendFriendRequest(userId)}
                        className="gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendMessageRequest(userId, displayName || email)}
                        className="gap-2 border-primary/50 hover:bg-primary/10"
                      >
                        <Mail className="h-4 w-4" />
                        <span className="hidden sm:inline">Message</span>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
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
    <div className="w-full h-full flex flex-col glass-card rounded-xl overflow-hidden border border-border/50 shadow-2xl">
      {/* Modern Header with Gradient */}
      <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50 backdrop-blur-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Collaboration Hub
                </h2>
                <p className="text-sm text-muted-foreground">Connect and collaborate with others</p>
              </div>
            </div>
            <Badge variant="outline" className="px-3 py-1 border-primary/50">
              {friends.length} {friends.length === 1 ? 'Friend' : 'Friends'}
            </Badge>
          </div>
          
          {/* Status & Visibility Settings - Modern Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300">
              <CardContent className="p-4">
                <Label className="text-xs text-muted-foreground mb-2 block">Status</Label>
                <Select value={myStatus} onValueChange={(val) => updateUserStatus(val as UserStatus)}>
                  <SelectTrigger className="border-none bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-lg border-border/50">
                    <SelectItem value="online">
                      <div className="flex items-center gap-2">
                        <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                        <span>Online</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="busy">
                      <div className="flex items-center gap-2">
                        <Minus className="h-3 w-3 text-yellow-500" />
                        <span>Busy</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dnd">
                      <div className="flex items-center gap-2">
                        <Moon className="h-3 w-3 text-red-500" />
                        <span>Do Not Disturb</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="offline">
                      <div className="flex items-center gap-2">
                        <Circle className="h-3 w-3 fill-gray-400 text-gray-400" />
                        <span>Appear Offline</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Visibility</Label>
                  <span className="text-sm font-medium">
                    {isVisible ? 'Visible' : 'Invisible'}
                  </span>
                </div>
                <Switch
                  checked={isVisible}
                  onCheckedChange={updateVisibility}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modern Tab System */}
      <Tabs defaultValue="friends" className="flex-1 flex flex-col">
        <div className="px-6 pt-4 border-b border-border/50 bg-background/30 backdrop-blur-sm">
          <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="friends" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Friends</span>
              {friends.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {friends.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="discover" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Search className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Discover</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
              <Mail className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Messages</span>
              {messageRequests.length > 0 && (
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full flex items-center justify-center text-[10px] text-destructive-foreground font-bold animate-pulse">
                  {messageRequests.length}
                </div>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Requests</span>
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Search className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Friends Tab */}
        <TabsContent value="friends" className="flex-1 m-0 p-6 animate-fade-in">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center animate-fade-in">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-10 w-10 text-primary/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  Discover and connect with others to start collaborating
                </p>
                <Button variant="default" className="gap-2">
                  <Search className="h-4 w-4" />
                  Discover People
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {friends.map((friend, idx) => (
                  <div key={friend.friend_user_id} className="animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                    {renderUserCard(friend, true)}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover" className="flex-1 m-0 p-6 animate-fade-in">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {allUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-10 w-10 text-primary/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No users available</h3>
                <p className="text-sm text-muted-foreground">Check back later for new connections</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {allUsers.map((user, idx) => (
                  <div key={user.user_id} className="animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                    {renderUserCard(user, false)}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="flex-1 m-0 p-6 animate-fade-in">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {messageRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="h-10 w-10 text-primary/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No message requests</h3>
                <p className="text-sm text-muted-foreground">You'll see message requests from others here</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {messageRequests.map((request, idx) => (
                  <Card key={request.id} className="overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                    <CardContent className="p-0">
                      <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {request.sender_id.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">New Message Request</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                      </div>
                      <div className="p-4 bg-muted/30">
                        <p className="text-sm leading-relaxed">{request.message}</p>
                      </div>
                      <div className="p-4 flex gap-2">
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => {
                            respondToRequest(request.id, true);
                            setTimeout(() => onOpenChat(request.sender_id, 'New Friend'), 500);
                          }}
                        >
                          <Check className="h-4 w-4" />
                          Accept & Chat
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => respondToRequest(request.id, false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="flex-1 m-0 p-6 animate-fade-in">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {pendingRequests.length === 0 && sentRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <UserPlus className="h-10 w-10 text-primary/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                <p className="text-sm text-muted-foreground">Friend requests will appear here</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingRequests.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Received ({pendingRequests.length})
                    </h3>
                    {pendingRequests.map((request, idx) => (
                      <Card key={request.id} className="overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                  {request.sender_id.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">Friend Request</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(request.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {sentRequests.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Sent ({sentRequests.length})
                    </h3>
                    {sentRequests.map((request, idx) => (
                      <Card key={request.id} className="overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">Request Pending</p>
                                <p className="text-xs text-muted-foreground">
                                  Sent {new Date(request.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelRequest(request.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="flex-1 m-0 p-6 animate-fade-in">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                  className="pl-9 border-border/50 focus:border-primary/50 transition-colors"
                />
              </div>
              <Button onClick={searchUsers} disabled={isSearching} className="gap-2">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-500px)]">
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Search className="h-10 w-10 text-primary/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Search for users</h3>
                  <p className="text-sm text-muted-foreground">Find and connect with others</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {searchResults.map((result, idx) => (
                    <div key={result.user_id} className="animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                      {renderUserCard(result, false)}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* Message Request Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="sm:max-w-md border-border/50 bg-background/95 backdrop-blur-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Send Message to {selectedUserName}
            </DialogTitle>
            <DialogDescription>
              Send a message request. If accepted, you can start chatting and add them as a friend.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Write your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none border-border/50 focus:border-primary/50"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {messageText.length}/500 characters
              </p>
              <Badge variant={messageText.length > 400 ? 'destructive' : 'secondary'}>
                {500 - messageText.length} left
              </Badge>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowMessageDialog(false);
              setMessageText('');
            }}>
              Cancel
            </Button>
            <Button onClick={submitMessageRequest} className="gap-2">
              <Mail className="h-4 w-4" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
