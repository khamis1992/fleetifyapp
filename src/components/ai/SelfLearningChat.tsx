import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Brain, 
  Zap, 
  ThumbsUp, 
  ThumbsDown, 
  Lightbulb,
  TrendingUp,
  Clock,
  Target,
  RefreshCw
} from 'lucide-react';
import { useSelfLearningAI } from '@/hooks/useSelfLearningAI';
import { ClarificationDialog } from './ClarificationDialog';
import { LearningFeedbackDialog } from './LearningFeedbackDialog';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'system';
  timestamp: Date;
  metadata?: {
    confidence?: number;
    intent?: string;
    processingType?: string;
    learningApplied?: boolean;
    adaptiveRecommendations?: string[];
  };
}

export const SelfLearningChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your self-learning AI assistant. I continuously learn from our interactions to provide better responses. What would you like to know?',
      type: 'system',
      timestamp: new Date(),
      metadata: {
        confidence: 1.0,
        learningApplied: false
      }
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showClarification, setShowClarification] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    processQueryWithLearning,
    processClarificationResponse,
    submitLearningFeedback,
    currentSession,
    isProcessing,
    isLearning
  } = useSelfLearningAI();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
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
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await processQueryWithLearning({
        query: inputValue,
        context: {
          conversation_history: messages.slice(-3),
          timestamp: new Date().toISOString()
        }
      });

      setLastResponse(response);

      if (response.requires_clarification && currentSession) {
        setShowClarification(true);
        return;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        type: 'ai',
        timestamp: new Date(),
        metadata: {
          confidence: response.confidence,
          intent: response.intent_classification,
          processingType: response.processing_type,
          learningApplied: response.learning_applied,
          adaptiveRecommendations: response.adaptive_recommendations
        }
      };

      setMessages(prev => [...prev, aiMessage]);

      // Show learning indicators
      if (response.learning_applied) {
        toast.success('🧠 AI learned from previous interactions!');
      }

      if (response.confidence > 0.8) {
        toast.success('🎯 High confidence response');
      }

    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I encountered an error processing your request. Please try again.',
        type: 'ai',
        timestamp: new Date(),
        metadata: {
          confidence: 0,
          intent: 'error'
        }
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Error processing your request');
    } finally {
      setIsTyping(false);
    }
  };

  const handleClarificationSubmit = async (responses: Record<string, string>) => {
    if (!currentSession) return;

    try {
      await processClarificationResponse(currentSession.id, responses);
      setShowClarification(false);
      
      // Re-process the original query with clarification
      const response = await processQueryWithLearning({
        query: currentSession.original_query,
        context: {
          clarification_responses: responses,
          conversation_history: messages.slice(-3)
        }
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        type: 'ai',
        timestamp: new Date(),
        metadata: {
          confidence: response.confidence,
          intent: response.intent_classification,
          learningApplied: true,
          adaptiveRecommendations: response.adaptive_recommendations
        }
      };

      setMessages(prev => [...prev, aiMessage]);
      toast.success('🎓 AI learned from your clarification!');

    } catch (error) {
      console.error('Error processing clarification:', error);
      toast.error('Error processing clarification');
    }
  };

  const handleFeedbackSubmit = async (feedbackData: any) => {
    try {
      await submitLearningFeedback({
        feedback_type: feedbackData.feedbackType,
        feedback_rating: feedbackData.rating,
        feedback_comments: feedbackData.comments,
        improvement_suggestions: feedbackData.suggestions || {}
      });
      setShowFeedback(false);
      toast.success('Thank you! Your feedback helps me learn and improve.');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Error submitting feedback');
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
          <div className={`rounded-lg p-4 ${
            isUser 
              ? 'bg-primary text-primary-foreground' 
              : isSystem
              ? 'bg-muted text-muted-foreground border border-border'
              : 'bg-secondary text-secondary-foreground'
          }`}>
            <p className="text-sm leading-relaxed">{message.content}</p>
            
            {message.metadata && !isUser && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs">
                  {message.metadata.confidence !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      <Target className="h-3 w-3 mr-1" />
                      {Math.round(message.metadata.confidence * 100)}% confidence
                    </Badge>
                  )}
                  
                  {message.metadata.learningApplied && (
                    <Badge variant="default" className="text-xs bg-green-500">
                      <Brain className="h-3 w-3 mr-1" />
                      Learning Applied
                    </Badge>
                  )}
                  
                  {message.metadata.processingType && (
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      {message.metadata.processingType}
                    </Badge>
                  )}
                </div>
                
                {message.metadata.adaptiveRecommendations && message.metadata.adaptiveRecommendations.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Suggestions:</p>
                    <div className="flex flex-wrap gap-1">
                      {message.metadata.adaptiveRecommendations.map((suggestion, index) => (
                        <Badge key={index} variant="outline" className="text-xs cursor-pointer hover:bg-accent"
                               onClick={() => setInputValue(suggestion)}>
                          <Lightbulb className="h-3 w-3 mr-1" />
                          {suggestion}
                        </Badge>
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
            
            {!isUser && !isSystem && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowFeedback(true)}
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Feedback
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[600px]">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Self-Learning AI Assistant
            {isLearning && (
              <Badge variant="secondary" className="animate-pulse">
                <TrendingUp className="h-3 w-3 mr-1" />
                Learning...
              </Badge>
            )}
          </CardTitle>
          
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processing with self-learning AI...
              </div>
              <Progress value={isLearning ? 75 : 45} className="h-2" />
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map(renderMessage)}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-secondary text-secondary-foreground rounded-lg p-4 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <Separator className="my-4" />
          
          <div className="flex items-center gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything... I learn from every interaction!"
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
            💡 The AI learns from your interactions and improves over time
          </div>
        </CardContent>
      </Card>
      
      {/* Clarification Dialog */}
      <ClarificationDialog
        isOpen={showClarification}
        onClose={() => setShowClarification(false)}
        session={currentSession}
        onSubmitResponses={handleClarificationSubmit}
        isProcessing={isProcessing}
      />
      
      {/* Feedback Dialog */}
      <LearningFeedbackDialog
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        onSubmitFeedback={handleFeedbackSubmit}
        queryData={lastResponse ? {
          query: messages[messages.length - 2]?.content || '',
          response: messages[messages.length - 1]?.content || '',
          intent: lastResponse.intent_classification || 'general',
          confidence: lastResponse.confidence || 0
        } : undefined}
      />
    </div>
  );
};