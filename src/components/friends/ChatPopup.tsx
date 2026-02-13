import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Send, Minus, UserPlus, Check, CheckCheck } from 'lucide-react';
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

interface ChatPopupProps {
  friendId: string;
  friendName: string;
  friendAvatar?: string;
  onClose: () => void;
}

export function ChatPopup({ friendId, friendName, friendAvatar, onClose }: ChatPopupProps) {
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

      // Mark messages as read
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

          // Mark as read
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

    // Optimistic update
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

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Brief typing indicator to feel alive
    setShowTypingIndicator(true);
    setTimeout(() => setShowTypingIndicator(false), 1200);

    try {
      const { data, error } = await supabase.from('chat_messages').insert({
        sender_id: currentUserId,
        receiver_id: friendId,
        message: text,
      }).select().single();

      if (error) throw error;

      // Replace optimistic message with real one
      if (data) {
        setMessages(prev =>
          prev.map(m => m.id === optimisticMsg.id ? data : m)
        );
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Remove optimistic message on failure
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
    // Auto-expand up to 3 lines
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 76) + 'px'; // ~3 lines
  };

  const chatItems = groupMessagesByDate(messages);

  // Group consecutive messages from same sender
  const renderMessages = () => {
    return chatItems.map((item, index) => {
      if (item.type === 'date-separator') {
        return (
          <div key={`sep-${item.date}`} className="flex items-center justify-center py-3">
            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {item.label}
            </span>
          </div>
        );
      }

      const msg = item;
      const isMine = msg.sender_id === currentUserId;
      const isEmoji = isEmojiOnly(msg.message);

      // Check if next message is from same sender (for clustering)
      const nextItem = chatItems[index + 1];
      const isLastInCluster =
        !nextItem ||
        nextItem.type === 'date-separator' ||
        nextItem.sender_id !== msg.sender_id;

      // Check if previous message is from same sender
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
            !isLastInCluster ? 'mb-0.5' : 'mb-2'
          )}
        >
          {/* Avatar for received messages — only on first in cluster */}
          {!isMine && (
            <div className="w-7 mr-1.5 flex-shrink-0">
              {isFirstInCluster ? (
                <Avatar className="h-7 w-7">
                  <AvatarImage src={friendAvatar} />
                  <AvatarFallback className="text-[10px]">
                    {friendName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : null}
            </div>
          )}

          <div className="flex flex-col max-w-[72%]">
            <div
              className={cn(
                'px-3 py-1.5 break-words',
                isEmoji
                  ? 'text-2xl bg-transparent px-1'
                  : isMine
                    ? 'bg-primary text-primary-foreground rounded-2xl'
                    : 'bg-muted text-foreground rounded-2xl',
                // Tail rounding
                !isEmoji && isMine && isFirstInCluster && 'rounded-tr-md',
                !isEmoji && isMine && isLastInCluster && 'rounded-br-md',
                !isEmoji && !isMine && isFirstInCluster && 'rounded-tl-md',
                !isEmoji && !isMine && isLastInCluster && 'rounded-bl-md',
              )}
            >
              <p className={cn('text-sm leading-relaxed', isEmoji && 'text-2xl')}>{msg.message}</p>
            </div>

            {/* Time + read receipts — only on last in cluster */}
            {isLastInCluster && (
              <div className={cn(
                'flex items-center gap-1 mt-0.5 px-1',
                isMine ? 'justify-end' : 'justify-start'
              )}>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(msg.created_at), 'HH:mm')}
                </span>
                {isMine && !msg.id.startsWith('temp-') && (
                  msg.read_at ? (
                    <CheckCheck className="h-3 w-3 text-primary" />
                  ) : (
                    <Check className="h-3 w-3 text-muted-foreground" />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className={cn(
      'fixed bottom-4 right-20 w-[360px] z-50 flex flex-col',
      'rounded-2xl border border-border bg-card shadow-[var(--shadow-material-5)]',
      'animate-scale-in origin-bottom-right',
      isMinimized ? 'h-auto' : 'h-[480px]'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border rounded-t-2xl bg-muted/30">
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarImage src={friendAvatar} />
            <AvatarFallback className="text-xs font-medium">
              {friendName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-card animate-chat-online-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{friendName}</p>
          <p className="text-[11px] text-muted-foreground">Online</p>
        </div>

        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Friend request alerts */}
          {!isCheckingFriendship && !isFriend && !hasPendingRequest && (
            <div className="px-3 pt-2">
              <Alert className="border-primary/30 bg-primary/5 py-2">
                <AlertDescription className="flex items-center justify-between text-xs">
                  <span>Not friends yet</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={sendFriendRequest}>
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!isCheckingFriendship && !isFriend && hasPendingRequest && (
            <div className="px-3 pt-2">
              <Alert className="border-border bg-muted/50 py-2">
                <AlertDescription className="text-xs text-muted-foreground">
                  Friend request pending — chat away!
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-minimal">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <Avatar className="h-16 w-16 mb-4">
                  <AvatarImage src={friendAvatar} />
                  <AvatarFallback className="text-lg">
                    {friendName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium mb-1">Start a conversation</p>
                <p className="text-xs text-muted-foreground">
                  Say hi to {friendName} 👋
                </p>
              </div>
            ) : (
              <>
                {renderMessages()}

                {/* Typing indicator */}
                {showTypingIndicator && (
                  <div className="flex justify-start mb-2">
                    <div className="w-7 mr-1.5 flex-shrink-0" />
                    <div className="bg-muted rounded-2xl px-4 py-2.5 flex items-center gap-1">
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
          <div className="px-3 pb-3 pt-1 border-t border-border">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                placeholder="Message..."
                value={newMessage}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                rows={1}
                className={cn(
                  'flex-1 resize-none rounded-xl border border-border bg-input px-3 py-2',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-1 focus:ring-ring',
                  'scrollbar-minimal'
                )}
                style={{ minHeight: '36px', maxHeight: '76px' }}
              />
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
                onClick={sendMessage}
                disabled={!newMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
