import React, { useState, useRef, useEffect } from 'react';
import { FormattedResponse } from './FormattedResponse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Send, 
  Mic, 
  MicOff, 
  Upload, 
  Brain, 
  Zap, 
  Target, 
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share,
  Download,
  MoreHorizontal,
  Lightbulb,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useUnifiedLegalAI, UnifiedLegalQuery, UnifiedLegalResponse } from '@/hooks/useUnifiedLegalAI';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'system';
  timestamp: Date;
  metadata?: {
    classification?: any;
    processingType?: string;
    processingTime?: number;
    confidence?: number;
    adaptiveRecommendations?: string[];
  };
  reactions?: {
    helpful?: boolean;
    accurate?: boolean;
    bookmarked?: boolean;
  };
}

interface SmartSuggestion {
  text: string;
  type: 'follow_up' | 'clarification' | 'related_topic';
  confidence: number;
}

export const SmartLegalAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { submitUnifiedQuery, isProcessing, error, processingStatus, clearError } = useUnifiedLegalAI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');

    try {
      const queryData: UnifiedLegalQuery = {
        query: currentInput,
        country: 'Kuwait', // Default or get from user context
        company_id: 'default-company', // Get from context
        conversationHistory: messages,
        context: selectedFile ? { attachedFile: selectedFile.name } : undefined
      };

      const response: UnifiedLegalResponse = await submitUnifiedQuery(queryData);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.response.advice || ('message' in response.response ? response.response.message : '') || 'لم يتم العثور على إجابة مناسبة',
        type: 'ai',
        timestamp: new Date(),
        metadata: {
          classification: response.classification,
          processingType: response.processingType,
          processingTime: response.metadata.processingTime,
          confidence: response.classification.confidence,
          adaptiveRecommendations: response.metadata.adaptiveRecommendations
        }
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Generate smart suggestions based on the response
      generateSmartSuggestions(response, messages);
      
      // Clear selected file after processing
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'عذراً، حدث خطأ في معالجة استفسارك. يرجى المحاولة مرة أخرى.',
        type: 'system',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const generateSmartSuggestions = (response: UnifiedLegalResponse, history: Message[]) => {
    const suggestions: SmartSuggestion[] = [];
    
    // Add follow-up questions based on processing type
    if (response.processingType === 'basic') {
      suggestions.push({
        text: 'هل تحتاج إلى تحليل أعمق لهذا الموضوع؟',
        type: 'follow_up',
        confidence: 0.8
      });
    }
    
    // Add clarification suggestions if confidence is low
    if (response.classification.confidence < 0.7) {
      suggestions.push({
        text: 'هل يمكنك توضيح المزيد من التفاصيل؟',
        type: 'clarification',
        confidence: 0.9
      });
    }
    
    // Add related topics based on user intent
    if (response.classification.contextual.userIntent === 'consultation') {
      suggestions.push({
        text: 'ما هي الخطوات العملية التالية؟',
        type: 'related_topic',
        confidence: 0.7
      });
    }
    
    setSmartSuggestions(suggestions);
  };

  const handleReaction = (messageId: string, reactionType: 'helpful' | 'accurate' | 'bookmarked') => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          reactions: {
            ...msg.reactions,
            [reactionType]: !msg.reactions?.[reactionType]
          }
        };
      }
      return msg;
    }));
    toast.success('تم تسجيل تقييمك');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`تم اختيار الملف: ${file.name}`);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    toast.info('بدء التسجيل الصوتي...');
    // Implement voice recording logic here
  };

  const stopRecording = () => {
    setIsRecording(false);
    toast.success('تم إيقاف التسجيل');
    // Implement voice processing logic here
  };

  const getProcessingIcon = (processingType?: string) => {
    switch (processingType) {
      case 'basic': return <Zap className="h-4 w-4" />;
      case 'advanced': return <Target className="h-4 w-4" />;
      case 'hybrid': return <RefreshCw className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">المساعد القانوني الذكي</CardTitle>
              {isProcessing && (
                <Badge variant="secondary" className="animate-pulse">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                    {processingStatus || 'معالجة...'}
                  </div>
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                AI متطور
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">مرحباً بك في المساعد القانوني الذكي</h3>
                  <p className="text-muted-foreground">
                    أطرح استفسارك القانوني وسأقوم بتحليله وتقديم الإجابة المناسبة
                  </p>
                </div>
              )}
              
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${message.type === 'user' ? 'bg-primary text-primary-foreground' : message.type === 'ai' ? 'bg-muted' : 'bg-yellow-50 border-yellow-200'} rounded-lg p-4`}>
                    {message.type === 'ai' && message.metadata && (
                      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                        {getProcessingIcon(message.metadata.processingType)}
                        <span>
                          {message.metadata.processingType === 'basic' ? 'تحليل سريع' :
                           message.metadata.processingType === 'advanced' ? 'تحليل متقدم' : 'تحليل ذكي'}
                        </span>
                        {message.metadata.classification && (
                          <Badge className={getComplexityColor(message.metadata.classification.complexity)}>
                            {message.metadata.classification.complexity === 'low' ? 'بسيط' :
                             message.metadata.classification.complexity === 'medium' ? 'متوسط' : 'معقد'}
                          </Badge>
                        )}
                        {message.metadata.processingTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{(message.metadata.processingTime / 1000).toFixed(1)}ث</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {message.type === 'ai' ? (
                      <FormattedResponse content={message.content} className="text-sm leading-relaxed" />
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                    
                    {message.metadata?.adaptiveRecommendations && message.metadata.adaptiveRecommendations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-1 mb-2 text-sm font-medium">
                          <Lightbulb className="h-4 w-4" />
                          اقتراحات ذكية
                        </div>
                        <div className="space-y-1">
                          {message.metadata.adaptiveRecommendations.map((rec, index) => (
                            <div key={index} className="text-sm text-muted-foreground bg-background/50 rounded p-2">
                              • {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {message.type === 'ai' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReaction(message.id, 'helpful')}
                          className={message.reactions?.helpful ? 'text-green-600' : ''}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReaction(message.id, 'accurate')}
                          className={message.reactions?.accurate ? 'text-blue-600' : ''}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Share className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Smart Suggestions */}
          {smartSuggestions.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                <Lightbulb className="h-4 w-4" />
                اقتراحات سريعة
              </div>
              <div className="flex flex-wrap gap-2">
                {smartSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    onClick={() => setInputMessage(suggestion.text)}
                    className="text-xs"
                  >
                    {suggestion.text}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-4" />

          {/* Input Area */}
          <div className="space-y-3">
            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <Upload className="h-4 w-4" />
                <span className="text-sm">{selectedFile.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedFile(null)}
                  className="ml-auto"
                >
                  ×
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <div className="flex-1">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="اكتب استفسارك القانوني هنا..."
                  className="resize-none"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isProcessing}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};