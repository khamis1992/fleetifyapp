import React, { useState, useRef, useEffect } from 'react';
import { FormattedResponse } from './FormattedResponse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  TrendingUp,
  FileText,
  BarChart3,
  PieChart,
  GitCompare,
  Activity,
  Eye,
  X,
  Plus,
  Settings,
  Filter
} from 'lucide-react';
import { useUnifiedLegalAI, UnifiedLegalQuery, UnifiedLegalResponse } from '@/hooks/useUnifiedLegalAI';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

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
  responseType?: 'text' | 'document' | 'analysis' | 'comparison' | 'chart' | 'interactive' | 'prediction';
  attachments?: Array<{
    id: string;
    name: string;
    type: 'document' | 'chart' | 'analysis_report' | 'comparison_report';
    content: any;
    downloadUrl?: string;
  }>;
  interactiveElements?: Array<{
    type: 'button' | 'form' | 'selection' | 'upload' | 'chart_control';
    label: string;
    action: string;
    data?: any;
  }>;
  analysisData?: {
    charts?: any[];
    tables?: any[];
    insights?: any[];
    predictions?: any[];
    risks?: any[];
    recommendations?: any[];
    comparison?: any;
  };
}

interface SmartSuggestion {
  text: string;
  type: 'follow_up' | 'clarification' | 'related_topic';
  confidence: number;
}

interface FileUpload {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

export const EnhancedSmartLegalAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const [activeQueryType, setActiveQueryType] = useState<'auto' | 'consultation' | 'document_analysis' | 'document_generation' | 'contract_comparison' | 'predictive_analysis' | 'smart_recommendations'>('auto');
  const [showFileUpload, setShowFileUpload] = useState(false);
  
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
    if (!inputMessage.trim() && uploadedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage || 'ملفات مرفقة للتحليل',
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    const currentFiles = uploadedFiles;
    setInputMessage('');
    setUploadedFiles([]);

    try {
      const queryData: UnifiedLegalQuery = {
        query: currentInput,
        country: 'Kuwait',
        company_id: 'default-company',
        conversationHistory: messages,
        queryType: activeQueryType === 'auto' ? undefined : activeQueryType,
        files: currentFiles.map(f => f.file),
        comparisonDocuments: activeQueryType === 'contract_comparison' ? currentFiles : undefined,
        context: { attachedFiles: currentFiles.map(f => f.name) }
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
        },
        responseType: response.responseType,
        attachments: response.attachments,
        interactiveElements: response.interactiveElements,
        analysisData: response.analysisData
      };

      setMessages(prev => [...prev, aiMessage]);
      generateSmartSuggestions(response, messages);
      
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
    
    // Add suggestions based on response type
    if (response.responseType === 'interactive') {
      suggestions.push({
        text: 'هل تحتاج إلى مساعدة في استخدام هذه الأدوات؟',
        type: 'follow_up',
        confidence: 0.8
      });
    }
    
    if (response.responseType === 'analysis') {
      suggestions.push({
        text: 'هل يمكنك تقديم المزيد من التفاصيل حول هذا التحليل؟',
        type: 'follow_up',
        confidence: 0.9
      });
    }
    
    if (response.classification.confidence < 0.7) {
      suggestions.push({
        text: 'هل يمكنك توضيح المزيد من التفاصيل؟',
        type: 'clarification',
        confidence: 0.9
      });
    }
    
    setSmartSuggestions(suggestions);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const fileUpload: FileUpload = {
        file,
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date()
      };
      
      setUploadedFiles(prev => [...prev, fileUpload]);
      toast.success(`تم إضافة الملف: ${file.name}`);
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleInteractiveAction = (action: string, data?: any) => {
    switch (action) {
      case 'upload_documents':
        fileInputRef.current?.click();
        break;
      case 'generate_lease_contract':
      case 'generate_service_agreement':
      case 'generate_legal_notice':
        setInputMessage(`أنشئ ${action.replace('generate_', '').replace('_', ' ')}`);
        break;
      case 'implement_recommendation':
        setInputMessage(`كيف يمكنني تنفيذ: ${data?.recommendation}`);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const renderResponseContent = (message: Message) => {
    if (message.type !== 'ai') {
      return <div className="whitespace-pre-wrap">{message.content}</div>;
    }

    return (
      <div className="space-y-4">
        <FormattedResponse content={message.content} className="text-sm leading-relaxed" />
        
        {/* Render Charts */}
        {message.analysisData?.charts && (
          <div className="space-y-4">
            {message.analysisData.charts.map((chart, index) => (
              <div key={index} className="bg-background rounded-lg p-4 border">
                <h4 className="font-semibold mb-2">تحليل بياني</h4>
                {chart.type === 'similarity' && (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[{ name: 'التشابه', value: chart.data.similarity }]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill={CHART_COLORS[0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {chart.type === 'probability' && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-2">
                      {chart.data.probability}%
                    </div>
                    <p className="text-sm text-muted-foreground">{chart.data.prediction}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Render Analysis Insights */}
        {message.analysisData?.insights && message.analysisData.insights.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              رؤى التحليل
            </h4>
            <ul className="space-y-1">
              {message.analysisData.insights.map((insight, index) => (
                <li key={index} className="text-sm">• {insight}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Render Risks */}
        {message.analysisData?.risks && message.analysisData.risks.length > 0 && (
          <div className="bg-orange-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              تقييم المخاطر
            </h4>
            <div className="space-y-2">
              {message.analysisData.risks.map((risk, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant={risk.level === 'high' ? 'destructive' : risk.level === 'medium' ? 'secondary' : 'default'}>
                    {risk.level === 'high' ? 'عالي' : risk.level === 'medium' ? 'متوسط' : 'منخفض'}
                  </Badge>
                  <span className="text-sm">{risk.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Render Interactive Elements */}
        {message.interactiveElements && message.interactiveElements.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">إجراءات تفاعلية</h4>
            <div className="flex flex-wrap gap-2">
              {message.interactiveElements.map((element, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={element.type === 'upload' ? 'outline' : 'default'}
                  onClick={() => handleInteractiveAction(element.action, element.data)}
                >
                  {element.type === 'upload' && <Upload className="h-4 w-4 mr-1" />}
                  {element.type === 'selection' && <Eye className="h-4 w-4 mr-1" />}
                  {element.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Render Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              الملفات المرفقة
            </h4>
            <div className="space-y-2">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-sm font-medium">{attachment.name}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getQueryTypeIcon = (type: string) => {
    switch (type) {
      case 'document_analysis': return <FileText className="h-4 w-4" />;
      case 'document_generation': return <Plus className="h-4 w-4" />;
      case 'contract_comparison': return <GitCompare className="h-4 w-4" />;
      case 'predictive_analysis': return <TrendingUp className="h-4 w-4" />;
      case 'smart_recommendations': return <Lightbulb className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getQueryTypeLabel = (type: string) => {
    switch (type) {
      case 'consultation': return 'استشارة';
      case 'document_analysis': return 'تحليل وثائق';
      case 'document_generation': return 'إنشاء وثائق';
      case 'contract_comparison': return 'مقارنة عقود';
      case 'predictive_analysis': return 'تحليل تنبؤي';
      case 'smart_recommendations': return 'توصيات ذكية';
      default: return 'تلقائي';
    }
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">المساعد القانوني الذكي المتكامل</CardTitle>
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
                {getQueryTypeIcon(activeQueryType)}
                {getQueryTypeLabel(activeQueryType)}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Query Type Selector */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">نوع الاستعلام</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['auto', 'consultation', 'document_analysis', 'document_generation', 'contract_comparison', 'predictive_analysis', 'smart_recommendations'].map((type) => (
              <Button
                key={type}
                size="sm"
                variant={activeQueryType === type ? 'default' : 'outline'}
                onClick={() => setActiveQueryType(type as any)}
                className="flex items-center gap-1"
              >
                {getQueryTypeIcon(type)}
                {getQueryTypeLabel(type)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">مرحباً بك في المساعد القانوني الذكي المتكامل</h3>
                  <p className="text-muted-foreground mb-4">
                    يمكنني مساعدتك في الاستشارات القانونية، تحليل الوثائق، إنشاء العقود، والمزيد
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-md mx-auto">
                    <Button size="sm" variant="outline" onClick={() => setInputMessage('ما هي خطوات إنهاء عقد الإيجار؟')}>
                      استشارة سريعة
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setActiveQueryType('document_analysis')}>
                      تحليل وثيقة
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setInputMessage('أنشئ عقد إيجار سكني')}>
                      إنشاء عقد
                    </Button>
                  </div>
                </div>
              )}
              
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : message.type === 'ai' 
                        ? 'bg-muted' 
                        : 'bg-yellow-50 border-yellow-200'
                  } rounded-lg p-4`}>
                    {renderResponseContent(message)}
                    
                    {message.type === 'ai' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                        <Button size="sm" variant="ghost">
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Share className="h-4 w-4" />
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

          {/* File Upload Area */}
          {uploadedFiles.length > 0 && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">الملفات المرفقة</span>
              </div>
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-background rounded border">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {(file.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="space-y-3">
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
                  multiple
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  title="رفع ملفات"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isProcessing}
                  title="تسجيل صوتي"
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={(!inputMessage.trim() && uploadedFiles.length === 0) || isProcessing}
                  size="sm"
                  title="إرسال"
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