import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Paperclip, MoreVertical, ThumbsUp, ThumbsDown, Copy, Share, Download, Settings, Zap, Brain, Shield, TrendingUp, Clock, Users, FileText, AlertTriangle, CheckCircle, XCircle, Loader2, Sparkles, MessageSquare, Bot, User, ChevronDown, ChevronUp, Eye, EyeOff, Volume2, VolumeX, RefreshCw, Star, Heart, Bookmark } from 'lucide-react';
import { useChatGPTLevelAI } from '@/hooks/useChatGPTLevelAI';
import { useContinuousLearningSystem } from '@/hooks/useContinuousLearningSystem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    processingTime?: number;
    sources?: string[];
    reasoning?: string;
    legalAnalysis?: any;
    attachments?: string[];
  };
  feedback?: {
    rating?: number;
    helpful?: boolean;
    bookmarked?: boolean;
  };
}

interface ConversationSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastActivity: Date;
  tags: string[];
  summary?: string;
}

export const ChatGPTLevelInterface: React.FC = () => {
  // Hooks للذكاء الاصطناعي والتعلم
  const {
    processAdvancedQuery,
    isProcessing,
    systemStats,
    aiConfig,
    updateAIConfig,
    getCacheStats
  } = useChatGPTLevelAI();

  const {
    recordLearningInteraction,
    updateUserFeedback,
    modelPerformance,
    getImprovementRecommendations
  } = useContinuousLearningSystem();

  // حالات الواجهة
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  // مراجع DOM
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // تأثيرات جانبية
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    // إنشاء جلسة جديدة عند التحميل
    createNewSession();
  }, []);

  // إنشاء جلسة محادثة جديدة
  const createNewSession = useCallback(() => {
    const newSession: ConversationSession = {
      id: `session_${Date.now()}`,
      title: 'محادثة جديدة',
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      tags: [],
    };

    setCurrentSession(newSession);
    setMessages([]);
    setSessions(prev => [newSession, ...prev]);
  }, []);

  // إرسال رسالة
  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // معالجة الاستفسار بالذكاء الاصطناعي المتقدم
      const response = await processAdvancedQuery(
        userMessage.content,
        'current_user_id', // يجب الحصول عليه من السياق
        'current_company_id' // يجب الحصول عليه من السياق
      );

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: {
          confidence: response.confidence,
          processingTime: response.metadata.processingTime,
          sources: response.sources,
          reasoning: response.reasoning,
          legalAnalysis: response.legalAnalysis,
        },
      };

      setMessages(prev => [...prev, assistantMessage]);

      // تسجيل التفاعل للتعلم المستمر
      await recordLearningInteraction(
        userMessage.content,
        assistantMessage.content,
        {
          intent: 'legal_consultation', // يجب استخراجه من التحليل
          entities: [], // يجب استخراجه من التحليل
          complexity: response.confidence,
          urgency: 'medium'
        },
        response.metadata,
        'current_user_id',
        currentSession?.id || 'default_session'
      );

      // تحديث الجلسة
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          messages: [...currentSession.messages, userMessage, assistantMessage],
          lastActivity: new Date(),
          title: currentSession.messages.length === 0 ? generateSessionTitle(userMessage.content) : currentSession.title
        };

        setCurrentSession(updatedSession);
        setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
      }

      // تشغيل الصوت إذا كان مفعلاً
      if (voiceEnabled) {
        speakText(response.content);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'عذراً، حدث خطأ أثناء معالجة استفسارك. يرجى المحاولة مرة أخرى.',
        timestamp: new Date(),
        metadata: {
          confidence: 0,
          processingTime: 0,
        },
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, isProcessing, processAdvancedQuery, recordLearningInteraction, currentSession, voiceEnabled]);

  // تقييم الرسالة
  const rateMessage = useCallback(async (messageId: string, rating: number) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, feedback: { ...msg.feedback, rating } }
        : msg
    ));

    // تحديث التقييم في نظام التعلم
    await updateUserFeedback(messageId, { rating, helpful: rating >= 4 });
  }, [updateUserFeedback]);

  // إضافة/إزالة إشارة مرجعية
  const toggleBookmark = useCallback(async (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, feedback: { ...msg.feedback, bookmarked: !msg.feedback?.bookmarked } }
        : msg
    ));
  }, []);

  // نسخ النص
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // يمكن إضافة إشعار نجاح هنا
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, []);

  // تشغيل النص صوتياً
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }, []);

  // تسجيل صوتي
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      // إيقاف التسجيل
      setIsRecording(false);
      // هنا يجب إضافة منطق إيقاف التسجيل ومعالجة الصوت
    } else {
      // بدء التسجيل
      setIsRecording(true);
      // هنا يجب إضافة منطق بدء التسجيل
    }
  }, [isRecording]);

  // توليد عنوان الجلسة
  const generateSessionTitle = useCallback((firstMessage: string) => {
    const words = firstMessage.split(' ').slice(0, 4);
    return words.join(' ') + (firstMessage.split(' ').length > 4 ? '...' : '');
  }, []);

  // مكون رسالة المستخدم
  const UserMessage: React.FC<{ message: Message }> = ({ message }) => (
    <div className="flex justify-end mb-4 group">
      <div className="flex items-start space-x-2 max-w-[80%]">
        <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-lg">
          <p className="text-sm leading-relaxed">{message.content}</p>
          <div className="flex items-center justify-between mt-2 text-xs text-blue-100">
            <span>{message.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-blue-100 hover:text-white hover:bg-blue-700"
                      onClick={() => copyToClipboard(message.content)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>نسخ</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-blue-100 text-blue-600">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );

  // مكون رسالة المساعد
  const AssistantMessage: React.FC<{ message: Message }> = ({ message }) => (
    <div className="flex justify-start mb-4 group">
      <div className="flex items-start space-x-2 max-w-[85%]">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-lg">
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          
          {/* معلومات إضافية */}
          {message.metadata && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Zap className="h-3 w-3" />
                    <span>{(message.metadata.confidence * 100).toFixed(0)}% ثقة</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{message.metadata.processingTime}ms</span>
                  </span>
                  {message.metadata.sources && message.metadata.sources.length > 0 && (
                    <span className="flex items-center space-x-1">
                      <FileText className="h-3 w-3" />
                      <span>{message.metadata.sources.length} مصدر</span>
                    </span>
                  )}
                </div>
                <span>{message.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          )}

          {/* أزرار التفاعل */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-1">
              {/* تقييم الرسالة */}
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant="ghost"
                    size="sm"
                    className={`h-6 w-6 p-0 ${
                      message.feedback?.rating === rating
                        ? 'text-yellow-500'
                        : 'text-gray-400 hover:text-yellow-500'
                    }`}
                    onClick={() => rateMessage(message.id, rating)}
                  >
                    <Star className="h-3 w-3" fill={message.feedback?.rating === rating ? 'currentColor' : 'none'} />
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(message.content)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>نسخ</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 w-6 p-0 ${message.feedback?.bookmarked ? 'text-red-500' : ''}`}
                      onClick={() => toggleBookmark(message.id)}
                    >
                      <Heart className="h-3 w-3" fill={message.feedback?.bookmarked ? 'currentColor' : 'none'} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>إشارة مرجعية</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {voiceEnabled && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => speakText(message.content)}
                      >
                        <Volume2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>تشغيل صوتي</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {message.metadata?.sources && message.metadata.sources.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setSelectedMessage(message)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>عرض المصادر</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // مكون مؤشر الكتابة
  const TypingIndicator: React.FC = () => (
    <div className="flex justify-start mb-4">
      <div className="flex items-start space-x-2">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm text-gray-500">المستشار القانوني يكتب...</span>
          </div>
        </div>
      </div>
    </div>
  );

  // مكون الإحصائيات
  const StatsPanel: React.FC = () => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center space-x-2">
          <TrendingUp className="h-4 w-4" />
          <span>إحصائيات الأداء</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{(modelPerformance.accuracy * 100).toFixed(1)}%</div>
            <div className="text-xs text-gray-500">دقة النظام</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{modelPerformance.responseTime.toFixed(1)}s</div>
            <div className="text-xs text-gray-500">زمن الاستجابة</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{(modelPerformance.userSatisfaction * 100).toFixed(0)}%</div>
            <div className="text-xs text-gray-500">رضا المستخدمين</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{systemStats.totalQueries}</div>
            <div className="text-xs text-gray-500">إجمالي الاستفسارات</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>معدل استخدام التخزين المؤقت</span>
            <span>{(modelPerformance.cacheHitRate * 100).toFixed(0)}%</span>
          </div>
          <Progress value={modelPerformance.cacheHitRate * 100} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`flex h-screen bg-gray-50 ${darkMode ? 'dark' : ''}`}>
      {/* الشريط الجانبي للجلسات */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">المستشار القانوني الذكي</h2>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Sparkles className="h-3 w-3 mr-1" />
                ChatGPT Level
              </Badge>
            </div>
          </div>
          
          <Button 
            onClick={createNewSession}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            محادثة جديدة
          </Button>
        </div>

        {/* قائمة الجلسات */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {sessions.map((session) => (
              <Card 
                key={session.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  currentSession?.id === session.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => {
                  setCurrentSession(session);
                  setMessages(session.messages);
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-gray-800 truncate">{session.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {session.messages.length} رسالة • {session.lastActivity.toLocaleDateString('ar-SA')}
                      </p>
                      {session.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {session.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* الإحصائيات */}
        <div className="p-4 border-t border-gray-200">
          <StatsPanel />
        </div>
      </div>

      {/* منطقة المحادثة الرئيسية */}
      <div className="flex-1 flex flex-col">
        {/* شريط العلوي */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-gray-800">
                  {currentSession?.title || 'المستشار القانوني الذكي'}
                </span>
              </div>
              {isProcessing && (
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  معالجة...
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={voiceEnabled ? 'text-blue-600' : ''}
                    >
                      {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>تشغيل/إيقاف الصوت</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAutoScroll(!autoScroll)}
                      className={autoScroll ? 'text-blue-600' : ''}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>التمرير التلقائي</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>إعدادات المستشار القانوني</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="voice-enabled">تشغيل الصوت</Label>
                      <Switch
                        id="voice-enabled"
                        checked={voiceEnabled}
                        onCheckedChange={setVoiceEnabled}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dark-mode">الوضع المظلم</Label>
                      <Switch
                        id="dark-mode"
                        checked={darkMode}
                        onCheckedChange={setDarkMode}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="compact-mode">الوضع المضغوط</Label>
                      <Switch
                        id="compact-mode"
                        checked={compactMode}
                        onCheckedChange={setCompactMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>درجة الحرارة (الإبداع)</Label>
                      <Slider
                        value={[aiConfig.temperature * 10]}
                        onValueChange={(value) => updateAIConfig({ temperature: value[0] / 10 })}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500">
                        القيمة الحالية: {aiConfig.temperature.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* منطقة الرسائل */}
        <ScrollArea className="flex-1 p-4" ref={messagesContainerRef}>
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  مرحباً بك في المستشار القانوني الذكي
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  أنا مستشار قانوني ذكي متخصص في قوانين دول الخليج وقطاع تأجير السيارات. 
                  كيف يمكنني مساعدتك اليوم؟
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {[
                    'صياغة إنذار قانوني لعميل متأخر في السداد',
                    'مراجعة عقد تأجير سيارات جديد',
                    'تقييم المخاطر القانونية لحالة معينة',
                    'استشارة حول قوانين المرور في الكويت'
                  ].map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="text-right p-3 h-auto text-sm"
                      onClick={() => setInputValue(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id}>
                    {message.role === 'user' ? (
                      <UserMessage message={message} />
                    ) : (
                      <AssistantMessage message={message} />
                    )}
                  </div>
                ))}
                {isTyping && <TypingIndicator />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* منطقة الإدخال */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="اكتب استفسارك القانوني هنا..."
                    className="pr-12 pl-4 py-3 text-right resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    disabled={isProcessing}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt"
                      multiple
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>إرفاق ملف</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${isRecording ? 'text-red-500' : ''}`}
                            onClick={toggleRecording}
                          >
                            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>تسجيل صوتي</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>

              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isProcessing}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-3"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* شريط الحالة */}
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <div className="flex items-center space-x-3">
                <span>مدعوم بالذكاء الاصطناعي المتقدم</span>
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  آمن ومشفر
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                {systemStats.totalQueries > 0 && (
                  <span>
                    {systemStats.totalQueries} استفسار • معدل الدقة {(modelPerformance.accuracy * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* نافذة عرض المصادر */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>مصادر المعلومات والتحليل</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedMessage.metadata?.sources && (
                <div>
                  <h4 className="font-medium mb-2">المصادر المستخدمة:</h4>
                  <ul className="space-y-1">
                    {selectedMessage.metadata.sources.map((source, index) => (
                      <li key={index} className="text-sm text-blue-600 hover:underline cursor-pointer">
                        {source}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {selectedMessage.metadata?.reasoning && (
                <div>
                  <h4 className="font-medium mb-2">سلسلة التفكير:</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedMessage.metadata.reasoning}
                  </p>
                </div>
              )}

              {selectedMessage.metadata?.legalAnalysis && (
                <div>
                  <h4 className="font-medium mb-2">التحليل القانوني:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">مستوى المخاطر:</span>
                      <Badge 
                        variant={
                          selectedMessage.metadata.legalAnalysis.riskLevel === 'high' ? 'destructive' :
                          selectedMessage.metadata.legalAnalysis.riskLevel === 'medium' ? 'default' : 'secondary'
                        }
                      >
                        {selectedMessage.metadata.legalAnalysis.riskLevel}
                      </Badge>
                    </div>
                    {selectedMessage.metadata.legalAnalysis.recommendations && (
                      <div>
                        <span className="text-sm font-medium">التوصيات:</span>
                        <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                          {selectedMessage.metadata.legalAnalysis.recommendations.map((rec: string, index: number) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

