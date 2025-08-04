import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { 
  Brain, 
  TrendingUp, 
  DollarSign, 
  Users, 
  FileText, 
  Truck, 
  AlertTriangle,
  Lightbulb,
  Target,
  Zap,
  RefreshCw,
  BarChart3,
  Send,
  Sparkles
} from 'lucide-react';
import { useEnhancedAI, EnhancedAIResponse, QuickStats } from '@/hooks/useEnhancedAI';
import { SmartAnalyticsPanel } from '@/components/analytics/SmartAnalyticsPanel';
import { SelfLearningAIPanel } from './SelfLearningAIPanel';
import { IntelligentInsightsPanel } from './IntelligentInsightsPanel';
import { ComprehensiveAIDashboard } from './ComprehensiveAIDashboard';
import { toast } from 'sonner';

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  response?: EnhancedAIResponse;
}

export const EnhancedAIPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  
  const {
    processQuery,
    getQuickStats,
    getFinancialOverview,
    getCustomerAnalysis,
    getContractPerformance,
    getOperationalInsights,
    getPredictiveAnalysis,
    getRiskAssessment,
    isProcessing,
    error,
    processingStatus,
    clearError
  } = useEnhancedAI();

  // Load quick stats on component mount
  useEffect(() => {
    loadQuickStats();
  }, []);

  const loadQuickStats = async () => {
    try {
      const stats = await getQuickStats();
      setQuickStats(stats);
    } catch (error) {
      console.error('Error loading quick stats:', error);
    }
  };

  const handleSendQuery = async () => {
    if (!inputQuery.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputQuery,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = inputQuery;
    setInputQuery('');

    try {
      const response = await processQuery({
        query: currentQuery,
        analysis_type: 'comprehensive'
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.analysis,
        type: 'ai',
        timestamp: new Date(),
        response
      };

      setMessages(prev => [...prev, aiMessage]);
      toast.success('تم تحليل الاستعلام بنجاح');
    } catch (error) {
      console.error('Error processing query:', error);
      toast.error('حدث خطأ في معالجة الاستعلام');
    }
  };

  const handleQuickAnalysis = async (analysisType: string) => {
    try {
      let response: EnhancedAIResponse;
      let analysisName = '';

      switch (analysisType) {
        case 'financial':
          response = await getFinancialOverview();
          analysisName = 'التحليل المالي';
          break;
        case 'customers':
          response = await getCustomerAnalysis();
          analysisName = 'تحليل العملاء';
          break;
        case 'contracts':
          response = await getContractPerformance();
          analysisName = 'أداء العقود';
          break;
        case 'operations':
          response = await getOperationalInsights();
          analysisName = 'العمليات التشغيلية';
          break;
        case 'predictive':
          response = await getPredictiveAnalysis();
          analysisName = 'التحليل التنبؤي';
          break;
        case 'risk':
          response = await getRiskAssessment();
          analysisName = 'تقييم المخاطر';
          break;
        default:
          return;
      }

      const aiMessage: Message = {
        id: Date.now().toString(),
        content: response.analysis,
        type: 'ai',
        timestamp: new Date(),
        response
      };

      setMessages([aiMessage]);
      setActiveTab('chat');
      toast.success(`تم إجراء ${analysisName} بنجاح`);
    } catch (error) {
      console.error('Error running quick analysis:', error);
      toast.error('حدث خطأ في التحليل');
    }
  };

  const renderQuickStats = () => {
    if (!quickStats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العقود</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.contracts.total}</div>
            <p className="text-xs text-muted-foreground">
              {quickStats.contracts.active} نشط | {quickStats.contracts.total_value.toFixed(3)} د.ك
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.customers.total}</div>
            <p className="text-xs text-muted-foreground">
              {quickStats.customers.active} نشط | {quickStats.customers.new_this_month} جديد
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الوضع المالي</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.financial.collection_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              معدل التحصيل | {quickStats.financial.outstanding.toFixed(3)} د.ك متأخر
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المركبات</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.vehicles.total}</div>
            <p className="text-xs text-muted-foreground">
              {quickStats.vehicles.available} متاحة | {quickStats.vehicles.in_use} مؤجرة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الموظفين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats.employees.total}</div>
            <p className="text-xs text-muted-foreground">
              {quickStats.employees.active} نشط | {quickStats.employees.present_today} حاضر اليوم
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التنبيهات</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {quickStats.customers.blacklisted}
            </div>
            <p className="text-xs text-muted-foreground">عميل محظور</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderQuickActions = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <Button
        variant="outline"
        onClick={() => handleQuickAnalysis('financial')}
        disabled={isProcessing}
        className="h-20 flex flex-col items-center justify-center space-y-2"
      >
        <DollarSign className="h-6 w-6" />
        <span>التحليل المالي</span>
      </Button>

      <Button
        variant="outline"
        onClick={() => handleQuickAnalysis('customers')}
        disabled={isProcessing}
        className="h-20 flex flex-col items-center justify-center space-y-2"
      >
        <Users className="h-6 w-6" />
        <span>تحليل العملاء</span>
      </Button>

      <Button
        variant="outline"
        onClick={() => handleQuickAnalysis('contracts')}
        disabled={isProcessing}
        className="h-20 flex flex-col items-center justify-center space-y-2"
      >
        <FileText className="h-6 w-6" />
        <span>أداء العقود</span>
      </Button>

      <Button
        variant="outline"
        onClick={() => handleQuickAnalysis('operations')}
        disabled={isProcessing}
        className="h-20 flex flex-col items-center justify-center space-y-2"
      >
        <Truck className="h-6 w-6" />
        <span>العمليات التشغيلية</span>
      </Button>

      <Button
        variant="outline"
        onClick={() => handleQuickAnalysis('predictive')}
        disabled={isProcessing}
        className="h-20 flex flex-col items-center justify-center space-y-2"
      >
        <TrendingUp className="h-6 w-6" />
        <span>التحليل التنبؤي</span>
      </Button>

      <Button
        variant="outline"
        onClick={() => handleQuickAnalysis('risk')}
        disabled={isProcessing}
        className="h-20 flex flex-col items-center justify-center space-y-2"
      >
        <AlertTriangle className="h-6 w-6" />
        <span>تقييم المخاطر</span>
      </Button>
    </div>
  );

  const renderVisualization = (viz: any, index: number) => {
    switch (viz.type) {
      case 'pie':
        return (
          <Card key={index} className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">{viz.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={viz.data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({name, value}) => `${name}: ${value}`}
                  >
                    {viz.data.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'line':
        return (
          <Card key={index} className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">{viz.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={viz.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="amount" stroke={CHART_COLORS[0]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'bar':
        return (
          <Card key={index} className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">{viz.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={viz.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const renderMessage = (message: Message) => (
    <div key={message.id} className={`mb-4 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
      <div className={`inline-block max-w-[80%] p-4 rounded-lg ${
        message.type === 'user' 
          ? 'bg-primary text-primary-foreground ml-auto' 
          : 'bg-muted'
      }`}>
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.type === 'ai' && (
          <div className="mt-2 text-xs opacity-70">
            {message.response && (
              <>
                <Badge variant="secondary" className="mr-2">
                  دقة: {(message.response.confidence * 100).toFixed(1)}%
                </Badge>
                <Badge variant="outline">
                  وقت المعالجة: {message.response.processing_time}ms
                </Badge>
              </>
            )}
          </div>
        )}
      </div>

      {/* Render insights and recommendations */}
      {message.response && message.response.data.insights.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              الرؤى المكتشفة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {message.response.data.insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Render recommendations */}
      {message.response && message.response.data.recommendations.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              التوصيات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {message.response.data.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Render visualizations */}
      {message.response && message.response.data.visualizations.length > 0 && (
        <div className="mt-4">
          {message.response.data.visualizations.map((viz, index) => renderVisualization(viz, index))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            المساعد الذكي المطور
            <Sparkles className="h-5 w-5 text-primary" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderQuickStats()}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
              <TabsTrigger value="analytics">التحليل الذكي</TabsTrigger>
              <TabsTrigger value="learning">التعلم الذاتي</TabsTrigger>
              <TabsTrigger value="insights">الرؤى الذكية</TabsTrigger>
              <TabsTrigger value="chat">المحادثة</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">التحليلات السريعة</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadQuickStats}
                  disabled={isProcessing}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  تحديث
                </Button>
              </div>
              {renderQuickActions()}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <SmartAnalyticsPanel />
            </TabsContent>

            <TabsContent value="learning" className="space-y-4">
              <SelfLearningAIPanel />
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <IntelligentInsightsPanel />
            </TabsContent>

            <TabsContent value="chat" className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {processingStatus && (
                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>{processingStatus}</AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-96 p-4 border rounded-lg">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>مرحباً! أنا المساعد الذكي المطور</p>
                    <p className="text-sm mt-2">يمكنني الوصول إلى جميع بيانات النظام وتقديم تحليلات شاملة</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map(renderMessage)}
                  </div>
                )}
              </ScrollArea>

              <div className="flex gap-2">
                <Textarea
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="اكتب استفسارك هنا... (مثال: أريد تحليل شامل لأداء الشركة هذا الشهر)"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendQuery();
                    }
                  }}
                />
                <Button
                  onClick={handleSendQuery}
                  disabled={isProcessing || !inputQuery.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};