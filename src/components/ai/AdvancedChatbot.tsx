import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Brain, 
  Eye, 
  History, 
  Lightbulb,
  TrendingUp,
  Clock,
  Target,
  RefreshCw,
  MessageSquare,
  BarChart3,
  GitBranch,
  Layers
} from 'lucide-react';
import { useConversationMemory } from '@/hooks/useConversationMemory';
import { useAdvancedContextAnalysis } from '@/hooks/useAdvancedContextAnalysis';
import { useSelfLearningAI } from '@/hooks/useSelfLearningAI';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'system' | 'context_info';
  timestamp: Date;
  metadata?: {
    confidence?: number;
    intent?: string;
    domain?: string;
    complexity?: string;
    entities?: string[];
    contextInsights?: any[];
    processingDetails?: any;
  };
}

export const AdvancedChatbot: React.FC = () => {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: '1',
      content: 'مرحباً! أنا مساعدك الذكي المتقدم مع ذاكرة محادثة وفهم السياق العميق. أستطيع تتبع محادثاتنا السابقة وفهم المراجع المعقدة. كيف يمكنني مساعدتك؟',
      type: 'system',
      timestamp: new Date(),
      metadata: {
        confidence: 1.0
      }
    }
  ]);
  const [inputValue, setInputValue] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [showContextDetails, setShowContextDetails] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Hooks
  const {
    currentSession,
    initializeSession,
    addConversationTurn,
    getRelevantContext,
    getConversationSummary
  } = useConversationMemory();

  const {
    analyzeWithConversationContext,
    getCurrentContext,
    getCurrentInsights
  } = useAdvancedContextAnalysis();

  const {
    processQueryWithLearning
  } = useSelfLearningAI();

  // Initialize session on mount
  React.useEffect(() => {
    initializeSession('Advanced Chat Session');
  }, [initializeSession]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const queryText = inputValue;
    setInputValue('');
    setIsProcessing(true);

    try {
      // Step 1: Advanced context analysis
      const advancedContext = await analyzeWithConversationContext(queryText);
      
      // Step 2: Get relevant conversation context
      const relevantContext = getRelevantContext(queryText, 5, 10);
      
      // Step 3: Show context insights if significant
      const insights = getCurrentInsights();
      if (insights.length > 0 && showContextDetails) {
        const contextMessage: Message = {
          id: (Date.now() + 0.5).toString(),
          content: `تحليل السياق: ${insights.map(i => i.description).join(' • ')}`,
          type: 'context_info',
          timestamp: new Date(),
          metadata: {
            contextInsights: insights
          }
        };
        setMessages(prev => [...prev, contextMessage]);
      }

      // Step 4: Process with enhanced AI including full context
      const enhancedQuery = {
        query: queryText,
        context: {
          conversation_history: relevantContext.recentTurns,
          contextual_references: relevantContext.relevantReferences,
          session_summary: relevantContext.sessionSummary,
          advanced_context: advancedContext,
          timestamp: new Date().toISOString()
        }
      };

      const response = await processQueryWithLearning(enhancedQuery);

      // Step 5: Create AI response message
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        type: 'ai',
        timestamp: new Date(),
        metadata: {
          confidence: response.confidence,
          intent: response.intent_classification,
          domain: advancedContext.currentQuery.domain,
          complexity: advancedContext.currentQuery.complexity,
          entities: advancedContext.currentQuery.entities,
          contextInsights: insights,
          processingDetails: {
            learningApplied: response.learning_applied,
            processingType: response.processing_type,
            contextUsed: true
          }
        }
      };

      setMessages(prev => [...prev, aiMessage]);

      // Step 6: Add to conversation memory
      if (currentSession) {
        await addConversationTurn(queryText, response.response, {
          intent: response.intent_classification,
          domain: advancedContext.currentQuery.domain,
          entities: advancedContext.currentQuery.entities,
          confidence: response.confidence
        });
      }

      // Step 7: Show success indicators
      if (response.learning_applied) {
        toast.success('🧠 تم تطبيق التعلم من المحادثات السابقة!');
      }

      if (insights.length > 0) {
        toast.info(`🔍 تم تحليل ${insights.length} نقطة سياقية`);
      }

    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.',
        type: 'ai',
        timestamp: new Date(),
        metadata: {
          confidence: 0,
          intent: 'error'
        }
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('خطأ في معالجة الطلب');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    const isContextInfo = message.type === 'context_info';
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
          <div className={`rounded-lg p-4 ${
            isUser 
              ? 'bg-primary text-primary-foreground' 
              : isSystem
              ? 'bg-muted text-muted-foreground border border-border'
              : isContextInfo
              ? 'bg-orange-50 text-orange-800 border border-orange-200'
              : 'bg-secondary text-secondary-foreground'
          }`}>
            <p className="text-sm leading-relaxed">{message.content}</p>
            
            {message.metadata && !isUser && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {message.metadata.confidence !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      <Target className="h-3 w-3 mr-1" />
                      {Math.round(message.metadata.confidence * 100)}% ثقة
                    </Badge>
                  )}
                  
                  {message.metadata.domain && (
                    <Badge variant="secondary" className="text-xs">
                      <Layers className="h-3 w-3 mr-1" />
                      {message.metadata.domain}
                    </Badge>
                  )}
                  
                  {message.metadata.complexity && (
                    <Badge variant={
                      message.metadata.complexity === 'high' ? 'destructive' :
                      message.metadata.complexity === 'medium' ? 'default' : 'secondary'
                    } className="text-xs">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      {message.metadata.complexity}
                    </Badge>
                  )}
                  
                  {message.metadata.processingDetails?.contextUsed && (
                    <Badge variant="default" className="text-xs bg-blue-500">
                      <Eye className="h-3 w-3 mr-1" />
                      سياق محادثة
                    </Badge>
                  )}
                  
                  {message.metadata.processingDetails?.learningApplied && (
                    <Badge variant="default" className="text-xs bg-green-500">
                      <Brain className="h-3 w-3 mr-1" />
                      تعلم مطبق
                    </Badge>
                  )}
                </div>
                
                {message.metadata.entities && message.metadata.entities.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">الكيانات المحددة:</p>
                    <div className="flex flex-wrap gap-1">
                      {message.metadata.entities.map((entity, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {entity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {message.metadata.contextInsights && message.metadata.contextInsights.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">رؤى السياق:</p>
                    <div className="space-y-1">
                      {message.metadata.contextInsights.map((insight: any, index: number) => (
                        <div key={index} className="text-xs bg-blue-50 text-blue-800 p-2 rounded">
                          <span className="font-medium">{insight.type}:</span> {insight.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  const conversationSummary = getConversationSummary();
  const currentContext = getCurrentContext();

  return (
    <div className="flex flex-col h-[700px]">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              المساعد الذكي المتقدم
              <Badge variant="outline" className="text-xs">
                <GitBranch className="h-3 w-3 mr-1" />
                ذاكرة محادثة
              </Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContextDetails(!showContextDetails)}
              >
                <Eye className="h-4 w-4 mr-1" />
                تفاصيل السياق
              </Button>
            </div>
          </div>
          
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                معالجة متقدمة مع تحليل السياق والذاكرة...
              </div>
              <Progress value={75} className="h-2" />
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                المحادثة
              </TabsTrigger>
              <TabsTrigger value="context" className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                السياق
              </TabsTrigger>
              <TabsTrigger value="memory" className="flex items-center gap-1">
                <History className="h-4 w-4" />
                الذاكرة
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="flex-1 flex flex-col mt-4">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="context" className="flex-1 mt-4">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    السياق الحالي
                  </h3>
                  
                  {currentContext && (
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <h4 className="font-medium mb-2">الاستعلام الحالي</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>النية: <Badge variant="outline">{currentContext.currentQuery.intent}</Badge></div>
                          <div>المجال: <Badge variant="outline">{currentContext.currentQuery.domain}</Badge></div>
                          <div>التعقيد: <Badge variant="outline">{currentContext.currentQuery.complexity}</Badge></div>
                          <div>الثقة: <Badge variant="outline">{Math.round(currentContext.currentQuery.confidence * 100)}%</Badge></div>
                        </div>
                      </div>
                      
                      <div className="bg-muted p-3 rounded-lg">
                        <h4 className="font-medium mb-2">تدفق المحادثة</h4>
                        <div className="text-sm space-y-1">
                          <div>تحولات السياق: {currentContext.conversationFlow.context_shifts}</div>
                          <div>المراجع غير المحلولة: {currentContext.conversationFlow.unresolved_references.length}</div>
                        </div>
                      </div>
                      
                      <div className="bg-muted p-3 rounded-lg">
                        <h4 className="font-medium mb-2">الوعي الزمني</h4>
                        <div className="text-sm">
                          <div>تماسك الجدول الزمني: {Math.round(currentContext.temporalAwareness.timeline_coherence * 100)}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="memory" className="flex-1 mt-4">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="h-4 w-4" />
                    ملخص الجلسة
                  </h3>
                  
                  {conversationSummary && (
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>إجمالي الرسائل: {conversationSummary.totalMessages}</div>
                          <div>الاستعلامات المحلولة: {conversationSummary.resolvedQueries}</div>
                          <div>متوسط الثقة: {Math.round(conversationSummary.avgConfidence * 100)}%</div>
                          <div>المجالات: {conversationSummary.domains.join(', ')}</div>
                        </div>
                      </div>
                      
                      <div className="bg-muted p-3 rounded-lg">
                        <h4 className="font-medium mb-2">المواضيع الرئيسية</h4>
                        <div className="flex flex-wrap gap-1">
                          {conversationSummary.keyTopics.map((topic, index) => (
                            <Badge key={index} variant="secondary">{topic}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          
          <Separator className="my-4" />
          
          <div className="flex items-center gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="أدخل سؤالك... سأتذكر محادثتنا وأفهم السياق المعقد"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputValue.trim() || isProcessing}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-2 text-xs text-muted-foreground">
            🧠 مساعد ذكي مع ذاكرة محادثة متقدمة وفهم عميق للسياق
          </div>
        </CardContent>
      </Card>
    </div>
  );
};