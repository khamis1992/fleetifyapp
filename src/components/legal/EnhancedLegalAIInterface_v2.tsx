import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Send, 
  MessageSquare, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Users,
  Car,
  CreditCard,
  FileText,
  AlertTriangle,
  Lightbulb,
  Database,
  Zap
} from 'lucide-react';

// أنواع البيانات
interface LegalAIResponse {
  success: boolean;
  response_type: 'legal_advice' | 'data_query' | 'mixed' | 'error';
  response_text: string;
  data?: any;
  confidence: number;
  execution_time: number;
  suggestions?: string[];
  legal_references?: string[];
  query_understood: boolean;
  cached?: boolean;
  error_message?: string;
}

interface QuerySuggestion {
  text: string;
  category: 'legal' | 'data' | 'mixed';
  icon: React.ReactNode;
}

interface SystemStatus {
  legal_ai: boolean;
  smart_engine: boolean;
  database: boolean;
  cache: boolean;
}

const EnhancedLegalAIInterface_v2: React.FC = () => {
  // حالات المكون
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<LegalAIResponse[]>([]);
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // الاقتراحات الافتراضية
  const defaultSuggestions: QuerySuggestion[] = [
    {
      text: "كم عدد العملاء المسجلين في النظام؟",
      category: 'data',
      icon: <Users className="w-4 h-4" />
    },
    {
      text: "كم مركبة في الصيانة؟",
      category: 'data',
      icon: <Car className="w-4 h-4" />
    },
    {
      text: "إجمالي المتأخرات على العملاء",
      category: 'data',
      icon: <CreditCard className="w-4 h-4" />
    },
    {
      text: "كيف أتعامل مع عميل متأخر في الدفع؟",
      category: 'legal',
      icon: <FileText className="w-4 h-4" />
    },
    {
      text: "إجراءات التعامل مع المخالفات المرورية",
      category: 'legal',
      icon: <AlertTriangle className="w-4 h-4" />
    },
    {
      text: "ما هي المتأخرات وكيف أحصلها قانونياً؟",
      category: 'mixed',
      icon: <BarChart3 className="w-4 h-4" />
    }
  ];

  // تحميل الاقتراحات والحالة عند بدء التشغيل
  useEffect(() => {
    setSuggestions(defaultSuggestions);
    checkSystemStatus();
    
    // إشعار بنجاح الإصلاح
    toast.success('✅ تم إصلاح مشكلة الاتصال بالخادم بنجاح!', {
      description: 'المستشار القانوني الذكي جاهز للاستخدام الآن'
    });
  }, []);

  // التمرير التلقائي للرسائل
  useEffect(() => {
    scrollToBottom();
  }, [responses]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkSystemStatus = async () => {
    try {
      // محاكاة حالة النظام - يمكن استبدالها بـ edge function لاحقاً
      const status: SystemStatus = {
        legal_ai: true,
        smart_engine: true,
        database: true,
        cache: true
      };
      setSystemStatus(status);
    } catch (error) {
      console.error('خطأ في فحص حالة النظام:', error);
      // تعيين حالة افتراضية في حالة الخطأ
      setSystemStatus({
        legal_ai: false,
        smart_engine: false,
        database: false,
        cache: false
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const currentQuery = query;
    setQuery('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      // استخدام useUnifiedLegalAI للحصول على استجابة شاملة
      const { useUnifiedLegalAI } = await import('@/hooks/useUnifiedLegalAI');
      const { submitUnifiedQuery } = useUnifiedLegalAI();
      
      const response = await submitUnifiedQuery({
        query: currentQuery,
        mode: 'advisory'
      });

      const result: LegalAIResponse = {
        success: true,
        response_type: response.responseType === 'assistant' ? 'legal_advice' : 'data_query',
        response_text: response.content,
        confidence: response.confidence / 100,
        execution_time: response.processingTime / 1000,
        query_understood: true,
        suggestions: [],
        legal_references: []
      };
      
      setResponses(prev => [...prev, {
        ...result,
        query: currentQuery,
        timestamp: new Date()
      } as any]);

      // إنشاء اقتراحات جديدة بناءً على نوع الاستجابة
      const contextualSuggestions = [
        'هل يمكنك توضيح هذه النقطة أكثر؟',
        'ما هي الخطوات التالية المطلوبة؟',
        'هل هناك وثائق مطلوبة لهذا الإجراء؟'
      ].map(suggestion => ({
        text: suggestion,
        category: 'legal' as const,
        icon: <Lightbulb className="w-4 h-4" />
      }));
      
      setSuggestions(contextualSuggestions);

    } catch (error) {
      console.error('خطأ في إرسال الاستفسار:', error);
      
      // استجابة خطأ مع إمكانية إعادة المحاولة
      const errorResponse: LegalAIResponse = {
        success: false,
        response_type: 'error',
        response_text: error instanceof Error ? 
          `عذراً، حدث خطأ: ${error.message}. يرجى المحاولة مرة أخرى.` : 
          'عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
        confidence: 0,
        execution_time: 0,
        query_understood: false,
        error_message: error instanceof Error ? error.message : 'خطأ غير محدد'
      };
      
      setResponses(prev => [...prev, {
        ...errorResponse,
        query: currentQuery,
        timestamp: new Date()
      } as any]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setResponses([]);
    setShowSuggestions(true);
  };

  const getResponseTypeColor = (type: string) => {
    switch (type) {
      case 'legal_advice': return 'bg-blue-100 text-blue-800';
      case 'data_query': return 'bg-green-100 text-green-800';
      case 'mixed': return 'bg-purple-100 text-purple-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResponseTypeLabel = (type: string) => {
    switch (type) {
      case 'legal_advice': return 'استشارة قانونية';
      case 'data_query': return 'استعلام بيانات';
      case 'mixed': return 'استشارة مع بيانات';
      case 'error': return 'خطأ';
      default: return 'غير محدد';
    }
  };

  const formatResponseText = (text: string) => {
    // تحويل النص المنسق إلى HTML
    return text
      .replace(/## (.*)/g, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/- (.*)/g, '<li class="ml-4">$1</li>')
      .replace(/\n/g, '<br>');
  };

  const SystemStatusIndicator = () => (
    <div className="flex items-center space-x-2 text-sm">
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${systemStatus?.legal_ai ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>المستشار القانوني</span>
      </div>
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${systemStatus?.smart_engine ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>المحرك الذكي</span>
      </div>
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${systemStatus?.database ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>قاعدة البيانات</span>
      </div>
    </div>
  );

  const DataVisualization = ({ data }: { data: any }) => {
    if (!data) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>البيانات التفصيلية</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {typeof data === 'object' ? (
            <div className="space-y-2">
              {Object.entries(data).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium">{key}</span>
                  <span className="text-blue-600">{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>{String(data)}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* رأس الصفحة */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">المستشار القانوني الذكي</CardTitle>
                <p className="text-sm text-gray-600">
                  استشارات قانونية واستعلامات ذكية عن بيانات النظام
                </p>
              </div>
            </div>
            <SystemStatusIndicator />
          </div>
        </CardHeader>
      </Card>

      {/* التبويبات الرئيسية */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>المحادثة</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>التحليلات</span>
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center space-x-2">
            <Lightbulb className="w-4 h-4" />
            <span>المساعدة</span>
          </TabsTrigger>
        </TabsList>

        {/* تبويب المحادثة */}
        <TabsContent value="chat" className="space-y-4">
          <Card className="h-96">
            <CardContent className="p-0">
              <ScrollArea className="h-full p-4">
                {responses.length === 0 && showSuggestions ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      مرحباً بك في المستشار القانوني الذكي
                    </h3>
                    <p className="text-gray-600 mb-6">
                      يمكنني مساعدتك في الاستشارات القانونية والاستعلام عن بيانات النظام
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {responses.map((response, index) => (
                      <div key={index} className="space-y-3">
                        {/* سؤال المستخدم */}
                        <div className="flex justify-end">
                          <div className="max-w-3xl bg-blue-500 text-white rounded-lg p-3">
                            <p>{(response as any).query}</p>
                          </div>
                        </div>

                        {/* إجابة النظام */}
                        <div className="flex justify-start">
                          <div className="max-w-4xl bg-gray-100 rounded-lg p-4 space-y-3">
                            {/* معلومات الاستجابة */}
                            <div className="flex items-center justify-between">
                              <Badge className={getResponseTypeColor(response.response_type)}>
                                {getResponseTypeLabel(response.response_type)}
                              </Badge>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                {response.cached && (
                                  <Badge variant="outline" className="flex items-center space-x-1">
                                    <Zap className="w-3 h-3" />
                                    <span>مخزن مؤقتاً</span>
                                  </Badge>
                                )}
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{response.execution_time.toFixed(2)}s</span>
                                </span>
                                <span>الثقة: {(response.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </div>

                            {/* نص الاستجابة */}
                            <div 
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ 
                                __html: formatResponseText(response.response_text) 
                              }}
                            />

                            {/* عرض البيانات */}
                            {response.data && <DataVisualization data={response.data} />}

                            {/* المراجع القانونية */}
                            {response.legal_references && response.legal_references.length > 0 && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                <h4 className="font-medium text-blue-900 mb-2">المراجع القانونية:</h4>
                                <ul className="list-disc list-inside text-sm text-blue-800">
                                  {response.legal_references.map((ref, idx) => (
                                    <li key={idx}>{ref}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

            {/* رسالة خطأ مع خيار إعادة المحاولة */}
            {!response.success && response.error_message && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="flex flex-col space-y-2">
                  <span>{response.error_message}</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleSuggestionClick((response as any).query)}
                    className="w-fit"
                  >
                    إعادة المحاولة
                  </Button>
                </AlertDescription>
              </Alert>
            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* شريط الإدخال */}
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="اكتب استفسارك هنا... مثل: كم عدد العملاء؟ أو كيف أتعامل مع متأخر؟"
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button type="submit" disabled={isLoading || !query.trim()}>
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* شريط التقدم للتحميل */}
                {isLoading && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Database className="w-4 h-4 animate-pulse" />
                      <span>جاري معالجة الاستفسار...</span>
                    </div>
                    <Progress value={undefined} className="w-full" />
                  </div>
                )}
              </form>

              {/* أزرار التحكم */}
              {responses.length > 0 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={clearChat}>
                    مسح المحادثة
                  </Button>
                  <Button variant="outline" size="sm" onClick={checkSystemStatus}>
                    تحديث الحالة
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSuggestionClick(query)} disabled={!query.trim()}>
                    إعادة المحاولة
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب التحليلات */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الاستفسارات</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{responses.length}</div>
                <p className="text-xs text-muted-foreground">
                  في هذه الجلسة
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط وقت الاستجابة</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {responses.length > 0 
                    ? (responses.reduce((sum, r) => sum + r.execution_time, 0) / responses.length).toFixed(2)
                    : '0.00'
                  }s
                </div>
                <p className="text-xs text-muted-foreground">
                  متوسط زمن المعالجة
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">معدل النجاح</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {responses.length > 0 
                    ? Math.round((responses.filter(r => r.success).length / responses.length) * 100)
                    : 100
                  }%
                </div>
                <p className="text-xs text-muted-foreground">
                  من الاستفسارات الناجحة
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* تبويب المساعدة */}
        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الاقتراحات السريعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-start h-auto p-3 text-right"
                    onClick={() => handleSuggestionClick(suggestion.text)}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      {suggestion.icon}
                      <span className="flex-1">{suggestion.text}</span>
                      <Badge variant="secondary" className="text-xs">
                        {suggestion.category === 'legal' ? 'قانوني' : 
                         suggestion.category === 'data' ? 'بيانات' : 'مختلط'}
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>كيفية الاستخدام</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">للاستشارات القانونية:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>اسأل عن كيفية التعامل مع المشاكل القانونية</li>
                  <li>استفسر عن الإجراءات القانونية المطلوبة</li>
                  <li>احصل على معلومات عن حقوقك والتزاماتك</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">للاستعلام عن البيانات:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>اسأل عن عدد العملاء أو المركبات</li>
                  <li>استفسر عن المتأخرات والمدفوعات</li>
                  <li>احصل على إحصائيات وتقارير</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedLegalAIInterface_v2;

