import React, { useState, useRef, useEffect } from 'react';
import { FormattedResponse } from './FormattedResponse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { StatCardNumber } from '@/components/ui/NumberDisplay';
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
  Filter,
  MessageSquare,
  BookOpen,
  Gauge
} from 'lucide-react';
import { useUnifiedLegalAI, UnifiedLegalQuery, UnifiedLegalResponse } from '@/hooks/useUnifiedLegalAI';
import { useSelfLearningAI } from '@/hooks/useSelfLearningAI';
import { useEnhancedAI } from '@/hooks/useEnhancedAI';
import { ClarificationDialog } from '@/components/ai/ClarificationDialog';
import { LearningFeedbackDialog } from '@/components/ai/LearningFeedbackDialog';
import { UnpaidCustomerSearchInterface } from './UnpaidCustomerSearchInterface';
import { useUnpaidCustomerSearch } from '@/hooks/useUnpaidCustomerSearch';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'system' | 'insight' | 'analytics' | 'learning';
  timestamp: Date;
  metadata?: {
    classification?: any;
    processingType?: string;
    processingTime?: number;
    confidence?: number;
    adaptiveRecommendations?: string[];
    intent?: string;
    learningApplied?: boolean;
    analyticsData?: any;
    insightsData?: any;
    performanceMetrics?: any;
  };
  reactions?: {
    helpful?: boolean;
    accurate?: boolean;
    bookmarked?: boolean;
  };
  responseType?: 'text' | 'document' | 'analysis' | 'comparison' | 'chart' | 'interactive' | 'prediction' | 'dashboard';
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
  type: 'follow_up' | 'clarification' | 'related_topic' | 'analytics' | 'insights';
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

interface LocalQuickStats {
  totalContracts: number;
  activeCustomers: number;
  monthlyRevenue: number;
  totalVehicles: number;
  totalEmployees: number;
  recentPayments: number;
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

export const SmartLegalAssistant = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const [activeQueryType, setActiveQueryType] = useState<'auto' | 'consultation' | 'document_analysis' | 'document_generation' | 'contract_comparison' | 'predictive_analysis' | 'smart_recommendations'>('auto');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showUnpaidCustomersInterface, setShowUnpaidCustomersInterface] = useState(false);
  const [showClarificationDialog, setShowClarificationDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [clarificationSession, setClarificationSession] = useState<any>(null);
  const [lastQueryData, setLastQueryData] = useState<any>(null);
  const [quickStats, setQuickStats] = useState<LocalQuickStats | null>(null);
  const [learningPatterns, setLearningPatterns] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  
  const { user, loading: authLoading } = useAuth();
  const { submitUnifiedQuery, isProcessing: isLegalProcessing, error: legalError, processingStatus, clearError } = useUnifiedLegalAI();
  const { processQueryWithLearning, processClarificationResponse, submitLearningFeedback, isProcessing: isLearning, currentSession } = useSelfLearningAI();
  const { processQuery: processEnhancedQuery, getQuickStats, getFinancialOverview, getCustomerAnalysis, isProcessing: isAnalyzing, error: analyticsError } = useEnhancedAI();
  const { generateLegalNoticeData } = useUnpaidCustomerSearch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isProcessing = isLegalProcessing || isLearning || isAnalyzing;
  const error = legalError || analyticsError;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      if (legalError) clearError();
    }
  }, [error, legalError, clearError]);

  // Initialize with welcome message and load data
  useEffect(() => {
    const initializeAssistant = async () => {
      if (!user?.company?.id) return;

      // Welcome message with enhanced features
      const welcomeMessage: Message = {
        id: 'welcome',
        content: 'مرحباً بك في المساعد القانوني الذكي المتكامل! يمكنني مساعدتك في الاستشارات القانونية، تحليل البيانات، التعلم التكيفي، وتقديم رؤى ذكية.',
        type: 'system',
        timestamp: new Date(),
        metadata: {
          processingType: 'welcome',
          confidence: 1.0
        }
      };
      
      setMessages([welcomeMessage]);

      // Load quick stats for dashboard insights
      try {
        const stats = await getQuickStats();
        const localStats: LocalQuickStats = {
          totalContracts: stats.contracts.total,
          activeCustomers: stats.customers.active,
          monthlyRevenue: stats.contracts.monthly_revenue,
          totalVehicles: stats.vehicles.total,
          totalEmployees: stats.employees.total,
          recentPayments: stats.financial.total_collected
        };
        setQuickStats(localStats);
        
        // Add dashboard overview as system message
        const dashboardMessage: Message = {
          id: 'dashboard-overview',
          content: `نظرة عامة على شركتك: ${localStats.totalContracts} عقد، ${localStats.activeCustomers} عميل نشط، ${localStats.monthlyRevenue.toFixed(3)} د.ك إيرادات شهرية`,
          type: 'analytics',
          timestamp: new Date(),
          metadata: {
            analyticsData: localStats,
            processingType: 'dashboard_overview'
          },
          responseType: 'dashboard'
        };
        
        setMessages(prev => [...prev, dashboardMessage]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }

      // Initialize learning patterns (mock data for now)
      setLearningPatterns([
        { type: 'query_pattern', data: 'عقود الإيجار', success_rate: 95, usage: 150 },
        { type: 'document_analysis', data: 'تحليل الوثائق القانونية', success_rate: 88, usage: 87 },
        { type: 'customer_queries', data: 'استفسارات العملاء', success_rate: 92, usage: 120 }
      ]);

      // Initialize AI recommendations
      setAiRecommendations([
        {
          type: 'optimization',
          title: 'تحسين عملية مراجعة العقود',
          description: 'يمكن تقليل وقت مراجعة العقود بنسبة 40% باستخدام التحليل التلقائي',
          impact: 'high',
          confidence: 85
        },
        {
          type: 'automation',
          title: 'أتمتة إشعارات التحصيل',
          description: 'أتمتة إرسال إشعارات التحصيل للعملاء المتأخرين',
          impact: 'medium',
          confidence: 78
        }
      ]);
    };

    initializeAssistant();
  }, [user?.company?.id, getQuickStats]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && uploadedFiles.length === 0) return;

    if (!user?.company?.id) {
      toast.error('خطأ في الصلاحيات: لم يتم العثور على معلومات الشركة');
      return;
    }

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
      // Determine if this is an analytics query
      const isAnalyticsQuery = /تحليل|إحصائي|بيانات|تقرير|أداء|مالي/.test(currentInput);
      
      if (isAnalyticsQuery) {
        // Handle analytics queries
        const analysisResponse = await processEnhancedQuery({
          query: currentInput,
          analysis_type: 'comprehensive',
          context: {
            conversationHistory: messages,
            company_id: user.company.id
          }
        });

        const analyticsMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: analysisResponse.analysis || 'تم إجراء التحليل بنجاح',
          type: 'analytics',
          timestamp: new Date(),
          metadata: {
            analyticsData: analysisResponse.data,
            confidence: analysisResponse.confidence,
            processingTime: analysisResponse.processing_time
          },
          responseType: 'analysis',
          analysisData: {
            insights: analysisResponse.data?.insights || [],
            recommendations: analysisResponse.data?.recommendations || [],
            charts: analysisResponse.data?.visualizations || []
          }
        };

        setMessages(prev => [...prev, analyticsMessage]);
        generateSmartSuggestions(analysisResponse, messages);
        return;
      }

      // Try self-learning AI first
      const learningQueryData = {
        query: currentInput,
        company_id: user.company.id,
        user_id: user.id,
        context: {
          conversationHistory: messages,
          queryType: activeQueryType,
          attachedFiles: currentFiles.map(f => f.name)
        }
      };

      setLastQueryData(learningQueryData);
      const learningResponse = await processQueryWithLearning(learningQueryData);

      // Check if clarification is needed
      if (learningResponse.requires_clarification && learningResponse.clarification_questions?.length > 0) {
        setClarificationSession({
          id: learningResponse.session_id || 'temp-session',
          original_query: currentInput,
          clarification_questions: learningResponse.clarification_questions,
          company_id: user.company.id,
          session_status: 'active' as const,
          created_at: new Date().toISOString()
        });
        setShowClarificationDialog(true);
        
        const clarificationMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: 'أحتاج إلى بعض التوضيحات لتقديم إجابة أكثر دقة. يرجى الإجابة على الأسئلة التالية:',
          type: 'learning',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, clarificationMessage]);
        return;
      }

      // If we have a direct response from learning AI, use it
      if (learningResponse.response) {
        const learningMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: learningResponse.response,
          type: 'learning',
          timestamp: new Date(),
          metadata: {
            confidence: learningResponse.confidence,
            intent: learningResponse.intent_classification,
            learningApplied: learningResponse.learning_applied,
            adaptiveRecommendations: learningResponse.adaptive_recommendations
          }
        };

        setMessages(prev => [...prev, learningMessage]);
        generateSmartSuggestions(learningResponse, messages);
        return;
      }

      // Fallback to unified legal AI
      const queryData: UnifiedLegalQuery = {
        query: currentInput,
        country: 'Kuwait',
        company_id: user.company.id,
        user_id: user.id,
        conversationHistory: messages,
        queryType: activeQueryType === 'auto' ? undefined : activeQueryType,
        files: currentFiles.map(f => f.file),
        comparisonDocuments: activeQueryType === 'contract_comparison' ? currentFiles : undefined,
        context: { attachedFiles: currentFiles.map(f => f.name) }
      };

      const response: UnifiedLegalResponse = await submitUnifiedQuery(queryData);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.content || 'لم يتم العثور على إجابة مناسبة',
        type: 'ai',
        timestamp: new Date(),
        metadata: {
          classification: response.classification || 'general',
          processingType: response.processingType || 'unified',
          processingTime: response.processingTime || 100,
          confidence: response.confidence || 95,
          adaptiveRecommendations: response.metadata?.adaptiveRecommendations || []
        },
        responseType: 'text' as any,
        attachments: response.attachments || [],
        interactiveElements: response.interactiveElements || [],
        analysisData: response.analysisData || {}
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

  const generateSmartSuggestions = (response: any, history: Message[]) => {
    const suggestions: SmartSuggestion[] = [];
    
    // Learning AI suggestions
    if (response.adaptive_recommendations) {
      response.adaptive_recommendations.forEach((suggestion: string) => {
        suggestions.push({
          text: suggestion,
          type: 'follow_up',
          confidence: 0.8
        });
      });
    }
    
    // Analytics suggestions
    if (response.analysis || response.data) {
      suggestions.push({
        text: 'أظهر لي المزيد من التحليلات التفصيلية',
        type: 'analytics',
        confidence: 0.9
      });
    }

    // Insights suggestions
    if (response.insights?.length > 0) {
      suggestions.push({
        text: 'كيف يمكنني تطبيق هذه الرؤى عملياً؟',
        type: 'insights',
        confidence: 0.85
      });
    }
    
    // Interactive suggestions
    if (response.responseType === 'interactive') {
      suggestions.push({
        text: 'هل تحتاج إلى مساعدة في استخدام هذه الأدوات؟',
        type: 'follow_up',
        confidence: 0.8
      });
    }
    
    const confidence = response.classification?.confidence || response.confidence || 0;
    if (confidence < 0.7) {
      suggestions.push({
        text: 'هل يمكنك توضيح المزيد من التفاصيل؟',
        type: 'clarification',
        confidence: 0.9
      });
    }
    
    setSmartSuggestions(suggestions);
  };

  const handleClarificationSubmit = async (responses: Record<string, string>) => {
    try {
      if (!clarificationSession?.id || !lastQueryData) return;

      const result = await processClarificationResponse(clarificationSession.id, responses);
      
      const aiMessage: Message = {
        id: Date.now().toString(),
        content: result.response || 'شكراً لك على التوضيحات. تم تحديث فهمي للموضوع.',
        type: 'learning',
        timestamp: new Date(),
        metadata: {
          confidence: result.confidence || 0.8,
          intent: result.query_intent || 'updated',
          learningApplied: true
        }
      };

      setMessages(prev => [...prev, aiMessage]);
      setShowClarificationDialog(false);
      setClarificationSession(null);
      
      setTimeout(() => setShowFeedbackDialog(true), 1000);
      
    } catch (error) {
      console.error('Error processing clarification:', error);
      toast.error('حدث خطأ في معالجة التوضيحات');
    }
  };

  const handleFeedbackSubmit = async (feedbackData: any) => {
    try {
      await submitLearningFeedback({
        feedback_type: feedbackData.feedbackType,
        feedback_rating: feedbackData.rating,
        feedback_comments: feedbackData.comments,
        improvement_suggestions: feedbackData.suggestions
      });
      
      toast.success('شكراً لك على تقييمك! سيساعدني هذا في التحسن.');
      setShowFeedbackDialog(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('حدث خطأ في إرسال التقييم');
    }
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

  const handleQuickAnalysis = async (type: string) => {
    try {
      let response;
      switch (type) {
        case 'financial':
          response = await getFinancialOverview();
          break;
        case 'customer':
          response = await getCustomerAnalysis();
          break;
        default:
          return;
      }

      const analysisMessage: Message = {
        id: Date.now().toString(),
        content: response.analysis || `تم إجراء تحليل ${type} بنجاح`,
        type: 'analytics',
        timestamp: new Date(),
        metadata: {
          analyticsData: response.data,
          confidence: response.confidence
        },
        responseType: 'analysis',
        analysisData: {
          insights: response.insights || [],
          recommendations: response.recommendations || []
        }
      };

      setMessages(prev => [...prev, analysisMessage]);
    } catch (error) {
      console.error('Error in quick analysis:', error);
      toast.error('حدث خطأ في التحليل السريع');
    }
  };

  const renderQuickStats = () => {
    if (!quickStats) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي العقود</p>
                <StatCardNumber value={quickStats.totalContracts} />
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">العملاء النشطون</p>
                <StatCardNumber value={quickStats.activeCustomers} />
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الإيرادات الشهرية</p>
                <StatCardNumber value={`${quickStats.monthlyRevenue.toFixed(1)}K`} />
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMessageContent = (message: Message) => {
    if (message.type === 'user') {
      return <div className="whitespace-pre-wrap">{message.content}</div>;
    }

    return (
      <div className="space-y-4">
        <FormattedResponse content={message.content} className="text-sm leading-relaxed" />
        
        {message.analysisData?.charts && (
          <div className="space-y-4">
            {message.analysisData.charts.map((chart, index) => (
              <div key={index} className="bg-background rounded-lg p-4 border">
                <h4 className="font-semibold mb-2">تحليل بياني</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[chart]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill={CHART_COLORS[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}

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
      </div>
    );
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-primary text-primary-foreground';
      case 'ai': return 'bg-muted';
      case 'analytics': return 'bg-blue-50 border-blue-200';
      case 'learning': return 'bg-green-50 border-green-200';
      case 'insight': return 'bg-purple-50 border-purple-200';
      default: return 'bg-yellow-50 border-yellow-200';
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">جاري تحميل المساعد القانوني المتكامل...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.company?.id) {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert className="max-w-md">
          <AlertDescription>
            عذراً، لا يمكن الوصول إلى المساعد القانوني. يرجى التأكد من تسجيل الدخول وتحديد الشركة.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">

        <TabsContent value="chat" className="flex-1 flex flex-col mt-4">
          {/* Query Type Selector */}
          <Card className="mb-4">
            <CardContent className="p-4 text-right" dir="rtl">
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
                    <Brain className="h-4 w-4" />
                    {type === 'auto' ? 'تلقائي' : 
                     type === 'consultation' ? 'استشارة' :
                     type === 'document_analysis' ? 'تحليل وثائق' :
                     type === 'document_generation' ? 'إنشاء وثائق' :
                     type === 'contract_comparison' ? 'مقارنة عقود' :
                     type === 'predictive_analysis' ? 'تحليل تنبؤي' :
                     'توصيات ذكية'}
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
                        يمكنني مساعدتك في الاستشارات القانونية، تحليل البيانات، التعلم التكيفي، وتقديم رؤى ذكية
                      </p>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] ${getMessageTypeColor(message.type)} rounded-lg p-4`}>
                        {renderMessageContent(message)}
                        
                        {message.type !== 'user' && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                            <Button size="sm" variant="ghost">
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setShowFeedbackDialog(true)}
                              title="تقييم الإجابة"
                            >
                              <Brain className="h-4 w-4" />
                            </Button>
                            {message.metadata?.learningApplied && (
                              <Badge variant="secondary" className="text-xs">
                                تطبيق التعلم
                              </Badge>
                            )}
                            {message.metadata?.confidence && (
                              <Badge variant="outline" className="text-xs">
                                ثقة: {Math.round(message.metadata.confidence * 100)}%
                              </Badge>
                            )}
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
                    اقتراحات ذكية
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
                        <span className="text-sm">{file.name}</span>
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
                      onClick={handleSendMessage}
                      disabled={(!inputMessage.trim() && uploadedFiles.length === 0) || isProcessing}
                      size="sm"
                      title="إرسال"
                    >
                      {isProcessing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="flex-1 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>لوحة التحكم الذكية</CardTitle>
            </CardHeader>
            <CardContent>
              {renderQuickStats()}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={() => handleQuickAnalysis('financial')} className="h-20">
                  <div className="text-center">
                    <TrendingUp className="h-6 w-6 mx-auto mb-1" />
                    <span>تحليل مالي سريع</span>
                  </div>
                </Button>
                <Button onClick={() => handleQuickAnalysis('customer')} className="h-20">
                  <div className="text-center">
                    <Activity className="h-6 w-6 mx-auto mb-1" />
                    <span>تحليل العملاء</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="flex-1 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>التحليلات المتقدمة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription>
                    استخدم المحادثة لطلب تحليلات مخصصة، أو انقر على التحليلات السريعة أعلاه
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="flex-1 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>التعلم الذكي والتكيفي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">أنماط التعلم المكتشفة</h4>
                  <div className="space-y-2">
                    {learningPatterns.map((pattern, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                        <span className="text-sm">{pattern.data}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{pattern.success_rate}% نجاح</Badge>
                          <Badge variant="outline">{pattern.usage} استخدام</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">توصيات الذكاء الاصطناعي</h4>
                  <div className="space-y-2">
                    {aiRecommendations.map((rec, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium">{rec.title}</h5>
                          <Badge variant={rec.impact === 'high' ? 'default' : 'secondary'}>
                            {rec.impact === 'high' ? 'تأثير عالي' : 'تأثير متوسط'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">ثقة: {rec.confidence}%</span>
                          <Progress value={rec.confidence} className="flex-1 max-w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showClarificationDialog && clarificationSession && (
        <ClarificationDialog
          isOpen={showClarificationDialog}
          onClose={() => setShowClarificationDialog(false)}
          session={clarificationSession}
          onSubmitResponses={handleClarificationSubmit}
          isProcessing={isLearning}
        />
      )}

      {showFeedbackDialog && (
        <LearningFeedbackDialog
          isOpen={showFeedbackDialog}
          onClose={() => setShowFeedbackDialog(false)}
          onSubmitFeedback={handleFeedbackSubmit}
          queryData={lastQueryData}
          isSubmitting={false}
        />
      )}
    </div>
  );
};
