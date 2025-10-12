import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Send,
  AlertTriangle,
  FileText,
  Scale,
  TrendingUp,
  Settings,
  Sparkles,
  Download,
  Copy,
  User,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useLegalAI } from '@/hooks/useLegalAI';
import { useLegalAIStats } from '@/hooks/useLegalAIStats';
import { APIKeySettings } from './APIKeySettings';
import { LegalDocumentGenerator } from './LegalDocumentGenerator';
import { RiskAnalyzer } from './RiskAnalyzer';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface LegalAIInterfaceProps {
  companyId: string;
  onDocumentGenerated?: (document: LegalDocument) => void;
  onRiskAnalysis?: (analysis: RiskAnalysis) => void;
}

export interface LegalDocument {
  id: string;
  type: string;
  content: string;
  customerId?: string;
  country: string;
  created_at: string;
}

export interface RiskAnalysis {
  customerId: string;
  score: number;
  factors: RiskFactors;
  recommendations: string[];
}

export interface RiskFactors {
  paymentDelay: number;
  unpaidAmount: number;
  violationCount: number;
  contractHistory: number;
  litigationHistory: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    customerId?: string;
    riskScore?: number;
    documentType?: string;
  };
}

export const EnhancedLegalAIInterface_v2: React.FC<LegalAIInterfaceProps> = ({
  companyId,
  onDocumentGenerated,
  onRiskAnalysis
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<'kuwait' | 'saudi' | 'qatar'>('kuwait');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    processQuery,
    generateDocument,
    analyzeRisk,
    isProcessing,
    apiKey,
    setApiKey
  } = useLegalAI(companyId);

  const stats = useLegalAIStats(companyId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'system',
        content: 'مرحباً! أنا المستشار القانوني الذكي المتخصص في شركات التأجير والليموزين في دول الخليج. كيف يمكنني مساعدتك اليوم؟',
        timestamp: new Date()
      }]);
    }
  }, []);

  const handleSubmitQuery = async () => {
    if (!inputQuery.trim() || isProcessing) return;

    if (!apiKey) {
      toast.error('يرجى إدخال مفتاح OpenAI API أولاً في تبويب الإعدادات');
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputQuery,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputQuery('');
    setIsStreaming(true);

    try {
      const response = await processQuery.mutateAsync({
        query: inputQuery,
        country: selectedCountry,
        companyId
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        metadata: {
          customerId: response.customerId,
          riskScore: response.riskScore,
          documentType: response.documentType
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle document generation if applicable
      if (response.document && onDocumentGenerated) {
        onDocumentGenerated(response.document);
      }

      // Handle risk analysis if applicable
      if (response.riskAnalysis && onRiskAnalysis) {
        onRiskAnalysis(response.riskAnalysis);
      }

      toast.success('تم معالجة استفسارك بنجاح');
    } catch (error: any) {
      console.error('Error processing query:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `عذراً، حدث خطأ: ${error.message}. يرجى المحاولة مرة أخرى.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('حدث خطأ في معالجة الاستفسار');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('تم نسخ النص');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitQuery();
    }
  };

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
          <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className={`p-2 rounded-full ${isSystem ? 'bg-purple-100' : isUser ? 'bg-primary' : 'bg-accent'}`}>
              {isSystem ? (
                <Sparkles className="h-4 w-4 text-purple-600" />
              ) : isUser ? (
                <User className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Scale className="h-4 w-4 text-accent-foreground" />
              )}
            </div>

            {/* Message Content */}
            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-lg p-3 shadow-sm ${
                isSystem ? 'bg-purple-50 border border-purple-200' :
                isUser ? 'bg-primary text-primary-foreground' : 
                'bg-card border'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Metadata */}
                {message.metadata && (
                  <div className="mt-2 pt-2 border-t border-current/20 space-y-1">
                    {message.metadata.riskScore !== undefined && (
                      <Badge variant={message.metadata.riskScore > 70 ? 'destructive' : 'default'}>
                        درجة المخاطر: {message.metadata.riskScore.toFixed(1)}
                      </Badge>
                    )}
                    {message.metadata.documentType && (
                      <Badge variant="outline">
                        {message.metadata.documentType}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Timestamp and Actions */}
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-xs text-muted-foreground">
                  {format(message.timestamp, 'HH:mm', { locale: ar })}
                </span>
                {!isUser && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => handleCopyMessage(message.content)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StatCard = ({ icon: Icon, label, value, trend }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-xs text-success">
            <TrendingUp className="h-3 w-3" />
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="إجمالي الاستشارات"
          value={stats.data?.totalConsultations || 0}
          trend="+12% هذا الشهر"
        />
        <StatCard
          icon={FileText}
          label="الوثائق المُنشأة"
          value={stats.data?.totalDocuments || 0}
        />
        <StatCard
          icon={Clock}
          label="متوسط زمن الاستجابة"
          value={`${(stats.data?.avgResponseTime || 0).toFixed(2)}s`}
        />
        <StatCard
          icon={DollarSign}
          label="التوفير الشهري"
          value={`$${(stats.data?.costSavings || 0).toFixed(0)}`}
          trend="75% توفير"
        />
      </div>

      {/* Main Interface */}
      <Tabs defaultValue="consultation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consultation" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span>استشارة قانونية</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>الوثائق</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>تحليل المخاطر</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>الإعدادات</span>
          </TabsTrigger>
        </TabsList>

        {/* Consultation Tab */}
        <TabsContent value="consultation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                المستشار القانوني الذكي
              </CardTitle>
              <CardDescription>
                اطرح استفساراتك القانونية بلغة طبيعية وسأساعدك بخبرة قانونية متخصصة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Country Selector */}
              <div className="flex gap-2">
                <Button
                  variant={selectedCountry === 'kuwait' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCountry('kuwait')}
                >
                  🇰🇼 الكويت
                </Button>
                <Button
                  variant={selectedCountry === 'saudi' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCountry('saudi')}
                >
                  🇸🇦 السعودية
                </Button>
                <Button
                  variant={selectedCountry === 'qatar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCountry('qatar')}
                >
                  🇶🇦 قطر
                </Button>
              </div>

              {/* Chat Messages */}
              <ScrollArea className="h-[500px] rounded-md border p-4">
                <div className="space-y-4">
                  {messages.map(message => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {isStreaming && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">جاري المعالجة...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="اكتب استفسارك القانوني هنا... (مثال: اكتب إنذار قانوني للعميل أحمد محمد)"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[60px]"
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleSubmitQuery}
                  disabled={isProcessing || !inputQuery.trim()}
                  className="px-6"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setInputQuery('اكتب إنذار قانوني للعميل')}>
                  إنذار قانوني
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setInputQuery('تحليل مخاطر العميل')}>
                  تحليل المخاطر
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setInputQuery('إنهاء عقد')}>
                  إنهاء عقد
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setInputQuery('مطالبة مالية')}>
                  مطالبة مالية
                </Badge>
              </div>

              {!apiKey && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    يرجى إدخال مفتاح OpenAI API في تبويب الإعدادات لاستخدام المستشار القانوني
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <LegalDocumentGenerator
            companyId={companyId}
            country={selectedCountry}
            onDocumentGenerated={onDocumentGenerated}
          />
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk">
          <RiskAnalyzer
            companyId={companyId}
            onAnalysisComplete={onRiskAnalysis}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <APIKeySettings
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
