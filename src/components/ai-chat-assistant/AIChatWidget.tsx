/**
 * مكون المحادثة الذكية العائم
 * AI Chat Widget Component
 * 
 * مساعد افتراضي ذكي يجيب على أسئلة الموظفين حول النظام
 * مع دعم التنقل التلقائي والجولات التفاعلية
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIChat } from '@/contexts/AIChatContext';
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
  ExternalLink,
  Play,
  Navigation,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAIChatAssistant, ChatMessage } from '@/hooks/useAIChatAssistant';
import { PAGE_ROUTES } from '@/lib/ai-knowledge-base';
import { useToast } from '@/components/ui/use-toast';
import { useTourGuide } from '@/components/tour-guide';
import { useSystemStats, generateStatsPrompt } from '@/hooks/useSystemStats';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
// ===== أنواع الإجراءات =====
interface ActionButton {
  type: 'nav' | 'tour' | 'action';
  id: string;
  label: string;
}

// دالة لاستخراج الإجراءات من النص
const parseActions = (text: string): { cleanText: string; actions: ActionButton[] } => {
  const actions: ActionButton[] = [];
  
  // استخراج إجراءات التنقل [NAV:route:label]
  const navRegex = /\[NAV:([a-zA-Z]+):([^\]]+)\]/g;
  let match;
  while ((match = navRegex.exec(text)) !== null) {
    actions.push({
      type: 'nav',
      id: match[1],
      label: match[2],
    });
  }
  
  // استخراج إجراءات الجولات [TOUR:id:label]
  const tourRegex = /\[TOUR:([a-zA-Z-]+):([^\]]+)\]/g;
  while ((match = tourRegex.exec(text)) !== null) {
    actions.push({
      type: 'tour',
      id: match[1],
      label: match[2],
    });
  }

  // استخراج الإجراءات السريعة [ACTION:action_id:label]
  const actionRegex = /\[ACTION:([a-zA-Z-]+):([^\]]+)\]/g;
  while ((match = actionRegex.exec(text)) !== null) {
    actions.push({
      type: 'action',
      id: match[1],
      label: match[2],
    });
  }
  
  // إزالة الإجراءات من النص
  const cleanText = text
    .replace(/\[NAV:[^\]]+\]/g, '')
    .replace(/\[TOUR:[^\]]+\]/g, '')
    .replace(/\[ACTION:[^\]]+\]/g, '')
    .trim();
  
  return { cleanText, actions };
};

// ===== معلومات الصفحات للسياق =====
const PAGE_INFO: Record<string, { name: string; section: string; suggestions: string[] }> = {
  '/dashboard': {
    name: 'الرئيسية',
    section: 'عام',
    suggestions: ['ما هي إحصائيات اليوم؟', 'كم عدد العقود النشطة؟'],
  },
  '/fleet': {
    name: 'المركبات',
    section: 'الأسطول',
    suggestions: ['كيف أضيف مركبة جديدة؟', 'كيف أجدد التأمين؟'],
  },
  '/customers': {
    name: 'العملاء',
    section: 'العملاء',
    suggestions: ['كيف أضيف عميل جديد؟', 'كيف أبحث عن عميل؟'],
  },
  '/contracts': {
    name: 'العقود',
    section: 'العقود',
    suggestions: ['كيف أنشئ عقد جديد؟', 'كيف أجدد عقد؟'],
  },
  '/finance/payments': {
    name: 'المدفوعات',
    section: 'المالية',
    suggestions: ['كيف أنشئ سند قبض؟', 'كيف أرسل سند عبر واتساب؟'],
  },
  '/tasks': {
    name: 'المهام',
    section: 'المهام',
    suggestions: ['كيف أنشئ مهمة جديدة؟', 'ما هي مهامي اليوم؟'],
  },
};

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

// مكون أزرار الإجراءات
const ActionButtons: React.FC<{
  actions: ActionButton[];
  onNavigate: (routeKey: string) => void;
  onStartTour: (tourId: string) => void;
  onQuickAction: (actionId: string) => void;
}> = ({ actions, onNavigate, onStartTour, onQuickAction }) => {
  if (actions.length === 0) return null;

  const getButtonStyle = (type: 'nav' | 'tour' | 'action') => {
    switch (type) {
      case 'nav':
        return 'border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300';
      case 'tour':
        return 'border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300';
      case 'action':
        return 'bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:from-coral-600 hover:to-orange-600 border-0';
    }
  };

  const getIcon = (type: 'nav' | 'tour' | 'action') => {
    switch (type) {
      case 'nav':
        return <MapPin className="w-3 h-3" />;
      case 'tour':
        return <Play className="w-3 h-3" />;
      case 'action':
        return <Sparkles className="w-3 h-3" />;
    }
  };

  const getLabel = (action: ActionButton) => {
    switch (action.type) {
      case 'nav':
        return `انتقل: ${action.label}`;
      case 'tour':
        return `جولة: ${action.label}`;
      case 'action':
        return `⚡ ${action.label}`;
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
      <p className="text-xs text-neutral-500 flex items-center gap-1 mb-2">
        <Sparkles className="w-3 h-3" />
        إجراءات تفاعلية
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, idx) => (
          <Button
            key={idx}
            size="sm"
            variant={action.type === 'action' ? 'default' : 'outline'}
            className={cn(
              'h-8 text-xs gap-1.5 rounded-full transition-all',
              getButtonStyle(action.type)
            )}
            onClick={() => {
              if (action.type === 'nav') {
                onNavigate(action.id);
              } else if (action.type === 'tour') {
                onStartTour(action.id);
              } else {
                onQuickAction(action.id);
              }
            }}
          >
            {getIcon(action.type)}
            {getLabel(action)}
          </Button>
        ))}
      </div>
    </div>
  );
};

// Formatted message component with action support
const FormattedMessage: React.FC<{
  content: string;
  onNavigate: (routeKey: string) => void;
  onStartTour: (tourId: string) => void;
  onQuickAction: (actionId: string) => void;
}> = ({ content, onNavigate, onStartTour, onQuickAction }) => {
  const { cleanText, actions } = useMemo(() => parseActions(content), [content]);
  const htmlContent = parseMarkdown(cleanText);
  
  return (
    <div>
      <div 
        className="text-sm leading-relaxed prose prose-sm max-w-none
          [&_strong]:font-bold [&_strong]:text-inherit
          [&_em]:italic
          [&_li]:my-1 [&_li]:mr-4
          [&_br]:block [&_br]:content-[''] [&_br]:mt-1"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      <ActionButtons
        actions={actions}
        onNavigate={onNavigate}
        onStartTour={onStartTour}
        onQuickAction={onQuickAction}
      />
    </div>
  );
};

// Message Bubble Component
const MessageBubble: React.FC<{
  message: ChatMessage;
  onNavigate: (routeKey: string) => void;
  onStartTour: (tourId: string) => void;
  onQuickAction: (actionId: string) => void;
}> = ({ message, onNavigate, onStartTour, onQuickAction }) => {
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
          ? 'bg-gradient-to-br from-rose-500 to-orange-500 text-white'
          : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-3 shadow-sm',
        isUser 
          ? 'bg-gradient-to-br from-rose-500 to-orange-500 text-white rounded-br-md'
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
              <FormattedMessage
                content={message.content}
                onNavigate={onNavigate}
                onStartTour={onStartTour}
                onQuickAction={onQuickAction}
              />
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
          {message.timestamp.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </motion.div>
  );
};

// Welcome Message Component with Page Context
const WelcomeMessage: React.FC<{
  onSuggestionClick: (q: string) => void;
  currentPage?: { name: string; section: string; suggestions: string[] };
}> = ({ onSuggestionClick, currentPage }) => {
  // دمج الاقتراحات السياقية مع الاقتراحات العامة
  const contextualSuggestions = currentPage?.suggestions || [];
  const allSuggestions = [...contextualSuggestions, ...SUGGESTED_QUESTIONS.slice(0, 4 - contextualSuggestions.length)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-6 px-4"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
        <Bot className="h-8 w-8 text-white" />
      </div>
      
      <h3 className="text-lg font-bold text-neutral-800 mb-2">
        مرحباً! أنا مساعدك الذكي 🤖
      </h3>
      
      <p className="text-sm text-neutral-600 mb-4 max-w-xs mx-auto">
        يمكنني مساعدتك في استخدام النظام والإجابة على أسئلتك
      </p>

      {/* Page Context Badge */}
      {currentPage && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs px-3 py-1.5 rounded-full">
            <MapPin className="w-3 h-3" />
            أنت في: {currentPage.name}
          </span>
        </div>
      )}
      
      {/* Suggested Questions */}
      <div className="space-y-2">
        <p className="text-xs text-neutral-500 flex items-center justify-center gap-1">
          <Lightbulb className="h-3 w-3" />
          {currentPage ? 'اقتراحات لهذه الصفحة' : 'أسئلة مقترحة'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {allSuggestions.slice(0, 4).map((q, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-xs h-auto py-2 px-3 rounded-full hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
              onClick={() => onSuggestionClick(q)}
            >
              {q}
            </Button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Main Chat Widget
export const AIChatWidget: React.FC<{
   hideFloatingButton?: boolean }> = ({ hideFloatingButton = false }) => {
  const externalAIChat = useAIChat();
  // Use external state if available, otherwise use local state
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = externalAIChat?.isOpen ?? localIsOpen;
  const setIsOpen = (value: boolean) => {
    if (externalAIChat?.openChat) {
      if (value) externalAIChat.openChat();
      else externalAIChat.closeChat();
    } else {
      setLocalIsOpen(value);
    }
  };
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // جلب إحصائيات النظام الحقيقية
  const { data: systemStats } = useSystemStats();
  const statsPrompt = useMemo(() => generateStatsPrompt(systemStats), [systemStats]);
  
  // نظام الجولات التفاعلية
  const { startTour, navigateTo } = useTourGuide();
  
  const {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    stopGeneration,
  } = useAIChatAssistant({ systemStatsPrompt: statsPrompt });

  // الحصول على معلومات الصفحة الحالية
  const currentPageInfo = useMemo(() => {
    return PAGE_INFO[location.pathname] || null;
  }, [location.pathname]);

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

  // التنقل للصفحة المطلوبة
  const handleNavigate = (routeKey: string) => {
    const route = PAGE_ROUTES[routeKey as keyof typeof PAGE_ROUTES];
    if (route) {
      setIsOpen(false); // إغلاق المحادثة
      navigate(route);
      toast({
        title: '📍 تم التنقل',
        description: `انتقلت إلى الصفحة المطلوبة`,
      });
    } else {
      toast({
        title: '⚠️ خطأ',
        description: 'لم يتم العثور على الصفحة',
        variant: 'destructive',
      });
    }
  };

  // بدء جولة تفاعلية
  const handleStartTour = (tourId: string) => {
    setIsOpen(false); // إغلاق المحادثة أولاً
    
    // تحديد المسار المناسب للجولة
    const tourRoutes: Record<string, string> = {
      'add-vehicle': '/fleet',
      'create-contract': '/contracts',
      'renew-insurance': '/fleet',
      'create-payment': '/finance/payments',
      'add-customer': '/customers',
      'dashboard-overview': '/dashboard',
    };
    
    const targetRoute = tourRoutes[tourId];
    if (targetRoute && location.pathname !== targetRoute) {
      // التنقل للصفحة المناسبة أولاً ثم بدء الجولة
      navigate(targetRoute);
      setTimeout(() => {
        startTour(tourId);
      }, 500);
    } else {
      // بدء الجولة مباشرة
      startTour(tourId);
    }
    
    toast({
      title: '🎯 جولة تفاعلية',
      description: `بدأت جولة "${tourId}" - اتبع الإرشادات على الشاشة`,
    });
  };

  // تنفيذ إجراء سريع
  const handleQuickAction = (actionId: string) => {
    console.log('🚀 Quick action:', actionId);
    setIsOpen(false); // إغلاق المحادثة

    // تحديد الإجراء والتنفيذ
    const actionRoutes: Record<string, string> = {
      'open-add-vehicle': '/fleet',
      'open-add-customer': '/customers',
      'open-add-contract': '/contracts',
      'open-add-payment': '/finance/payments',
      'open-add-invoice': '/finance/invoices',
      'open-add-task': '/tasks',
      'search-vehicle': '/fleet',
      'search-customer': '/customers',
      'search-contract': '/contracts',
      'show-dashboard': '/dashboard',
      'show-reports': '/fleet/reports',
    };

    const targetRoute = actionRoutes[actionId];
    if (targetRoute) {
      navigate(targetRoute);
      
      // رسالة توضيحية للمستخدم
      const actionMessages: Record<string, { title: string; description: string }> = {
        'open-add-vehicle': { title: '🚗 إضافة مركبة', description: 'اضغط على زر "إضافة مركبة" لبدء الإضافة' },
        'open-add-customer': { title: '👤 إضافة عميل', description: 'اضغط على زر "إضافة عميل" لبدء الإضافة' },
        'open-add-contract': { title: '📄 إنشاء عقد', description: 'اضغط على زر "إنشاء عقد جديد" لبدء الإنشاء' },
        'open-add-payment': { title: '💳 سند جديد', description: 'اضغط على زر "سند جديد" لإنشاء سند قبض أو صرف' },
        'open-add-invoice': { title: '🧾 فاتورة جديدة', description: 'اضغط على زر "إنشاء فاتورة" لبدء الإنشاء' },
        'open-add-task': { title: '✅ مهمة جديدة', description: 'اضغط على زر "إضافة مهمة" لإنشاء مهمة' },
        'search-vehicle': { title: '🔍 بحث', description: 'استخدم خانة البحث للعثور على المركبة' },
        'search-customer': { title: '🔍 بحث', description: 'استخدم خانة البحث للعثور على العميل' },
        'search-contract': { title: '🔍 بحث', description: 'استخدم خانة البحث للعثور على العقد' },
        'show-dashboard': { title: '🏠 الرئيسية', description: 'تم الانتقال إلى لوحة التحكم' },
        'show-reports': { title: '📊 التقارير', description: 'تم الانتقال إلى صفحة التقارير' },
      };

      const message = actionMessages[actionId] || { title: '✅ تم', description: 'تم تنفيذ الإجراء' };
      
      setTimeout(() => {
        toast({
          title: message.title,
          description: message.description,
        });
      }, 300);
    } else {
      toast({
        title: '⚠️ خطأ',
        description: 'إجراء غير معروف',
        variant: 'destructive',
      });
    }
  };

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
      {/* Floating Button - المساعد الذكي على اليسار */}
      <AnimatePresence>
        {!isOpen && !hideFloatingButton && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 left-6 z-[9999]"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/40 hover:shadow-blue-500/50 transition-all hover:scale-110"
            >
              <Bot className="h-6 w-6" />
            </Button>
            
            {/* Pulse Animation - pointer-events-none to allow clicking the button */}
            <span className="absolute top-0 left-0 h-14 w-14 rounded-full bg-blue-500 animate-ping opacity-30 pointer-events-none" />
            
            {/* AI Badge */}
            <span className="absolute -top-1 -right-1 flex h-5 w-5 pointer-events-none">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 items-center justify-center">
                <Sparkles className="h-3 w-3 text-white" />
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
            
            {/* Chat Window - على اليسار */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-6 left-6 z-[9999] w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-100px)] bg-neutral-50 rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-teal-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">المساعد الذكي</h3>
                    <p className="text-white/80 text-xs">{t("fleetifyAiAssistant")}</p>
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
                  <WelcomeMessage
                    onSuggestionClick={handleSuggestionClick}
                    currentPage={currentPageInfo || undefined}
                  />
                ) : (
                  <>
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        onNavigate={handleNavigate}
                        onStartTour={handleStartTour}
                        onQuickAction={handleQuickAction}
                      />
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
                          className="text-xs h-7 px-3 rounded-full whitespace-nowrap hover:bg-blue-50 hover:border-blue-300"
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
                    className="flex-1 bg-neutral-50 border-neutral-200 focus:border-blue-400 focus:ring-blue-400 rounded-full px-4 h-10"
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
                      className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;

