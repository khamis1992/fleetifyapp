import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Brain, 
  BarChart3,
  Users,
  DollarSign,
  Zap,
  Shield,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Activity,
  Lightbulb
} from 'lucide-react';
import { useSmartAnalytics, SmartAnalysisResult, BehaviorAnalysis, RiskIndicator, PredictiveInsight } from '@/hooks/useSmartAnalytics';
import { toast } from 'sonner';

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

const RISK_COLORS = {
  low: '#10b981',
  medium: '#f59e0b', 
  high: '#ef4444',
  critical: '#dc2626'
};

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon: React.ReactNode;
  color?: string;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ 
  title, 
  value, 
  trend, 
  trendValue, 
  icon, 
  color = 'text-primary' 
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className={color}>{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {trend && trendValue && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
          {trend === 'stable' && <Activity className="h-3 w-3 text-blue-500" />}
          {trendValue}
        </p>
      )}
    </CardContent>
  </Card>
);

export const SmartAnalyticsPanel: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<SmartAnalysisResult | null>(null);
  const [behaviorAnalysis, setBehaviorAnalysis] = useState<BehaviorAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'30d' | '90d' | '6m' | '1y'>('90d');
  
  const {
    performSmartAnalysis,
    analyzeBehaviorPatterns,
    monitorRisks,
    getBenchmarks,
    forecastTrends,
    isAnalyzing,
    error,
    clearError
  } = useSmartAnalytics();

  useEffect(() => {
    loadInitialAnalysis();
  }, [selectedTimePeriod]);

  const loadInitialAnalysis = async () => {
    try {
      const [analysis, behavior] = await Promise.all([
        performSmartAnalysis('comprehensive', selectedTimePeriod, true),
        analyzeBehaviorPatterns()
      ]);
      
      setAnalysisResult(analysis);
      setBehaviorAnalysis(behavior);
      toast.success('تم تحديث التحليل الذكي بنجاح');
    } catch (error) {
      console.error('Error loading analysis:', error);
      toast.error('حدث خطأ في تحميل التحليل');
    }
  };

  const handleRefreshAnalysis = async () => {
    await loadInitialAnalysis();
  };

  const renderPerformanceScore = () => {
    if (!analysisResult) return null;

    const score = analysisResult.performance_score;
    const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-yellow-600';
      return 'text-red-600';
    };

    const getScoreLabel = (score: number) => {
      if (score >= 80) return 'ممتاز';
      if (score >= 60) return 'جيد';
      if (score >= 40) return 'متوسط';
      return 'يحتاج تحسين';
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            نقاط الأداء العام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              {getScoreLabel(score)}
            </div>
            <Progress value={score} className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRiskMatrix = () => {
    if (!analysisResult?.risks.length) return null;

    const riskData = analysisResult.risks.map(risk => ({
      name: risk.description.substring(0, 30) + '...',
      probability: risk.probability * 100,
      impact: risk.impact * 100,
      severity: risk.severity
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            مصفوفة المخاطر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  `${value}%`, 
                  name === 'probability' ? 'الاحتمالية' : 'التأثير'
                ]}
              />
              <Bar dataKey="probability" fill={CHART_COLORS[0]} name="probability" />
              <Bar dataKey="impact" fill={CHART_COLORS[1]} name="impact" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderPredictions = () => {
    if (!analysisResult?.predictions.length) return null;

    const predictionData = analysisResult.predictions.map(pred => ({
      metric: pred.metric === 'monthly_revenue' ? 'الإيرادات الشهرية' : pred.metric,
      current: pred.current_value,
      predicted: pred.predicted_value,
      confidence: pred.confidence * 100,
      change: ((pred.predicted_value - pred.current_value) / pred.current_value * 100).toFixed(1)
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            التوقعات المستقبلية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {predictionData.map((pred, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold">{pred.metric}</h4>
                  <p className="text-sm text-muted-foreground">
                    من {pred.current.toFixed(3)} إلى {pred.predicted.toFixed(3)}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    parseFloat(pred.change) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {parseFloat(pred.change) > 0 ? '+' : ''}{pred.change}%
                  </div>
                  <Badge variant="secondary">دقة: {pred.confidence.toFixed(0)}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBehaviorInsights = () => {
    if (!behaviorAnalysis) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              سلوك العملاء
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">طريقة الدفع المفضلة</h4>
                <p className="text-sm text-muted-foreground">
                  {behaviorAnalysis.customer_patterns.payment_behavior}
                </p>
              </div>
              <div>
                <h4 className="font-semibold">معدل تجديد العقود</h4>
                <p className="text-sm text-muted-foreground">
                  {behaviorAnalysis.customer_patterns.contract_renewal_rate.toFixed(1)}%
                </p>
              </div>
              <div>
                <h4 className="font-semibold">متوسط مدة العقد</h4>
                <p className="text-sm text-muted-foreground">
                  {behaviorAnalysis.customer_patterns.average_contract_duration} يوم
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              الأنماط التشغيلية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">استخدام المركبات</h4>
                <Progress 
                  value={behaviorAnalysis.operational_patterns.vehicle_utilization} 
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {behaviorAnalysis.operational_patterns.vehicle_utilization.toFixed(1)}%
                </p>
              </div>
              <div>
                <h4 className="font-semibold">تكرار الصيانة</h4>
                <p className="text-sm text-muted-foreground">
                  {behaviorAnalysis.operational_patterns.maintenance_frequency}
                </p>
              </div>
              <div>
                <h4 className="font-semibold">إنتاجية الموظفين</h4>
                <Progress 
                  value={behaviorAnalysis.operational_patterns.employee_productivity} 
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {behaviorAnalysis.operational_patterns.employee_productivity}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderInsightsAndRecommendations = () => {
    if (!analysisResult) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              الرؤى الرئيسية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisResult.key_insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              التوصيات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisResult.recommendations.slice(0, 5).map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6" />
              محرك التحليل الذكي
            </CardTitle>
            <div className="flex items-center gap-2">
              <select 
                value={selectedTimePeriod}
                onChange={(e) => setSelectedTimePeriod(e.target.value as any)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="30d">30 يوم</option>
                <option value="90d">90 يوم</option>
                <option value="6m">6 أشهر</option>
                <option value="1y">سنة واحدة</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAnalysis}
                disabled={isAnalyzing}
              >
                <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isAnalyzing ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
              <p>جاري إجراء التحليل الذكي...</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="risks">المخاطر</TabsTrigger>
                <TabsTrigger value="predictions">التوقعات</TabsTrigger>
                <TabsTrigger value="behavior">السلوك</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {analysisResult && (
                    <>
                      <AnalyticsCard
                        title="نقاط الأداء"
                        value={analysisResult.performance_score}
                        icon={<Target className="h-4 w-4" />}
                        trend={analysisResult.performance_score > 70 ? 'up' : 'down'}
                        trendValue={`${analysisResult.performance_score > 70 ? 'ممتاز' : 'يحتاج تحسين'}`}
                      />
                      <AnalyticsCard
                        title="المخاطر المكتشفة"
                        value={analysisResult.risks.length}
                        icon={<AlertTriangle className="h-4 w-4" />}
                        color="text-orange-500"
                        trend={analysisResult.risks.length > 0 ? 'down' : 'stable'}
                        trendValue={`${analysisResult.risks.filter(r => r.severity === 'critical').length} حرج`}
                      />
                      <AnalyticsCard
                        title="التوقعات"
                        value={analysisResult.predictions.length}
                        icon={<TrendingUp className="h-4 w-4" />}
                        color="text-blue-500"
                        trend="stable"
                        trendValue="متاح"
                      />
                      <AnalyticsCard
                        title="الرؤى"
                        value={analysisResult.key_insights.length}
                        icon={<Lightbulb className="h-4 w-4" />}
                        color="text-purple-500"
                        trend="up"
                        trendValue="محدثة"
                      />
                    </>
                  )}
                </div>

                {renderPerformanceScore()}
                {renderInsightsAndRecommendations()}
              </TabsContent>

              <TabsContent value="risks" className="space-y-6">
                {renderRiskMatrix()}
                
                {analysisResult?.risks && (
                  <Card>
                    <CardHeader>
                      <CardTitle>تفاصيل المخاطر</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analysisResult.risks.map((risk, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{risk.description}</h4>
                              <Badge 
                                variant="outline" 
                                style={{ 
                                  color: RISK_COLORS[risk.severity],
                                  borderColor: RISK_COLORS[risk.severity]
                                }}
                              >
                                {risk.severity === 'critical' ? 'حرج' :
                                 risk.severity === 'high' ? 'عالي' :
                                 risk.severity === 'medium' ? 'متوسط' : 'منخفض'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <span className="text-sm text-muted-foreground">الاحتمالية: </span>
                                <span className="font-medium">{(risk.probability * 100).toFixed(0)}%</span>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">التأثير: </span>
                                <span className="font-medium">{(risk.impact * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                            <div className="text-sm">
                              <p className="font-medium mb-1">الإجراءات المقترحة:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {risk.recommended_actions.map((action, actionIndex) => (
                                  <li key={actionIndex} className="text-muted-foreground">{action}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="predictions" className="space-y-6">
                {renderPredictions()}
              </TabsContent>

              <TabsContent value="behavior" className="space-y-6">
                {renderBehaviorInsights()}
                
                {behaviorAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle>الاتجاهات الموسمية</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-2">أشهر الذروة</h4>
                          <div className="flex flex-wrap gap-2">
                            {behaviorAnalysis.seasonal_trends.peak_months.map((month, index) => (
                              <Badge key={index} variant="default">{month}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">أشهر الانخفاض</h4>
                          <div className="flex flex-wrap gap-2">
                            {behaviorAnalysis.seasonal_trends.low_months.map((month, index) => (
                              <Badge key={index} variant="secondary">{month}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">نمط النمو</h4>
                        <p className="text-sm text-muted-foreground">
                          {behaviorAnalysis.seasonal_trends.growth_pattern}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};