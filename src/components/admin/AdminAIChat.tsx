import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Loader2, Sparkles, Trash2, Database, Shield, Zap, Search, TrendingUp, BarChart3, Eye, X, MessageSquare, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PlatformInsight {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  competitor_reference: string | null;
  source_reference: string | null;
  utility_score: number | null;
  recommendation: string | null;
  status: string;
  created_at: string;
}

const QUICK_PROMPTS = [
  { icon: Search, label: 'SEO audit', prompt: 'Analyze my current SEO setup (meta tags, sitemap, robots.txt, llms.txt, structured data) and suggest improvements to rank higher than Notion and Obsidian for "AI second brain" keywords.' },
  { icon: TrendingUp, label: 'Competitive analysis', prompt: 'Compare Pendragon\'s current feature set against Notion, Obsidian, and OneNote. What key features am I missing? Where do I have an advantage?' },
  { icon: BarChart3, label: 'Growth strategy', prompt: 'Based on current user metrics and content patterns, suggest growth strategies to increase user acquisition and retention.' },
  { icon: Database, label: 'Optimize queries', prompt: 'Analyze my database tables and suggest query optimizations, missing indexes, or schema improvements.' },
  { icon: Shield, label: 'Security audit', prompt: 'Review my RLS policies and suggest security improvements. Are there any tables that might be exposed?' },
  { icon: Zap, label: 'Fix top errors', prompt: 'Look at the most recent error reports and suggest fixes for the top issues.' },
  { icon: Sparkles, label: 'Feature ideas', prompt: 'Based on the current platform state and feature requests, suggest the most impactful improvements to build next.' },
];

const CATEGORY_COLORS: Record<string, string> = {
  seo: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  feature_gap: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  ux: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  performance: 'bg-green-500/10 text-green-500 border-green-500/20',
  competitive: 'bg-red-500/10 text-red-500 border-red-500/20',
  growth: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
};

const PRIORITY_DOTS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-muted-foreground',
};

export function AdminAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<PlatformInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const copyToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    const { data } = await supabase
      .from('platform_insights')
      .select('*')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(12);
    setInsights((data as PlatformInsight[]) ?? []);
    setLoadingInsights(false);
  };

  const updateInsightStatus = async (id: string, status: string) => {
    await supabase
      .from('platform_insights')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    setInsights(prev => prev.filter(i => i.id !== id));
    toast.success(status === 'reviewed' ? 'Marked as reviewed' : 'Dismissed');
  };

  const askAboutInsight = (insight: PlatformInsight) => {
    const prompt = `I have this platform insight:\n\n**${insight.title}**\n${insight.description}\n\nCategory: ${insight.category}, Priority: ${insight.priority}${insight.competitor_reference ? `, Competitor: ${insight.competitor_reference}` : ''}\n\nGive me a detailed action plan to implement this improvement.`;
    sendMessage(prompt);
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode: 'chat',
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch { /* partial JSON, skip */ }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to get AI response');
      if (!assistantContent) {
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasNewInsights = insights.length > 0;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Admin Assistant
            {hasNewInsights && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Chat with AI to diagnose issues, optimize SEO, analyze competitors, and get improvement suggestions
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Platform Pulse + Quick prompts when no chat */}
      {messages.length === 0 && (
        <>
          {/* Platform Pulse */}
          {!loadingInsights && insights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Platform Pulse</h3>
                <Badge variant="secondary" className="text-xs">{insights.length} new</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.slice(0, 6).map((insight) => (
                  <Card key={insight.id} className="border-border/50 group">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[insight.category] ?? ''}`}>
                            {insight.category.replace('_', ' ')}
                          </Badge>
                          <span className={`h-2 w-2 rounded-full ${PRIORITY_DOTS[insight.priority] ?? PRIORITY_DOTS.medium}`} title={insight.priority} />
                          {insight.competitor_reference && (
                            <span className="text-[10px] text-muted-foreground capitalize">{insight.competitor_reference}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-medium leading-tight">{insight.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{insight.description}</p>
                      <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => updateInsightStatus(insight.id, 'reviewed')}>
                          <Eye className="h-3 w-3 mr-1" /> Reviewed
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => updateInsightStatus(insight.id, 'dismissed')}>
                          <X className="h-3 w-3 mr-1" /> Dismiss
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => askAboutInsight(insight)}>
                          <MessageSquare className="h-3 w-3 mr-1" /> Ask AI
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Quick prompts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUICK_PROMPTS.map((qp, i) => (
              <Card
                key={i}
                className="cursor-pointer hover:bg-muted/50 transition-colors border-border/50"
                onClick={() => sendMessage(qp.prompt)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <qp.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{qp.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{qp.prompt}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Chat messages */}
      {messages.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px] p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 border border-border/30'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <>
                          <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background [&_pre]:border [&_pre]:border-border/50 [&_code]:text-xs">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          <div className="flex justify-end mt-2 pt-2 border-t border-border/20">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(msg.content, i)}
                              className="h-6 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {copiedIndex === i ? (
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
                        </>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    </div>
                    <div className="bg-muted/50 border border-border/30 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Thinking…</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Input */}
      <div className="flex gap-2">
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMessages([])}
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Textarea
          ref={textareaRef}
          placeholder="Ask about SEO, competitors, errors, optimizations..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          rows={2}
          className="resize-none flex-1"
        />
        <Button
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          className="self-end"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
