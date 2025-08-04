import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Send, 
  Mic, 
  MicOff, 
  Paperclip,
  History,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share,
  MoreVertical,
  RefreshCw,
  Zap,
  Brain,
  FileText,
  Download,
  Upload,
  Play,
  Pause
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { useLegalAI } from '@/hooks/useLegalAI';
import { useAdvancedLegalAI } from '@/hooks/useAdvancedLegalAI';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

interface ConversationMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  confidence?: number;
  metadata?: {
    sources?: string[];
    legal_references?: string[];
    suggested_actions?: string[];
    attachments?: Array<{
      name: string;
      type: string;
      size: number;
      url?: string;
    }>;
  };
  reactions?: {
    helpful: boolean;
    accurate: boolean;
    bookmarked: boolean;
  };
}

interface SmartSuggestion {
  id: string;
  text: string;
  type: 'question' | 'action' | 'followup';
  confidence: number;
}

export const UnifiedLegalInterface: React.FC = () => {
  const { user } = useUnifiedCompanyAccess();
  const { submitQuery, isLoading: basicLoading } = useLegalAI();
  const { submitAdvancedQuery, isLoading: advancedLoading } = useAdvancedLegalAI();
  
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [contextMemory, setContextMemory] = useState<Map<string, any>>(new Map());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const isLoading = basicLoading || advancedLoading;

  useEffect(() => {
    // Initialize conversation
    const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setConversationId(newConversationId);
    
    // Welcome message
    const welcomeMessage: ConversationMessage = {
      id: 'welcome',
      type: 'system',
      content: 'مرحباً بك في مساعد الذكاء الاصطناعي القانوني المطور. كيف يمكنني مساعدتك اليوم؟',
      timestamp: new Date(),
      metadata: {
        suggested_actions: [
          'تحليل عقد قانوني',
          'استشارة قانونية عامة',
          'مراجعة وثيقة قانونية',
          'البحث في السوابق القضائية'
        ]
      }
    };
    
    setMessages([welcomeMessage]);
    generateSmartSuggestions([]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateSmartSuggestions = (conversationHistory: ConversationMessage[]) => {
    // Generate contextual suggestions based on conversation
    const suggestions: SmartSuggestion[] = [
      {
        id: 'quick_analysis',
        text: 'هل يمكنك تحليل هذا العقد سريعاً؟',
        type: 'question',
        confidence: 0.9
      },
      {
        id: 'legal_precedent',
        text: 'ابحث عن سوابق قضائية مشابهة',
        type: 'action',
        confidence: 0.8
      },
      {
        id: 'risk_assessment',
        text: 'ما هي المخاطر القانونية المحتملة؟',
        type: 'followup',
        confidence: 0.85
      }
    ];

    setSmartSuggestions(suggestions);
  };

  const handleSendMessage = async (content: string, isFromSuggestion: boolean = false) => {
    if (!content.trim() && !isFromSuggestion) return;

    const userMessage: ConversationMessage = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsTyping(true);

    try {
      // Determine if this requires advanced analysis
      const needsAdvancedAnalysis = content.includes('تحليل') || content.includes('عقد') || content.includes('وثيقة');
      
      let response;
      if (needsAdvancedAnalysis) {
        response = await submitAdvancedQuery({
          query: content,
          country: 'KW',
          company_id: user?.profile?.company_id || '',
          context: {
            case_history: [],
            related_documents: [],
            client_profile: {},
            legal_preferences: {}
          },
          analysis_depth: 'comprehensive'
        });
      } else {
        response = await submitQuery({
          query: content,
          country: 'KW',
          company_id: user?.profile?.company_id || ''
        });
      }

      // Update context memory
      setContextMemory(prev => {
        const newMemory = new Map(prev);
        newMemory.set(`query_${Date.now()}`, {
          query: content,
          response: response,
          timestamp: new Date()
        });
        
        // Keep only last 10 interactions
        if (newMemory.size > 10) {
          const firstKey = newMemory.keys().next().value;
          newMemory.delete(firstKey);
        }
        
        return newMemory;
      });

      const aiMessage: ConversationMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: needsAdvancedAnalysis ? response.comprehensive_advice : response.response,
        timestamp: new Date(),
        confidence: needsAdvancedAnalysis ? response.confidence_score : 0.85,
        metadata: {
          sources: needsAdvancedAnalysis ? response.classification?.references : [],
          legal_references: needsAdvancedAnalysis ? response.analysis?.legal_precedents?.map(p => p.title) : [],
          suggested_actions: needsAdvancedAnalysis ? response.analysis?.action_items : []
        },
        reactions: {
          helpful: false,
          accurate: false,
          bookmarked: false
        }
      };

      setMessages(prev => [...prev, aiMessage]);
      generateSmartSuggestions([...messages, userMessage, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ConversationMessage = {
        id: `error_${Date.now()}`,
        type: 'system',
        content: 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "خطأ في المحادثة",
        description: "حدث خطأ أثناء معالجة رسالتك",
        variant: "destructive"
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleReaction = (messageId: string, reactionType: keyof ConversationMessage['reactions']) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.reactions) {
        return {
          ...msg,
          reactions: {
            ...msg.reactions,
            [reactionType]: !msg.reactions[reactionType]
          }
        };
      }
      return msg;
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const message: ConversationMessage = {
        id: `file_${Date.now()}_${Math.random()}`,
        type: 'user',
        content: `تم رفع الملف: ${file.name}`,
        timestamp: new Date(),
        metadata: {
          attachments: [{
            name: file.name,
            type: file.type,
            size: file.size
          }]
        }
      };
      
      setMessages(prev => [...prev, message]);
      
      // Process file for legal analysis
      setTimeout(() => {
        handleSendMessage(`قم بتحليل هذا الملف: ${file.name}`);
      }, 500);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // Here you would typically send the audio to a speech-to-text service
        setCurrentInput(prev => prev + ' [تم تسجيل صوتي]');
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "خطأ في التسجيل",
        description: "لم نتمكن من الوصول إلى الميكروفون",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: "تم النسخ",
        description: "تم نسخ المحتوى إلى الحافظة",
      });
    });
  };

  const getMessageTypeColor = (type: ConversationMessage['type']) => {
    switch (type) {
      case 'user': return 'bg-primary text-primary-foreground';
      case 'ai': return 'bg-muted';
      case 'system': return 'bg-blue-50 text-blue-900 border border-blue-200';
      default: return 'bg-muted';
    }
  };

  const getMessageAlignment = (type: ConversationMessage['type']) => {
    return type === 'user' ? 'justify-end' : 'justify-start';
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">المساعد القانوني الذكي</CardTitle>
                <CardDescription>
                  محادثة تفاعلية مع ذاكرة سياقية وتحليل متقدم
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                متصل
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 p-4">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${getMessageAlignment(message.type)}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${getMessageTypeColor(message.type)}`}>
                    <div className="flex items-start gap-2 mb-2">
                      {message.type !== 'user' && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src="/ai-avatar.png" />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </div>
                        
                        {message.confidence && (
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              ثقة: {Math.round(message.confidence * 100)}%
                            </Badge>
                          </div>
                        )}
                        
                        {message.metadata?.suggested_actions && message.metadata.suggested_actions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs text-muted-foreground">إجراءات مقترحة:</div>
                            <div className="flex flex-wrap gap-1">
                              {message.metadata.suggested_actions.map((action, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-6"
                                  onClick={() => handleSendMessage(action, true)}
                                >
                                  {action}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {message.type === 'ai' && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => handleReaction(message.id, 'helpful')}
                          >
                            <ThumbsUp className={`h-3 w-3 ${message.reactions?.helpful ? 'text-green-600' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => handleReaction(message.id, 'accurate')}
                          >
                            <ThumbsDown className={`h-3 w-3 ${message.reactions?.accurate ? 'text-red-600' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => handleReaction(message.id, 'bookmarked')}
                          >
                            <Bookmark className={`h-3 w-3 ${message.reactions?.bookmarked ? 'text-blue-600' : ''}`} />
                          </Button>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => copyToClipboard(message.content)}>
                              <Copy className="h-4 w-4 mr-2" />
                              نسخ
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share className="h-4 w-4 mr-2" />
                              مشاركة
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              تصدير
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground mt-2">
                      {message.timestamp.toLocaleTimeString('ar-KW')}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                      <span className="text-sm text-muted-foreground">المساعد يكتب...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        {/* Smart Suggestions */}
        {smartSuggestions.length > 0 && (
          <div className="px-4 py-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">اقتراحات ذكية:</div>
            <div className="flex flex-wrap gap-2">
              {smartSuggestions.map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleSendMessage(suggestion.text, true)}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {suggestion.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="اكتب رسالتك هنا..."
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage(currentInput))}
                className="min-h-[44px] max-h-32 resize-none"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center gap-1">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
                className={isRecording ? 'bg-red-50 text-red-600 border-red-200' : ''}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              
              <Button
                onClick={() => handleSendMessage(currentInput)}
                disabled={isLoading || !currentInput.trim()}
                size="sm"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UnifiedLegalInterface;
