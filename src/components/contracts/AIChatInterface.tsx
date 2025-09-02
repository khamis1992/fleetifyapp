import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Bot, 
  User, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Lightbulb,
  FileText,
  BarChart3,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useAdvancedAI } from '@/hooks/useAdvancedAI';
import { AIMessage, TaskType } from '@/types/ai-assistant';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AIChatInterfaceProps {
  contractData?: any;
  onActionSuggested?: (action: any) => void;
}

export const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  contractData,
  onActionSuggested
}) => {
  const [input, setInput] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>('analyze_data');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const aiAssistant = useAIAssistant({
    module: 'contracts',
    primitives: ['data_analysis', 'content_creation', 'research', 'ideation_strategy'],
    context: { contractData },
    priority: 'high_value',
    enabledFeatures: []
  });

  const advancedAI = useAdvancedAI();

  // التمرير التلقائي للأسفل عند إضافة رسائل جديدة
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [aiAssistant.messages]);

  // إرسال رسالة للمساعد الذكي
  const handleSendMessage = async () => {
    if (!input.trim() || aiAssistant.isLoading) return;

    const message = input.trim();
    setInput('');

    try {
      const response = await aiAssistant.executeTask(selectedTaskType, message, {
        timestamp: new Date(),
        conversationContext: aiAssistant.messages.slice(-5) // آخر 5 رسائل للسياق
      });

      if (response.suggestions && onActionSuggested) {
        response.suggestions.forEach(onActionSuggested);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // أنواع المهام السريعة
  const quickActions = [
    {
      type: 'analyze_data' as TaskType,
      label: 'تحليل البيانات',
      icon: BarChart3,
      prompt: 'قم بتحليل البيانات المتاحة وقدم تقريراً شاملاً عن الوضع الحالي'
    },
    {
      type: 'suggest_action' as TaskType,
      label: 'اقتراح إجراءات',
      icon: Lightbulb,
      prompt: 'ما هي أفضل الإجراءات التي يمكن اتخاذها لتحسين إدارة العقود؟'
    },
    {
      type: 'generate_document' as TaskType,
      label: 'إنشاء وثيقة',
      icon: FileText,
      prompt: 'أنشئ قالب عقد مُحسن بناءً على أفضل الممارسات'
    },
    {
      type: 'research_topic' as TaskType,
      label: 'بحث موضوع',
      icon: TrendingUp,
      prompt: 'ابحث عن أحدث الاتجاهات في صناعة تأجير المركبات'
    }
  ];

  // تنسيق الرسائل
  const formatMessage = (message: AIMessage) => {
    const isUser = message.role === 'user';
    const timeAgo = formatDistanceToNow(message.timestamp, { 
      addSuffix: true, 
      locale: ar 
    });

    return (
      <div
        key={message.id}
        className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        
        <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
          <div className={`p-3 rounded-lg ${
            isUser 
              ? 'bg-primary text-primary-foreground ml-auto' 
              : 'bg-muted'
          }`}>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
            
            {message.metadata && (
              <div className="mt-2 flex flex-wrap gap-1">
                {message.metadata.taskType && (
                  <Badge variant="secondary" className="text-xs">
                    {getTaskTypeLabel(message.metadata.taskType)}
                  </Badge>
                )}
                {message.metadata.confidence && (
                  <Badge 
                    variant={message.metadata.confidence > 0.8 ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    ثقة: {Math.round(message.metadata.confidence * 100)}%
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    );
  };

  const getTaskTypeLabel = (taskType: TaskType): string => {
    const labels: Record<TaskType, string> = {
      'analyze_data': 'تحليل البيانات',
      'generate_document': 'إنشاء وثيقة',
      'suggest_action': 'اقتراح إجراء',
      'research_topic': 'بحث موضوع',
      'create_report': 'إنشاء تقرير',
      'automate_process': 'أتمتة العملية',
      'optimize_workflow': 'تحسين سير العمل',
      'predict_outcome': 'توقع النتائج',
      'sentiment_analysis': 'تحليل المشاعر',
      'risk_prediction': 'التنبؤ بالمخاطر',
      'competitive_analysis': 'التحليل التنافسي',
      'contract_comparison': 'مقارنة العقود',
      'financial_forecasting': 'التنبؤ المالي'
    };
    return labels[taskType] || taskType;
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          المساعد الذكي التفاعلي
        </CardTitle>
        
        {/* إجراءات سريعة */}
        <div className="flex flex-wrap gap-2 mt-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.type}
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTaskType(action.type);
                  setInput(action.prompt);
                }}
                className="text-xs"
              >
                <Icon className="w-3 h-3 mr-1" />
                {action.label}
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 flex flex-col p-0">
        {/* منطقة الرسائل */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {aiAssistant.messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">مرحباً! كيف يمكنني مساعدتك في إدارة العقود اليوم؟</p>
              <p className="text-xs mt-2">استخدم الأزرار أعلاه للبدء السريع أو اكتب سؤالك</p>
            </div>
          ) : (
            <div className="space-y-4">
              {aiAssistant.messages.map(formatMessage)}
              
              {/* مؤشر الكتابة */}
              {aiAssistant.isLoading && (
                <div className="flex gap-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>المساعد يفكر...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* منطقة الإدخال */}
        <div className="p-4 space-y-3">
          {/* اختيار نوع المهمة */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['analyze_data', 'suggest_action', 'generate_document', 'research_topic'] as TaskType[]).map((type) => (
              <Button
                key={type}
                variant={selectedTaskType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTaskType(type)}
                className="whitespace-nowrap text-xs"
              >
                {getTaskTypeLabel(type)}
              </Button>
            ))}
          </div>

          {/* حقل الإدخال */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك هنا..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={aiAssistant.isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || aiAssistant.isLoading}
              size="icon"
            >
              {aiAssistant.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* معلومات السياق */}
          {contractData && (
            <div className="text-xs text-muted-foreground">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              يتم استخدام بيانات العقود المتاحة في التحليل
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};