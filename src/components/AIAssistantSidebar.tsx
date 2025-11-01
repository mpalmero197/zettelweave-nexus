import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sparkles, Send, Loader2, X, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useZettelCards } from '@/hooks/useZettelCards';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIAssistantSidebar({ open, onOpenChange }: AIAssistantSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { cards, createCard } = useZettelCards();
  const { user } = useAuth();

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && open,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get sticky notes from localStorage
      const stickyNotes = JSON.parse(localStorage.getItem('sticky-notes:v1') || '[]');
      const scratchPad = JSON.parse(localStorage.getItem('scratchpad:notes:v1') || '[]');

      const { data, error } = await supabase.functions.invoke('ai-assistant-chat', {
        body: { 
          messages: [...messages, userMessage],
          context: {
            cards: cards.map(c => ({ id: c.id, title: c.title, content: c.content, category: c.category, tags: c.tags })),
            notes: notes.map(n => ({ id: n.id, title: n.title, content: n.content })),
            stickyNotes: stickyNotes.map((s: any) => ({ id: s.id, content: s.content })),
            scratchPad: scratchPad.map((s: any) => ({ id: s.id, content: s.content })),
          }
        }
      });

      if (error) throw error;

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.response 
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('AI assistant error:', error);
      toast.error('Failed to get response from AI assistant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  const createZettelCard = async () => {
    if (messages.length === 0) {
      toast.error('No conversation to create a card from');
      return;
    }

    setIsCreatingCard(true);
    try {
      // Prepare conversation summary request
      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'User' : 'ALICE'}: ${m.content}`)
        .join('\n\n');

      const { data, error } = await supabase.functions.invoke('ai-assistant-chat', {
        body: { 
          messages: [
            {
              role: 'user',
              content: `Summarize this conversation into a clear, organized zettelcard format with key points. Include a title and structured content:\n\n${conversationText}`
            }
          ]
        }
      });

      if (error) throw error;

      // Extract title and content from the summary
      const summary = data.response;
      const lines = summary.split('\n');
      const title = lines[0].replace(/^#+\s*/, '').replace(/^title:?\s*/i, '').trim() || 'ALICE Conversation Summary';
      const content = lines.slice(1).join('\n').trim();

      // Create the card
      await createCard({
        title,
        content: content || summary,
        category: 'AI Conversations',
        tags: ['alice', 'ai-generated'],
        number: '',
        linkedCards: []
      });

      toast.success('Zettelcard created from conversation');
      clearChat();
    } catch (error: any) {
      console.error('Error creating zettelcard:', error);
      toast.error('Failed to create zettelcard from conversation');
    } finally {
      setIsCreatingCard(false);
    }
  };

  const copyToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Ask ALICE
            </SheetTitle>
            {messages.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={createZettelCard}
                  disabled={isCreatingCard}
                  className="h-8 text-xs"
                >
                  {isCreatingCard ? 'Creating...' : 'Create Card'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
              <Sparkles className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">How can I help?</h3>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  Ask me about your cards, request summaries, or find connections in your knowledge base.
                </p>
              </div>
              <div className="space-y-2 w-full max-w-[280px]">
                <p className="text-xs font-medium text-muted-foreground">Try asking:</p>
                <div className="space-y-1">
                  {[
                    'Summarize my recent notes',
                    'Find connections between my cards',
                    'What are my main topics?'
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="w-full text-left text-xs p-2 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg px-4 py-2 max-w-[85%] relative group',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.role === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.content, index)}
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm"
                      >
                        {copiedIndex === index ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="rounded-lg px-4 py-2 bg-accent">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
