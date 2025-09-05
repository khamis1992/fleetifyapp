import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Car,
  FileText,
  Scale,
  BarChart3,
  Activity,
  Clock,
  Target,
  Zap,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Settings,
  Eye,
  ArrowRight,
  Plus,
  RefreshCw,
  Download,
  Share
} from 'lucide-react';
import { FloatingAIAssistant } from '@/components/ai/FloatingAIAssistant';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { AIAssistantConfig, AISuggestion } from '@/types/ai-assistant';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';

interface EnhancedAIDashboardProps {
  companyId: string;
}

interface DashboardMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

interface AIInsight {
  id: string;
  module: string;
  title: string;
  description: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'alert';
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  actionable: boolean;
  estimatedValue?: number;
  timeline?: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  module: string;
  action: () => void;
  enabled: boolean;
}

const dashboardMetrics: DashboardMetric[] = [
  {
    id: 'revenue',
    title: 'الإيرادات الشهرية',
    value: '125,000 ر.س',
    change: 12.5,
    trend: 'up',
    icon: DollarSign,
    color: 'text-green-600',
    description: 'إجمالي الإيرادات لهذا الشهر'
  },
  {
    id: 'customers',
    title: 'العملاء النشطين',
    value: 342,
    change: 8.3,
    trend: 'up',
    icon: Users,
    color: 'text-blue-600',
    description: 'عدد العملاء النشطين حالياً'
  },
  {
    id: 'fleet_utilization',
    title: 'معدل استخدام الأسطول',
    value: '78%',
    change: -2.1,
    trend: 'down',
    icon: Car,
    color: 'text-orange-600',
    description: 'متوسط استخدام المركبات'
  },
  {
    id: 'contracts',
    title: 'العقود الجديدة',
    value: 23,
    change: 15.2,
    trend: 'up',
    icon: FileText,
    color: 'text-purple-600',
    description: 'عقود جديدة هذا الأسبوع'
  }
];

export const EnhancedAIDashboard: React.FC<EnhancedAIDashboardProps> = ({
  companyId
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { user } = useUnifiedCompanyAccess();

  const aiConfig: AIAssistantConfig = {
    module: 'dashboard',
    primitives: ['data_analysis', 'ideation_strategy', 'automation', 'content_creation'],
    context: {
      companyId,
      metrics: dashboardMetrics,
      userId: user?.id
    },
    priority: 'high_value',
    enabledFeatures: []
  };

  const {
    executeTask,
    analyzeData,
    suggestActions,
    isLoading
  } = useAIAssistant(aiConfig);

  // تحليل البيانات وإنشاء الرؤى
  const generateInsights = async () => {
    setIsAnalyzing(true);
    try {
      const analysisResult = await analyzeData(
        dashboardMetrics,
        'تحليل أداء الشركة الشامل',
        [
          'ما هي أهم الفرص للنمو؟',
          'ما هي المخاطر التي يجب معالجتها؟',
          'كيف يمكن تحسين الكفاءة التشغيلية؟'
        ]
      );

      if (analysisResult) {
        const actionSuggestions = await suggestActions(
          'تحسين الأداء العام للشركة',
          ['زيادة الإيرادات', 'تقليل التكاليف', 'تحسين رضا العملاء'],
          ['الموارد المتاحة', 'الوقت المحدود']
        );

        const newInsights: AIInsight[] = [
          {
            id: 'insight_1',
            module: 'finance',
            title: 'فرصة زيادة الإيرادات',
            description: 'يمكن زيادة الإيرادات بنسبة 15% من خلال تحسين استراتيجية التسعير',
            type: 'opportunity',
            impact: 'high',
            confidence: 0.87,
            actionable: true,
            estimatedValue: 18750,
            timeline: '2-3 أشهر'
          },
          {
            id: 'insight_2',
            module: 'fleet',
            title: 'تحسين استخدام الأسطول',
            description: 'معدل استخدام الأسطول منخفض، يمكن تحسينه من خلال تحسين الجدولة',
            type: 'optimization',
            impact: 'medium',
            confidence: 0.82,
            actionable: true,
            timeline: '3-4 أسابيع'
          },
          {
            id: 'insight_3',
            module: 'customers',
            title: 'نمو قاعدة العملاء',
            description: 'نمو إيجابي في عدد العملاء الجدد، يجب الحفاظ على هذا الاتجاه',
            type: 'opportunity',
            impact: 'medium',
            confidence: 0.91,
            actionable: true,
            timeline: 'مستمر'
          },
          ...actionSuggestions.map((suggestion, index) => ({
            id: `ai_insight_${index}`,
            module: 'general',
            title: suggestion.title,
            description: suggestion.description,
            type: 'optimization' as const,
            impact: suggestion.confidence > 0.8 ? 'high' as const : 'medium' as const,
            confidence: suggestion.confidence,
            actionable: true,
            timeline: '2-4 أسابيع'
          }))
        ];

        setInsights(newInsights);
        toast.success('تم تحليل البيانات وإنشاء الرؤى بنجاح');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('حدث خطأ في تحليل البيانات');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // الإجراءات السريعة
  const quickActions: QuickAction[] = [
    {
      id: 'create_contract',
      title: 'إنشاء عقد جديد',
      description: 'إنشاء عقد إيجار بمساعدة الذكاء الاصطناعي',
      icon: FileText,
      module: 'contracts',
      action: () => toast.info('فتح معالج العقود الذكي...'),
      enabled: true
    },
    {
      id: 'analyze_fleet',
      title: 'تحليل الأسطول',
      description: 'تحليل أداء المركبات والحصول على توصيات',
      icon: Car,
      module: 'fleet',
      action: () => toast.info('فتح مساعد الأسطول الذكي...'),
      enabled: true
    },
    {
      id: 'legal_consultation',
      title: 'استشارة قانونية',
      description: 'الحصول على استشارة قانونية ذكية',
      icon: Scale,
      module: 'legal',
      action: () => toast.info('فتح المستشار القانوني...'),
      enabled: true
    },
    {
      id: 'generate_report',
      title: 'إنشاء تقرير',
      description: 'إنشاء تقرير مخصص بالذكاء الاصطناعي',
      icon: BarChart3,
      module: 'reports',
      action: () => toast.info('فتح مساعد التقارير...'),
      enabled: true
    }
  ];

  // تشغيل التحليل عند التحميل
  useEffect(() => {
    generateInsights();
  }, []);

  // مكون المقياس
  const MetricCard: React.FC<{ metric: DashboardMetric }> = ({ metric }) => {
    const Icon = metric.icon;
    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg bg-gray-100`}>
                <Icon className={`w-6 h-6 ${metric.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1 text-sm ${
                metric.trend === 'up' ? 'text-green-600' :
                metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {metric.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {metric.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                <span>{Math.abs(metric.change)}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">من الشهر الماضي</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // مكون الرؤية
  const InsightCard: React.FC<{ insight: AIInsight }> = ({ insight }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            insight.type === 'opportunity' ? 'bg-green-100 text-green-600' :
            insight.type === 'risk' ? 'bg-red-100 text-red-600' :
            insight.type === 'optimization' ? 'bg-blue-100 text-blue-600' :
            'bg-orange-100 text-orange-600'
          }`}>
            {insight.type === 'opportunity' && <TrendingUp className="w-4 h-4" />}
            {insight.type === 'risk' && <AlertTriangle className="w-4 h-4" />}
            {insight.type === 'optimization' && <Target className="w-4 h-4" />}
            {insight.type === 'alert' && <AlertTriangle className="w-4 h-4" />}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium text-sm">{insight.title}</h4>
              <Badge variant="outline" className="text-xs">{insight.module}</Badge>
              <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}>
                {insight.impact}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {Math.round(insight.confidence * 100)}% دقة
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {insight.estimatedValue && (
                <span>قيمة متوقعة: {insight.estimatedValue} ر.س</span>
              )}
              {insight.timeline && (
                <span>الإطار الزمني: {insight.timeline}</span>
              )}
            </div>
          </div>
          
          {insight.actionable && (
            <Button size="sm" variant="outline">
              <ArrowRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // مكون الإجراء السريع
  const QuickActionCard: React.FC<{ action: QuickAction }> = ({ action }) => {
    const Icon = action.icon;
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
        onClick={action.action}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-1">{action.title}</h4>
              <p className="text-xs text-gray-600">{action.description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* رأس لوحة التحكم الذكية */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 via-purple-50 to-green-50">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-600" />
            لوحة التحكم الذكية
            <Badge variant="secondary" className="mr-auto">
              <Sparkles className="w-3 h-3 ml-1" />
              مدعوم بالذكاء الاصطناعي المتقدم
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Button 
              onClick={generateInsights}
              disabled={isAnalyzing}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              تحليل ذكي شامل
            </Button>
            
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              تصدير التقرير
            </Button>
            
            <Button variant="outline" className="flex items-center gap-2">
              <Share className="w-4 h-4" />
              مشاركة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* التبويبات الرئيسية */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="insights">الرؤى الذكية</TabsTrigger>
          <TabsTrigger value="actions">الإجراءات السريعة</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات المتقدمة</TabsTrigger>
        </TabsList>

        {/* نظرة عامة */}
        <TabsContent value="overview" className="space-y-6">
          {/* المقاييس الرئيسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardMetrics.map(metric => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>

          {/* الرؤى السريعة */}
          {insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  أهم الرؤى
                  <Badge variant="outline">{insights.slice(0, 3).length} رؤية</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.slice(0, 3).map(insight => (
                    <div key={insight.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-lg ${
                        insight.type === 'opportunity' ? 'bg-green-100 text-green-600' :
                        insight.type === 'risk' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {insight.type === 'opportunity' && <TrendingUp className="w-4 h-4" />}
                        {insight.type === 'risk' && <AlertTriangle className="w-4 h-4" />}
                        {insight.type === 'optimization' && <Target className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <p className="text-xs text-gray-600">{insight.description}</p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab('insights')}>
                  عرض جميع الرؤى
                  <ArrowRight className="w-4 h-4 mr-2" />
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* الرؤى الذكية */}
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  الرؤى الذكية
                </span>
                <Badge variant="outline">{insights.length} رؤية</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {insights.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد رؤى متاحة حالياً</p>
                    <p className="text-sm">قم بتشغيل التحليل الذكي للحصول على رؤى مفيدة</p>
                  </div>
                ) : (
                  <div>
                    {insights.map(insight => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الإجراءات السريعة */}
        <TabsContent value="actions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                الإجراءات السريعة المدعومة بالذكاء الاصطناعي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map(action => (
                  <QuickActionCard key={action.id} action={action} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* إحصائيات الاستخدام */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                إحصائيات استخدام الذكاء الاصطناعي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">127</p>
                  <p className="text-sm text-gray-600">مهمة منجزة</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">89%</p>
                  <p className="text-sm text-gray-600">معدل النجاح</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">2.3s</p>
                  <p className="text-sm text-gray-600">متوسط وقت الاستجابة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* التحليلات المتقدمة */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">توزيع الرؤى حسب النوع</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">الفرص</span>
                    <div className="flex items-center gap-2">
                      <Progress value={60} className="w-20 h-2" />
                      <span className="text-sm font-medium">60%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">التحسينات</span>
                    <div className="flex items-center gap-2">
                      <Progress value={30} className="w-20 h-2" />
                      <span className="text-sm font-medium">30%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">المخاطر</span>
                    <div className="flex items-center gap-2">
                      <Progress value={10} className="w-20 h-2" />
                      <span className="text-sm font-medium">10%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الأداء حسب الوحدة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">العقود</span>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="w-20 h-2" />
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">الأسطول</span>
                    <div className="flex items-center gap-2">
                      <Progress value={78} className="w-20 h-2" />
                      <span className="text-sm font-medium">78%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">القانوني</span>
                    <div className="flex items-center gap-2">
                      <Progress value={92} className="w-20 h-2" />
                      <span className="text-sm font-medium">92%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">التقارير</span>
                    <div className="flex items-center gap-2">
                      <Progress value={88} className="w-20 h-2" />
                      <span className="text-sm font-medium">88%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* المساعد الذكي العائم */}
      <FloatingAIAssistant 
        config={aiConfig}
        defaultPosition={{ x: window.innerWidth - 420, y: 120 }}
      />
    </div>
  );
};
