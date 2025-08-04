import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  Clock, 
  DollarSign, 
  Scale, 
  AlertTriangle,
  CheckCircle,
  Target,
  Lightbulb,
  BarChart3,
  FileSearch
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RecommendationSystemProps {
  caseData?: any;
  onApplyRecommendation?: (recommendation: any) => void;
}

interface SmartRecommendation {
  id: string;
  type: 'strategy' | 'risk' | 'cost' | 'timeline' | 'legal';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  actionItems: string[];
  expectedOutcome: string;
  timeframe: string;
  resources: string[];
}

interface PredictiveInsights {
  successProbability: number;
  riskFactors: Array<{
    factor: string;
    severity: 'high' | 'medium' | 'low';
    mitigation: string;
  }>;
  costOptimization: Array<{
    area: string;
    potential_savings: number;
    implementation: string;
  }>;
  timelineOptimization: Array<{
    phase: string;
    current_estimate: number;
    optimized_estimate: number;
    method: string;
  }>;
}

export const SmartRecommendationSystem: React.FC<RecommendationSystemProps> = ({
  caseData,
  onApplyRecommendation
}) => {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [insights, setInsights] = useState<PredictiveInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (caseData) {
      generateRecommendations();
    }
  }, [caseData]);

  const generateRecommendations = async () => {
    setIsLoading(true);
    try {
      // Generate strategic recommendations
      const { data: strategicData, error: strategicError } = await supabase.functions.invoke('legal-ai-enhanced', {
        body: {
          path: 'generate-strategic-insights',
          caseData
        }
      });

      if (strategicError) throw strategicError;

      // Generate predictive analytics
      const { data: predictiveData, error: predictiveError } = await supabase.functions.invoke('legal-ai-enhanced', {
        body: {
          path: 'analyze-case-predictions',
          caseData
        }
      });

      if (predictiveError) throw predictiveError;

      // Process and structure recommendations
      const structuredRecommendations = await processRecommendations(strategicData, predictiveData);
      setRecommendations(structuredRecommendations);

      // Set insights
      if (predictiveData?.analysis) {
        setInsights({
          successProbability: strategicData?.insights?.case_strength || 0.75,
          riskFactors: predictiveData.analysis.risks || [],
          costOptimization: generateCostOptimizations(predictiveData.analysis.costs),
          timelineOptimization: generateTimelineOptimizations(predictiveData.analysis.timeline)
        });
      }

      toast.success('تم إنشاء التوصيات الذكية بنجاح');
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('فشل في إنشاء التوصيات');
      
      // Fallback recommendations
      setRecommendations(generateFallbackRecommendations());
    } finally {
      setIsLoading(false);
    }
  };

  const processRecommendations = async (strategicData: any, predictiveData: any): Promise<SmartRecommendation[]> => {
    const recommendations: SmartRecommendation[] = [];

    // Strategy recommendations
    if (strategicData?.insights?.recommended_strategy) {
      recommendations.push({
        id: 'strategy-1',
        type: 'strategy',
        title: 'Strategic Approach Recommendation',
        description: strategicData.insights.recommended_strategy,
        confidence: 0.85,
        priority: 'high',
        impact: 'high',
        actionItems: strategicData.insights.success_factors || [],
        expectedOutcome: 'Optimized case strategy with higher success probability',
        timeframe: '1-2 weeks',
        resources: ['Senior Legal Counsel', 'Strategy Team']
      });
    }

    // Risk mitigation recommendations
    if (predictiveData?.analysis?.risks) {
      predictiveData.analysis.risks.forEach((risk: any, index: number) => {
        recommendations.push({
          id: `risk-${index + 1}`,
          type: 'risk',
          title: `Risk Mitigation: ${risk.risk}`,
          description: risk.mitigation,
          confidence: 0.80,
          priority: risk.severity === 'high' ? 'high' : 'medium',
          impact: risk.severity === 'high' ? 'high' : 'medium',
          actionItems: [risk.mitigation],
          expectedOutcome: `Reduced ${risk.severity} risk exposure`,
          timeframe: '2-4 weeks',
          resources: ['Risk Assessment Team', 'Legal Experts']
        });
      });
    }

    // Timeline optimization recommendations
    if (predictiveData?.analysis?.timeline) {
      recommendations.push({
        id: 'timeline-1',
        type: 'timeline',
        title: 'Timeline Optimization',
        description: 'Optimize case timeline through strategic phase management',
        confidence: 0.75,
        priority: 'medium',
        impact: 'medium',
        actionItems: [
          'Prioritize critical discovery items',
          'Consider parallel processing',
          'Streamline documentation review'
        ],
        expectedOutcome: '20-30% reduction in overall timeline',
        timeframe: 'Ongoing',
        resources: ['Project Manager', 'Legal Team']
      });
    }

    // Cost optimization recommendations
    if (predictiveData?.analysis?.costs) {
      recommendations.push({
        id: 'cost-1',
        type: 'cost',
        title: 'Cost Optimization Strategy',
        description: 'Implement cost-effective resource allocation and budget management',
        confidence: 0.70,
        priority: 'medium',
        impact: 'high',
        actionItems: [
          'Review hourly rate allocations',
          'Consider alternative fee arrangements',
          'Optimize resource utilization'
        ],
        expectedOutcome: '15-25% cost reduction',
        timeframe: '1 month',
        resources: ['Finance Team', 'Practice Manager']
      });
    }

    return recommendations;
  };

  const generateCostOptimizations = (costs: any[]): any[] => {
    if (!costs) return [];
    
    return costs.map(cost => ({
      area: cost.category,
      potential_savings: Math.round(cost.estimatedAmount * 0.15),
      implementation: 'Resource reallocation and process optimization'
    }));
  };

  const generateTimelineOptimizations = (timeline: any[]): any[] => {
    if (!timeline) return [];
    
    return timeline.map(phase => ({
      phase: phase.phase,
      current_estimate: phase.estimatedDays,
      optimized_estimate: Math.round(phase.estimatedDays * 0.8),
      method: 'Parallel processing and automation'
    }));
  };

  const generateFallbackRecommendations = (): SmartRecommendation[] => {
    return [
      {
        id: 'fallback-1',
        type: 'strategy',
        title: 'Case Assessment Review',
        description: 'Conduct comprehensive case strength assessment',
        confidence: 0.60,
        priority: 'high',
        impact: 'high',
        actionItems: ['Review case documents', 'Assess legal precedents', 'Evaluate evidence'],
        expectedOutcome: 'Clear strategic direction',
        timeframe: '1 week',
        resources: ['Senior Attorney', 'Research Team']
      },
      {
        id: 'fallback-2',
        type: 'risk',
        title: 'Risk Assessment',
        description: 'Identify and evaluate potential risks',
        confidence: 0.65,
        priority: 'medium',
        impact: 'medium',
        actionItems: ['Risk identification workshop', 'Mitigation planning'],
        expectedOutcome: 'Comprehensive risk management plan',
        timeframe: '2 weeks',
        resources: ['Risk Team', 'Legal Counsel']
      }
    ];
  };

  const applyRecommendation = (recommendation: SmartRecommendation) => {
    setAppliedRecommendations(prev => new Set([...prev, recommendation.id]));
    onApplyRecommendation?.(recommendation);
    toast.success(`تم تطبيق التوصية: ${recommendation.title}`);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'strategy': return <Target className="h-4 w-4" />;
      case 'risk': return <Shield className="h-4 w-4" />;
      case 'cost': return <DollarSign className="h-4 w-4" />;
      case 'timeline': return <Clock className="h-4 w-4" />;
      case 'legal': return <Scale className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Brain className="h-5 w-5 animate-spin" />
            <span>إنتاج التوصيات الذكية...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            نظام التوصيات الذكي
          </CardTitle>
          <CardDescription>
            توصيات مخصصة مبنية على الذكاء الاصطناعي والتحليل التنبؤي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recommendations">التوصيات</TabsTrigger>
              <TabsTrigger value="insights">الرؤى التنبؤية</TabsTrigger>
              <TabsTrigger value="analytics">التحليلات</TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="space-y-4">
              {recommendations.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    لا توجد توصيات متاحة حالياً. يرجى تحديث بيانات القضية.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4">
                  {recommendations.map((rec) => (
                    <Card key={rec.id} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(rec.type)}
                            <CardTitle className="text-lg">{rec.title}</CardTitle>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={getPriorityColor(rec.priority) as any}>
                              {rec.priority === 'high' ? 'عالي' : rec.priority === 'medium' ? 'متوسط' : 'منخفض'}
                            </Badge>
                            <Badge className={getImpactColor(rec.impact)}>
                              تأثير {rec.impact === 'high' ? 'عالي' : rec.impact === 'medium' ? 'متوسط' : 'منخفض'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-muted-foreground">{rec.description}</p>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">خطوات العمل:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {rec.actionItems.map((item, index) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>مستوى الثقة:</span>
                              <span>{Math.round(rec.confidence * 100)}%</span>
                            </div>
                            <Progress value={rec.confidence * 100} className="h-2" />
                            <div className="text-sm text-muted-foreground">
                              <p><strong>النتيجة المتوقعة:</strong> {rec.expectedOutcome}</p>
                              <p><strong>الإطار الزمني:</strong> {rec.timeframe}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="text-sm text-muted-foreground">
                            <strong>الموارد المطلوبة:</strong> {rec.resources.join(', ')}
                          </div>
                          <Button
                            onClick={() => applyRecommendation(rec)}
                            disabled={appliedRecommendations.has(rec.id)}
                            variant={appliedRecommendations.has(rec.id) ? "outline" : "default"}
                          >
                            {appliedRecommendations.has(rec.id) ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                مطبق
                              </>
                            ) : (
                              'تطبيق التوصية'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              {insights ? (
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        احتمالية النجاح
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>احتمالية النجاح الإجمالية</span>
                          <span className="font-bold">{Math.round(insights.successProbability * 100)}%</span>
                        </div>
                        <Progress value={insights.successProbability * 100} className="h-3" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        عوامل المخاطر
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {insights.riskFactors.map((risk, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                            <div className={`w-3 h-3 rounded-full mt-1 ${
                              risk.severity === 'high' ? 'bg-red-500' :
                              risk.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`} />
                            <div className="flex-1">
                              <p className="font-medium">{risk.factor}</p>
                              <p className="text-sm text-muted-foreground">{risk.mitigation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          تحسين التكاليف
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {insights.costOptimization.map((opt, index) => (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">{opt.area}</span>
                                <span className="text-sm text-green-600">-${opt.potential_savings.toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{opt.implementation}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          تحسين الجدول الزمني
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {insights.timelineOptimization.map((opt, index) => (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">{opt.phase}</span>
                                <span className="text-sm text-blue-600">
                                  {opt.current_estimate} → {opt.optimized_estimate} يوم
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{opt.method}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    لا توجد رؤى تنبؤية متاحة حالياً. يرجى إنشاء التوصيات أولاً.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">التوصيات المطبقة</p>
                        <p className="text-2xl font-bold">{appliedRecommendations.size}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">معدل النجاح</p>
                        <p className="text-2xl font-bold">
                          {insights ? Math.round(insights.successProbability * 100) : '--'}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileSearch className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">إجمالي التوصيات</p>
                        <p className="text-2xl font-bold">{recommendations.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartRecommendationSystem;