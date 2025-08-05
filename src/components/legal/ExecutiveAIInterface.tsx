import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Brain, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Car, 
  FileText, 
  DollarSign,
  Settings,
  History,
  Zap,
  Target,
  TrendingUp,
  Activity,
  Command,
  Sparkles
} from 'lucide-react';
import { useAdvancedCommandEngine } from '@/hooks/useAdvancedCommandEngine';
import { useExecutiveAISystem, ExecutiveCommand, ExecutionResult } from '@/hooks/useExecutiveAISystem';
import { toast } from 'sonner';

interface ExecutiveAIInterfaceProps {
  companyId: string;
  userId: string;
  userRole?: string;
}

export const ExecutiveAIInterface: React.FC<ExecutiveAIInterfaceProps> = ({
  companyId,
  userId,
  userRole = 'admin'
}) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<ExecutiveCommand | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const commandEngine = useAdvancedCommandEngine(companyId, userId);
  const executiveSystem = useExecutiveAISystem(companyId, userId);

  // التمرير التلقائي للرسائل
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [executionResults, currentAnalysis]);

  // معالجة الإدخال
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userInput = input.trim();
    setInput('');
    setIsProcessing(true);

    try {
      // إضافة رسالة المستخدم
      const userMessage = {
        id: `user_${Date.now()}`,
        type: 'user',
        content: userInput,
        timestamp: new Date()
      };

      setExecutionResults(prev => [...prev, userMessage as any]);

      // تحليل الأمر
      const analysis = await commandEngine.analyzeCommand(userInput);
      setCurrentAnalysis(analysis);

      if (analysis.confidence < 0.5) {
        // اقتراح أوامر بديلة
        const suggestions = commandEngine.suggestAlternativeCommands(userInput);
        
        const response = {
          id: `ai_${Date.now()}`,
          type: 'ai',
          content: `لم أتمكن من فهم الأمر بوضوح. هل تقصد أحد هذه الأوامر؟`,
          suggestions,
          confidence: analysis.confidence,
          timestamp: new Date()
        };

        setExecutionResults(prev => [...prev, response as any]);
        return;
      }

      if (analysis.missingParameters.length > 0) {
        const response = {
          id: `ai_${Date.now()}`,
          type: 'ai',
          content: `معلومات ناقصة. يرجى تحديد: ${analysis.missingParameters.join(', ')}`,
          missingParams: analysis.missingParameters,
          timestamp: new Date()
        };

        setExecutionResults(prev => [...prev, response as any]);
        return;
      }

      // معالجة الأمر
      const result = await commandEngine.processIntelligentCommand(userInput);
      
      if (result.success && result.commands && result.commands.length > 0) {
        // عرض الأوامر للتأكيد
        const response = {
          id: `ai_${Date.now()}`,
          type: 'ai',
          content: `تم تحليل الأمر بنجاح. الأوامر المطلوب تنفيذها:`,
          commands: result.commands,
          requiresConfirmation: true,
          timestamp: new Date()
        };

        setExecutionResults(prev => [...prev, response as any]);
      } else {
        const response = {
          id: `ai_${Date.now()}`,
          type: 'ai',
          content: result.message,
          success: result.success,
          timestamp: new Date()
        };

        setExecutionResults(prev => [...prev, response as any]);
      }

    } catch (error) {
      const errorResponse = {
        id: `error_${Date.now()}`,
        type: 'error',
        content: 'حدث خطأ في معالجة الأمر. يرجى المحاولة مرة أخرى.',
        timestamp: new Date()
      };

      setExecutionResults(prev => [...prev, errorResponse as any]);
    } finally {
      setIsProcessing(false);
    }
  };

  // تأكيد تنفيذ الأمر
  const confirmExecution = async (commandId: string) => {
    setIsProcessing(true);
    
    try {
      const result = await executiveSystem.confirmAndExecuteCommand(commandId);
      
      const response = {
        id: `result_${Date.now()}`,
        type: 'result',
        content: result.message,
        success: result.success,
        data: result.data,
        affectedRecords: result.affectedRecords,
        timestamp: new Date()
      };

      setExecutionResults(prev => [...prev, response as any]);
      
      if (result.success) {
        toast.success('تم تنفيذ العملية بنجاح');
      } else {
        toast.error('فشل في تنفيذ العملية');
      }
    } catch (error) {
      toast.error('خطأ في تنفيذ العملية');
    } finally {
      setIsProcessing(false);
    }
  };

  // رفض تنفيذ الأمر
  const rejectExecution = (commandId: string) => {
    executiveSystem.rejectCommand(commandId);
    toast.info('تم إلغاء العملية');
  };

  // الحصول على أيقونة العملية
  const getOperationIcon = (operation: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'create_customer': <User className="w-4 h-4" />,
      'create_contract': <FileText className="w-4 h-4" />,
      'create_vehicle': <Car className="w-4 h-4" />,
      'register_violation': <AlertTriangle className="w-4 h-4" />,
      'create_invoice': <DollarSign className="w-4 h-4" />,
      'record_payment': <CheckCircle className="w-4 h-4" />
    };
    
    return iconMap[operation] || <Command className="w-4 h-4" />;
  };

  // الحصول على لون مستوى المخاطر
  const getRiskColor = (riskLevel: string) => {
    const colorMap: Record<string, string> = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    
    return colorMap[riskLevel] || 'bg-gray-100 text-gray-800';
  };

  // أمثلة الأوامر
  const commandExamples = [
    'سجل مخالفة مرورية على العميل أحمد بمبلغ 150 دينار',
    'افتح عقد تأجير للعميل محمد لمدة شهر',
    'أضف مركبة جديدة برقم لوحة 12345 نوع تويوتا',
    'أنشئ فاتورة للعميل سارة بمبلغ 500 دينار',
    'سجل دفعة من العميل علي بمبلغ 300 دينار',
    'أضف عميل جديد اسمه خالد أحمد'
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* الهيدر */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">المساعد الذكي التنفيذي</h1>
              <p className="text-sm text-gray-600">قادر على تنفيذ العمليات والتحكم في النظام</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <Activity className="w-3 h-3 mr-1" />
              نشط
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <Shield className="w-3 h-3 mr-1" />
              آمن
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 bg-white border-b">
          <TabsTrigger value="chat" className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>المحادثة</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>الأوامر المعلقة</span>
            {executiveSystem.pendingCommands.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {executiveSystem.pendingCommands.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span>السجل</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>الإحصائيات</span>
          </TabsTrigger>
        </TabsList>

        {/* تبويب المحادثة */}
        <TabsContent value="chat" className="flex-1 flex flex-col p-4 space-y-4">
          {/* منطقة الرسائل */}
          <ScrollArea className="flex-1 bg-white rounded-lg border p-4">
            <div className="space-y-4">
              {executionResults.length === 0 && (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">مرحباً! أنا المساعد الذكي التنفيذي</h3>
                  <p className="text-gray-600 mb-4">يمكنني تنفيذ العمليات المختلفة في النظام. جرب أحد هذه الأوامر:</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-4xl mx-auto">
                    {commandExamples.map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="text-right justify-start h-auto p-3 text-sm"
                        onClick={() => setInput(example)}
                      >
                        <Command className="w-4 h-4 ml-2 flex-shrink-0" />
                        <span className="truncate">{example}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {executionResults.map((result, index) => (
                <div key={result.id || index} className={`flex ${result.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-4 ${
                    result.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : result.type === 'error'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}>
                    {result.type === 'user' ? (
                      <p>{result.content}</p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-gray-800">{result.content}</p>
                        
                        {/* اقتراحات الأوامر */}
                        {result.suggestions && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">اقتراحات:</p>
                            {result.suggestions.map((suggestion: string, idx: number) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="text-right justify-start w-full"
                                onClick={() => setInput(suggestion)}
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        )}
                        
                        {/* الأوامر المطلوب تأكيدها */}
                        {result.commands && (
                          <div className="space-y-3">
                            {result.commands.map((command: ExecutiveCommand) => (
                              <Card key={command.id} className="border-l-4 border-l-blue-500">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                      {getOperationIcon(command.operation)}
                                      <span className="font-medium">{command.description}</span>
                                    </div>
                                    <Badge className={getRiskColor(command.estimatedImpact)}>
                                      {command.estimatedImpact}
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-sm text-gray-600 mb-3">
                                    <p><strong>العملية:</strong> {command.operation}</p>
                                    <p><strong>الجداول المتأثرة:</strong> {command.affectedRecords.join(', ')}</p>
                                  </div>
                                  
                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      onClick={() => confirmExecution(command.id)}
                                      disabled={isProcessing}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      تأكيد
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => rejectExecution(command.id)}
                                      disabled={isProcessing}
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      إلغاء
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                        
                        {/* نتائج التنفيذ */}
                        {result.type === 'result' && (
                          <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                            <AlertDescription className="flex items-center">
                              {result.success ? (
                                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600 mr-2" />
                              )}
                              {result.content}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs opacity-70 mt-2">
                      {result.timestamp?.toLocaleTimeString('ar-SA')}
                    </div>
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-[80%]">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-gray-600">جاري المعالجة...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* منطقة الإدخال */}
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب أمرك هنا... مثل: سجل مخالفة على العميل أحمد"
              className="flex-1 text-right"
              disabled={isProcessing}
            />
            <Button type="submit" disabled={isProcessing || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </TabsContent>

        {/* تبويب الأوامر المعلقة */}
        <TabsContent value="pending" className="flex-1 p-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>الأوامر المعلقة ({executiveSystem.pendingCommands.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {executiveSystem.pendingCommands.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد أوامر معلقة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {executiveSystem.pendingCommands.map((command) => (
                    <Card key={command.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            {getOperationIcon(command.operation)}
                            <span className="font-medium">{command.description}</span>
                          </div>
                          <Badge className={getRiskColor(command.estimatedImpact)}>
                            {command.estimatedImpact}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          <p><strong>العملية:</strong> {command.operation}</p>
                          <p><strong>الجداول المتأثرة:</strong> {command.affectedRecords.join(', ')}</p>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => confirmExecution(command.id)}
                            disabled={isProcessing}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            تأكيد
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectExecution(command.id)}
                            disabled={isProcessing}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            إلغاء
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب السجل */}
        <TabsContent value="history" className="flex-1 p-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="w-5 h-5" />
                <span>سجل العمليات</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {executiveSystem.executionHistory.map((log) => (
                    <div key={log.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getOperationIcon(log.operation)}
                          <span className="font-medium">{log.operation}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {log.result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleString('ar-SA')}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{log.result.message}</p>
                      {log.result.affectedRecords.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          الجداول المتأثرة: {log.result.affectedRecords.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب الإحصائيات */}
        <TabsContent value="stats" className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">إجمالي العمليات</p>
                    <p className="text-2xl font-bold text-gray-900">{executiveSystem.stats.totalOperations}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">العمليات الناجحة</p>
                    <p className="text-2xl font-bold text-green-600">{executiveSystem.stats.successfulOperations}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">العمليات الفاشلة</p>
                    <p className="text-2xl font-bold text-red-600">{executiveSystem.stats.failedOperations}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">الأوامر المعلقة</p>
                    <p className="text-2xl font-bold text-orange-600">{executiveSystem.stats.pendingCommands}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>إحصائيات التحليل</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>إجمالي التحليلات</span>
                    <span className="font-bold">{commandEngine.stats.totalAnalyses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>التحليلات الناجحة</span>
                    <span className="font-bold text-green-600">{commandEngine.stats.successfulAnalyses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>متوسط الثقة</span>
                    <span className="font-bold text-blue-600">
                      {(commandEngine.stats.averageConfidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>معدل النجاح</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {executiveSystem.stats.totalOperations > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(executiveSystem.stats.successfulOperations / executiveSystem.stats.totalOperations) * 100}%` 
                        }}
                      ></div>
                    </div>
                  )}
                  <p className="text-center text-2xl font-bold text-green-600">
                    {executiveSystem.stats.totalOperations > 0 
                      ? ((executiveSystem.stats.successfulOperations / executiveSystem.stats.totalOperations) * 100).toFixed(1)
                      : 0
                    }%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

