import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sparkles, Send, Loader2, X, Copy, Check, Globe, Maximize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useZettelCards } from '@/hooks/useZettelCards';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { SearchResultsDialog } from '@/components/SearchResultsDialog';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  source?: 'internet_search' | 'knowledge_base';
  images?: string[];
  relatedQuestions?: string[];
}

interface AIAssistantSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchResult?: (query: string, result: string, images?: string[], relatedQuestions?: string[]) => void;
}

export function AIAssistantSidebar({ open, onOpenChange, onSearchResult }: AIAssistantSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedSearchQuery, setExpandedSearchQuery] = useState('');
  const [expandedSearchResult, setExpandedSearchResult] = useState('');
  const [showSearchDialog, setShowSearchDialog] = useState(false);
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
        content: data.response,
        source: data.source,
        images: data.images || [],
        relatedQuestions: data.relatedQuestions || []
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Show in canvas for internet searches
      if (data.source === 'internet_search') {
        onSearchResult?.(input, data.response, data.images, data.relatedQuestions);
        setExpandedSearchQuery(input);
        setExpandedSearchResult(data.response);
        setShowSearchDialog(false); // Don't auto-open dialog anymore
      }
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

  const expandSearchResult = (message: Message, userQuery: string) => {
    setExpandedSearchQuery(userQuery);
    setExpandedSearchResult(message.content);
    setShowSearchDialog(true);
  };

  const handleSuggestedSearch = (query: string) => {
    setInput(query);
    // Auto-send the suggested search
    setTimeout(() => {
      const userMessage: Message = { role: 'user', content: query };
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      // Same logic as handleSend
      (async () => {
        try {
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
            content: data.response,
            source: data.source,
            images: data.images || [],
            relatedQuestions: data.relatedQuestions || []
          };
          setMessages(prev => [...prev, assistantMessage]);

          if (data.source === 'internet_search') {
            onSearchResult?.(query, data.response, data.images, data.relatedQuestions);
            setExpandedSearchQuery(query);
            setExpandedSearchResult(data.response);
          }
        } catch (error: any) {
          console.error('AI assistant error:', error);
          toast.error('Failed to get response from AI assistant');
        } finally {
          setIsLoading(false);
        }
      })();
    }, 100);
  };

  return (
    <>
      <SearchResultsDialog
        open={showSearchDialog}
        onOpenChange={setShowSearchDialog}
        query={expandedSearchQuery}
        result={expandedSearchResult}
        onSuggestedSearch={handleSuggestedSearch}
      />
      
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[450px] p-0 flex flex-col bg-gradient-to-br from-background via-background to-accent/5">
        <SheetHeader className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Ask ALICE
              </span>
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

        <ScrollArea className="flex-1 p-5" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-8">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-sm">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  How can I help?
                </h3>
                <p className="text-sm text-muted-foreground max-w-[320px] leading-relaxed">
                  I can search the internet for current information or help you explore your knowledge base.
                </p>
              </div>
              <div className="space-y-3 w-full max-w-[340px]">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 justify-center">
                  <Sparkles className="h-3 w-3" />
                  Suggested Queries
                </p>
                <div className="space-y-2">
                  {[
                    'Summarize my recent notes',
                    'What time is it in Paris?',
                    'Who won the latest Nobel Prize?',
                    'Find connections between my cards'
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="w-full text-left text-sm p-3 rounded-xl bg-gradient-to-r from-accent/50 to-accent/30 hover:from-accent hover:to-accent/50 transition-all border border-border/30 hover:border-primary/30 font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const userQuery = index > 0 ? messages[index - 1]?.content || '' : '';
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-3 max-w-[85%] relative group shadow-sm',
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                          : 'bg-gradient-to-br from-accent/80 to-accent/50 text-accent-foreground border border-border/30 backdrop-blur-sm'
                      )}
                    >
                      {message.role === 'assistant' && message.source === 'internet_search' && (
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/20">
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Globe className="h-3.5 w-3.5 text-primary" />
                            <span className="text-primary">Internet Search</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => expandSearchResult(message, userQuery)}
                            className="h-6 w-6 p-0 hover:bg-primary/10 rounded-lg"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      {message.role === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(message.content, index)}
                          className="absolute -top-2 -right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-all bg-background shadow-md rounded-lg border border-border/50"
                        >
                          {copiedIndex === index ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2">
                  <div className="rounded-2xl px-4 py-3 bg-gradient-to-br from-accent/80 to-accent/50 border border-border/30 backdrop-blur-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-border/50 bg-gradient-to-r from-background to-accent/5">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/20"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="rounded-xl shadow-sm hover:shadow-md transition-shadow"
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
    </>
  );
}
