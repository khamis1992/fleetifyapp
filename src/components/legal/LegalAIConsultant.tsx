import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  ThumbsUp, 
  BarChart, 
  Zap, 
  Clock, 
  TrendingUp, 
  Database,
  Brain,
  Star,
  CheckCircle,
  AlertCircle,
  Loader2,
  Bot,
  User,
  Settings,
  History
} from 'lucide-react';
import { useLegalAI } from '@/hooks/useLegalAI';
import { useLegalAIStats } from '@/hooks/useLegalAIStats';

interface LegalAIConsultantProps {
  companyId: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  metadata?: {
    source: 'cache' | 'local_knowledge' | 'api';
    confidence: number;
    response_time: number;
    cost_saved?: boolean;
  };
}

export const LegalAIConsultant: React.FC<LegalAIConsultantProps> = ({ companyId }) => {
  // حالات البيانات الأساسية
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('kuwait'); // الكويت كافتراضي لـ FleetifyApp
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // حالات التقييم
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  

  // Hooks مخصصة
  const { submitQuery, submitFeedback, isLoading: apiLoading } = useLegalAI();
  const { stats, healthStatus, refreshStats } = useLegalAIStats();

  // قائمة الدول المدعومة
  const countries = [
    { code: 'kuwait', name: 'دولة الكويت', flag: '🇰🇼' },
    { code: 'saudi_arabia', name: 'المملكة العربية السعودية', flag: '🇸🇦' },
    { code: 'qatar', name: 'دولة قطر', flag: '🇶🇦' }
  ];

  // تحميل المحادثات السابقة عند بدء التطبيق
  useEffect(() => {
    loadChatHistory();
    refreshStats();
  }, [companyId]);

  // تحميل تاريخ المحادثات
  const loadChatHistory = async () => {
    try {
      // يمكن تحميل المحادثات السابقة من قاعدة البيانات
      const savedHistory = localStorage.getItem(`legal-ai-chat-${companyId}`);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        // إصلاح مشكلة timestamp - تحويل السلاسل النصية إلى Date objects
        const fixedHistory = parsedHistory.map((message: any) => ({
          ...message,
          timestamp: typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp
        }));
        setChatHistory(fixedHistory);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // حفظ تاريخ المحادثات
  const saveChatHistory = (history: ChatMessage[]) => {
    try {
      localStorage.setItem(`legal-ai-chat-${companyId}`, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  // إرسال الاستفسار القانوني
  const handleSubmitQuery = async () => {
    if (!query.trim()) {
      setError('يرجى كتابة سؤالك القانوني');
      return;
    }

    setLoading(true);
    setError(null);
    setFeedbackSubmitted(false);
    setRating(0);
    setFeedbackText('');

    // إضافة رسالة المستخدم
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date()
    };

    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    saveChatHistory(newHistory);

    try {
      const response = await submitQuery({
        query: query,
        country: country,
        company_id: companyId
      });

      if (response.success) {
        // إضافة رسالة الذكاء الاصطناعي
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: response.advice,
          timestamp: new Date(),
          metadata: response.metadata
        };

        const updatedHistory = [...newHistory, aiMessage];
        setChatHistory(updatedHistory);
        saveChatHistory(updatedHistory);
        setCurrentMessageId(aiMessage.id);

        // تحديث الإحصائيات
        setTimeout(refreshStats, 1000);
      } else {
        setError(response.message || 'حدث خطأ في معالجة طلبك');
      }
    } catch (error) {
      setError('حدث خطأ في الاتصال بالخادم');
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setQuery(''); // مسح النص بعد الإرسال
    }
  };

  // إرسال التقييم
  const handleSubmitFeedback = async () => {
    if (!currentMessageId || rating === 0) {
      setError('يرجى اختيار تقييم أولاً');
      return;
    }

    try {
      const currentMessage = chatHistory.find(msg => msg.id === currentMessageId);
      if (!currentMessage) return;

      const userMessage = chatHistory.find(msg => 
        msg.type === 'user' && 
        chatHistory.indexOf(msg) === chatHistory.indexOf(currentMessage) - 1
      );

      if (!userMessage) return;

      const response = await submitFeedback({
        query: userMessage.content,
        country: country,
        rating: rating,
        feedback_text: feedbackText,
        company_id: companyId,
        message_id: currentMessageId
      });

      if (response.success) {
        setFeedbackSubmitted(true);
        setCurrentMessageId(null);
        // تحديث الإحصائيات
        setTimeout(refreshStats, 1000);
      } else {
        setError(response.message || 'حدث خطأ في تسجيل التقييم');
      }
    } catch (error) {
      setError('حدث خطأ في إرسال التقييم');
      console.error('Error:', error);
    }
  };

  // مسح تاريخ المحادثة
  const clearChatHistory = () => {
    setChatHistory([]);
    localStorage.removeItem(`legal-ai-chat-${companyId}`);
    setCurrentMessageId(null);
    setFeedbackSubmitted(false);
  };

  // مكون عرض الرسالة
  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isUser = message.type === 'user';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-bubble-in`}>
        <div className={`flex items-start gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* أيقونة المستخدم/البوت مع تأثيرات بصرية جميلة */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-chat-bubble transition-all duration-300 hover:scale-105 ${
            isUser 
              ? 'bg-gradient-chat-user animate-pulse-glow' 
              : 'bg-gradient-chat-ai border-2 border-accent/20'
          }`}>
            {isUser ? (
              <User className="w-5 h-5 text-white drop-shadow-sm" />
            ) : (
              <Bot className="w-5 h-5 text-primary drop-shadow-sm" />
            )}
          </div>
          
          {/* فقاعة الرسالة مع تصميم متدرج وظلال جميلة */}
          <div className={`relative rounded-2xl p-4 shadow-chat-bubble transition-all duration-300 hover:shadow-chat-glow ${
            isUser 
              ? 'bg-gradient-chat-user text-white' 
              : 'bg-gradient-chat-ai text-card-foreground border border-border/30'
          }`}>
            {/* محتوى الرسالة */}
            <div className="whitespace-pre-wrap text-sm leading-relaxed font-medium">
              {message.content}
            </div>
            
            {/* معلومات إضافية للرسائل من الذكاء الاصطناعي */}
            {!isUser && message.metadata && (
              <div className="mt-3 pt-3 border-t border-muted/30">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
                    {message.metadata.source === 'cache' && (
                      <>
                        <Zap className="w-3 h-3 text-warning" />
                        <span>ذاكرة مؤقتة</span>
                      </>
                    )}
                    {message.metadata.source === 'local_knowledge' && (
                      <>
                        <Database className="w-3 h-3 text-primary" />
                        <span>معرفة محلية</span>
                      </>
                    )}
                    {message.metadata.source === 'api' && (
                      <>
                        <Brain className="w-3 h-3 text-accent-foreground" />
                        <span>ذكاء اصطناعي</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span>{(message.metadata.response_time * 1000).toFixed(0)}ms</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span>{(message.metadata.confidence * 100).toFixed(0)}%</span>
                  </div>
                  
                  {message.metadata.cost_saved && (
                    <Badge variant="outline" className="text-success border-success/30 text-xs">
                      <CheckCircle className="w-2 h-2 mr-1" />
                      توفير
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {/* وقت الرسالة */}
            <div className={`text-xs mt-2 ${isUser ? 'text-white/70' : 'text-muted-foreground'}`}>
              {new Date(message.timestamp).toLocaleTimeString('ar', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            
            {/* مؤشر الاتجاه للفقاعة */}
            <div className={`absolute top-4 w-3 h-3 rotate-45 ${
              isUser 
                ? 'right-[-6px] bg-gradient-chat-user' 
                : 'left-[-6px] bg-gradient-chat-ai border-r border-b border-border/30'
            }`} />
          </div>
        </div>
      </div>
    );
  };

  // مكون الإحصائيات
  const StatsDisplay = () => {
    if (!stats) return <div>جاري تحميل الإحصائيات...</div>;

    const performance = stats.performance_overview;

    return (
      <div className="space-y-6">
        {/* إحصائيات الأداء الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي الاستفسارات</p>
                  <p className="text-2xl font-bold">{performance.total_queries}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">كفاءة التكلفة</p>
                  <p className="text-2xl font-bold">{performance.cost_efficiency}%</p>
                </div>
                <Zap className="w-8 h-8 text-green-500" />
              </div>
              <Progress value={performance.cost_efficiency} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">رضا المستخدمين</p>
                  <p className="text-2xl font-bold">{performance.user_satisfaction}%</p>
                </div>
                <ThumbsUp className="w-8 h-8 text-yellow-500" />
              </div>
              <Progress value={performance.user_satisfaction} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">متوسط وقت الاستجابة</p>
                  <p className="text-2xl font-bold">{performance.average_response_time.toFixed(2)}s</p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* إحصائيات مفصلة */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>توزيع مصادر الإجابات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>الذاكرة المؤقتة</span>
                  <div className="flex items-center gap-2">
                    <Progress value={performance.cache_hit_rate} className="w-20" />
                    <span className="text-sm">{performance.cache_hit_rate}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>المعرفة المحلية</span>
                  <div className="flex items-center gap-2">
                    <Progress value={performance.local_knowledge_hit_rate} className="w-20" />
                    <span className="text-sm">{performance.local_knowledge_hit_rate}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>الذكاء الاصطناعي</span>
                  <div className="flex items-center gap-2">
                    <Progress value={performance.api_usage_rate} className="w-20" />
                    <span className="text-sm">{performance.api_usage_rate}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>التوفير في التكلفة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>التوفير الإجمالي</span>
                  <span className="font-bold">${performance.total_cost_saved}</span>
                </div>
                <div className="flex justify-between">
                  <span>التوفير المقدر شهرياً</span>
                  <span className="font-bold">${stats.efficiency_breakdown.estimated_monthly_savings}</span>
                </div>
                <div className="flex justify-between">
                  <span>استدعاءات API محفوظة</span>
                  <span className="font-bold">{stats.efficiency_breakdown.api_calls_saved}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-end">
        <div className="text-right">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 justify-end">
            المستشار القانوني
            <Brain className="w-6 h-6 text-blue-500" />
          </h2>
        </div>
        
        {/* حالة النظام */}
        {healthStatus && (
          <div className="flex items-center gap-2 mr-auto">
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              النظام يعمل بكفاءة {healthStatus.performance.cost_efficiency}%
            </Badge>
          </div>
        )}
      </div>

      {/* منطقة المحادثة بدون تبويبات */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* منطقة المحادثة */}
          <div className="lg:col-span-3">
            <Card className="h-[400px] flex flex-col bg-gradient-chat-container shadow-chat-container border-0 backdrop-blur-sm">
              <CardHeader className="flex-shrink-0 bg-gradient-chat-header rounded-t-lg border-b border-border/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 rounded-full bg-primary/10">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <span className="bg-gradient-primary bg-clip-text text-transparent font-bold">
                      المحادثة القانونية الذكية
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="w-48 shadow-chat-input border-border/30 hover:shadow-chat-glow transition-all duration-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="flex items-center gap-2">
                              <span className="text-lg">{c.flag}</span>
                              <span>{c.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearChatHistory}
                      className="hover:shadow-chat-input transition-all duration-300 border-border/30"
                    >
                      <History className="w-4 h-4 mr-1" />
                      مسح المحادثة
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {/* منطقة الرسائل */}
              <CardContent className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4 pr-2">
                  {chatHistory.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center animate-fade-in">
                        <div className="p-4 rounded-full bg-gradient-primary/10 mb-6 inline-block animate-float">
                          <Bot className="w-16 h-16 text-primary drop-shadow-sm" />
                        </div>
                        <h3 className="text-xl font-bold text-card-foreground mb-2">مرحباً بك في المستشار القانوني</h3>
                        <p className="text-muted-foreground mb-4">ابدأ محادثة جديدة واطرح سؤالك القانوني</p>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                          <span>جاهز للمساعدة على مدار الساعة</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    chatHistory.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))
                  )}
                  
                  {loading && (
                    <div className="flex justify-start mb-6 animate-slide-up">
                      <div className="flex items-start gap-3 max-w-[85%]">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-chat-ai border-2 border-accent/20 shadow-chat-bubble">
                          <Bot className="w-5 h-5 text-primary animate-pulse" />
                        </div>
                        <div className="relative bg-gradient-chat-ai text-card-foreground border border-border/30 rounded-2xl p-4 shadow-chat-bubble">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 rounded-full bg-primary animate-typing" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 rounded-full bg-primary animate-typing" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 rounded-full bg-primary animate-typing" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-sm text-muted-foreground">المستشار يفكر في إجابتك...</span>
                          </div>
                          <div className="absolute top-4 left-[-6px] w-3 h-3 rotate-45 bg-gradient-chat-ai border-r border-b border-border/30" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              
              {/* منطقة الإدخال */}
              <div className="border-t border-border/20 bg-gradient-chat-input p-6 space-y-4 rounded-b-lg">
                {/* منطقة كتابة الرسالة */}
                <div className="space-y-3">
                  <Textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="اكتب سؤالك القانوني هنا... مثال: ما هي خطوات تأسيس شركة في الكويت؟"
                    className="min-h-[80px] resize-none shadow-chat-input border-border/30 bg-background/50 focus:shadow-chat-glow transition-all duration-300 text-base"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleSubmitQuery();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSubmitQuery}
                    disabled={loading || !query.trim()}
                    className="w-full px-8 bg-gradient-primary hover:shadow-glow transition-all duration-300 font-semibold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        جاري المعالجة...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        إرسال السؤال
                      </>
                    )}
                  </Button>
                </div>
                
                {error && (
                  <Alert className="border-destructive/30 bg-destructive/5 animate-slide-up">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </Card>
          </div>
          
          {/* الشريط الجانبي */}
          <div className="space-y-4">
            {/* إحصائيات سريعة */}
            {stats && (
              <Card className="bg-gradient-card shadow-card border-0 animate-fade-in">
                <CardHeader className="bg-gradient-chat-header rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-primary">
                    <div className="p-1.5 rounded-full bg-primary/10">
                      <BarChart className="w-4 h-4" />
                    </div>
                    إحصائيات سريعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-gradient-accent/10 hover:bg-gradient-accent/20 transition-all duration-300">
                    <span className="text-sm font-medium">الاستفسارات اليوم</span>
                    <span className="font-bold text-primary text-lg">{stats.performance_overview.total_queries}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-gradient-accent/10 hover:bg-gradient-accent/20 transition-all duration-300">
                    <span className="text-sm font-medium">كفاءة التكلفة</span>
                    <span className="font-bold text-success text-lg">{stats.performance_overview.cost_efficiency}%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-gradient-accent/10 hover:bg-gradient-accent/20 transition-all duration-300">
                    <span className="text-sm font-medium">رضا المستخدمين</span>
                    <span className="font-bold text-primary text-lg">{stats.performance_overview.user_satisfaction}%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-gradient-accent/10 hover:bg-gradient-accent/20 transition-all duration-300">
                    <span className="text-sm font-medium">وقت الاستجابة</span>
                    <span className="font-bold text-muted-foreground text-lg">{stats.performance_overview.average_response_time.toFixed(2)}s</span>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* تقييم الإجابة الأخيرة */}
            {currentMessageId && !feedbackSubmitted && (
              <Card className="bg-gradient-card shadow-card border-0 animate-slide-up">
                <CardHeader className="bg-gradient-chat-header rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-primary">
                    <div className="p-1.5 rounded-full bg-warning/20">
                      <Star className="w-4 h-4 text-warning" />
                    </div>
                    قيّم الإجابة
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    ساعدنا في تحسين جودة الخدمة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  {/* نجوم التقييم */}
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Button
                        key={star}
                        variant="ghost"
                        size="sm"
                        onClick={() => setRating(star)}
                        className={`p-2 hover:scale-110 transition-all duration-300 ${
                          rating >= star ? 'text-warning' : 'text-muted-foreground hover:text-warning/70'
                        }`}
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </Button>
                    ))}
                  </div>
                  
                  {/* تعليق إضافي */}
                  <Textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="تعليق إضافي (اختياري)"
                    className="min-h-[80px] resize-none shadow-chat-input border-border/30 bg-background/50 focus:shadow-chat-glow transition-all duration-300"
                  />
                  
                  <Button 
                    onClick={handleSubmitFeedback}
                    disabled={rating === 0}
                    className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 font-semibold"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    إرسال التقييم
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {feedbackSubmitted && (
              <Card className="bg-gradient-card shadow-card border-0 animate-scale-in">
                <CardContent className="p-6 text-center">
                  <div className="p-3 rounded-full bg-success/10 mb-4 inline-block">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <h4 className="font-semibold text-card-foreground mb-2">شكراً لك!</h4>
                  <p className="text-sm text-success">تم تسجيل تقييمك بنجاح</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
