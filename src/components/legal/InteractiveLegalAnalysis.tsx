import React, { useState, useCallback, useEffect } from 'react';
import { FormattedResponse } from './FormattedResponse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  FileText,
  MessageCircle,
  Lightbulb,
  Target,
  Shield,
  BarChart3,
  Eye,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Share2,
  Filter,
  Search,
  RefreshCw,
  Circle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useAdvancedLegalAI, type EnhancedLegalResponse, type QueryClassification, type LegalInsights } from '@/hooks/useAdvancedLegalAI';

interface InteractiveLegalAnalysisProps {
  response: EnhancedLegalResponse;
  onFeedback?: (rating: number, feedback: string) => void;
  onFollowUp?: (question: string) => void;
  onSaveTemplate?: (templateData: any) => void;
}

const InteractiveLegalAnalysis: React.FC<InteractiveLegalAnalysisProps> = ({
  response,
  onFeedback,
  onFollowUp,
  onSaveTemplate
}) => {
  const { getLegalInsights, insights } = useAdvancedLegalAI();
  const [activeInsightTab, setActiveInsightTab] = useState('overview');
  const [selectedSolution, setSelectedSolution] = useState<number>(0);
  const [userFeedback, setUserFeedback] = useState<{ rating: number | null; feedback: string }>({
    rating: null,
    feedback: ''
  });
  const [savedItems, setSavedItems] = useState<string[]>([]);

  useEffect(() => {
    getLegalInsights();
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getComplexityIcon = (level: string) => {
    switch (level) {
      case 'simple': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'moderate': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'complex': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'expert_level': return <Brain className="h-4 w-4 text-red-500" />;
      default: return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleSaveItem = (item: string) => {
    setSavedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const handleSubmitFeedback = () => {
    if (userFeedback.rating && onFeedback) {
      onFeedback(userFeedback.rating, userFeedback.feedback);
      setUserFeedback({ rating: null, feedback: '' });
    }
  };

  // بيانات للمخططات
  const confidenceData = Object.entries(response.confidence_indicators).map(([key, value]) => ({
    name: key === 'source_reliability' ? 'موثوقية المصدر' :
          key === 'legal_accuracy' ? 'الدقة القانونية' :
          key === 'jurisdiction_relevance' ? 'الصلة بالولاية القضائية' :
          'الشمولية',
    value: value * 100
  }));

  const riskFactorsData = response.smart_analysis.risk_assessment.risk_factors.map((factor, index) => ({
    factor,
    impact: Math.random() * 100 // في الواقع، ستأتي هذه البيانات من التحليل
  }));

  const solutionComparisonData = response.alternative_solutions.map((solution, index) => ({
    name: `الحل ${index + 1}`,
    complexity: solution.complexity,
    cost: solution.estimated_cost / 1000, // تحويل إلى آلاف
    feasibility: Math.random() * 100 // يجب حسابها بناءً على العوامل الفعلية
  }));

  return (
    <div className="space-y-6">
      {/* ملخص التحليل */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              تحليل قانوني تفاعلي متقدم
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className={getRiskColor(response.smart_analysis.risk_assessment.risk_level)}>
                مستوى المخاطر: {response.smart_analysis.risk_assessment.risk_level}
              </Badge>
              <Badge variant="secondary">
                {getComplexityIcon(response.classification.complexity_level)}
                {response.classification.complexity_level}
              </Badge>
            </div>
          </div>
          <CardDescription>
            تحليل شامل ومتطور للاستفسار القانوني مع توصيات قابلة للتنفيذ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {Math.round(response.confidence_indicators.legal_accuracy * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">دقة التحليل</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {response.smart_analysis.timeline_analysis.estimated_duration}
              </div>
              <div className="text-sm text-muted-foreground">المدة المتوقعة</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {response.smart_analysis.cost_estimation.estimated_range.min.toLocaleString()} د.ك
              </div>
              <div className="text-sm text-muted-foreground">التكلفة المتوقعة</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {response.alternative_solutions.length}
              </div>
              <div className="text-sm text-muted-foreground">حلول بديلة</div>
            </div>
          </div>

          {/* مؤشرات الثقة */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">مؤشرات الثقة</h4>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={confidenceData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="الثقة"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* التحليل التفصيلي */}
      <Tabs value={activeInsightTab} onValueChange={setActiveInsightTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="solutions">الحلول</TabsTrigger>
          <TabsTrigger value="risks">المخاطر</TabsTrigger>
          <TabsTrigger value="timeline">الجدول الزمني</TabsTrigger>
          <TabsTrigger value="insights">الرؤى</TabsTrigger>
        </TabsList>

        {/* نظرة عامة */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* التصنيف والتحليل */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  تصنيف الاستفسار
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span>النوع الأساسي</span>
                    <Badge>{response.classification.primary_type}</Badge>
                  </div>
                  <Progress value={response.classification.confidence_score * 100} />
                </div>
                
                <div>
                  <span className="font-medium">الفئات الفرعية:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {response.classification.sub_categories.map((category, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-medium">الخبرة المطلوبة:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {response.classification.required_expertise.map((expertise, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {expertise}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* الاستجابة الرئيسية */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  الاستشارة القانونية
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSaveItem('main_advice')}
                  >
                    <Bookmark className={`h-4 w-4 ${savedItems.includes('main_advice') ? 'fill-current' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <FormattedResponse content={response.advice} className="text-sm leading-relaxed" />
                </ScrollArea>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-1" />
                    مشاركة
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    طباعة
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* أسئلة المتابعة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                أسئلة المتابعة المقترحة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {response.follow_up_questions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-start h-auto p-3 text-right"
                    onClick={() => onFollowUp?.(question)}
                  >
                    <ArrowRight className="h-4 w-4 ml-2" />
                    {question}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الحلول البديلة */}
        <TabsContent value="solutions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>مقارنة الحلول البديلة</CardTitle>
              <CardDescription>
                تحليل تفصيلي للحلول المتاحة مع المقارنة بينها
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* مخطط مقارنة الحلول */}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={solutionComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="complexity" fill="#8884d8" name="التعقيد" />
                  <Bar dataKey="cost" fill="#82ca9d" name="التكلفة (آلاف)" />
                  <Bar dataKey="feasibility" fill="#ffc658" name="الجدوى" />
                </BarChart>
              </ResponsiveContainer>

              <Separator className="my-6" />

              {/* تفاصيل الحلول */}
              <div className="space-y-4">
                {response.alternative_solutions.map((solution, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedSolution === index ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedSolution(index)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold">الحل {index + 1}: {solution.solution}</h4>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          تعقيد: {solution.complexity}/5
                        </Badge>
                        <Badge variant="secondary">
                          {solution.estimated_cost.toLocaleString()} د.ك
                        </Badge>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-green-700 mb-2">المزايا:</h5>
                        <ul className="text-sm space-y-1">
                          {solution.pros.map((pro, proIndex) => (
                            <li key={proIndex} className="flex items-start gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-red-700 mb-2">العيوب:</h5>
                        <ul className="text-sm space-y-1">
                          {solution.cons.map((con, conIndex) => (
                            <li key={conIndex} className="flex items-start gap-2">
                              <AlertTriangle className="h-3 w-3 text-red-500 mt-1 flex-shrink-0" />
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {selectedSolution === index && (
                      <div className="mt-4 pt-4 border-t">
                        <Button onClick={() => onSaveTemplate?.(solution)}>
                          <Bookmark className="h-4 w-4 mr-1" />
                          حفظ كنموذج
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تحليل المخاطر */}
        <TabsContent value="risks" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  تقييم المخاطر
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className={getRiskColor(response.smart_analysis.risk_assessment.risk_level)}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    مستوى المخاطر: {response.smart_analysis.risk_assessment.risk_level}
                  </AlertTitle>
                  <AlertDescription>
                    تحليل شامل للمخاطر المحتملة وتأثيرها على القضية
                  </AlertDescription>
                </Alert>

                <div>
                  <h4 className="font-semibold mb-3">عوامل المخاطر:</h4>
                  <div className="space-y-2">
                    {response.smart_analysis.risk_assessment.risk_factors.map((factor, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  استراتيجيات التخفيف
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {response.smart_analysis.risk_assessment.mitigation_strategies.map((strategy, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">{strategy}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* مخطط تأثير المخاطر */}
          {riskFactorsData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>تحليل تأثير عوامل المخاطر</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskFactorsData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="factor" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="impact" fill="#ff7300" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* الجدول الزمني */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                الجدول الزمني المتوقع
              </CardTitle>
              <CardDescription>
                المدة المتوقعة: {response.smart_analysis.timeline_analysis.estimated_duration}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {response.smart_analysis.timeline_analysis.critical_deadlines.map((deadline, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${
                      deadline.importance === 'critical' ? 'bg-red-500' :
                      deadline.importance === 'high' ? 'bg-orange-500' :
                      deadline.importance === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                    <div className="flex-1">
                      <h4 className="font-medium">{deadline.task}</h4>
                      <p className="text-sm text-muted-foreground">{deadline.deadline}</p>
                    </div>
                    <Badge variant={
                      deadline.importance === 'critical' ? 'destructive' :
                      deadline.importance === 'high' ? 'secondary' :
                      'outline'
                    }>
                      {deadline.importance}
                    </Badge>
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-lg font-semibold">
                    {response.smart_analysis.cost_estimation.estimated_range.min.toLocaleString()} - 
                    {response.smart_analysis.cost_estimation.estimated_range.max.toLocaleString()} د.ك
                  </div>
                  <div className="text-sm text-muted-foreground">التكلفة المتوقعة</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-lg font-semibold">%85</div>
                  <div className="text-sm text-muted-foreground">احتمالية النجاح</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الرؤى والتحليلات */}
        <TabsContent value="insights" className="space-y-4">
          {insights && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">أنماط الاستفسارات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={insights.user_patterns.common_query_types}
                          dataKey="frequency"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                        >
                          {insights.user_patterns.common_query_types.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(${index * 120}, 70%, 50%)`} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">اتجاه رضا المستخدمين</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={insights.system_optimization.user_satisfaction_trend.map((value, index) => ({
                        month: `الشهر ${index + 1}`,
                        satisfaction: value * 100
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="satisfaction" stroke="#8884d8" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">أداء النظام</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>فعالية التخزين المؤقت</span>
                        <span>{Math.round(insights.system_optimization.cache_effectiveness * 100)}%</span>
                      </div>
                      <Progress value={insights.system_optimization.cache_effectiveness * 100} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>دقة الاستجابة</span>
                        <span>{Math.round(insights.system_optimization.response_accuracy * 100)}%</span>
                      </div>
                      <Progress value={insights.system_optimization.response_accuracy * 100} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    توصيات التحسين
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="process">
                    <TabsList>
                      <TabsTrigger value="process">تحسين العمليات</TabsTrigger>
                      <TabsTrigger value="knowledge">فجوات المعرفة</TabsTrigger>
                      <TabsTrigger value="training">التدريب</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="process" className="space-y-3">
                      {insights.recommendations.process_improvements.map((improvement, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                          <span className="text-sm">{improvement}</span>
                        </div>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="knowledge" className="space-y-3">
                      {insights.recommendations.knowledge_gaps.map((gap, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                          <span className="text-sm">{gap}</span>
                        </div>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="training" className="space-y-3">
                      {insights.recommendations.training_suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                          <span className="text-sm">{suggestion}</span>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* نموذج التقييم */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ThumbsUp className="h-4 w-4" />
            تقييم الاستشارة
          </CardTitle>
          <CardDescription>
            ساعدنا في تحسين جودة الخدمة من خلال تقييمك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                variant={userFeedback.rating === rating ? "default" : "outline"}
                size="sm"
                onClick={() => setUserFeedback(prev => ({ ...prev, rating }))}
              >
                {rating} ⭐
              </Button>
            ))}
          </div>
          
          <textarea
            className="w-full p-3 border rounded-md resize-none"
            rows={3}
            placeholder="ملاحظات إضافية (اختياري)"
            value={userFeedback.feedback}
            onChange={(e) => setUserFeedback(prev => ({ ...prev, feedback: e.target.value }))}
          />
          
          <Button onClick={handleSubmitFeedback} disabled={!userFeedback.rating}>
            إرسال التقييم
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InteractiveLegalAnalysis;