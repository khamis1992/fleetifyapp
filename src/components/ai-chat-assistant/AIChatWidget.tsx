/**
 * مكون المحادثة الذكية العائم
 * AI Chat Widget Component
 * 
 * مساعد افتراضي ذكي يجيب على أسئلة الموظفين حول النظام
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
  Sparkles,
  StopCircle,
  ChevronDown,
  Lightbulb,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAIChatAssistant, ChatMessage } from '@/hooks/useAIChatAssistant';

// الأسئلة المقترحة
const SUGGESTED_QUESTIONS = [
  'كيف أجدد تأمين مركبة؟',
  'كيف أنشئ عقد جديد؟',
  'كيف أسجل دفعة جديدة؟',
  'كيف أضيف عميل جديد؟',
  'كيف أرسل سند قبض عبر واتساب؟',
  'كيف أضيف مركبة جديدة؟',
];

// Simple Markdown to HTML parser
const parseMarkdown = (text: string): string => {
  return text
    // Bold: **text** or ***text***
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong>$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text*
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Numbered lists: 1. text
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="list-decimal mr-5">$2</li>')
    // Bullet points: - text
    .replace(/^[-•]\s+(.+)$/gm, '<li class="list-disc mr-5">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br/>');
};

// Formatted message component
const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const htmlContent = parseMarkdown(content);
  return (
    <div 
      className="text-sm leading-relaxed prose prose-sm max-w-none
        [&_strong]:font-bold [&_strong]:text-inherit
        [&_em]:italic
        [&_li]:my-1 [&_li]:mr-4
        [&_br]:block [&_br]:content-[''] [&_br]:mt-1"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

// Message Bubble Component
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        'flex gap-3 mb-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isUser 
          ? 'bg-gradient-to-br from-coral-500 to-orange-500 text-white'
          : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
        isUser 
          ? 'bg-gradient-to-br from-coral-500 to-orange-500 text-white rounded-br-md'
          : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-md'
      )}>
        {message.isStreaming && !message.content ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">جاري التفكير...</span>
          </div>
        ) : (
          <div>
            {isUser ? (
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {message.content}
              </div>
            ) : (
              <FormattedMessage content={message.content} />
            )}
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-current animate-pulse mr-1" />
            )}
          </div>
        )}
        
        {/* Timestamp */}
        <div className={cn(
          'text-[10px] mt-1 opacity-70',
          isUser ? 'text-left' : 'text-right'
        )}>
          {message.timestamp.toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </motion.div>
  );
};

// Welcome Message Component
const WelcomeMessage: React.FC<{ onSuggestionClick: (q: string) => void }> = ({ 
  onSuggestionClick 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-6 px-4"
  >
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-coral-500 to-orange-500 flex items-center justify-center shadow-lg shadow-coral-500/30">
      <Sparkles className="h-8 w-8 text-white" />
    </div>
    
    <h3 className="text-lg font-bold text-neutral-800 mb-2">
      مرحباً! أنا مساعدك الذكي 🤖
    </h3>
    
    <p className="text-sm text-neutral-600 mb-6 max-w-xs mx-auto">
      يمكنني مساعدتك في استخدام النظام والإجابة على أسئلتك
    </p>
    
    {/* Suggested Questions */}
    <div className="space-y-2">
      <p className="text-xs text-neutral-500 flex items-center justify-center gap-1">
        <Lightbulb className="h-3 w-3" />
        أسئلة مقترحة
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            className="text-xs h-auto py-2 px-3 rounded-full hover:bg-coral-50 hover:border-coral-300 hover:text-coral-600 transition-colors"
            onClick={() => onSuggestionClick(q)}
          >
            {q}
          </Button>
        ))}
      </div>
    </div>
  </motion.div>
);

// Main Chat Widget
export const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    stopGeneration,
  } = useAIChatAssistant();

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (question: string) => {
    sendMessage(question);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 left-6 z-[9999]"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-coral-500 to-orange-500 hover:from-coral-600 hover:to-orange-600 shadow-lg shadow-coral-500/40 hover:shadow-coral-500/50 transition-all hover:scale-110"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
            
            {/* Pulse Animation - pointer-events-none to allow clicking the button */}
            <span className="absolute top-0 left-0 h-14 w-14 rounded-full bg-coral-500 animate-ping opacity-30 pointer-events-none" />
            
            {/* Badge */}
            <span className="absolute -top-1 -right-1 flex h-5 w-5 pointer-events-none">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 items-center justify-center">
                <HelpCircle className="h-3 w-3 text-white" />
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-[9998] md:hidden"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Chat Window */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-6 left-6 z-[9999] w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-100px)] bg-neutral-50 rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-l from-coral-500 to-orange-500 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">المساعد الذكي</h3>
                    <p className="text-white/80 text-xs">Fleetify AI Assistant</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearChat}
                      className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                      title="مسح المحادثة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 px-4 py-4">
                {messages.length === 0 ? (
                  <WelcomeMessage onSuggestionClick={handleSuggestionClick} />
                ) : (
                  <>
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </ScrollArea>

              {/* Quick Suggestions (when chat has messages) */}
              {messages.length > 0 && !isLoading && (
                <div className="px-4 pb-2 flex-shrink-0">
                  <ScrollArea className="w-full" orientation="horizontal">
                    <div className="flex gap-2 pb-2">
                      {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-3 rounded-full whitespace-nowrap hover:bg-coral-50 hover:border-coral-300"
                          onClick={() => handleSuggestionClick(q)}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 bg-white border-t border-neutral-200 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="اكتب سؤالك هنا..."
                    className="flex-1 bg-neutral-50 border-neutral-200 focus:border-coral-400 focus:ring-coral-400 rounded-full px-4 h-10"
                    disabled={isLoading}
                    dir="rtl"
                  />
                  
                  {isLoading ? (
                    <Button
                      onClick={stopGeneration}
                      className="h-10 w-10 rounded-full bg-red-500 hover:bg-red-600"
                      title="إيقاف"
                    >
                      <StopCircle className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSend}
                      disabled={!inputValue.trim()}
                      className="h-10 w-10 rounded-full bg-gradient-to-br from-coral-500 to-orange-500 hover:from-coral-600 hover:to-orange-600 disabled:opacity-50"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                
                {/* Powered by */}
                <p className="text-[10px] text-neutral-400 text-center mt-2">
                  مدعوم بـ GLM-4.6 AI 🤖
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;

