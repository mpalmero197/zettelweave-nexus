import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, ArrowLeft, UserPlus, Check, CheckCheck, MessageSquare, Smile } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center h-full bg-background text-center px-6">
        <div className="chat-empty-icon mb-4">
          <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <p className="text-sm font-semibold text-foreground/70">No conversation selected</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Pick a friend from the sidebar to start chatting</p>
      </div>
    );
  }

  const chatItems = groupMessagesByDate(messages);
  const friendName = friend.friend_display_name || friend.friend_email;
  const statusColor = friend.user_status === 'online' ? 'bg-emerald-500' 
    : friend.user_status === 'busy' ? 'bg-amber-500' 
    : friend.user_status === 'away' ? 'bg-amber-400'
    : friend.user_status === 'dnd' ? 'bg-red-500'
    : 'bg-muted-foreground/40';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card/80 backdrop-blur-md flex-shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 rounded-full" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="relative">
          <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
            <AvatarImage src={friend.friend_avatar_url} />
            <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">{(friendName).substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card', statusColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-foreground">{friendName}</p>
          <p className="text-[10px] text-muted-foreground capitalize leading-none mt-0.5">{friend.user_status || 'offline'}</p>
        </div>
      </div>

      {/* Friend request alert */}
      {!isFriend && !hasPendingRequest && (
        <div className="px-3 pt-2 flex-shrink-0">
          <Alert className="border-primary/20 bg-primary/5 py-2 rounded-xl">
            <AlertDescription className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Not friends yet</span>
              <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={sendFriendRequest}>
                <UserPlus className="h-3 w-3 mr-1" />Add
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-minimal chat-messages-bg">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar className="h-16 w-16 mb-4 ring-2 ring-border shadow-md">
              <AvatarImage src={friend.friend_avatar_url} />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">{(friendName).substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold text-foreground">Start a conversation</p>
            <p className="text-xs text-muted-foreground mt-1">Say hi to {friendName} 👋</p>
          </div>
        ) : (
          chatItems.map((item, index) => {
            if (item.type === 'date-separator') {
              return (
                <div key={`sep-${item.date}`} className="flex items-center justify-center py-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 bg-muted/60 backdrop-blur-sm px-3 py-1 rounded-full">{item.label}</span>
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
              <div key={msg.id} className={cn('flex animate-chat-msg-in', isMine ? 'justify-end' : 'justify-start', !isLast ? 'mb-[3px]' : 'mb-3')}>
                {!isMine && (
                  <div className="w-7 mr-2 flex-shrink-0 self-end">
                    {isLast && (
                      <Avatar className="h-7 w-7 shadow-sm">
                        <AvatarImage src={friend.friend_avatar_url} />
                        <AvatarFallback className="text-[9px] font-semibold bg-muted">{(friendName).substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}
                <div className="flex flex-col max-w-[75%]">
                  <div className={cn(
                    'break-words transition-colors',
                    emoji ? 'text-3xl px-1 py-0.5'
                      : isMine
                        ? 'chat-bubble-mine px-3.5 py-2 rounded-2xl text-primary-foreground'
                        : 'chat-bubble-theirs px-3.5 py-2 rounded-2xl text-foreground',
                    !emoji && isMine && isFirst && !isLast && 'rounded-tr-lg',
                    !emoji && isMine && isLast && !isFirst && 'rounded-br-lg',
                    !emoji && isMine && !isFirst && !isLast && 'rounded-r-lg',
                    !emoji && !isMine && isFirst && !isLast && 'rounded-tl-lg',
                    !emoji && !isMine && isLast && !isFirst && 'rounded-bl-lg',
                    !emoji && !isMine && !isFirst && !isLast && 'rounded-l-lg',
                  )}>
                    <p className={cn('text-[13px] leading-relaxed', emoji && 'text-3xl leading-none')}>{msg.message}</p>
                  </div>
                  {isLast && (
                    <div className={cn('flex items-center gap-1 mt-1 px-1', isMine ? 'justify-end' : 'justify-start')}>
                      <span className="text-[10px] text-muted-foreground/60 font-medium">{format(new Date(msg.created_at), 'HH:mm')}</span>
                      {isMine && !msg.id.startsWith('temp-') && (
                        msg.read_at
                          ? <CheckCheck className="h-3 w-3 text-primary" />
                          : <Check className="h-3 w-3 text-muted-foreground/50" />
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
      <div className="px-3 pb-3 pt-2 border-t border-border/30 flex-shrink-0 bg-card/50 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              rows={1}
              className={cn(
                'w-full resize-none rounded-2xl border border-border/50 bg-muted/40 px-4 py-2.5 pr-10',
                'text-[13px] placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30',
                'scrollbar-minimal transition-all duration-200'
              )}
              style={{ minHeight: '40px', maxHeight: '80px' }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 bottom-1 h-7 w-7 rounded-full text-muted-foreground/40 hover:text-muted-foreground"
              tabIndex={-1}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <Button
            size="icon"
            className={cn(
              'h-10 w-10 rounded-full flex-shrink-0 shadow-sm transition-all duration-200',
              newMessage.trim() ? 'scale-100 opacity-100' : 'scale-95 opacity-70'
            )}
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
