import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Send, 
  RefreshCw,
  Save,
  History,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  Lightbulb,
  FileText,
  Shield,
  Target,
  TrendingUp,
  Activity,
  Settings,
  Download,
  Share,
  Copy,
  Trash2,
  Play
} from 'lucide-react';
import { useEnhancedLegalAI, EnhancedLegalResponse, ConversationHistory } from '@/hooks/useEnhancedLegalAI';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  confidence?: number;
  processing_time?: number;
  risk_assessment?: any;
  legal_references?: string[];
  action_items?: string[];
}

export const EnhancedLegalInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [savedConversations, setSavedConversations] = useState<any[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [conversationName, setConversationName] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [isSystemHealthy, setIsSystemHealthy] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    processLegalQuery,
    getQuerySuggestions,
    getLegalAnalytics,
    saveConversation,
    loadSavedConversations,
    clearConversationHistory,
    retryLastQuery,
    checkSystemHealth,
    isProcessing,
    error,
    processingStatus,
    conversationHistory,
    currentSessionId,
    clearError
  } = useEnhancedLegalAI();

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Check system health
        const healthy = await checkSystemHealth();
        setIsSystemHealthy(healthy);

        // Load suggestions
        const initialSuggestions = await getQuerySuggestions();
        setSuggestions(initialSuggestions);

        // Load analytics
        const analyticsData = await getLegalAnalytics();
        setAnalytics(analyticsData);

        // Load saved conversations
        const conversations = await loadSavedConversations();
        setSavedConversations(conversations);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  const handleSendMessage = async () => {
    if (!inputQuery.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputQuery,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const query = inputQuery;
    setInputQuery('');

    try {
      const response: EnhancedLegalResponse = await processLegalQuery({
        query,
        analysis_type: 'comprehensive'
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.analysis,
        type: 'ai',
        timestamp: new Date(),
        confidence: response.confidence,
        processing_time: response.processing_time,
        risk_assessment: response.risk_assessment,
        legal_references: response.legal_references,
        action_items: response.action_items
      };

      setMessages(prev => [...prev, aiMessage]);

      // Refresh analytics
      const updatedAnalytics = await getLegalAnalytics();
      setAnalytics(updatedAnalytics);

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'عذراً، حدث خطأ أثناء معالجة استعلامك. يرجى المحاولة مرة أخرى.',
        type: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputQuery(suggestion);
  };

  const handleSaveConversation = async () => {
    if (!conversationName.trim()) {
      toast.error('يرجى إدخال اسم للمحادثة');
      return;
    }

    try {
      await saveConversation(conversationName);
      setSaveDialogOpen(false);
      setConversationName('');
      
      // Refresh saved conversations
      const conversations = await loadSavedConversations();
      setSavedConversations(conversations);
    } catch (error) {
      toast.error('فشل في حفظ المحادثة');
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    clearConversationHistory();
    toast.success('تم مسح المحادثة');
  };

  const handleRetry = async () => {
    try {
      const response = await retryLastQuery();
      if (response) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          content: response.analysis,
          type: 'ai',
          timestamp: new Date(),
          confidence: response.confidence,
          processing_time: response.processing_time,
          risk_assessment: response.risk_assessment,
          legal_references: response.legal_references,
          action_items: response.action_items
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      toast.error('فشل في إعادة المحاولة');
    }
  };

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderMessage = (message: Message) => (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 ${message.type === 'user' ? 'text-right' : 'text-left'}`}
    >
      <div className={`inline-block max-w-[85%] ${
        message.type === 'user' 
          ? 'bg-primary text-primary-foreground rounded-l-lg rounded-tr-lg p-4' 
          : 'bg-card border rounded-r-lg rounded-tl-lg p-6'
      }`}>
        <div className="space-y-3">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          
          {message.type === 'ai' && (
            <div className="space-y-4 pt-4 border-t border-border/50">
              {/* Confidence and Processing Time */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  <span>الثقة: {message.confidence}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>الوقت: {message.processing_time}ms</span>
                </div>
              </div>

              {/* Risk Assessment */}
              {message.risk_assessment && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">تقييم المخاطر:</span>
                    <Badge className={getRiskColor(message.risk_assessment.level)}>
                      {message.risk_assessment.level === 'low' ? 'منخفض' : 
                       message.risk_assessment.level === 'medium' ? 'متوسط' : 'مرتفع'}
                    </Badge>
                  </div>
                  {message.risk_assessment.factors?.length > 0 && (
                    <ul className="list-disc list-inside text-sm space-y-1 mr-4">
                      {message.risk_assessment.factors.map((factor: string, index: number) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Action Items */}
              {message.action_items && message.action_items.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span className="font-medium">الخطوات المطلوبة:</span>
                  </div>
                  <ul className="list-decimal list-inside text-sm space-y-1 mr-4">
                    {message.action_items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Legal References */}
              {message.legal_references && message.legal_references.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">المراجع القانونية:</span>
                  </div>
                  <ul className="list-disc list-inside text-sm space-y-1 mr-4">
                    {message.legal_references.map((ref, index) => (
                      <li key={index}>{ref}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground mt-2">
        {message.timestamp.toLocaleTimeString('ar-KW')}
      </div>
    </motion.div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">المساعد القانوني المتقدم</h2>
              <p className="text-sm text-muted-foreground">
                مدعوم بالذكاء الاصطناعي للقانون الكويتي
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isSystemHealthy ? 'default' : 'destructive'}>
              {isSystemHealthy ? 'متصل' : 'غير متصل'}
            </Badge>
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={messages.length === 0}>
                  <Save className="h-4 w-4 mr-2" />
                  حفظ
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>حفظ المحادثة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="conversation-name">اسم المحادثة</Label>
                    <Input
                      id="conversation-name"
                      value={conversationName}
                      onChange={(e) => setConversationName(e.target.value)}
                      placeholder="أدخل اسم المحادثة..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleSaveConversation}>
                      حفظ
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="sm" onClick={handleClearChat} disabled={messages.length === 0}>
              <Trash2 className="h-4 w-4 mr-2" />
              مسح
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
          <TabsTrigger value="chat">المحادثة</TabsTrigger>
          <TabsTrigger value="analytics">الإحصائيات</TabsTrigger>
          <TabsTrigger value="history">السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col p-4">
          {/* System Status */}
          {!isSystemHealthy && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                يوجد مشكلة في الاتصال بالنظام. بعض الميزات قد لا تعمل بشكل صحيح.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button variant="link" onClick={clearError} className="p-0 h-auto ml-2">
                  إخفاء
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Messages Area */}
          <ScrollArea className="flex-1 mb-4">
            <div className="space-y-4 p-4">
              <AnimatePresence>
                {messages.map(renderMessage)}
              </AnimatePresence>
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 text-muted-foreground"
                >
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  <span>{processingStatus}</span>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Suggestions */}
          {messages.length === 0 && suggestions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">اقتراحات:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestions.slice(0, 4).map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-3 text-right justify-start"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Lightbulb className="h-4 w-4 ml-2 flex-shrink-0" />
                    <span className="text-sm">{suggestion}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Textarea
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="اكتب استفسارك القانوني هنا..."
                className="flex-1 min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputQuery.trim() || isProcessing}
                  className="h-10"
                >
                  <Send className="h-4 w-4" />
                </Button>
                {error && (
                  <Button
                    onClick={handleRetry}
                    disabled={isProcessing}
                    variant="outline"
                    className="h-10"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="flex-1 p-4">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الاستعلامات</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.total_queries}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.successful_queries} ناجح | {analytics.failed_queries} فاشل
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">معدل النجاح</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.success_rate.toFixed(1)}%</div>
                  <Progress value={analytics.success_rate} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">متوسط الثقة</CardTitle>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.average_confidence.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    متوسط وقت المعالجة: {analytics.average_processing_time.toFixed(0)}ms
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="flex-1 p-4">
          <div className="space-y-4">
            {savedConversations.length > 0 ? (
              savedConversations.map((conversation) => (
                <Card key={conversation.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{conversation.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(conversation.created_at).toLocaleDateString('ar-KW')}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4 mr-2" />
                      استعادة
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4" />
                <p>لا توجد محادثات محفوظة</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};