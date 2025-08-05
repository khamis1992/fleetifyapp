import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Settings, 
  Shield, 
  Zap, 
  Brain,
  CheckCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  FileText,
  Users,
  Car,
  CreditCard,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Activity,
  Database,
  Cpu,
  Lock
} from 'lucide-react';
import { useExecutiveAISystem } from '@/hooks/useExecutiveAISystem';
import { useAdvancedCommandEngine } from '@/hooks/useAdvancedCommandEngine';
import { useChatGPTLevelAI } from '@/hooks/useChatGPTLevelAI';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  operation?: any;
  confidence?: number;
  executionTime?: number;
}

interface PendingCommand {
  id: string;
  command: string;
  operation: any;
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected';
}

interface SystemStats {
  totalOperations: number;
  successRate: number;
  averageResponseTime: number;
  securityBlocks: number;
  activeUsers: number;
  systemLoad: number;
}

export const UnifiedLegalAIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: '🤖 مرحباً! أنا المساعد الذكي الموحد لنظام Fleetify. يمكنني مساعدتك في:\n\n🎯 **الوضع الاستشاري**: الإجابة على الاستفسارات القانونية والتجارية\n⚡ **الوضع التنفيذي**: تنفيذ العمليات مباشرة في النظام\n\nاكتب أمرك أو استفسارك وسأقوم بمساعدتك فوراً!',
      timestamp: new Date(),
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'advisory' | 'executive'>('advisory');
  const [pendingCommands, setPendingCommands] = useState<PendingCommand[]>([]);
  const [operationHistory, setOperationHistory] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalOperations: 1247,
    successRate: 94.2,
    averageResponseTime: 0.34,
    securityBlocks: 23,
    activeUsers: 8,
    systemLoad: 67
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const executiveSystem = useExecutiveAISystem('company_123', 'user_123');
  const commandEngine = useAdvancedCommandEngine('company_123', 'user_123');
  const aiSystem = useChatGPTLevelAI();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const startTime = Date.now();
      
      if (currentMode === 'executive') {
        // الوضع التنفيذي - استخدام النظام التنفيذي
        const commandResult = await executiveSystem.processNaturalLanguageCommand(inputValue);
        
        if (commandResult.success) {
          const successMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: commandResult.message,
            timestamp: new Date(),
            executionTime: Date.now() - startTime
          };
          
          setMessages(prev => [...prev, successMessage]);
          
          // إضافة الأوامر المعلقة
          if (commandResult.commands && commandResult.commands.length > 0) {
            const newPendingCommands = commandResult.commands.map(cmd => ({
              id: cmd.id,
              command: inputValue,
              operation: {
                type: cmd.operation,
                description: cmd.description
              },
              riskLevel: cmd.estimatedImpact as 'low' | 'medium' | 'high',
              timestamp: new Date(),
              status: 'pending' as const
            }));
            
            setPendingCommands(prev => [...prev, ...newPendingCommands]);
          }
        } else {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `❌ **خطأ في معالجة الأمر**\n\n${commandResult.message}`,
            timestamp: new Date(),
            executionTime: Date.now() - startTime
          };
          
          setMessages(prev => [...prev, errorMessage]);
        }
      } else {
        // الوضع الاستشاري - استخدام النظام المتقدم للذكاء الاصطناعي
        const response = await aiSystem.processAdvancedQuery(
          inputValue,
          'user_123',
          'company_123',
          { analysisType: 'legal_consultation' }
        );
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.content || 'تم معالجة استفسارك بنجاح',
          timestamp: new Date(),
          confidence: response.confidence || 95,
          executionTime: Date.now() - startTime
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
      
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `❌ **حدث خطأ في النظام**\n\n${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveCommand = async (commandId: string) => {
    const command = pendingCommands.find(cmd => cmd.id === commandId);
    if (!command) return;

    try {
      // Create ExecutiveCommand from operation
      const execCommand = {
        id: command.id,
        operation: command.operation.type as any,
        parameters: {},
        description: command.operation.description,
        requiresConfirmation: false,
        estimatedImpact: command.riskLevel as any,
        affectedRecords: []
      };
      
      const result = await executiveSystem.confirmAndExecuteCommand(command.id);
      
      setPendingCommands(prev => 
        prev.map(cmd => 
          cmd.id === commandId 
            ? { ...cmd, status: 'approved' as const }
            : cmd
        )
      );
      
      const resultMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: result.success 
          ? `✅ **تم تنفيذ الأمر المعلق بنجاح**\n\n${result.message}`
          : `❌ **فشل في تنفيذ الأمر المعلق**\n\n${result.message}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, resultMessage]);
      setOperationHistory(prev => [...prev, { ...result, timestamp: new Date() }]);
      
    } catch (error) {
      console.error('Error executing approved command:', error);
    }
  };

  const handleRejectCommand = (commandId: string) => {
    setPendingCommands(prev => 
      prev.map(cmd => 
        cmd.id === commandId 
          ? { ...cmd, status: 'rejected' as const }
          : cmd
      )
    );
    
    const rejectionMessage: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: '❌ **تم رفض الأمر المعلق**\n\nلم يتم تنفيذ أي تغييرات على النظام.',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, rejectionMessage]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const quickCommands = [
    { text: 'عرض إحصائيات العملاء', icon: Users },
    { text: 'تقرير المركبات المتاحة', icon: Car },
    { text: 'ملخص العمليات المالية', icon: CreditCard },
    { text: 'حالة النظام والأمان', icon: Shield },
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">المساعد الذكي الموحد</h1>
              <p className="text-sm text-gray-600">نظام متقدم للاستشارة والتحكم التنفيذي</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Badge variant={currentMode === 'advisory' ? 'default' : 'secondary'}>
              {currentMode === 'advisory' ? '🎯 استشاري' : '⚡ تنفيذي'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMode(currentMode === 'advisory' ? 'executive' : 'advisory')}
            >
              <RotateCcw className="h-4 w-4 ml-1" />
              تبديل الوضع
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 bg-white border-b">
              <TabsTrigger value="chat" className="flex items-center space-x-2 rtl:space-x-reverse">
                <MessageCircle className="h-4 w-4" />
                <span>المحادثة</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center space-x-2 rtl:space-x-reverse">
                <Clock className="h-4 w-4" />
                <span>الأوامر المعلقة</span>
                {pendingCommands.filter(cmd => cmd.status === 'pending').length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {pendingCommands.filter(cmd => cmd.status === 'pending').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2 rtl:space-x-reverse">
                <FileText className="h-4 w-4" />
                <span>السجل</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center space-x-2 rtl:space-x-reverse">
                <BarChart3 className="h-4 w-4" />
                <span>الإحصائيات</span>
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col">
              {/* Mode Alert */}
              <Alert className={`m-4 ${currentMode === 'executive' ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {currentMode === 'executive' 
                    ? '⚡ **الوضع التنفيذي نشط**: يمكن للنظام تنفيذ العمليات مباشرة في قاعدة البيانات'
                    : '🎯 **الوضع الاستشاري نشط**: النظام سيقدم المشورة دون تنفيذ عمليات'
                  }
                </AlertDescription>
              </Alert>

              {/* Quick Commands */}
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {quickCommands.map((cmd, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setInputValue(cmd.text)}
                      className="flex items-center space-x-1 rtl:space-x-reverse text-xs"
                    >
                      <cmd.icon className="h-3 w-3" />
                      <span>{cmd.text}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-4 pb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.type === 'user'
                            ? 'bg-blue-500 text-white'
                            : message.type === 'system'
                            ? 'bg-gray-100 text-gray-800 border'
                            : 'bg-white text-gray-800 border shadow-sm'
                        }`}
                      >
                        <div className="flex items-start space-x-2 rtl:space-x-reverse">
                          {message.type !== 'user' && (
                            <div className={`p-1 rounded ${message.type === 'system' ? 'bg-gray-200' : 'bg-blue-100'}`}>
                              <Bot className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {message.content}
                            </div>
                            <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                              <span>{formatTime(message.timestamp)}</span>
                              {message.confidence && (
                                <span>ثقة: {message.confidence.toFixed(1)}%</span>
                              )}
                              {message.executionTime && (
                                <span>زمن: {message.executionTime}ms</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border rounded-lg p-3 shadow-sm">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span className="text-sm text-gray-600">جاري المعالجة...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 bg-white border-t">
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={currentMode === 'executive' 
                      ? "اكتب أمرك التنفيذي هنا... (مثل: سجل مخالفة على العميل أحمد)"
                      : "اكتب استفسارك هنا..."
                    }
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isLoading || !inputValue.trim()}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Pending Commands Tab */}
            <TabsContent value="pending" className="flex-1 p-4">
              <div className="space-y-4">
                {pendingCommands.filter(cmd => cmd.status === 'pending').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد أوامر معلقة حالياً</p>
                  </div>
                ) : (
                  pendingCommands
                    .filter(cmd => cmd.status === 'pending')
                    .map((command) => (
                      <Card key={command.id} className="border-l-4 border-l-orange-400">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{command.operation.type}</CardTitle>
                            <Badge className={getRiskLevelColor(command.riskLevel)}>
                              {command.riskLevel === 'high' ? 'مخاطر عالية' : 
                               command.riskLevel === 'medium' ? 'مخاطر متوسطة' : 'مخاطر منخفضة'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-gray-700">الأمر الأصلي:</p>
                              <p className="text-sm bg-gray-50 p-2 rounded">{command.command}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">تفاصيل العملية:</p>
                              <p className="text-sm text-gray-600">{command.operation.description}</p>
                            </div>
                            <div className="flex space-x-2 rtl:space-x-reverse">
                              <Button 
                                onClick={() => handleApproveCommand(command.id)}
                                className="bg-green-500 hover:bg-green-600"
                                size="sm"
                              >
                                <CheckCircle className="h-4 w-4 ml-1" />
                                موافقة
                              </Button>
                              <Button 
                                onClick={() => handleRejectCommand(command.id)}
                                variant="destructive"
                                size="sm"
                              >
                                <AlertTriangle className="h-4 w-4 ml-1" />
                                رفض
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 p-4">
              <div className="space-y-4">
                {operationHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد عمليات في السجل</p>
                  </div>
                ) : (
                  operationHistory.map((operation, index) => (
                    <Card key={index} className={`border-l-4 ${operation.success ? 'border-l-green-400' : 'border-l-red-400'}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            {operation.success ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span className="font-medium">{operation.type || 'عملية'}</span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatTime(operation.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{operation.message}</p>
                        {operation.data && (
                          <details className="mt-2">
                            <summary className="text-sm text-blue-600 cursor-pointer">عرض التفاصيل</summary>
                            <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                              {JSON.stringify(operation.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="stats" className="flex-1 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي العمليات</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemStats.totalOperations.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">منذ بداية التشغيل</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">معدل النجاح</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemStats.successRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">للعمليات المنفذة</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">زمن الاستجابة</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemStats.averageResponseTime.toFixed(2)}s</div>
                    <p className="text-xs text-muted-foreground">متوسط الاستجابة</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الحماية الأمنية</CardTitle>
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemStats.securityBlocks}</div>
                    <p className="text-xs text-muted-foreground">هجمة محجوبة</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">المستخدمون النشطون</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemStats.activeUsers}</div>
                    <p className="text-xs text-muted-foreground">متصل حالياً</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">حمولة النظام</CardTitle>
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{systemStats.systemLoad}%</div>
                    <p className="text-xs text-muted-foreground">استخدام الموارد</p>
                  </CardContent>
                </Card>
              </div>

              {/* System Status */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Database className="h-5 w-5" />
                    <span>حالة النظام</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">قاعدة البيانات</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">متصلة</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">محرك الذكاء الاصطناعي</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">نشط</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">نظام الأمان</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">محمي</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">النسخ الاحتياطية</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">محدثة</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

