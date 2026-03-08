import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

interface PlayerContext {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  totalXP: number;
  streak: number;
  coldStreak: number;
  stats: Record<string, number>;
  goal: string | null;
  dayNumber: number;
  systemMode: string;
  currentTime: string;
  dayType: string;
  questsCompletedToday: number;
  questsTotalToday: number;
  shadowCount: number;
  forceMultiplier: number;
  dungeonsCleared: number;
}

export function useSystemChat(buildContext: () => PlayerContext) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const { user } = useAuth();

  // Load latest conversation from DB on mount
  useEffect(() => {
    if (!user) {
      setMessages([]);
      conversationIdRef.current = null;
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadConversation = async () => {
      try {
        // Get the most recent conversation_id
        const { data: latest } = await supabase
          .from('chat_messages')
          .select('conversation_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (cancelled) return;

        if (latest && latest.length > 0) {
          const convId = latest[0].conversation_id;
          conversationIdRef.current = convId;

          // Load all messages in that conversation
          const { data: rows } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('user_id', user.id)
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

          if (cancelled) return;

          if (rows && rows.length > 0) {
            setMessages(rows.map(r => ({ role: r.role as 'user' | 'assistant', content: r.content })));
          }
        }
      } catch (e) {
        console.error('[SystemChat] Failed to load conversation:', e);
      }
      setIsLoading(false);
    };

    loadConversation();
    return () => { cancelled = true; };
  }, [user]);

  // Persist a message to DB (fire-and-forget)
  const persistMessage = useCallback((msg: ChatMessage) => {
    if (!user) return;

    // Generate a new conversation_id if none exists
    if (!conversationIdRef.current) {
      conversationIdRef.current = crypto.randomUUID();
    }

    supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role: msg.role,
        content: msg.content,
        conversation_id: conversationIdRef.current,
      })
      .then(({ error }) => {
        if (error) console.error('[SystemChat] Failed to persist message:', error);
      });
  }, [user]);

  const sendMessage = useCallback(async (input: string) => {
    const userMsg: ChatMessage = { role: 'user', content: input };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsStreaming(true);

    // Persist user message
    persistMessage(userMsg);

    let assistantSoFar = '';

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/system-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: allMessages,
            playerContext: buildContext(),
          }),
          signal: controller.signal,
        }
      );

      if (!resp.ok || !resp.body) {
        const errorData = await resp.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Request failed: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }

      // Persist the complete assistant message
      if (assistantSoFar) {
        persistMessage({ role: 'assistant', content: assistantSoFar });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorContent = `\n\n*System error: ${err.message}*`;
        upsertAssistant(errorContent);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, buildContext, persistMessage]);

  const clearChat = useCallback(async () => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);

    // Delete all messages in this conversation from DB
    if (user && conversationIdRef.current) {
      const convId = conversationIdRef.current;
      conversationIdRef.current = null;
      
      supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id)
        .eq('conversation_id', convId)
        .then(({ error }) => {
          if (error) console.error('[SystemChat] Failed to clear conversation:', error);
        });
    } else {
      conversationIdRef.current = null;
    }
  }, [user]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, isLoading, sendMessage, clearChat, stopStreaming };
}
