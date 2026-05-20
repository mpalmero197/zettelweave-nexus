import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Loader2, X, Copy, Check, Globe, Maximize2, BookOpen, ChevronLeft, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKnowledgeChat } from '@/hooks/useKnowledgeChat';
import { KnowledgeChatSourcePanel } from '@/components/KnowledgeChatSourcePanel';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export function KnowledgeChat() {
  const isMobile = useIsMobile();
  const [showSources, setShowSources] = useState(!isMobile);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  } = useKnowledgeChat(true);

  const submit = () => {
    if (isLoading) return;
    if (!input.trim() && pendingImages.length === 0) return;
    sendMessage(input, pendingImages);
    setPendingImages([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: string[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name}: not an image`); continue; }
      if (f.size > 8 * 1024 * 1024) { toast.error(`${f.name}: max 8MB`); continue; }
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      next.push(dataUrl);
    }
    if (next.length) setPendingImages(prev => [...prev, ...next].slice(0, 8));
  };


  const copyToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch { /* noop */ }
  };

  const handleSuggestedSearch = (query: string) => {
    setInput(query);
    setTimeout(() => sendMessage(query), 100);
  };

  // Listen for external requests (e.g. writing-context smart suggestion) to
  // open the assistant with a pre-filled query and run it immediately.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const query = detail?.query;
      if (typeof query === 'string' && query.trim()) {
        setInput(query);
        setTimeout(() => sendMessage(query), 150);
      }
    };
    window.addEventListener('open-knowledge-chat-with-query', handler);
    return () => window.removeEventListener('open-knowledge-chat-with-query', handler);
  }, [sendMessage, setInput]);

  return (
    <div className="h-[calc(100dvh-7rem-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4.5rem)] flex">
      {/* Source Panel - Desktop sidebar / Mobile sheet */}
      {isMobile ? (
        <Sheet open={showSources} onOpenChange={setShowSources}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="p-4 border-b border-border/50">
              <SheetTitle className="text-sm">Knowledge Sources</SheetTitle>
            </SheetHeader>
            <KnowledgeChatSourcePanel
              sourceCategories={sourceCategories}
              selectedSources={selectedSources}
              toggleSource={toggleSource}
              toggleAllSources={toggleAllSources}
              enabledSourceCount={enabledSourceCount}
              totalSourceCount={totalSourceCount}
            />
          </SheetContent>
        </Sheet>
      ) : showSources ? (
        <div className="w-72 border-r border-border/50 bg-card/50 flex flex-col shrink-0">
          <KnowledgeChatSourcePanel
            sourceCategories={sourceCategories}
            selectedSources={selectedSources}
            toggleSource={toggleSource}
            toggleAllSources={toggleAllSources}
            enabledSourceCount={enabledSourceCount}
            totalSourceCount={totalSourceCount}
            className="flex-1"
          />
        </div>
      ) : null}

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent shrink-0">
          {isMobile && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowSources(true)}>
              <BookOpen className="h-4 w-4" />
            </Button>
          )}
          {!isMobile && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowSources(!showSources)}>
              {showSources ? <ChevronLeft className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
            </Button>
          )}
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">Chat with your Knowledge</h2>
            <p className="text-xs text-muted-foreground">
              {enabledSourceCount} source{enabledSourceCount !== 1 ? 's' : ''} active
            </p>
          </div>
          {messages.length > 0 && (
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={createCardFromChat}>
                Save as Card
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={clearChat}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-12">
              <div className="p-4 rounded-2xl bg-primary/10">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg">Chat with your Knowledge</h3>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  Ask questions about your notes, cards, documents, and more. ALICE will ground responses in your content and cite specific sources.
                </p>
              </div>
              <div className="space-y-2 w-full max-w-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Try asking</p>
                {[
                  'Summarize my recent notes',
                  'Find connections between my cards',
                  'What are the key themes across my documents?',
                  'What are my upcoming tasks and events?',
                ].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedSearch(s)}
                    className="w-full text-left text-sm p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors border border-border/30 hover:border-primary/30"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div className={cn(
                    'rounded-2xl px-4 py-3 max-w-[85%] relative group shadow-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-accent-foreground border border-border/30'
                  )}>
                    {msg.role === 'assistant' && msg.source === 'internet_search' && (
                      <div className="flex items-center gap-1.5 text-xs font-medium mb-2 pb-2 border-b border-border/20">
                        <Globe className="h-3.5 w-3.5 text-primary" />
                        <span className="text-primary">Internet Search</span>
                      </div>
                    )}

                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}

                    {msg.role === 'assistant' && (
                      <div className="flex justify-end mt-1.5 pt-1.5 border-t border-border/20">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(msg.content, i)}
                          className="h-6 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {copiedIndex === i ? (
                            <><Check className="h-3 w-3 text-green-500" /><span className="text-green-500">Copied</span></>
                          ) : (
                            <><Copy className="h-3 w-3" />Copy</>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Suggested follow-ups */}
                    {msg.role === 'assistant' && msg.relatedQuestions && msg.relatedQuestions.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/20 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Related questions:</p>
                        {msg.relatedQuestions.map((q, qi) => (
                          <button
                            key={qi}
                            onClick={() => handleSuggestedSearch(q)}
                            className="block w-full text-left text-xs p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start animate-in fade-in">
                  <div className="rounded-2xl px-4 py-3 bg-accent border border-border/30">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-gradient-to-r from-background to-accent/5 shrink-0">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your knowledge..."
              disabled={isLoading}
              className="flex-1 rounded-xl border-border/50 bg-background"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="rounded-xl"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
