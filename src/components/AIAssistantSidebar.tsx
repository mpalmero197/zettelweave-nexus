import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sparkles, Send, Loader2, X, Copy, Check, Globe, Maximize2, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SearchResultsDialog } from '@/components/SearchResultsDialog';
import { KnowledgeChatSourcePanel } from '@/components/KnowledgeChatSourcePanel';
import { useKnowledgeChat, ChatMessage } from '@/hooks/useKnowledgeChat';
import ReactMarkdown from 'react-markdown';

interface AIAssistantSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchResult?: (data: {
    query: string;
    result: string;
    images?: string[];
    citations?: string[];
    relatedQuestions?: string[];
  }) => void;
}

export function AIAssistantSidebar({ open, onOpenChange, onSearchResult }: AIAssistantSidebarProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedSearchQuery, setExpandedSearchQuery] = useState('');
  const [expandedSearchResult, setExpandedSearchResult] = useState('');
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    clearChat,
    createCardFromChat,
    scrollRef,
    selectedSources,
    toggleSource,
    toggleAllSources,
    sourceCategories,
    enabledSourceCount,
    totalSourceCount,
  } = useKnowledgeChat(open);

  const [isCreatingCard, setIsCreatingCard] = useState(false);

  const handleSend = async () => {
    const result = await sendMessage();
    if (result?.data?.source === 'internet_search' && onSearchResult) {
      onSearchResult({
        query: result.userMessage.content,
        result: result.data.response,
        images: result.data.images || [],
        citations: result.data.citations || [],
        relatedQuestions: result.data.relatedQuestions || []
      });
      setExpandedSearchQuery(result.userMessage.content);
      setExpandedSearchResult(result.data.response);
      setShowSearchDialog(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateCard = async () => {
    setIsCreatingCard(true);
    try {
      await createCardFromChat();
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
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const expandSearchResult = (message: ChatMessage, userQuery: string) => {
    setExpandedSearchQuery(userQuery);
    setExpandedSearchResult(message.content);
    setShowSearchDialog(true);
  };

  const handleSuggestedSearch = async (query: string) => {
    setInput(query);
    setTimeout(() => sendMessage(query), 100);
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
                  onClick={handleCreateCard}
                  disabled={isCreatingCard}
                  className="h-8 text-xs"
                >
                  <span className="hidden md:inline">{isCreatingCard ? 'Creating...' : 'Create Card'}</span>
                  <span className="md:hidden">{isCreatingCard ? '...' : 'Create'}</span>
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

        {/* Collapsible Source Selector */}
        <div className="border-b border-border/30">
          <button
            onClick={() => setShowSources(!showSources)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{enabledSourceCount}/{totalSourceCount} sources active</span>
            {showSources ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          {showSources && (
            <KnowledgeChatSourcePanel
              sourceCategories={sourceCategories}
              selectedSources={selectedSources}
              toggleSource={toggleSource}
              toggleAllSources={toggleAllSources}
              enabledSourceCount={enabledSourceCount}
              totalSourceCount={totalSourceCount}
              compact
            />
          )}
        </div>

        <ScrollArea className="flex-1 p-5" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-8">
              <div className="p-4 rounded-2xl bg-primary/10">
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
                    'Find connections between my cards',
                    'What subjects could you create master documents for?',
                    'What are my upcoming tasks and events?'
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
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent text-accent-foreground border border-border/30'
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

                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      )}

                      {message.role === 'assistant' && (
                        <div className="flex justify-end mt-1.5 pt-1.5 border-t border-border/20">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(message.content, index)}
                            className="h-6 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {copiedIndex === index ? (
                              <>
                                <Check className="h-3 w-3 text-green-500" />
                                <span className="text-green-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Suggested follow-ups */}
                      {message.role === 'assistant' && message.relatedQuestions && message.relatedQuestions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/20 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Suggested:</p>
                          {message.relatedQuestions.map((q, qi) => (
                            <button
                              key={qi}
                              onClick={() => handleSuggestedSearch(q)}
                              className="block w-full text-left text-xs p-1.5 rounded-lg hover:bg-primary/10 text-primary"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2">
                  <div className="rounded-2xl px-4 py-3 bg-accent border border-border/30">
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
              className="flex-1 rounded-xl border-border/50 bg-background focus:ring-2 focus:ring-primary/20"
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
