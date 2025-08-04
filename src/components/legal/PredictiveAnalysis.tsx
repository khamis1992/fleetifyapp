import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Brain, AlertTriangle, CheckCircle, Clock, DollarSign, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';

// أنواع البيانات
interface PredictionRequest {
  caseType: string;
  caseDetails: string;
  jurisdiction: string;
  clientProfile: string;
  caseValue?: number;
  estimatedDuration?: number;
  complexity: 'low' | 'medium' | 'high';
}

interface PredictionResult {
  id: string;
  successProbability: number;
  estimatedDuration: number;
  estimatedCost: number;
  riskFactors: RiskFactor[];
  recommendations: string[];
  similarCases: SimilarCase[];
  timeline: TimelineEvent[];
  confidenceLevel: number;
  createdAt: string;
}

interface RiskFactor {
  factor: string;
  impact: 'low' | 'medium' | 'high';
  probability: number;
  description: string;
}

interface SimilarCase {
  id: string;
  description: string;
  outcome: 'won' | 'lost' | 'settled';
  similarity: number;
  duration: number;
  cost: number;
}

interface TimelineEvent {
  phase: string;
  estimatedDuration: number;
  activities: string[];
  cost: number;
}

interface PredictiveAnalysisProps {
  onAnalysisComplete?: (result: PredictionResult) => void;
}

const PredictiveAnalysis: React.FC<PredictiveAnalysisProps> = ({ onAnalysisComplete }) => {
  const [request, setRequest] = useState<PredictionRequest>({
    caseType: '',
    caseDetails: '',
    jurisdiction: '',
    clientProfile: '',
    complexity: 'medium'
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionResult | null>(null);

  // بيانات إحصائيات القضايا
  const caseStatsData = [
    { month: 'يناير', won: 12, lost: 3, settled: 5 },
    { month: 'فبراير', won: 15, lost: 2, settled: 7 },
    { month: 'مارس', won: 18, lost: 4, settled: 6 },
    { month: 'أبريل', won: 14, lost: 5, settled: 8 },
    { month: 'مايو', won: 20, lost: 3, settled: 9 },
    { month: 'يونيو', won: 16, lost: 2, settled: 4 }
  ];

  const successRateData = [
    { name: 'القضايا المكسوبة', value: 75, color: '#10b981' },
    { name: 'القضايا المفقودة', value: 15, color: '#ef4444' },
    { name: 'التسويات', value: 10, color: '#f59e0b' }
  ];

  const caseTypeData = [
    { type: 'تجارية', success: 85, count: 45 },
    { type: 'عمالية', success: 78, count: 32 },
    { type: 'عقارية', success: 82, count: 28 },
    { type: 'عقود', success: 90, count: 38 },
    { type: 'أحوال شخصية', success: 75, count: 22 }
  ];

  // إجراء التحليل التنبؤي
  const performPredictiveAnalysis = async () => {
    if (!request.caseType || !request.caseDetails) {
      toast.error('يرجى إدخال جميع البيانات المطلوبة');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      const analysisSteps = [
        'تحليل تفاصيل القضية...',
        'مراجعة القضايا المشابهة...',
        'تحليل عوامل النجاح...',
        'حساب المخاطر المحتملة...',
        'تقدير التكاليف والمدة...',
        'إنشاء التوصيات...',
        'تكوين الجدول الزمني...',
        'حساب مستوى الثقة...'
      ];

      for (let i = 0; i < analysisSteps.length; i++) {
        setCurrentStep(analysisSteps[i]);
        setAnalysisProgress((i + 1) / analysisSteps.length * 100);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // محاكاة نتائج التحليل
      const result = generatePredictionResult(request);
      setPredictions(prev => [result, ...prev]);
      setSelectedPrediction(result);
      onAnalysisComplete?.(result);
      
      toast.success('تم إكمال التحليل التنبؤي بنجاح!');
      
    } catch (error) {
      toast.error('حدث خطأ في التحليل التنبؤي');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setCurrentStep('');
    }
  };

  // توليد نتائج التحليل التنبؤي
  const generatePredictionResult = (req: PredictionRequest): PredictionResult => {
    // حساب احتمالية النجاح بناءً على نوع القضية والتعقيد
    let baseSuccess = 75;
    
    switch (req.caseType) {
      case 'تجارية': baseSuccess = 85; break;
      case 'عقود': baseSuccess = 90; break;
      case 'عقارية': baseSuccess = 82; break;
      case 'عمالية': baseSuccess = 78; break;
      default: baseSuccess = 75;
    }

    switch (req.complexity) {
      case 'low': baseSuccess += 10; break;
      case 'high': baseSuccess -= 15; break;
    }

    const successProbability = Math.max(30, Math.min(95, baseSuccess + (Math.random() - 0.5) * 20));

    // تقدير المدة والتكلفة
    const baseDuration = req.complexity === 'low' ? 3 : req.complexity === 'medium' ? 6 : 12;
    const estimatedDuration = baseDuration + Math.floor(Math.random() * 4);
    
    const baseCost = req.caseValue ? req.caseValue * 0.1 : 50000;
    const estimatedCost = baseCost + (Math.random() - 0.5) * baseCost * 0.4;

    // عوامل المخاطر
    const riskFactors: RiskFactor[] = [
      {
        factor: 'تعقيد القضية',
        impact: req.complexity,
        probability: req.complexity === 'high' ? 80 : req.complexity === 'medium' ? 50 : 20,
        description: 'مستوى التعقيد القانوني للقضية قد يؤثر على النتيجة'
      },
      {
        factor: 'قوة الأدلة',
        impact: 'medium',
        probability: 60,
        description: 'جودة الأدلة المتاحة تؤثر على فرص النجاح'
      },
      {
        factor: 'تجربة القاضي',
        impact: 'low',
        probability: 30,
        description: 'خبرة القاضي في هذا النوع من القضايا'
      }
    ];

    // القضايا المشابهة
    const similarCases: SimilarCase[] = [
      {
        id: '1',
        description: 'قضية مشابهة في نفس المجال',
        outcome: 'won',
        similarity: 85,
        duration: estimatedDuration - 1,
        cost: estimatedCost * 0.9
      },
      {
        id: '2',
        description: 'قضية بنفس الطبيعة القانونية',
        outcome: 'settled',
        similarity: 78,
        duration: estimatedDuration + 2,
        cost: estimatedCost * 1.1
      },
      {
        id: '3',
        description: 'قضية في نفس الاختصاص',
        outcome: 'won',
        similarity: 72,
        duration: estimatedDuration,
        cost: estimatedCost * 0.8
      }
    ];

    // التوصيات
    const recommendations = [
      'جمع أدلة إضافية لتعزيز موقف العميل',
      'إعداد استراتيجية دفاع متينة',
      'النظر في إمكانية التفاوض للوصول لتسوية',
      'توثيق جميع الخطوات القانونية بعناية',
      'الاستعانة بخبراء في المجال عند الحاجة'
    ];

    // الجدول الزمني
    const timeline: TimelineEvent[] = [
      {
        phase: 'إعداد القضية',
        estimatedDuration: Math.ceil(estimatedDuration * 0.2),
        activities: ['جمع الأدلة', 'إعداد المرافعات', 'دراسة السوابق'],
        cost: estimatedCost * 0.3
      },
      {
        phase: 'المرافعات الأولية',
        estimatedDuration: Math.ceil(estimatedDuration * 0.3),
        activities: ['تقديم الدعوى', 'الرد على دفوع الخصم', 'جلسات المرافعة'],
        cost: estimatedCost * 0.4
      },
      {
        phase: 'المرحلة النهائية',
        estimatedDuration: Math.ceil(estimatedDuration * 0.5),
        activities: ['المرافعات الختامية', 'انتظار الحكم', 'تنفيذ الحكم'],
        cost: estimatedCost * 0.3
      }
    ];

    return {
      id: Date.now().toString(),
      successProbability,
      estimatedDuration,
      estimatedCost,
      riskFactors,
      recommendations,
      similarCases,
      timeline,
      confidenceLevel: 85 + Math.random() * 10,
      createdAt: new Date().toISOString()
    };
  };

  // تحديث بيانات الطلب
  const updateRequest = (field: keyof PredictionRequest, value: any) => {
    setRequest(prev => ({ ...prev, [field]: value }));
  };

  // ألوان المخاطر
  const getRiskColor = (impact: string) => {
    switch (impact) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (impact: string) => {
    switch (impact) {
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'won': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'lost': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'settled': return <Target className="h-4 w-4 text-yellow-600" />;
      default: return null;
    }
  };

  const getOutcomeText = (outcome: string) => {
    switch (outcome) {
      case 'won': return 'مكسوبة';
      case 'lost': return 'مفقودة';
      case 'settled': return 'تسوية';
      default: return outcome;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Brain className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">التحليل التنبؤي القانوني</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          احصل على تنبؤات دقيقة حول نتائج القضايا والتكاليف المتوقعة
        </p>
      </div>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">تحليل جديد</TabsTrigger>
          <TabsTrigger value="results">النتائج</TabsTrigger>
          <TabsTrigger value="statistics">الإحصائيات</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                إعداد التحليل التنبؤي
              </CardTitle>
              <CardDescription>
                أدخل تفاصيل القضية للحصول على تحليل تنبؤي شامل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="caseType">نوع القضية *</Label>
                  <Select
                    value={request.caseType}
                    onValueChange={(value) => updateRequest('caseType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع القضية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="تجارية">تجارية</SelectItem>
                      <SelectItem value="عمالية">عمالية</SelectItem>
                      <SelectItem value="عقارية">عقارية</SelectItem>
                      <SelectItem value="عقود">عقود</SelectItem>
                      <SelectItem value="أحوال شخصية">أحوال شخصية</SelectItem>
                      <SelectItem value="جنائية">جنائية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jurisdiction">الاختصاص *</Label>
                  <Select
                    value={request.jurisdiction}
                    onValueChange={(value) => updateRequest('jurisdiction', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الاختصاص" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="السعودية">السعودية</SelectItem>
                      <SelectItem value="الإمارات">الإمارات</SelectItem>
                      <SelectItem value="الكويت">الكويت</SelectItem>
                      <SelectItem value="قطر">قطر</SelectItem>
                      <SelectItem value="البحرين">البحرين</SelectItem>
                      <SelectItem value="عُمان">عُمان</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complexity">مستوى التعقيد</Label>
                  <Select
                    value={request.complexity}
                    onValueChange={(value: 'low' | 'medium' | 'high') => updateRequest('complexity', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفض</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="high">عالي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caseValue">قيمة القضية (ريال)</Label>
                  <Input
                    id="caseValue"
                    type="number"
                    placeholder="أدخل قيمة القضية"
                    value={request.caseValue || ''}
                    onChange={(e) => updateRequest('caseValue', parseFloat(e.target.value) || undefined)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="caseDetails">تفاصيل القضية *</Label>
                <Textarea
                  id="caseDetails"
                  placeholder="أدخل تفاصيل شاملة عن القضية..."
                  value={request.caseDetails}
                  onChange={(e) => updateRequest('caseDetails', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientProfile">ملف العميل</Label>
                <Textarea
                  id="clientProfile"
                  placeholder="معلومات إضافية عن العميل وحالته..."
                  value={request.clientProfile}
                  onChange={(e) => updateRequest('clientProfile', e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                onClick={performPredictiveAnalysis}
                disabled={!request.caseType || !request.caseDetails || isAnalyzing}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    جاري التحليل...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    بدء التحليل التنبؤي
                  </div>
                )}
              </Button>

              {/* شريط التقدم */}
              {isAnalyzing && (
                <div className="space-y-2">
                  <Progress value={analysisProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground text-center">
                    {currentStep}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {selectedPrediction ? (
            <div className="space-y-6">
              {/* ملخص النتائج */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedPrediction.successProbability.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">احتمالية النجاح</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedPrediction.estimatedDuration}
                    </div>
                    <div className="text-sm text-muted-foreground">شهر (المدة المتوقعة)</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(selectedPrediction.estimatedCost)}
                    </div>
                    <div className="text-sm text-muted-foreground">التكلفة المتوقعة</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedPrediction.confidenceLevel.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">مستوى الثقة</div>
                  </CardContent>
                </Card>
              </div>

              {/* عوامل المخاطر */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    عوامل المخاطر
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedPrediction.riskFactors.map((risk, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getRiskIcon(risk.impact)}
                          <div>
                            <div className="font-medium">{risk.factor}</div>
                            <div className="text-sm text-muted-foreground">{risk.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRiskColor(risk.impact)}>
                            {risk.impact === 'low' ? 'منخفض' : risk.impact === 'medium' ? 'متوسط' : 'عالي'}
                          </Badge>
                          <div className="text-sm font-medium">{risk.probability}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* القضايا المشابهة */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    القضايا المشابهة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedPrediction.similarCases.map((case_, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getOutcomeIcon(case_.outcome)}
                          <div>
                            <div className="font-medium">{case_.description}</div>
                            <div className="text-sm text-muted-foreground">
                              التشابه: {case_.similarity}% • المدة: {case_.duration} شهر
                            </div>
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium">{getOutcomeText(case_.outcome)}</div>
                          <div className="text-sm text-muted-foreground">{formatCurrency(case_.cost)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* التوصيات */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    التوصيات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedPrediction.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* الجدول الزمني */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    الجدول الزمني المتوقع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedPrediction.timeline.map((phase, index) => (
                      <div key={index} className="border-l-4 border-l-primary pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{phase.phase}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{phase.estimatedDuration} شهر</span>
                            <span>{formatCurrency(phase.cost)}</span>
                          </div>
                        </div>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {phase.activities.map((activity, actIndex) => (
                            <li key={actIndex}>{activity}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">لا توجد نتائج تحليل</h3>
                <p className="text-muted-foreground">
                  قم بإجراء تحليل تنبؤي جديد لعرض النتائج هنا
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          {/* إحصائيات عامة */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">85%</div>
                <div className="text-sm text-muted-foreground">معدل النجاح العام</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">245</div>
                <div className="text-sm text-muted-foreground">إجمالي القضايا</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">6.2</div>
                <div className="text-sm text-muted-foreground">متوسط المدة (شهر)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">92%</div>
                <div className="text-sm text-muted-foreground">دقة التنبؤات</div>
              </CardContent>
            </Card>
          </div>

          {/* مخطط إحصائيات القضايا */}
          <Card>
            <CardHeader>
              <CardTitle>إحصائيات القضايا الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={caseStatsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="won" fill="#10b981" name="مكسوبة" />
                  <Bar dataKey="lost" fill="#ef4444" name="مفقودة" />
                  <Bar dataKey="settled" fill="#f59e0b" name="تسوية" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* نسب النجاح */}
            <Card>
              <CardHeader>
                <CardTitle>نسب النتائج</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={successRateData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {successRateData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* معدلات النجاح بحسب النوع */}
            <Card>
              <CardHeader>
                <CardTitle>معدل النجاح بحسب نوع القضية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {caseTypeData.map((type, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{type.type}</span>
                        <span>{type.success}% ({type.count} قضية)</span>
                      </div>
                      <Progress value={type.success} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PredictiveAnalysis;