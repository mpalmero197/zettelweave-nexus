import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, ArrowLeft, UserPlus, Check, CheckCheck, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  type Message,
  type ChatItem,
  groupMessagesByDate,
  isEmojiOnly,
} from '@/utils/chatUtils';
import type { Friend } from './CollabStudio';

interface ChatPaneProps {
  friend: Friend | null;
  onBack?: () => void;
}

export function ChatPane({ friend, onBack }: ChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [isFriend, setIsFriend] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!friend) return;
    loadCurrentUser();
    loadMessages();
    checkFriendship();
    const cleanup = subscribeToMessages();
    return cleanup;
  }, [friend?.friend_user_id]);

  useEffect(() => {
    sentinelRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const checkFriendship = async () => {
    if (!friend) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: f } = await supabase
      .from('friendships').select('id')
      .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${friend.friend_user_id}),and(user_id_1.eq.${friend.friend_user_id},user_id_2.eq.${user.id})`)
      .maybeSingle();
    setIsFriend(!!f);

    const { data: r } = await supabase
      .from('friend_requests').select('id')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.friend_user_id}),and(sender_id.eq.${friend.friend_user_id},receiver_id.eq.${user.id})`)
      .eq('status', 'pending').maybeSingle();
    setHasPendingRequest(!!r);
  };

  const loadMessages = async () => {
    if (!friend) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('chat_messages').select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.friend_user_id}),and(sender_id.eq.${friend.friend_user_id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    setMessages(data || []);

    // Mark as read
    await supabase
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', friend.friend_user_id)
      .eq('receiver_id', user.id)
      .is('read_at', null);
  };

  const subscribeToMessages = () => {
    if (!friend) return () => {};
    const channel = supabase
      .channel(`chat-pane:${friend.friend_user_id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `sender_id=eq.${friend.friend_user_id}`
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => [...prev, msg]);
        supabase.from('chat_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const sendMessage = useCallback(async () => {
    const text = newMessage.trim();
    if (!text || !currentUserId || !friend) return;

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      receiver_id: friend.friend_user_id,
      message: text,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const { data, error } = await supabase.from('chat_messages').insert({
        sender_id: currentUserId, receiver_id: friend.friend_user_id, message: text,
      }).select().single();
      if (error) throw error;
      if (data) setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      toast.error('Failed to send');
    }
  }, [newMessage, currentUserId, friend]);

  const sendFriendRequest = async () => {
    if (!friend) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: friend.friend_user_id, status: 'pending' });
      setHasPendingRequest(true);
      toast.success('Friend request sent!');
    } catch {
      toast.error('Failed to send request');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 76) + 'px';
  };

  // Empty state
  if (!friend) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background/50 text-center px-6">
        <MessageSquare className="h-12 w-12 text-muted-foreground/20 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Select a conversation</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Pick a friend from the sidebar to start chatting</p>
      </div>
    );
  }

  const chatItems = groupMessagesByDate(messages);
  const friendName = friend.friend_display_name || friend.friend_email;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur-sm flex-shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Avatar className="h-8 w-8">
          <AvatarImage src={friend.friend_avatar_url} />
          <AvatarFallback className="text-[10px] font-medium">{(friendName).substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{friendName}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{friend.user_status || 'offline'}</p>
        </div>
      </div>

      {/* Friend request alert */}
      {!isFriend && !hasPendingRequest && (
        <div className="px-3 pt-2 flex-shrink-0">
          <Alert className="border-border bg-muted/50 py-2">
            <AlertDescription className="flex items-center justify-between text-xs">
              <span>Not friends yet</span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={sendFriendRequest}>
                <UserPlus className="h-3 w-3 mr-1" />Add
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-minimal">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar className="h-14 w-14 mb-3">
              <AvatarImage src={friend.friend_avatar_url} />
              <AvatarFallback className="text-base">{(friendName).substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="text-sm font-medium">Start a conversation</p>
            <p className="text-xs text-muted-foreground mt-0.5">Say hi to {friendName} 👋</p>
          </div>
        ) : (
          chatItems.map((item, index) => {
            if (item.type === 'date-separator') {
              return (
                <div key={`sep-${item.date}`} className="flex items-center justify-center py-3">
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">{item.label}</span>
                </div>
              );
            }
            const msg = item;
            const isMine = msg.sender_id === currentUserId;
            const emoji = isEmojiOnly(msg.message);
            const next = chatItems[index + 1];
            const prev = chatItems[index - 1];
            const isLast = !next || next.type === 'date-separator' || next.sender_id !== msg.sender_id;
            const isFirst = !prev || prev.type === 'date-separator' || prev.sender_id !== msg.sender_id;

            return (
              <div key={msg.id} className={cn('flex animate-chat-msg-in', isMine ? 'justify-end' : 'justify-start', !isLast ? 'mb-0.5' : 'mb-2')}>
                {!isMine && (
                  <div className="w-7 mr-1.5 flex-shrink-0">
                    {isFirst && (
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={friend.friend_avatar_url} />
                        <AvatarFallback className="text-[10px]">{(friendName).substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}
                <div className="flex flex-col max-w-[72%]">
                  <div className={cn(
                    'px-3 py-1.5 break-words',
                    emoji ? 'text-2xl bg-transparent px-1'
                      : isMine ? 'bg-primary text-primary-foreground rounded-2xl'
                      : 'bg-muted text-foreground rounded-2xl',
                    !emoji && isMine && isFirst && 'rounded-tr-md',
                    !emoji && isMine && isLast && 'rounded-br-md',
                    !emoji && !isMine && isFirst && 'rounded-tl-md',
                    !emoji && !isMine && isLast && 'rounded-bl-md',
                  )}>
                    <p className={cn('text-sm leading-relaxed', emoji && 'text-2xl')}>{msg.message}</p>
                  </div>
                  {isLast && (
                    <div className={cn('flex items-center gap-1 mt-0.5 px-1', isMine ? 'justify-end' : 'justify-start')}>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(msg.created_at), 'HH:mm')}</span>
                      {isMine && !msg.id.startsWith('temp-') && (
                        msg.read_at ? <CheckCheck className="h-3 w-3 text-primary" /> : <Check className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={sentinelRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-1 border-t border-border/50 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            placeholder="Message..."
            value={newMessage}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-xl border border-border bg-input px-3 py-2',
              'text-sm placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ring scrollbar-minimal'
            )}
            style={{ minHeight: '36px', maxHeight: '76px' }}
          />
          <Button
            size="icon"
            className="h-9 w-9 rounded-xl flex-shrink-0"
            onClick={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
