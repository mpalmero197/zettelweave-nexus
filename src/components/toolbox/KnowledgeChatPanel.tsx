import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Sparkles, Globe, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKnowledgeChat } from '@/hooks/useKnowledgeChat';
import ReactMarkdown from 'react-markdown';

export function KnowledgeChatPanel() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const localScrollRef = useRef<HTMLDivElement | null>(null);

  const {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    enabledSourceCount,
    totalSourceCount,
  } = useKnowledgeChat(true);

  useEffect(() => {
    if (localScrollRef.current) {
      localScrollRef.current.scrollTop = localScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {}
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">Knowledge Chat</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {enabledSourceCount}/{totalSourceCount} sources
        </span>
      </div>

      <div ref={localScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8 space-y-2">
            <Sparkles className="h-6 w-6 mx-auto opacity-40" />
            <p>Ask anything about your notes, cards, and documents.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex flex-col gap-1", msg.role === 'user' ? 'items-end' : 'items-start')}>
            <div className={cn(
              "max-w-[90%] rounded-lg px-3 py-2 text-xs",
              msg.role === 'user' ? 'bg-primary/15 text-foreground' : 'bg-muted/60 text-foreground'
            )}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-xs prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === 'assistant' && (
              <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                <button onClick={() => copy(msg.content, idx)} className="hover:text-foreground flex items-center gap-0.5">
                  {copiedIndex === idx ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                  Copy
                </button>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Thinking...
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border/50 flex gap-1">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask your knowledge base..."
          className="h-8 text-xs"
          disabled={isLoading}
        />
        <Button size="sm" className="h-8 w-8 p-0" onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
