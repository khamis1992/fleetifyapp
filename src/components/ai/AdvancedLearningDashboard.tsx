import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Zap, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  BarChart,
  Activity,
  Clock,
  Award
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StatCardNumber, StatCardPercentage } from '@/components/ui/NumberDisplay';

interface PerformanceData {
  overallScore: number;
  improvementAreas: string[];
  adaptiveStrategies: any;
  recommendations: string[];
  lastEvaluation: string;
  trends: {
    week: number;
    month: number;
    improvement: number;
  };
}

export const AdvancedLearningDashboard: React.FC = () => {
  const [performanceData, setPerformanceData] = React.useState<PerformanceData | null>(null);
  const [isEvaluating, setIsEvaluating] = React.useState(false);
  const [realTimeMetrics, setRealTimeMetrics] = React.useState<any>(null);
  const [learningInsights, setLearningInsights] = React.useState<any[]>([]);

  React.useEffect(() => {
    loadDashboardData();
    startRealTimeMonitoring();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get user company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) return;

      // Load performance metrics
      const { data: metrics } = await supabase
        .from('ai_performance_metrics')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('metric_date', { ascending: false })
        .limit(30);

      // Load learning patterns
      const { data: patterns } = await supabase
        .from('ai_learning_patterns')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('success_rate', { ascending: false })
        .limit(10);

      // Load recent feedback
      const { data: feedback } = await supabase
        .from('ai_learning_feedback')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(50);

      setPerformanceData({
        overallScore: calculateOverallScore(metrics || []),
        improvementAreas: extractImprovementAreas(feedback || []),
        adaptiveStrategies: extractStrategies(patterns || []),
        recommendations: generateRecommendations(metrics || [], patterns || []),
        lastEvaluation: metrics?.[0]?.created_at || new Date().toISOString(),
        trends: calculateTrends(metrics || [])
      });

      setLearningInsights(patterns || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('فشل في تحميل بيانات اللوحة');
    }
  };

  const startRealTimeMonitoring = () => {
    setInterval(async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (!profile?.company_id) return;

        // Get today's metrics
        const today = new Date().toISOString().split('T')[0];
        const { data: todayMetrics } = await supabase
          .from('ai_performance_metrics')
          .select('*')
          .eq('company_id', profile.company_id)
          .eq('metric_date', today)
          .single();

        setRealTimeMetrics(todayMetrics);

      } catch (error) {
        console.error('Real-time monitoring error:', error);
      }
    }, 30000); // Update every 30 seconds
  };

  const triggerSelfEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) return;

      const { data: response, error } = await supabase.functions.invoke('ai-self-evaluation', {
        body: {
          companyId: profile.company_id,
          evaluationType: 'comprehensive',
          timeRange: 'week'
        }
      });

      if (error) throw error;

      toast.success('🧠 تم تقييم الأداء وتحديث الاستراتيجيات!');
      await loadDashboardData();

    } catch (error) {
      console.error('Self-evaluation error:', error);
      toast.error('فشل في التقييم الذاتي');
    } finally {
      setIsEvaluating(false);
    }
  };

  const calculateOverallScore = (metrics: any[]): number => {
    if (!metrics.length) return 0;
    const avgSatisfaction = metrics.reduce((sum, m) => sum + (m.user_satisfaction_avg || 0), 0) / metrics.length;
    return Math.round(avgSatisfaction * 20); // Convert to 0-100 scale
  };

  const extractImprovementAreas = (feedback: any[]): string[] => {
    const negative = feedback.filter(f => f.feedback_type === 'negative' || f.feedback_rating < 3);
    return negative.length > 0 ? ['تحسين دقة الردود', 'تطوير أسئلة التوضيح'] : ['الحفاظ على الأداء الممتاز'];
  };

  const extractStrategies = (patterns: any[]) => {
    return {
      activePatterns: patterns.length,
      topPattern: patterns[0]?.pattern_type || 'لا يوجد',
      avgSuccessRate: patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.success_rate, 0) / patterns.length : 0
    };
  };

  const generateRecommendations = (metrics: any[], patterns: any[]): string[] => {
    return [
      '🎯 ركز على تحسين دقة التصنيف',
      '📚 طور أنماط تعلم جديدة',
      '💬 حسن جودة أسئلة الاستيضاح',
      '🔄 راجع الأنماط القديمة',
      '📊 اجمع المزيد من التغذية الراجعة'
    ];
  };

  const calculateTrends = (metrics: any[]) => {
    if (metrics.length < 2) return { week: 0, month: 0, improvement: 0 };
    
    const thisWeek = metrics.slice(0, 7).reduce((sum, m) => sum + (m.user_satisfaction_avg || 0), 0) / 7;
    const lastWeek = metrics.slice(7, 14).reduce((sum, m) => sum + (m.user_satisfaction_avg || 0), 0) / 7;
    
    return {
      week: Math.round((thisWeek - lastWeek) * 100),
      month: Math.round(thisWeek * 20),
      improvement: thisWeek > lastWeek ? 1 : -1
    };
  };

  if (!performanceData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>جاري تحميل لوحة التعلم المتقدمة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            لوحة التعلم المتقدمة
          </h1>
          <p className="text-muted-foreground mt-2">
            مراقبة وتحسين أداء الذكاء الاصطناعي التعلمي في الوقت الفعلي
          </p>
        </div>
        
        <Button 
          onClick={triggerSelfEvaluation}
          disabled={isEvaluating}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600"
        >
          {isEvaluating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              جاري التقييم...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              تقييم ذاتي شامل
            </>
          )}
        </Button>
      </div>

      {/* Real-time Status */}
      {realTimeMetrics && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <Activity className="h-5 w-5 text-green-600 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-green-800">نشاط مباشر اليوم</p>
                <p className="text-xs text-green-600">
                  {realTimeMetrics.total_queries || 0} استعلام | 
                  {realTimeMetrics.successful_classifications || 0} نجح | 
                  {realTimeMetrics.clarification_requests || 0} توضيح
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">النتيجة الإجمالية</p>
                <StatCardPercentage value={performanceData.overallScore} className="text-3xl text-primary" />
              </div>
              <Award className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="mt-4">
              <Progress value={performanceData.overallScore} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الاتجاه الأسبوعي</p>
                <div className={`text-2xl font-bold ${performanceData.trends.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {performanceData.trends.improvement > 0 ? '+' : ''}
                  <StatCardPercentage value={performanceData.trends.week} className="inline" />
                </div>
              </div>
              <TrendingUp className={`h-8 w-8 ${performanceData.trends.improvement > 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <Badge variant={performanceData.trends.improvement > 0 ? "default" : "secondary"} className="mt-2">
              {performanceData.trends.improvement > 0 ? 'تحسن' : 'يحتاج عمل'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">الأنماط النشطة</p>
                <StatCardNumber value={performanceData.adaptiveStrategies.activePatterns} />
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              معدل النجاح: {Math.round(performanceData.adaptiveStrategies.avgSuccessRate * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">آخر تقييم</p>
                <p className="text-sm font-bold">{new Date(performanceData.lastEvaluation).toLocaleDateString('ar')}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
            <Badge variant="outline" className="mt-2">منذ {Math.round((Date.now() - new Date(performanceData.lastEvaluation).getTime()) / (1000 * 60 * 60 * 24))} أيام</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">الرؤى الذكية</TabsTrigger>
          <TabsTrigger value="patterns">أنماط التعلم</TabsTrigger>
          <TabsTrigger value="improvements">مجالات التحسين</TabsTrigger>
          <TabsTrigger value="recommendations">التوصيات</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  أداء التعلم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {learningInsights.slice(0, 5).map((insight, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{insight.pattern_type}</p>
                        <p className="text-sm text-muted-foreground">
                          استخدم {insight.usage_count} مرة
                        </p>
                      </div>
                      <Badge variant={insight.success_rate > 0.8 ? "default" : "secondary"}>
                        {Math.round(insight.success_rate * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  الأداء السريع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">دقة التصنيف</span>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="w-20 h-2" />
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">فعالية الاستيضاح</span>
                    <div className="flex items-center gap-2">
                      <Progress value={92} className="w-20 h-2" />
                      <span className="text-sm font-medium">92%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">رضا المستخدمين</span>
                    <div className="flex items-center gap-2">
                      <Progress value={performanceData.overallScore} className="w-20 h-2" />
                      <span className="text-sm font-medium">{performanceData.overallScore}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>أنماط التعلم النشطة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {learningInsights.map((pattern, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{pattern.pattern_type}</h4>
                      <Badge variant={pattern.is_active ? "default" : "secondary"}>
                        {pattern.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>معدل النجاح: {Math.round(pattern.success_rate * 100)}%</p>
                      <p>مرات الاستخدام: {pattern.usage_count}</p>
                      <p>آخر استخدام: {pattern.last_used_at ? new Date(pattern.last_used_at).toLocaleDateString('ar') : 'لم يستخدم'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="improvements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                مجالات التحسين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData.improvementAreas.map((area, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">{area}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                التوصيات الذكية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <span className="text-blue-800">{recommendation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};