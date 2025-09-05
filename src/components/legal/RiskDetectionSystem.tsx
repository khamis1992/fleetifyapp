import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Brain,
  Target,
  Activity,
  Zap,
  BarChart3,
  Radar,
  Clock,
  DollarSign,
  Scale,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RiskFactor {
  id: string;
  type: 'financial' | 'legal' | 'operational' | 'compliance' | 'reputational';
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  probability: number; // 0-1
  impact: number; // 0-1
  riskScore: number; // probability * impact
  mitigation: string[];
  timeline: string;
  cost: number;
  detectedAt: Date;
  source: string;
}

interface RiskAnalysis {
  id: string;
  totalRisks: number;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskDistribution: Record<string, number>;
  trends: Array<{
    period: string;
    riskScore: number;
    change: number;
  }>;
  recommendations: string[];
  analyzedAt: Date;
}

interface RiskDetectionSystemProps {
  documentContent?: string;
  onRiskDetected?: (risks: RiskFactor[]) => void;
}

export const RiskDetectionSystem: React.FC<RiskDetectionSystemProps> = ({ 
  documentContent, 
  onRiskDetected 
}) => {
  const [risks, setRisks] = useState<RiskFactor[]>([]);
  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedRiskType, setSelectedRiskType] = useState<string>('all');

  useEffect(() => {
    if (documentContent) {
      performRiskAnalysis(documentContent);
    } else {
      // Load sample data for demonstration
      loadSampleRisks();
    }
  }, [documentContent]);

  const performRiskAnalysis = async (content: string) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Simulate AI-powered risk detection
      setAnalysisProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));

      const detectedRisks = await detectRisks(content);
      setAnalysisProgress(60);
      await new Promise(resolve => setTimeout(resolve, 500));

      const riskAnalysis = await analyzeRisks(detectedRisks);
      setAnalysisProgress(90);
      await new Promise(resolve => setTimeout(resolve, 300));

      setRisks(detectedRisks);
      setAnalysis(riskAnalysis);
      setAnalysisProgress(100);

      onRiskDetected?.(detectedRisks);

      toast({
        title: "تم اكتشاف المخاطر",
        description: `تم تحديد ${detectedRisks.length} عامل خطر محتمل`
      });

    } catch (error) {
      console.error('Error analyzing risks:', error);
      toast({
        title: "خطأ في تحليل المخاطر",
        description: "حدث خطأ أثناء تحليل المخاطر",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const detectRisks = async (content: string): Promise<RiskFactor[]> => {
    // Simulate AI-powered risk detection
    return [
      {
        id: 'risk_1',
        type: 'financial',
        category: 'التزامات مالية',
        description: 'غرامات مالية مرتفعة في حالة التأخير',
        severity: 'high',
        probability: 0.7,
        impact: 0.8,
        riskScore: 0.56,
        mitigation: [
          'وضع جدول زمني واقعي للتسليم',
          'إضافة بند القوة القاهرة',
          'التفاوض على تخفيض الغرامة'
        ],
        timeline: '30-60 يوم',
        cost: 50000,
        detectedAt: new Date(),
        source: 'تحليل البنود المالية'
      },
      {
        id: 'risk_2',
        type: 'legal',
        category: 'شروط تعاقدية',
        description: 'عدم وضوح في شروط إنهاء العقد',
        severity: 'medium',
        probability: 0.5,
        impact: 0.6,
        riskScore: 0.30,
        mitigation: [
          'إعادة صياغة شروط الإنهاء',
          'تحديد إجراءات واضحة للإنهاء',
          'إضافة مهلة زمنية للإشعار'
        ],
        timeline: '15-30 يوم',
        cost: 25000,
        detectedAt: new Date(),
        source: 'تحليل الشروط القانونية'
      },
      {
        id: 'risk_3',
        type: 'operational',
        category: 'تنفيذ العمليات',
        description: 'مواصفات فنية معقدة قد تؤدي لصعوبات في التنفيذ',
        severity: 'medium',
        probability: 0.6,
        impact: 0.5,
        riskScore: 0.30,
        mitigation: [
          'مراجعة المواصفات الفنية',
          'تقييم القدرة على التنفيذ',
          'طلب توضيحات إضافية'
        ],
        timeline: '45-90 يوم',
        cost: 75000,
        detectedAt: new Date(),
        source: 'تحليل المتطلبات التقنية'
      },
      {
        id: 'risk_4',
        type: 'compliance',
        category: 'امتثال تنظيمي',
        description: 'متطلبات ترخيص إضافية غير محددة',
        severity: 'high',
        probability: 0.4,
        impact: 0.9,
        riskScore: 0.36,
        mitigation: [
          'مراجعة متطلبات التراخيص',
          'التواصل مع الجهات المختصة',
          'إضافة بند مسؤولية الحصول على التراخيص'
        ],
        timeline: '60-120 يوم',
        cost: 100000,
        detectedAt: new Date(),
        source: 'تحليل المتطلبات التنظيمية'
      },
      {
        id: 'risk_5',
        type: 'reputational',
        category: 'سمعة تجارية',
        description: 'عقوبات سمعية في حالة عدم الالتزام بمعايير الجودة',
        severity: 'critical',
        probability: 0.3,
        impact: 0.95,
        riskScore: 0.285,
        mitigation: [
          'وضع معايير واضحة للجودة',
          'نظام مراقبة ومتابعة مستمر',
          'خطة إدارة الأزمات'
        ],
        timeline: '30-180 يوم',
        cost: 200000,
        detectedAt: new Date(),
        source: 'تحليل معايير الجودة'
      }
    ];
  };

  const analyzeRisks = async (risks: RiskFactor[]): Promise<RiskAnalysis> => {
    const totalRisks = risks.length;
    const riskScore = risks.reduce((sum, risk) => sum + risk.riskScore, 0) / totalRisks;
    
    let riskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
    if (riskScore > 0.7) riskLevel = 'critical';
    else if (riskScore > 0.5) riskLevel = 'high';
    else if (riskScore > 0.3) riskLevel = 'medium';

    const riskDistribution: Record<string, number> = {};
    risks.forEach(risk => {
      riskDistribution[risk.type] = (riskDistribution[risk.type] || 0) + 1;
    });

    const trends = [
      { period: 'الشهر الماضي', riskScore: 0.45, change: -0.1 },
      { period: 'هذا الشهر', riskScore: riskScore, change: 0.05 },
      { period: 'التوقع المستقبلي', riskScore: riskScore - 0.05, change: -0.05 }
    ];

    const recommendations = [
      'مراجعة وتحديث إجراءات إدارة المخاطر',
      'وضع خطط طوارئ للمخاطر عالية الاحتمال',
      'تدريب الفريق على التعامل مع المخاطر المحددة',
      'مراقبة دورية للمخاطر الناشئة'
    ];

    return {
      id: `analysis_${Date.now()}`,
      totalRisks,
      riskScore,
      riskLevel,
      riskDistribution,
      trends,
      recommendations,
      analyzedAt: new Date()
    };
  };

  const loadSampleRisks = () => {
    // Load sample data for demonstration
    performRiskAnalysis('عقد تجاري يحتوي على بنود مختلفة تتطلب تحليل المخاطر');
  };

  const getRiskTypeColor = (type: string) => {
    switch (type) {
      case 'financial': return 'text-red-600 bg-red-50 border-red-200';
      case 'legal': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'operational': return 'text-green-600 bg-green-50 border-green-200';
      case 'compliance': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'reputational': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskTypeIcon = (type: string) => {
    switch (type) {
      case 'financial': return <DollarSign className="h-4 w-4" />;
      case 'legal': return <Scale className="h-4 w-4" />;
      case 'operational': return <Activity className="h-4 w-4" />;
      case 'compliance': return <Shield className="h-4 w-4" />;
      case 'reputational': return <Users className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical': return 'حرج';
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return 'غير محدد';
    }
  };

  const getRiskTypeText = (type: string) => {
    switch (type) {
      case 'financial': return 'مالي';
      case 'legal': return 'قانوني';
      case 'operational': return 'تشغيلي';
      case 'compliance': return 'امتثال';
      case 'reputational': return 'سمعة';
      default: return 'أخرى';
    }
  };

  const filteredRisks = selectedRiskType === 'all' 
    ? risks 
    : risks.filter(risk => risk.type === selectedRiskType);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radar className="h-5 w-5" />
                نظام كشف المخاطر المتقدم
              </CardTitle>
              <CardDescription>
                تحليل ذكي للمخاطر القانونية والتجارية باستخدام الذكاء الاصطناعي
              </CardDescription>
            </div>
            {analysis && (
              <Badge className={getSeverityColor(analysis.riskLevel)}>
                مستوى الخطر: {getSeverityText(analysis.riskLevel)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 animate-pulse text-primary" />
                <span>جاري تحليل المخاطر...</span>
              </div>
              <Progress value={analysisProgress} className="w-full" />
            </div>
          )}
          
          {!isAnalyzing && !documentContent && (
            <Button onClick={loadSampleRisks} variant="outline">
              <Target className="h-4 w-4 mr-2" />
              تشغيل تحليل تجريبي
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Risk Overview */}
      {analysis && (
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{analysis.totalRisks}</p>
                  <p className="text-sm text-muted-foreground">إجمالي المخاطر</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(analysis.riskScore * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">نقاط الخطر</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {risks.filter(r => r.mitigation.length > 0).length}
                  </p>
                  <p className="text-sm text-muted-foreground">حلول متاحة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {risks.filter(r => r.severity === 'critical' || r.severity === 'high').length}
                  </p>
                  <p className="text-sm text-muted-foreground">مخاطر عاجلة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk Analysis Tabs */}
      {risks.length > 0 && (
        <Tabs defaultValue="risks" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="risks">المخاطر المكتشفة</TabsTrigger>
            <TabsTrigger value="analysis">التحليل التفصيلي</TabsTrigger>
            <TabsTrigger value="mitigation">خطط التخفيف</TabsTrigger>
            <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
          </TabsList>

          <TabsContent value="risks" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">المخاطر المكتشفة</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={selectedRiskType === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedRiskType('all')}
                    >
                      الكل ({risks.length})
                    </Button>
                    {Object.entries(analysis?.riskDistribution || {}).map(([type, count]) => (
                      <Button
                        key={type}
                        variant={selectedRiskType === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedRiskType(type)}
                      >
                        {getRiskTypeText(type)} ({count})
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {filteredRisks.map((risk) => (
                      <div key={risk.id} className="p-4 rounded-lg border bg-muted/20">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getRiskTypeIcon(risk.type)}
                            <h4 className="font-medium">{risk.description}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(risk.severity)}>
                              {getSeverityText(risk.severity)}
                            </Badge>
                            <Badge variant="outline" className={getRiskTypeColor(risk.type)}>
                              {getRiskTypeText(risk.type)}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3 mb-3">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">احتمالية الحدوث</p>
                            <Progress value={risk.probability * 100} className="h-2" />
                            <p className="text-xs">{Math.round(risk.probability * 100)}%</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">درجة التأثير</p>
                            <Progress value={risk.impact * 100} className="h-2" />
                            <p className="text-xs">{Math.round(risk.impact * 100)}%</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">نقاط الخطر</p>
                            <Progress value={risk.riskScore * 100} className="h-2" />
                            <p className="text-xs">{Math.round(risk.riskScore * 100)}%</p>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 text-xs">
                          <div>
                            <p className="text-muted-foreground mb-1">الإطار الزمني:</p>
                            <p>{risk.timeline}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">التكلفة المتوقعة:</p>
                            <p>{risk.cost.toLocaleString()} د.ك</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">توزيع المخاطر</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analysis?.riskDistribution || {}).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRiskTypeIcon(type)}
                          <span className="text-sm">{getRiskTypeText(type)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${(count / risks.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">المخاطر حسب الشدة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['critical', 'high', 'medium', 'low'].map(severity => {
                      const count = risks.filter(r => r.severity === severity).length;
                      return (
                        <div key={severity} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity)}`} />
                            <span className="text-sm">{getSeverityText(severity)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${severity === 'critical' ? 'bg-red-600' : severity === 'high' ? 'bg-red-500' : severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${(count / risks.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mitigation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">استراتيجيات التخفيف</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {risks.filter(r => r.mitigation.length > 0).map((risk) => (
                    <div key={risk.id} className="p-4 rounded-lg border bg-muted/20">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-sm">{risk.description}</h4>
                        <Badge className={getSeverityColor(risk.severity)}>
                          {getSeverityText(risk.severity)}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">استراتيجيات التخفيف:</p>
                        <div className="space-y-1">
                          {risk.mitigation.map((strategy, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Zap className="h-3 w-3 text-yellow-600" />
                              <span className="text-sm">{strategy}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">اتجاهات المخاطر</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis?.trends.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{trend.period}</p>
                        <p className="text-xs text-muted-foreground">
                          نقاط خطر: {Math.round(trend.riskScore * 100)}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {trend.change > 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-600" />
                        )}
                        <span className={`text-sm font-medium ${trend.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {trend.change > 0 ? '+' : ''}{Math.round(trend.change * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {analysis?.recommendations && (
                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium text-sm">التوصيات الاستراتيجية</h4>
                    <div className="space-y-2">
                      {analysis.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 rounded bg-blue-50 border border-blue-200">
                          <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-blue-800">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default RiskDetectionSystem;