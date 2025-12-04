/**
 * Hook للتواصل مع Z.AI GLM-4.6 API
 * AI Chat Assistant Hook using Z.AI GLM-4.6 Model
 */

import { useState, useCallback, useRef } from 'react';
import { getSystemPrompt } from '@/lib/ai-knowledge-base';

// Z.AI API Configuration
const ZAI_API_URL = 'https://api.z.ai/api/paas/v4/chat/completions';
const ZAI_API_KEY = '136e9f29ddd445c0a5287440f6ab13e0.DSO2qKJ4AiP1SRrH';
const MODEL = 'glm-4.6';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface UseAIChatAssistantReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  stopGeneration: () => void;
}

// Generate unique ID
const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const useAIChatAssistant = (): UseAIChatAssistantReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantMessageId = generateId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Build conversation history for API
      const conversationHistory = [
        { role: 'system', content: getSystemPrompt() },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: content.trim() }
      ];

      const response = await fetch(ZAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'ar-SA,ar',
          'Authorization': `Bearer ${ZAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: conversationHistory,
          temperature: 0.7,
          stream: true,
          max_tokens: 2048,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data:')) {
              const jsonStr = trimmedLine.slice(5).trim();
              if (jsonStr === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  accumulatedContent += delta;
                  // Update message content in real-time
                  setMessages(prev => prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, content: accumulatedContent }
                      : m
                  ));
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Mark streaming as complete
      setMessages(prev => prev.map(m => 
        m.id === assistantMessageId 
          ? { ...m, isStreaming: false }
          : m
      ));

    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // Request was cancelled
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId 
            ? { ...m, isStreaming: false, content: m.content || 'تم إلغاء الرسالة.' }
            : m
        ));
      } else {
        const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
        console.error('AI Chat Error:', err);
        setError(errorMessage);
        
        // Update assistant message with error
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId 
            ? { 
                ...m, 
                isStreaming: false, 
                content: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.' 
              }
            : m
        ));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, isLoading]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    stopGeneration,
  };
};

export default useAIChatAssistant;

