import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  MessageCircle,
  X,
  Send,
  Minimize2,
  Maximize2,
  Sparkles,
  Lightbulb,
  TrendingUp,
  FileText,
  Search,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Mic,
  MicOff,
  Settings,
  Star,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { 
  AIAssistantConfig, 
  AIMessage, 
  AISuggestion,
  AIUseCasePrimitive,
  TaskType 
} from '@/types/ai-assistant';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FloatingAIAssistantProps {
  config: AIAssistantConfig;
  className?: string;
  defaultPosition?: { x: number; y: number };
}

const primitiveIcons: Record<AIUseCasePrimitive, React.ComponentType<any>> = {
  content_creation: FileText,
  research: Search,
  data_analysis: TrendingUp,
  automation: Zap,
  coding: Brain,
  ideation_strategy: Lightbulb
};

const primitiveColors: Record<AIUseCasePrimitive, string> = {
  content_creation: 'bg-blue-500',
  research: 'bg-green-500',
  data_analysis: 'bg-purple-500',
  automation: 'bg-orange-500',
  coding: 'bg-red-500',
  ideation_strategy: 'bg-yellow-500'
};

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
  config,
  className,
  defaultPosition = { x: window.innerWidth - 400, y: 100 }
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const dragRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    suggestions,
    isLoading,
    currentTask,
    error,
    executeTask,
    clearConversation,
    cancelCurrentTask
  } = useAIAssistant(config);

  // سجل تتبع للتشخيص
  console.log('🤖 FloatingAIAssistant mounted with config:', config);
  console.log('🤖 FloatingAIAssistant isOpen:', isOpen);

  // التعامل مع السحب والإفلات
  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // إرسال الرسالة
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    try {
      await executeTask('suggest_action', message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // التعامل مع الاقتراحات
  const handleSuggestionClick = async (suggestion: AISuggestion) => {
    try {
      await executeTask(
        suggestion.action as TaskType,
        `تنفيذ الاقتراح: ${suggestion.title} - ${suggestion.description}`
      );
    } catch (error) {
      console.error('Error executing suggestion:', error);
    }
  };

  // تفعيل/إلغاء تفعيل التسجيل الصوتي
  const toggleVoiceRecording = () => {
    setIsListening(!isListening);
    if (!isListening) {
      toast.info('بدء التسجيل الصوتي...');
      // هنا سيتم إضافة منطق التسجيل الصوتي
    } else {
      toast.info('تم إيقاف التسجيل الصوتي');
    }
  };

  // مكون الرسالة
  const MessageComponent: React.FC<{ message: AIMessage }> = ({ message }) => (
    <div className={cn(
      'flex gap-3 mb-4',
      message.role === 'user' ? 'justify-end' : 'justify-start'
    )}>
      {message.role === 'assistant' && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Brain className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className={cn(
        'max-w-[80%] rounded-lg p-3 text-sm',
        message.role === 'user' 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-900 border'
      )}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        
        {message.metadata && (
          <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
            {message.metadata.confidence && (
              <Badge variant="secondary" className="text-xs">
                دقة: {Math.round(message.metadata.confidence * 100)}%
              </Badge>
            )}
            {message.metadata.taskType && (
              <Badge variant="outline" className="text-xs">
                {message.metadata.taskType}
              </Badge>
            )}
          </div>
        )}
      </div>
      
      {message.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium">أ</span>
        </div>
      )}
    </div>
  );

  // مكون الاقتراحات
  const SuggestionsComponent: React.FC = () => (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        اقتراحات ذكية
      </h4>
      {suggestions.map((suggestion) => {
        const Icon = primitiveIcons[suggestion.primitive];
        return (
          <Button
            key={suggestion.id}
            variant="outline"
            size="sm"
            className="w-full justify-start h-auto p-3 text-right"
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={isLoading}
          >
            <div className="flex items-start gap-2 w-full">
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-right">
                <div className="font-medium text-sm">{suggestion.title}</div>
                <div className="text-xs text-gray-500 mt-1">{suggestion.description}</div>
              </div>
              <Badge 
                variant="secondary" 
                className={cn("text-xs", primitiveColors[suggestion.primitive])}
              >
                {Math.round(suggestion.confidence * 100)}%
              </Badge>
            </div>
          </Button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* زر التفعيل العائم */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 left-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="rounded-full w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Brain className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* نافذة المساعد الذكي */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              zIndex: 1000
            }}
            className={cn("w-96", className)}
          >
            <Card className="shadow-2xl border-0 overflow-hidden">
              {/* شريط العنوان */}
              <CardHeader 
                ref={dragRef}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 cursor-move select-none"
                onMouseDown={handleMouseDown}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    <CardTitle className="text-sm">
                      المساعد الذكي - {config.module}
                    </CardTitle>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-white hover:bg-white/20"
                      onClick={() => setIsMinimized(!isMinimized)}
                    >
                      {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-white hover:bg-white/20"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* شريط الحالة */}
                <div className="flex items-center gap-2 mt-2">
                  {config.primitives.map((primitive) => {
                    const Icon = primitiveIcons[primitive];
                    return (
                      <Badge key={primitive} variant="secondary" className="text-xs bg-white/20 text-white">
                        <Icon className="w-3 h-3 ml-1" />
                        {primitive}
                      </Badge>
                    );
                  })}
                </div>
              </CardHeader>

              {/* المحتوى */}
              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="p-4 space-y-4">
                      {/* منطقة الرسائل */}
                      <ScrollArea className="h-64 w-full">
                        {messages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                            <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
                            <p className="text-sm">مرحباً! كيف يمكنني مساعدتك اليوم؟</p>
                            <p className="text-xs mt-1">اكتب سؤالك أو اختر من الاقتراحات أدناه</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {messages.map((message) => (
                              <MessageComponent key={message.id} message={message} />
                            ))}
                            
                            {isLoading && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>جاري المعالجة...</span>
                                {currentTask && (
                                  <Badge variant="outline" className="text-xs">
                                    {currentTask}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </ScrollArea>

                      {/* رسائل الخطأ */}
                      {error && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      {/* الاقتراحات */}
                      {suggestions.length > 0 && (
                        <>
                          <Separator />
                          <SuggestionsComponent />
                        </>
                      )}

                      {/* منطقة الإدخال */}
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="اكتب رسالتك هنا..."
                            className="pl-10"
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            disabled={isLoading}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                            onClick={toggleVoiceRecording}
                          >
                            {isListening ? (
                              <MicOff className="w-4 h-4 text-red-500" />
                            ) : (
                              <Mic className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        
                        <Button
                          onClick={handleSendMessage}
                          disabled={!inputValue.trim() || isLoading}
                          size="sm"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {/* أزرار الإجراءات */}
                      <div className="flex justify-between items-center">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearConversation}
                            disabled={isLoading}
                          >
                            <X className="w-4 h-4 ml-1" />
                            مسح
                          </Button>
                          
                          {isLoading && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelCurrentTask}
                            >
                              إلغاء
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>متصل</span>
                        </div>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
