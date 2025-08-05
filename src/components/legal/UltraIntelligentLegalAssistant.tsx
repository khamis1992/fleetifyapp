import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, 
  Send, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database,
  Download,
  Lightbulb,
  Shield,
  TrendingUp,
  Users,
  FileCheck,
  MessageSquare,
  Zap
} from 'lucide-react';
import { useIntegratedLegalAI, LegalAIResponse, LegalAIRequest } from '@/hooks/useIntegratedLegalAI';
import { toast } from 'sonner';

interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  response?: LegalAIResponse;
}

interface UltraIntelligentLegalAssistantProps {
  companyId: string;
  userId: string;
}

export const UltraIntelligentLegalAssistant: React.FC<UltraIntelligentLegalAssistantProps> = ({
  companyId,
  userId
}) => {
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [isTyping, setIsTyping] = useState(false);
  
  const { processRequest, isProcessing, error } = useIntegratedLegalAI();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // التمرير التلقائي للرسائل الجديدة
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation, scrollToBottom]);

  // معالجة إرسال الاستفسار
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isProcessing) return;

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);
    setQuery('');
    setIsTyping(true);

    try {
      const request: LegalAIRequest = {
        query,
        companyId,
        userId
      };

      const response = await processRequest(request);

      const assistantMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.content,
        timestamp: new Date(),
        response
      };

      setConversation(prev => [...prev, assistantMessage]);
      
      // عرض إشعار بناءً على نوع الاستجابة
      switch (response.responseType) {
        case 'document':
          toast.success('تم إنشاء الوثيقة بنجاح!');
          break;
        case 'clarification_request':
          toast.info('يحتاج المساعد لمزيد من التوضيح');
          break;
        case 'recommendation':
          toast.info('تم تقديم توصيات مهمة');
          break;
      }

    } catch (err) {
      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.',
        timestamp: new Date()
      };
      setConversation(prev => [...prev, errorMessage]);
      toast.error('حدث خطأ في معالجة الطلب');
    } finally {
      setIsTyping(false);
    }
  }, [query, isProcessing, processRequest, companyId, userId]);

  // تنزيل الوثيقة المُنشأة
  const downloadDocument = useCallback((document: NonNullable<LegalAIResponse['generatedDocument']>) => {
    const blob = new Blob([document.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.type}_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('تم تنزيل الوثيقة بنجاح!');
  }, []);

  // عرض رسالة المساعد مع التفاصيل
  const renderAssistantMessage = useCallback((message: ConversationMessage) => {
    const response = message.response;
    if (!response) return message.content;

    return (
      <div className="space-y-4">
        {/* المحتوى الأساسي */}
        <div className="text-gray-800">
          {message.content}
        </div>

        {/* معلومات الاستجابة */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Badge variant={response.confidence > 0.8 ? 'default' : 'secondary'}>
            ثقة: {Math.round(response.confidence * 100)}%
          </Badge>
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            {response.processingTime}ms
          </Badge>
        </div>

        {/* الوثيقة المُنشأة */}
        {response.generatedDocument && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">وثيقة قانونية</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => downloadDocument(response.generatedDocument!)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-4 h-4 mr-1" />
                  تنزيل
                </Button>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                نوع الوثيقة: {response.generatedDocument.type}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ملخص البيانات */}
        {response.dataSummary && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-green-600" />
                <span className="font-medium">ملخص البيانات</span>
              </div>
              {response.dataSummary.insights.map((insight, index) => (
                <div key={index} className="text-sm text-gray-700 mb-1">
                  • {insight}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* التوصيات */}
        {response.recommendations && response.recommendations.length > 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                <span className="font-medium">التوصيات</span>
              </div>
              <ul className="space-y-1">
                {response.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    • {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* التحذيرات */}
        {response.warnings && response.warnings.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <ul className="space-y-1">
                {response.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* الخطوات التالية */}
        {response.nextSteps && response.nextSteps.length > 0 && (
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="font-medium">الخطوات التالية</span>
              </div>
              <ol className="space-y-1">
                {response.nextSteps.map((step, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    {index + 1}. {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* مصادر المعلومات */}
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
            مصادر المعلومات ({response.sources.length})
          </summary>
          <div className="mt-2 space-y-1">
            {response.sources.map((source, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-gray-500">
                {source.type === 'database' && <Database className="w-3 h-3" />}
                {source.type === 'legal_knowledge' && <Shield className="w-3 h-3" />}
                {source.type === 'ai_model' && <Brain className="w-3 h-3" />}
                {source.description}
              </div>
            ))}
          </div>
        </details>
      </div>
    );
  }, [downloadDocument]);

  // أمثلة الاستفسارات الشائعة
  const commonQueries = [
    'اكتب إنذار قانوني للعميل أحمد',
    'ما هي حقوقي القانونية في حالة تأخير العميل عن السداد؟',
    'أريد تحليل مخاطر العقد رقم 12345',
    'ما هي الإجراءات القانونية لاسترداد المركبة؟',
    'اعرض لي بيانات العميل محمد الأحمد',
    'ما هي متطلبات إنهاء العقد قانونياً؟'
  ];

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            المحادثة
          </TabsTrigger>
          <TabsTrigger value="examples" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            أمثلة
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            الإحصائيات
          </TabsTrigger>
        </TabsList>

        {/* تبويب المحادثة */}
        <TabsContent value="chat" className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-blue-600" />
                المستشار القانوني الذكي المتقدم
                <Badge variant="secondary" className="ml-auto">
                  <Zap className="w-3 h-3 mr-1" />
                  متطور
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* منطقة المحادثة */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {conversation.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">مرحباً! أنا مستشارك القانوني الذكي</p>
                      <p className="text-sm">
                        يمكنني مساعدتك في الاستشارات القانونية، إنشاء الوثائق، وتحليل البيانات
                      </p>
                    </div>
                  )}

                  {conversation.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {message.type === 'user' ? (
                          <div>{message.content}</div>
                        ) : (
                          renderAssistantMessage(message)
                        )}
                        <div className={`text-xs mt-2 ${
                          message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString('ar-SA')}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin">
                            <Brain className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-gray-600">المستشار يفكر...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* منطقة الإدخال */}
              <div className="border-t p-4">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="اكتب استفسارك القانوني هنا... (مثال: اكتب إنذار قانوني للعميل أحمد)"
                    className="flex-1 min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={!query.trim() || isProcessing}
                    className="self-end"
                  >
                    {isProcessing ? (
                      <div className="animate-spin">
                        <Brain className="w-4 h-4" />
                      </div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب الأمثلة */}
        <TabsContent value="examples" className="flex-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                أمثلة الاستفسارات الشائعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {commonQueries.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-start text-right h-auto p-4"
                    onClick={() => {
                      setQuery(example);
                      setActiveTab('chat');
                    }}
                  >
                    <MessageSquare className="w-4 h-4 ml-2 flex-shrink-0" />
                    {example}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب الإحصائيات */}
        <TabsContent value="insights" className="flex-1">
          <div className="grid gap-4 h-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">المحادثات</span>
                  </div>
                  <div className="text-2xl font-bold mt-2">{conversation.length / 2}</div>
                  <div className="text-sm text-gray-600">استفسار اليوم</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="font-medium">الوثائق</span>
                  </div>
                  <div className="text-2xl font-bold mt-2">
                    {conversation.filter(m => m.response?.generatedDocument).length}
                  </div>
                  <div className="text-sm text-gray-600">وثيقة مُنشأة</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">معدل الثقة</span>
                  </div>
                  <div className="text-2xl font-bold mt-2">
                    {conversation.length > 0 
                      ? Math.round(
                          conversation
                            .filter(m => m.response?.confidence)
                            .reduce((sum, m) => sum + (m.response?.confidence || 0), 0) / 
                          conversation.filter(m => m.response?.confidence).length * 100
                        )
                      : 0}%
                  </div>
                  <div className="text-sm text-gray-600">دقة الإجابات</div>
                </CardContent>
              </Card>
            </div>

            <Card className="flex-1">
              <CardHeader>
                <CardTitle>نشاط المستشار القانوني</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-gray-500 py-8">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>سيتم عرض إحصائيات مفصلة هنا قريباً</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* رسائل الخطأ */}
      {error && (
        <Alert className="mt-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

