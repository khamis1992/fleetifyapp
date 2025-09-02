import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Users,
  Car,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { useAdvancedAI } from '@/hooks/useAdvancedAI';

interface AIVisualAnalyticsProps {
  contractsData?: any[];
  customersData?: any[];
  vehiclesData?: any[];
  onInsightClick?: (insight: any) => void;
}

export const AIVisualAnalytics: React.FC<AIVisualAnalyticsProps> = ({
  contractsData = [],
  customersData = [],
  vehiclesData = [],
  onInsightClick
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { isProcessing, analyzeSentiment, predictRisks } = useAdvancedAI();

  // بيانات نموذجية للعرض (في الإنتاج ستأتي من قاعدة البيانات)
  const performanceData = [
    { month: 'يناير', contracts: 45, revenue: 125000, satisfaction: 8.2 },
    { month: 'فبراير', contracts: 52, revenue: 142000, satisfaction: 8.5 },
    { month: 'مارس', contracts: 48, revenue: 138000, satisfaction: 8.1 },
    { month: 'أبريل', contracts: 61, revenue: 165000, satisfaction: 8.7 },
    { month: 'مايو', contracts: 58, revenue: 159000, satisfaction: 8.4 },
    { month: 'يونيو', contracts: 67, revenue: 182000, satisfaction: 8.9 }
  ];

  const riskData = [
    { category: 'المخاطر المالية', score: 65, status: 'متوسط' },
    { category: 'مخاطر العمليات', score: 45, status: 'منخفض' },
    { category: 'المخاطر القانونية', score: 78, status: 'عالي' },
    { category: 'مخاطر السمعة', score: 35, status: 'منخفض' },
    { category: 'مخاطر التقنية', score: 52, status: 'متوسط' }
  ];

  const contractStatusData = [
    { name: 'نشط', value: 156, color: '#10b981' },
    { name: 'معلق', value: 23, color: '#f59e0b' },
    { name: 'منتهي', value: 78, color: '#6b7280' },
    { name: 'قيد المراجعة', value: 12, color: '#3b82f6' }
  ];

  const customerSatisfactionTrend = [
    { period: 'Q1', satisfaction: 8.1, complaints: 12, renewals: 89 },
    { period: 'Q2', satisfaction: 8.4, complaints: 8, renewals: 92 },
    { period: 'Q3', satisfaction: 8.7, complaints: 5, renewals: 95 },
    { period: 'Q4', satisfaction: 8.9, complaints: 3, renewals: 97 }
  ];

  // تحليل المشاعر التلقائي
  useEffect(() => {
    const runSentimentAnalysis = async () => {
      if (contractsData.length > 0) {
        setLoading(true);
        try {
          // استخراج النصوص من العقود للتحليل
          const contractTexts = contractsData
            .map(contract => contract.description || contract.terms || '')
            .filter(text => text.length > 0)
            .slice(0, 10); // تحليل أول 10 عقود

          if (contractTexts.length > 0) {
            const result = await analyzeSentiment(contractTexts, {
              source: 'contracts'
            });

            if (result) {
              setInsights(prev => [...prev, {
                type: 'sentiment',
                title: 'تحليل المشاعر للعقود',
                data: result.results.detailedAnalysis,
                confidence: result.metadata.confidence
              }]);
            }
          }
        } catch (error) {
          console.error('خطأ في تحليل المشاعر:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    runSentimentAnalysis();
  }, [contractsData, analyzeSentiment]);

  // الأرقام الرئيسية
  const keyMetrics = [
    {
      title: 'إجمالي العقود',
      value: contractsData.length || 269,
      change: '+12%',
      trend: 'up',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'الإيرادات الشهرية',
      value: '₽182,000',
      change: '+8%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'رضا العملاء',
      value: '8.9/10',
      change: '+0.2',
      trend: 'up',
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'المركبات النشطة',
      value: vehiclesData.length || 156,
      change: '+5%',
      trend: 'up',
      icon: Car,
      color: 'text-orange-600'
    }
  ];

  const renderMetricCard = (metric: any) => {
    const Icon = metric.icon;
    const trendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
    const TrendIcon = trendIcon;

    return (
      <Card key={metric.title} className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{metric.title}</p>
            <p className="text-2xl font-bold">{metric.value}</p>
          </div>
          <Icon className={`w-8 h-8 ${metric.color}`} />
        </div>
        <div className="flex items-center mt-2">
          <TrendIcon className={`w-4 h-4 mr-1 ${
            metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`} />
          <span className={`text-sm ${
            metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {metric.change}
          </span>
          <span className="text-sm text-muted-foreground mr-1">من الشهر الماضي</span>
        </div>
      </Card>
    );
  };

  const getRiskColor = (score: number) => {
    if (score < 40) return '#10b981'; // أخضر
    if (score < 70) return '#f59e0b'; // أصفر
    return '#ef4444'; // أحمر
  };

  return (
    <div className="space-y-6">
      {/* الأرقام الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map(renderMetricCard)}
      </div>

      {/* التبويبات التحليلية */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            الأداء
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            المخاطر
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            التنبؤات
          </TabsTrigger>
        </TabsList>

        {/* نظرة عامة */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* رسم بياني للعقود حسب الحالة */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  توزيع العقود حسب الحالة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={contractStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {contractStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* اتجاه الأداء الشهري */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  الأداء الشهري
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="contracts" fill="#3b82f6" name="العقود" />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="satisfaction" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      name="الرضا"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* تحليل الأداء */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* اتجاه رضا العملاء */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  تطور رضا العملاء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={customerSatisfactionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="satisfaction" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                      name="مستوى الرضا"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="renewals" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="معدل التجديد %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* الإيرادات والعقود */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  الإيرادات والعقود
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value, name) => [
                      name === 'revenue' ? `₽${value.toLocaleString()}` : value,
                      name === 'revenue' ? 'الإيرادات' : 'العقود'
                    ]} />
                    <Bar yAxisId="left" dataKey="contracts" fill="#3b82f6" name="العقود" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="الإيرادات" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* تحليل المخاطر */}
        <TabsContent value="risks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* خريطة المخاطر */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  خريطة المخاطر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={riskData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis angle={0} domain={[0, 100]} />
                    <Radar
                      name="مستوى المخاطر"
                      dataKey="score"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.3}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* تفاصيل المخاطر */}
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل تقييم المخاطر</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskData.map((risk, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{risk.category}</h4>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${risk.score}%`,
                              backgroundColor: getRiskColor(risk.score)
                            }}
                          />
                        </div>
                      </div>
                      <Badge 
                        variant={risk.score > 70 ? 'destructive' : risk.score > 40 ? 'default' : 'secondary'}
                        className="mr-3"
                      >
                        {risk.status}
                      </Badge>
                      <span className="text-sm font-mono">{risk.score}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* التنبؤات */}
        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* تنبؤات قصيرة المدى */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  التنبؤات القصيرة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">زيادة العقود بنسبة 15% الشهر القادم</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm">توقع 3 عقود تحتاج مراجعة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">تحسن رضا العملاء بـ 0.3 نقطة</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* تنبؤات متوسطة المدى */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  التنبؤات المتوسطة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm">نمو الإيرادات 25% خلال 6 أشهر</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">زيادة قاعدة العملاء بـ 40%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">الحاجة لـ 20 مركبة إضافية</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* توصيات استراتيجية */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  التوصيات الذكية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-right"
                    onClick={() => onInsightClick?.({ type: 'expand_fleet' })}
                  >
                    توسيع الأسطول قبل الذروة
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-right"
                    onClick={() => onInsightClick?.({ type: 'price_optimization' })}
                  >
                    تحسين استراتيجية التسعير
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-right"
                    onClick={() => onInsightClick?.({ type: 'risk_mitigation' })}
                  >
                    تطبيق خطة تخفيف المخاطر
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* معلومات إضافية عن التحليل */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">جاري تحليل البيانات...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};