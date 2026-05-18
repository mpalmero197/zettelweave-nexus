import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Send, Minus, UserPlus, Check, CheckCheck, ChevronLeft, Smile } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  type Message,
  type ChatItem,
  groupMessagesByDate,
  isEmojiOnly,
} from '@/utils/chatUtils';

interface ChatPopupProps {
  friendId: string;
  friendName: string;
  friendAvatar?: string;
  onClose: () => void;
}

export function ChatPopup({ friendId, friendName, friendAvatar, onClose }: ChatPopupProps) {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isCheckingFriendship, setIsCheckingFriendship] = useState(true);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadCurrentUser();
    checkFriendship();
    loadMessages();
    const cleanup = subscribeToMessages();
    return cleanup;
  }, [friendId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, showTypingIndicator]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const checkFriendship = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: friendshipData } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id_1.eq.${user.id},user_id_2.eq.${friendId}),and(user_id_1.eq.${friendId},user_id_2.eq.${user.id})`)
        .maybeSingle();

      setIsFriend(!!friendshipData);

      const { data: requestData } = await supabase
        .from('friend_requests')
        .select('id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .eq('status', 'pending')
        .maybeSingle();

      setHasPendingRequest(!!requestData);
    } catch (error) {
      console.error('Error checking friendship:', error);
    } finally {
      setIsCheckingFriendship(false);
    }
  };

  const sendFriendRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('friend_requests').insert({
        sender_id: user.id,
        receiver_id: friendId,
        status: 'pending'
      });

      if (error) throw error;
      setHasPendingRequest(true);
      toast.success('Friend request sent!');
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      if (error.code === '23505') {
        toast.error('Friend request already sent');
      } else {
        toast.error('Failed to send friend request');
      }
    }
  };

  const loadMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', friendId)
        .eq('receiver_id', user.id)
        .is('read_at', null);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat:${friendId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `sender_id=eq.${friendId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);

          supabase
            .from('chat_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', newMsg.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = useCallback(async () => {
    const text = newMessage.trim();
    if (!text || !currentUserId) return;

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      receiver_id: friendId,
      message: text,
      created_at: new Date().toISOString(),
      read_at: null,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setShowTypingIndicator(true);
    setTimeout(() => setShowTypingIndicator(false), 1200);

    try {
      const { data, error } = await supabase.from('chat_messages').insert({
        sender_id: currentUserId,
        receiver_id: friendId,
        message: text,
      }).select().single();

      if (error) throw error;

      if (data) {
        setMessages(prev =>
          prev.map(m => m.id === optimisticMsg.id ? data : m)
        );
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      toast.error('Failed to send message');
    }
  }, [newMessage, currentUserId, friendId]);

  const scrollToBottom = () => {
    sentinelRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 76) + 'px';
  };

  const chatItems = groupMessagesByDate(messages);

  const renderMessages = () => {
    return chatItems.map((item, index) => {
      if (item.type === 'date-separator') {
        return (
          <div key={`sep-${item.date}`} className="flex items-center justify-center py-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 bg-muted/60 backdrop-blur-sm px-3 py-1 rounded-full">
              {item.label}
            </span>
          </div>
        );
      }

      const msg = item;
      const isMine = msg.sender_id === currentUserId;
      const isEmoji = isEmojiOnly(msg.message);

      const nextItem = chatItems[index + 1];
      const isLastInCluster =
        !nextItem ||
        nextItem.type === 'date-separator' ||
        nextItem.sender_id !== msg.sender_id;

      const prevItem = chatItems[index - 1];
      const isFirstInCluster =
        !prevItem ||
        prevItem.type === 'date-separator' ||
        prevItem.sender_id !== msg.sender_id;

      return (
        <div
          key={msg.id}
          className={cn(
            'flex animate-chat-msg-in',
            isMine ? 'justify-end' : 'justify-start',
            !isLastInCluster ? 'mb-[3px]' : 'mb-3'
          )}
        >
          {!isMine && (
            <div className="w-7 mr-2 flex-shrink-0 self-end">
              {isLastInCluster ? (
                <Avatar className="h-7 w-7 shadow-sm">
                  <AvatarImage src={friendAvatar} />
                  <AvatarFallback className="text-[9px] font-semibold bg-muted">
                    {(friendName ?? '').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : null}
            </div>
          )}

          <div className="flex flex-col max-w-[75%]">
            <div
              className={cn(
                'break-words transition-colors',
                isEmoji
                  ? 'text-3xl px-1 py-0.5'
                  : isMine
                    ? 'chat-bubble-mine px-3.5 py-2 rounded-2xl text-primary-foreground'
                    : 'chat-bubble-theirs px-3.5 py-2 rounded-2xl text-foreground',
                !isEmoji && isMine && isFirstInCluster && !isLastInCluster && 'rounded-tr-lg',
                !isEmoji && isMine && isLastInCluster && !isFirstInCluster && 'rounded-br-lg',
                !isEmoji && isMine && !isFirstInCluster && !isLastInCluster && 'rounded-r-lg',
                !isEmoji && !isMine && isFirstInCluster && !isLastInCluster && 'rounded-tl-lg',
                !isEmoji && !isMine && isLastInCluster && !isFirstInCluster && 'rounded-bl-lg',
                !isEmoji && !isMine && !isFirstInCluster && !isLastInCluster && 'rounded-l-lg',
              )}
            >
              <p className={cn('text-[13px] leading-relaxed', isEmoji && 'text-3xl leading-none')}>{msg.message}</p>
            </div>

            {isLastInCluster && (
              <div className={cn(
                'flex items-center gap-1 mt-1 px-1',
                isMine ? 'justify-end' : 'justify-start'
              )}>
                <span className="text-[10px] text-muted-foreground/60 font-medium">
                  {format(new Date(msg.created_at), 'HH:mm')}
                </span>
                {isMine && !msg.id.startsWith('temp-') && (
                  msg.read_at ? (
                    <CheckCheck className="h-3 w-3 text-primary" />
                  ) : (
                    <Check className="h-3 w-3 text-muted-foreground/50" />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  // ─── Shared body content ───
  const renderBody = () => (
    <>
      {/* Friend request alerts */}
      {!isCheckingFriendship && !isFriend && !hasPendingRequest && (
        <div className="px-3 pt-2 shrink-0">
          <Alert className="border-primary/20 bg-primary/5 py-2 rounded-xl">
            <AlertDescription className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Not friends yet</span>
              <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={sendFriendRequest}>
                <UserPlus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {!isCheckingFriendship && !isFriend && hasPendingRequest && (
        <div className="px-3 pt-2 shrink-0">
          <Alert className="border-border/50 bg-muted/30 py-2 rounded-xl">
            <AlertDescription className="text-xs text-muted-foreground">
              Friend request pending — chat away!
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-minimal chat-messages-bg">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Avatar className="h-16 w-16 mb-4 ring-2 ring-border shadow-md">
              <AvatarImage src={friendAvatar} />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {String(friendName ?? '').substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold text-foreground mb-1">Start a conversation</p>
            <p className="text-xs text-muted-foreground">
              Say hi to {friendName ?? 'them'} 👋
            </p>
          </div>
        ) : (
          <>
            {renderMessages()}

            {showTypingIndicator && (
              <div className="flex justify-start mb-3">
                <div className="w-7 mr-2 flex-shrink-0" />
                <div className="bg-muted/60 backdrop-blur-sm rounded-2xl px-4 py-2.5 flex items-center gap-1.5">
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot animation-delay-200" />
                  <span className="chat-typing-dot animation-delay-400" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={sentinelRef} />
      </div>

      {/* Input area */}
      <div className={cn('px-3 pb-3 pt-2 border-t border-border/30 shrink-0 bg-card/50 backdrop-blur-sm', isMobile && 'pb-safe')}>
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleTextareaInput}
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
    </>
  );

  // ─── Mobile: full-screen overlay ───
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col animate-in slide-in-from-right-full duration-200">
        {/* Header */}
        <div className="flex items-center gap-2 px-2 py-2.5 border-b border-border/40 bg-card/80 backdrop-blur-md shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={onClose}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="relative">
            <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
              <AvatarImage src={friendAvatar} />
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {String(friendName ?? '').substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{friendName ?? 'Unknown'}</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Online</p>
          </div>
        </div>

        {renderBody()}
      </div>
    );
  }

  // ─── Desktop: floating card ───
  return (
    <div className={cn(
      'fixed bottom-4 right-20 w-[380px] z-50 flex flex-col',
      'rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl',
      'shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.15),0_4px_20px_-8px_rgba(0,0,0,0.15)]',
      'animate-scale-in origin-bottom-right',
      isMinimized ? 'h-auto' : 'h-[500px]'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 rounded-t-2xl bg-muted/20 shrink-0">
        <div className="relative">
          <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
            <AvatarImage src={friendAvatar} />
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {String(friendName ?? '').substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card animate-chat-online-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{friendName ?? 'Unknown'}</p>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Online</p>
        </div>

        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && renderBody()}
    </div>
  );
}
