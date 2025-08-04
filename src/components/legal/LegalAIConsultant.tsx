import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  MessageSquare, 
  BarChart3, 
  Settings,
  Send, 
  Loader2, 
  CheckCircle, 
  Clock,
  DollarSign,
  Zap,
  Star,
  TrendingUp,
  Users,
  Target,
  User,
  Bot,
  Database,
  ThumbsUp,
  AlertCircle,
  History
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useLegalAI } from '@/hooks/useLegalAI';
import { useLegalAIStats } from '@/hooks/useLegalAIStats';
import { useLegalMemos } from '@/hooks/useLegalMemos';
import { CustomerSearchDialog } from './CustomerSearchDialog';
import { CustomerAnalysisPanel } from './CustomerAnalysisPanel';
import APIKeySettings from './APIKeySettings';

interface LegalAIConsultantProps {
  companyId: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: number; // تغيير من Date إلى number للـ unix timestamp
  system_data?: any;
  classification?: {
    type: 'system_data' | 'legal_advice' | 'mixed';
    confidence: number;
    components?: { system_data: string[], legal_advice: string[] };
    reasoning?: string;
  };
  metadata?: {
    source: 'cache' | 'local_knowledge' | 'api' | 'system_data' | 'system_data_with_ai' | 'mixed_query_ai';
    confidence: number;
    response_time: number;
    cost_saved?: boolean;
    usage_count?: number;
    match_score?: number;
    data_sources?: string[];
    query_type?: 'system_data' | 'consultation' | 'memo' | 'contract' | 'licensing' | 'general' | 'mixed';
    components?: { system_data: string[], legal_advice: string[] };
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
  
  // حالات الواجهة
  const [activeTab, setActiveTab] = useState('chat');

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
        setChatHistory(JSON.parse(savedHistory));
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
      timestamp: Date.now() // استخدام timestamp رقمي
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
          content: response.advice || '',
          timestamp: Date.now(), // استخدام timestamp رقمي
          system_data: response.system_data,
          classification: response.classification,
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
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex items-start gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-blue-500' : 'bg-green-500'
          }`}>
            {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
          </div>
          
          <div className={`rounded-lg p-3 ${
            isUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-800 border'
          }`}>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
            
            {/* معلومات إضافية للرسائل من الذكاء الاصطناعي */}
            {!isUser && message.metadata && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    {message.metadata.source === 'cache' && (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>ذاكرة مؤقتة</span>
                      </>
                    )}
                    {message.metadata.source === 'local_knowledge' && (
                      <>
                        <Database className="w-3 h-3" />
                        <span>معرفة محلية</span>
                      </>
                    )}
                     {message.metadata.source === 'api' && (
                      <>
                        <Brain className="w-3 h-3" />
                        <span>ذكاء اصطناعي</span>
                      </>
                     )}
                     {message.metadata.source === 'system_data_with_ai' && (
                       <>
                         <Database className="w-3 h-3" />
                         <span>بيانات النظام + AI</span>
                       </>
                     )}
                     {message.metadata.source === 'mixed_query_ai' && (
                       <>
                         <Brain className="w-3 h-3" />
                         <Database className="w-3 h-3" />
                         <span>استفسار مختلط</span>
                       </>
                     )}
                  </div>
                  
                   <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{message.metadata.response_time?.toFixed(0)}ms</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>{(message.metadata.confidence * 100).toFixed(0)}%</span>
                  </div>
                  
                  {message.metadata.cost_saved && (
                    <Badge variant="outline" className="text-green-600 text-xs">
                      <CheckCircle className="w-2 h-2 mr-1" />
                      توفير
                    </Badge>
                  )}
                  
                  {message.metadata.data_sources && (
                    <div className="flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      <span>{message.metadata.data_sources.length} مصدر بيانات</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* عرض معلومات التصنيف للاستفسارات المختلطة */}
            {!isUser && message.classification && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">تحليل الاستفسار:</div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${
                      message.classification.type === 'mixed' ? 'bg-purple-50 text-purple-700' :
                      message.classification.type === 'system_data' ? 'bg-blue-50 text-blue-700' :
                      'bg-green-50 text-green-700'
                    }`}>
                      {message.classification.type === 'mixed' ? 'استفسار مختلط' :
                       message.classification.type === 'system_data' ? 'بيانات النظام' :
                       'استشارة قانونية'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      ({(message.classification.confidence * 100).toFixed(0)}% ثقة)
                    </span>
                  </div>
                  {message.classification.components && (
                    <div className="text-xs text-gray-500">
                      {message.classification.components.system_data?.length > 0 && (
                        <div>بيانات: {message.classification.components.system_data.join(', ')}</div>
                      )}
                      {message.classification.components.legal_advice?.length > 0 && (
                        <div>قانوني: {message.classification.components.legal_advice.join(', ')}</div>
                      )}
                    </div>
                  )}
                  {message.classification.reasoning && (
                    <div className="text-xs text-gray-400 italic">
                      {message.classification.reasoning}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* عرض البيانات الإضافية من النظام */}
            {!isUser && message.system_data && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">البيانات المستخدمة:</div>
                <div className="text-xs bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                  {message.system_data.outstanding_summary && (
                    <div>المبالغ المستحقة: {message.system_data.outstanding_summary.total_outstanding} د.ك من {message.system_data.outstanding_summary.customers_count} عميل</div>
                  )}
                  {message.system_data.customer_statistics && (
                    <div>إجمالي العملاء: {message.system_data.customer_statistics.total_customers}</div>
                  )}
                  {message.system_data.contract_statistics && (
                    <div>العقود النشطة: {message.system_data.contract_statistics.active_contracts}</div>
                  )}
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-400 mt-1">
              {new Date(message.timestamp).toLocaleTimeString('ar', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // مكون الإحصائيات
  const StatsDisplay = () => {
    if (!stats || !stats.performance_overview) return <div>جاري تحميل الإحصائيات...</div>;

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-500" />
            المستشار القانوني الذكي
          </h2>
          <p className="text-muted-foreground">
            استشارات قانونية متخصصة مع ذاكرة ذكية وتعلم تدريجي
          </p>
        </div>
        
        {/* حالة النظام */}
        {healthStatus && healthStatus.performance && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              النظام يعمل بكفاءة {healthStatus.performance.cost_efficiency}%
            </Badge>
          </div>
        )}
      </div>

      <Tabs defaultValue="consultant" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="consultant">الاستشارة</TabsTrigger>
          <TabsTrigger value="memos">المذكرات الذكية</TabsTrigger>
          <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          <TabsTrigger value="help">المساعدة</TabsTrigger>
        </TabsList>

        {/* تبويب الاستشارة */}
        <TabsContent value="consultant" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* منطقة المحادثة */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      المحادثة
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={clearChatHistory}>
                        <History className="w-4 h-4 mr-1" />
                        مسح المحادثة
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {/* منطقة الرسائل */}
                <CardContent className="flex-1 overflow-y-auto">
                  {chatHistory.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">
                          مرحباً بك في المستشار القانوني الذكي
                        </h3>
                        <p className="text-gray-500">
                          اطرح سؤالك القانوني وسأقدم لك استشارة متخصصة
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatHistory.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                      
                      {loading && (
                        <div className="flex justify-start mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-gray-100 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">جاري التفكير...</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                
                {/* منطقة الإدخال */}
                <div className="p-4 border-t">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.flag} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="اطرح سؤالك القانوني هنا..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        rows={2}
                        className="resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitQuery();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleSubmitQuery} 
                        disabled={loading || !query.trim()}
                        className="px-6"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'إرسال'
                        )}
                      </Button>
                    </div>
                    
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* لوحة التقييم */}
            <div className="space-y-6">
              {/* تقييم الرسالة الأخيرة */}
              {currentMessageId && !feedbackSubmitted && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">قيم هذه الاستشارة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`text-2xl ${
                            star <= rating ? 'text-yellow-400' : 'text-gray-300'
                          } hover:text-yellow-400 transition-colors`}
                        >
                          ⭐
                        </button>
                      ))}
                      <span className="text-sm text-gray-600 mr-2">
                        {rating > 0 && `${rating}/5`}
                      </span>
                    </div>
                    <Textarea
                      placeholder="تعليقك (اختياري)"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={2}
                    />
                    <Button onClick={handleSubmitFeedback} disabled={rating === 0} className="w-full">
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      إرسال التقييم
                    </Button>
                  </CardContent>
                </Card>
              )}

              {feedbackSubmitted && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    شكراً لك! تم تسجيل تقييمك وسيساعد في تحسين النظام.
                  </AlertDescription>
                </Alert>
              )}

              {/* إحصائيات سريعة */}
              {stats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">إحصائيات سريعة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats?.performance_overview && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm">الاستفسارات اليوم</span>
                          <span className="font-semibold">{stats.performance_overview.total_queries}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">كفاءة التكلفة</span>
                          <span className="font-semibold">{stats.performance_overview.cost_efficiency}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">متوسط الاستجابة</span>
                          <span className="font-semibold">{stats.performance_overview.average_response_time.toFixed(2)}s</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* تبويب المذكرات الذكية */}
        <TabsContent value="memos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                المذكرات القانونية الذكية
              </CardTitle>
              <CardDescription>
                إنشاء وإدارة المذكرات القانونية المبنية على استفساراتك وبيانات النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  المذكرات الذكية قيد التطوير
                </h3>
                <p className="text-gray-500 mb-4">
                  ستتمكن قريباً من إنشاء مذكرات قانونية ذكية بناءً على الاستفسارات والبيانات
                </p>
                <Button variant="outline" disabled>
                  قريباً
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب الإحصائيات */}
        <TabsContent value="stats" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">إحصائيات مفصلة</h3>
            <Button variant="outline" onClick={refreshStats}>
              <BarChart3 className="w-4 h-4 mr-2" />
              تحديث الإحصائيات
            </Button>
          </div>
          <StatsDisplay />
        </TabsContent>

        {/* تبويب الإعدادات */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                إعدادات المستشار القانوني
              </CardTitle>
              <CardDescription>
                إعدادات وتخصيص المستشار القانوني الذكي
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الدولة الافتراضية</label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">معلومات النظام</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>إصدار النظام:</span>
                    <span>2.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>آخر تحديث:</span>
                    <span>{new Date().toLocaleDateString('ar')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>حالة النظام:</span>
                    <Badge variant="outline" className="text-green-600">
                      يعمل بكفاءة
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب المساعدة */}
        <TabsContent value="help" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>دليل استخدام المستشار القانوني الذكي</CardTitle>
              <CardDescription>
                تعرف على الميزات الجديدة والمطورة في نظام التصنيف الذكي
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* أنواع الاستفسارات */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  أنواع الاستفسارات المدعومة
                </h4>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-50 text-green-700">استشارة قانونية</Badge>
                      <span className="text-sm text-gray-600">للأسئلة القانونية العامة</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      مثال: "ما هي حقوق المستأجر في الكويت؟" أو "هل يحق للعامل رفض العمل الإضافي؟"
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-50 text-blue-700">بيانات النظام</Badge>
                      <span className="text-sm text-gray-600">لاستعلام بيانات الشركة</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      مثال: "كم عدد الفواتير المتأخرة؟" أو "أعطني قائمة بالعملاء المدينين"
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-purple-50 text-purple-700">استفسار مختلط</Badge>
                      <span className="text-sm text-gray-600">يجمع بين النوعين</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      مثال: "ما هي الإجراءات القانونية ضد العملاء المتأخرين في السداد وأعطني قائمة بهم؟"
                    </p>
                  </div>
                </div>
              </div>

              {/* ميزات النظام الجديد */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  الميزات الجديدة
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3">
                    <h5 className="font-medium mb-1">تصنيف ذكي بالذكاء الاصطناعي</h5>
                    <p className="text-sm text-gray-600">
                      يحدد النظام تلقائياً نوع استفسارك ويوجهه للمعالج المناسب
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <h5 className="font-medium mb-1">معالجة الاستفسارات المختلطة</h5>
                    <p className="text-sm text-gray-600">
                      قدرة على التعامل مع الأسئلة التي تحتاج بيانات واستشارة قانونية معاً
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <h5 className="font-medium mb-1">تحليل مفصل للاستفسار</h5>
                    <p className="text-sm text-gray-600">
                      عرض تفاصيل التصنيف ومستوى الثقة والمكونات المختلفة
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <h5 className="font-medium mb-1">تعلم تدريجي</h5>
                    <p className="text-sm text-gray-600">
                      النظام يتعلم من تقييماتك ويحسن أداءه تدريجياً
                    </p>
                  </div>
                </div>
              </div>

              {/* نصائح للاستخدام الأمثل */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  نصائح للاستخدام الأمثل
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span>اكتب أسئلتك بوضوح وتفصيل لتحصل على إجابات أكثر دقة</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span>استخدم كلمات مفتاحية محددة مثل "فواتير متأخرة" أو "قانون العمل"</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span>قيم الإجابات لمساعدة النظام على التعلم والتحسن</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span>تأكد من اختيار الدولة الصحيحة للحصول على استشارة قانونية دقيقة</span>
                  </div>
                </div>
              </div>

              {/* معلومات تقنية */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">معلومات تقنية</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>• يستخدم النظام نماذج ذكاء اصطناعي متقدمة للتصنيف والإجابة</div>
                  <div>• يحتفظ بسجل محادثاتك محلياً لضمان الخصوصية</div>
                  <div>• يدعم معالجة النصوص العربية والإنجليزية</div>
                  <div>• يتكامل مع قاعدة بيانات شركتك لتقديم معلومات فورية</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

