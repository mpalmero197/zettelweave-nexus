import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useZettelCards } from '@/hooks/useZettelCards';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: 'internet_search' | 'knowledge_base';
  images?: string[];
  citations?: string[];
  relatedQuestions?: string[];
  /** Images attached by the user to this message (data URLs) for ALICE to see */
  attachedImages?: string[];
}

export interface SourceCategory {
  key: string;
  label: string;
  enabled: boolean;
  count: number;
}

export interface SelectedSources {
  cards: boolean;
  notes: boolean;
  catalystDocs: boolean;
  calendarEvents: boolean;
  tasks: boolean;
  scratchPad: boolean;
}

export function useKnowledgeChat(isActive: boolean = true) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSources, setSelectedSources] = useState<SelectedSources>({
    cards: true,
    notes: true,
    catalystDocs: true,
    calendarEvents: true,
    tasks: true,
    scratchPad: true,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const { cards, createCard } = useZettelCards();
  const { user } = useAuth();

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isActive,
  });

  const { data: catalystDocs = [] } = useQuery({
    queryKey: ['catalyst-docs-context', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('catalyst_documents')
        .select('id, title, content')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map(d => ({ id: d.id, title: d.title, content: (d.content || '').substring(0, 500) }));
    },
    enabled: !!user && isActive,
  });

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['calendar-events-context', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, event_date, description')
        .eq('user_id', user.id)
        .order('event_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isActive,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-context', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, notes, is_completed, due_date, priority')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isActive,
  });

  const { data: scratchpadNotes = [] } = useQuery({
    queryKey: ['scratchpad-context', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('scratchpad_notes')
        .select('id, content')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isActive,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Count enabled sources
  const enabledSourceCount = Object.values(selectedSources).filter(Boolean).length;
  const totalSourceCount = 6;

  // Compute how many items per category
  const sourceCategories: SourceCategory[] = [
    { key: 'cards', label: 'Cards', enabled: selectedSources.cards, count: cards.length },
    { key: 'notes', label: 'Notes', enabled: selectedSources.notes, count: notes.length },
    { key: 'catalystDocs', label: 'Documents', enabled: selectedSources.catalystDocs, count: catalystDocs.length },
    { key: 'calendarEvents', label: 'Calendar', enabled: selectedSources.calendarEvents, count: calendarEvents.length },
    { key: 'tasks', label: 'Tasks', enabled: selectedSources.tasks, count: tasks.length },
    { key: 'scratchPad', label: 'Scratch Pad', enabled: selectedSources.scratchPad, count: scratchpadNotes.length },
  ];

  const toggleSource = useCallback((key: keyof SelectedSources) => {
    setSelectedSources(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleAllSources = useCallback((enabled: boolean) => {
    setSelectedSources({
      cards: enabled,
      notes: enabled,
      catalystDocs: enabled,
      calendarEvents: enabled,
      tasks: enabled,
      scratchPad: enabled,
    });
  }, []);

  const buildContext = useCallback(() => {
    // Increase content limits when fewer sources are selected for deeper grounding
    const contentLimit = enabledSourceCount <= 2 ? 500 : 200;
    const noteLimit = enabledSourceCount <= 2 ? 300 : 150;

    const context: Record<string, any> = {};
    if (selectedSources.cards) {
      context.cards = cards.map(c => ({ id: c.id, title: c.title, content: c.content, category: c.category, tags: c.tags }));
    }
    if (selectedSources.notes) {
      context.notes = notes.map((n: any) => ({ id: n.id, title: n.title, content: n.content }));
    }
    if (selectedSources.catalystDocs) {
      context.catalystDocs = catalystDocs;
    }
    if (selectedSources.calendarEvents) {
      context.calendarEvents = calendarEvents.map((e: any) => ({ id: e.id, title: e.title, event_date: e.event_date, description: e.description }));
    }
    if (selectedSources.tasks) {
      context.tasks = tasks.map((t: any) => ({ id: t.id, title: t.title, notes: t.notes, is_completed: t.is_completed, due_date: t.due_date, priority: t.priority }));
    }
    if (selectedSources.scratchPad) {
      context.scratchPad = scratchpadNotes.map((s: any) => ({ id: s.id, content: s.content }));
    }
    return context;
  }, [selectedSources, cards, notes, catalystDocs, calendarEvents, tasks, scratchpadNotes, enabledSourceCount]);

  const sendMessage = useCallback(async (messageText?: string, attachedImages?: string[]) => {
    const text = messageText || input;
    const imgs = attachedImages && attachedImages.length > 0 ? attachedImages : undefined;
    if ((!text.trim() && !imgs) || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: text || '(image)', attachedImages: imgs };
    setMessages(prev => [...prev, userMessage]);
    if (!messageText) setInput('');
    setIsLoading(true);

    try {
      // Trim history to last 8 messages to avoid validation limits
      const trimmedHistory = [...messages, userMessage].slice(-8);
      const { data, error } = await supabase.functions.invoke('ai-assistant-chat', {
        body: {
          messages: trimmedHistory.map(({ attachedImages: _ai, ...m }) => m),
          context: buildContext(),
          selectedSources,
          images: imgs,
        }
      });

      if (error) {
        console.error('Edge function transport error:', error, 'data:', data);
        const msg = (data && (data as any).error) || error.message || 'Network error reaching AI assistant';
        throw new Error(msg);
      }

      if (data && (data as any).error) {
        throw new Error((data as any).error);
      }

      if (!data || !data.response) {
        throw new Error('Empty response from AI assistant');
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        source: data.source,
        images: data.images || [],
        citations: data.citations || [],
        relatedQuestions: data.relatedQuestions || []
      };
      setMessages(prev => [...prev, assistantMessage]);
      return { data, userMessage };
    } catch (error: any) {
      console.error('AI assistant error:', error);
      toast.error(`AI assistant: ${error?.message || 'Failed to get response'}`);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, buildContext, selectedSources]);

  const clearChat = useCallback(() => {
    setMessages([]);
    toast.success('Chat cleared');
  }, []);

  const createCardFromChat = useCallback(async () => {
    if (messages.length === 0) {
      toast.error('No conversation to create a card from');
      return;
    }

    try {
      const conversationText = messages
        .map(m => `${m.role === 'user' ? 'User' : 'ALICE'}: ${m.content}`)
        .join('\n\n');

      const { data, error } = await supabase.functions.invoke('ai-assistant-chat', {
        body: {
          messages: [{
            role: 'user',
            content: `Summarize this conversation into a clear, organized zettelcard format with key points. Include a title and structured content:\n\n${conversationText}`
          }]
        }
      });

      if (error) throw error;

      const summary = data.response;
      const lines = summary.split('\n');
      const title = lines[0].replace(/^#+\s*/, '').replace(/^title:?\s*/i, '').trim() || 'ALICE Conversation Summary';
      const content = lines.slice(1).join('\n').trim();

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
    }
  }, [messages, createCard, clearChat]);

  return {
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
  };
}
