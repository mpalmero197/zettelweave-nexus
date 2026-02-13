import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus, Mail, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { FriendRequest, SearchResult } from './CollabStudio';

interface DiscoverSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sentRequests: FriendRequest[];
  onRefresh: () => void;
}

export function DiscoverSheet({ open, onOpenChange, sentRequests, onRefresh }: DiscoverSheetProps) {
  const [allUsers, setAllUsers] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [messageDialog, setMessageDialog] = useState<{ userId: string; name: string } | null>(null);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    if (open) loadAllUsers();
  }, [open]);

  const loadAllUsers = async () => {
    setIsLoadingAll(true);
    try {
      const { data } = await supabase.rpc('get_all_visible_users');
      setAllUsers(data || []);
    } catch { /* ignore */ } finally {
      setIsLoadingAll(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const { data } = await supabase.rpc('search_users', { _search_query: searchQuery });
      setSearchResults(data || []);
    } catch {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: existing } = await supabase.from('friend_requests').select('id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
        .eq('status', 'pending').maybeSingle();
      if (existing) { toast.error('Request already exists'); return; }
      await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: userId, status: 'pending' });
      toast.success('Friend request sent!');
      onRefresh();
      loadAllUsers();
    } catch {
      toast.error('Failed to send request');
    }
  };

  const submitMessageRequest = async () => {
    if (!messageDialog || !messageText.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('friend_requests').insert({
        sender_id: user.id, receiver_id: messageDialog.userId, status: 'pending', message: messageText.trim()
      });
      toast.success('Message request sent!');
      setMessageDialog(null);
      setMessageText('');
      onRefresh();
      loadAllUsers();
    } catch {
      toast.error('Failed to send');
    }
  };

  const displayList = searchQuery.trim() ? searchResults : allUsers;

  const renderUser = (user: SearchResult) => {
    const pendingReq = sentRequests.find(r => r.receiver_id === user.user_id);
    const name = user.display_name || user.email;

    return (
      <div key={user.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={user.avatar_url} />
          <AvatarFallback className="text-[10px] font-medium bg-muted">{name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
        </div>
        {user.is_friend ? (
          <span className="text-[10px] text-muted-foreground font-medium">Friends</span>
        ) : pendingReq ? (
          <span className="text-[10px] text-muted-foreground font-medium">Pending</span>
        ) : (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendFriendRequest(user.user_id)} title="Add friend">
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMessageDialog({ userId: user.user_id, name })} title="Send message">
              <Mail className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="text-base">Discover People</SheetTitle>
            <SheetDescription className="text-xs">Find and connect with others</SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                  placeholder="Search by name or email..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Button size="sm" className="h-8 text-xs" onClick={searchUsers} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-2">
            {(isLoadingAll && !searchQuery.trim()) ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : displayList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">{searchQuery.trim() ? 'No results found' : 'No users available'}</p>
              </div>
            ) : (
              displayList.map(renderUser)
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={!!messageDialog} onOpenChange={() => { setMessageDialog(null); setMessageText(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Message {messageDialog?.name}</DialogTitle>
            <DialogDescription className="text-xs">Send a message request to start chatting.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Write your message..."
            maxLength={500}
            rows={3}
            className="resize-none text-sm"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setMessageDialog(null); setMessageText(''); }}>Cancel</Button>
            <Button size="sm" onClick={submitMessageRequest} disabled={!messageText.trim()}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
