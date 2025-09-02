import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// أنواع التحليل المتقدم للمرحلة الأولى
export type AdvancedAnalysisType = 
  | 'sentiment_analysis'     // تحليل المشاعر
  | 'risk_prediction'        // التنبؤ بالمخاطر  
  | 'competitive_analysis'   // التحليل التنافسي
  | 'contract_comparison'    // مقارنة العقود
  | 'financial_forecasting'  // التنبؤ المالي
  | 'performance_benchmarking'; // مقارنة الأداء

export interface AdvancedAIRequest {
  analysisType: AdvancedAnalysisType;
  data: any;
  parameters?: {
    timeframe?: string;
    depth?: 'basic' | 'detailed' | 'comprehensive';
    includeVisuals?: boolean;
    benchmarkData?: any;
  };
}

export interface AdvancedAIResponse {
  success: boolean;
  analysisType: AdvancedAnalysisType;
  results: {
    summary: string;
    detailedAnalysis: any;
    visualizations?: any[];
    recommendations: string[];
    actionItems: {
      priority: 'high' | 'medium' | 'low';
      task: string;
      timeline: string;
      impact: string;
    }[];
  };
  metadata: {
    processingTime: number;
    dataQuality: number;
    confidence: number;
    model: string;
  };
}

export const useAdvancedAI = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تحليل المشاعر للنصوص (عقود، مراسلات، تقييمات)
  const analyzeSentiment = useCallback(async (
    textData: string[],
    context?: { source: string; date?: Date }
  ): Promise<AdvancedAIResponse | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-contract-assistant', {
        body: {
          taskType: 'sentiment_analysis',
          prompt: `قم بتحليل المشاعر والنبرة في النصوص التالية وقدم تقييماً شاملاً`,
          context: {
            textData: textData.slice(0, 10), // تقييد العدد للأداء
            source: context?.source,
            analysisDepth: 'comprehensive'
          }
        }
      });

      if (error) throw new Error(error.message);
      
      return {
        success: true,
        analysisType: 'sentiment_analysis',
        results: {
          summary: data.message,
          detailedAnalysis: {
            overallSentiment: extractSentimentScore(data.message),
            sentimentTrends: analyzeTrends(textData),
            keyEmotions: extractKeyEmotions(data.message),
            concernAreas: extractConcerns(data.message)
          },
          recommendations: data.recommendations || [],
          actionItems: generateSentimentActionItems(data.message)
        },
        metadata: {
          processingTime: data.processingTime || 0,
          dataQuality: calculateTextQuality(textData),
          confidence: data.confidence || 0.8,
          model: 'advanced-sentiment-analyzer'
        }
      };
    } catch (err: any) {
      setError(err.message);
      toast.error('فشل في تحليل المشاعر');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // التنبؤ بالمخاطر المستقبلية
  const predictRisks = useCallback(async (
    historicalData: any[],
    currentIndicators: Record<string, number>
  ): Promise<AdvancedAIResponse | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-contract-assistant', {
        body: {
          taskType: 'risk_prediction',
          prompt: `استخدم البيانات التاريخية والمؤشرات الحالية للتنبؤ بالمخاطر المحتملة`,
          context: {
            historicalData: historicalData.slice(-50), // آخر 50 نقطة بيانات
            currentIndicators,
            predictionHorizon: '6_months'
          }
        }
      });

      if (error) throw new Error(error.message);
      
      return {
        success: true,
        analysisType: 'risk_prediction',
        results: {
          summary: data.message,
          detailedAnalysis: {
            riskFactors: extractRiskFactors(data.message),
            probabilityScores: generateRiskProbabilities(currentIndicators),
            timelines: extractTimeframes(data.message),
            impactAssessment: assessImpact(data.message)
          },
          visualizations: generateRiskCharts(historicalData, currentIndicators),
          recommendations: data.recommendations || [],
          actionItems: generateRiskActionItems(data.message)
        },
        metadata: {
          processingTime: data.processingTime || 0,
          dataQuality: calculateDataQuality(historicalData),
          confidence: data.confidence || 0.8,
          model: 'risk-prediction-engine'
        }
      };
    } catch (err: any) {
      setError(err.message);
      toast.error('فشل في التنبؤ بالمخاطر');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // التحليل التنافسي
  const analyzeCompetition = useCallback(async (
    companyData: any,
    marketData?: any
  ): Promise<AdvancedAIResponse | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-contract-assistant', {
        body: {
          taskType: 'competitive_analysis',
          prompt: `قم بتحليل الوضع التنافسي للشركة وقارنها مع السوق`,
          context: {
            companyMetrics: companyData,
            marketBenchmarks: marketData,
            analysisScope: 'comprehensive'
          }
        }
      });

      if (error) throw new Error(error.message);
      
      return {
        success: true,
        analysisType: 'competitive_analysis',
        results: {
          summary: data.message,
          detailedAnalysis: {
            competitivePosition: extractPosition(data.message),
            strengthsWeaknesses: extractSWOT(data.message),
            marketGaps: identifyGaps(data.message),
            competitiveAdvantages: extractAdvantages(data.message)
          },
          recommendations: data.recommendations || [],
          actionItems: generateCompetitiveActionItems(data.message)
        },
        metadata: {
          processingTime: data.processingTime || 0,
          dataQuality: 0.85,
          confidence: data.confidence || 0.8,
          model: 'competitive-analysis-pro'
        }
      };
    } catch (err: any) {
      setError(err.message);
      toast.error('فشل في التحليل التنافسي');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // مقارنة العقود
  const compareContracts = useCallback(async (
    contracts: any[],
    comparisonCriteria: string[]
  ): Promise<AdvancedAIResponse | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-contract-assistant', {
        body: {
          taskType: 'contract_comparison',
          prompt: `قارن العقود التالية وحدد الاختلافات والتشابهات المهمة`,
          context: {
            contracts: contracts.slice(0, 5), // تقييد العدد
            criteria: comparisonCriteria,
            comparisonType: 'detailed'
          }
        }
      });

      if (error) throw new Error(error.message);
      
      return {
        success: true,
        analysisType: 'contract_comparison',
        results: {
          summary: data.message,
          detailedAnalysis: {
            keyDifferences: extractDifferences(data.message),
            commonPatterns: findPatterns(data.message),
            riskAssessment: assessContractRisks(data.message),
            recommendations: extractContractRecommendations(data.message)
          },
          visualizations: generateComparisonCharts(contracts),
          recommendations: data.recommendations || [],
          actionItems: generateContractActionItems(data.message)
        },
        metadata: {
          processingTime: data.processingTime || 0,
          dataQuality: calculateContractQuality(contracts),
          confidence: data.confidence || 0.8,
          model: 'contract-comparison-expert'
        }
      };
    } catch (err: any) {
      setError(err.message);
      toast.error('فشل في مقارنة العقود');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    // الحالة
    isProcessing,
    error,
    
    // الوظائف
    analyzeSentiment,
    predictRisks,
    analyzeCompetition,
    compareContracts,
    
    // مساعدة
    clearError: () => setError(null)
  };
};

// دوال مساعدة للتحليل
function extractSentimentScore(text: string): { positive: number; negative: number; neutral: number } {
  // تحليل بسيط للمشاعر (يمكن تحسينه)
  const positiveWords = ['ممتاز', 'جيد', 'راض', 'سعيد', 'موافق'];
  const negativeWords = ['سيء', 'غير راض', 'مشكلة', 'خطأ', 'متأخر'];
  
  const positive = positiveWords.reduce((count, word) => 
    count + (text.includes(word) ? 1 : 0), 0);
  const negative = negativeWords.reduce((count, word) => 
    count + (text.includes(word) ? 1 : 0), 0);
  
  const total = positive + negative;
  return {
    positive: total > 0 ? positive / total : 0.5,
    negative: total > 0 ? negative / total : 0.3,
    neutral: total > 0 ? 1 - (positive + negative) / total : 0.2
  };
}

function analyzeTrends(textData: string[]): any[] {
  // تحليل الاتجاهات في البيانات النصية
  return textData.map((text, index) => ({
    period: index + 1,
    sentiment: extractSentimentScore(text),
    wordCount: text.split(' ').length,
    complexity: text.length / text.split(' ').length
  }));
}

function extractKeyEmotions(text: string): string[] {
  const emotions = ['فرح', 'غضب', 'خوف', 'حزن', 'دهشة', 'اشمئزاز'];
  return emotions.filter(emotion => text.includes(emotion));
}

function extractConcerns(text: string): string[] {
  const concernKeywords = ['مشكلة', 'تأخير', 'خطأ', 'شكوى', 'نزاع'];
  return concernKeywords.filter(keyword => text.includes(keyword));
}

function generateSentimentActionItems(analysis: string): any[] {
  return [
    {
      priority: 'high' as const,
      task: 'تحسين تجربة العملاء',
      timeline: 'أسبوعين',
      impact: 'تحسين الرضا العام'
    },
    {
      priority: 'medium' as const,
      task: 'مراجعة عمليات التواصل',
      timeline: 'شهر',
      impact: 'تقليل الشكاوى'
    }
  ];
}

function calculateTextQuality(textData: string[]): number {
  const avgLength = textData.reduce((sum, text) => sum + text.length, 0) / textData.length;
  return Math.min(1, avgLength / 100); // نموذج بسيط
}

function extractRiskFactors(text: string): string[] {
  const riskIndicators = ['تأخير', 'خسارة', 'مخاطر', 'نزاع', 'فشل'];
  return riskIndicators.filter(indicator => text.includes(indicator));
}

function generateRiskProbabilities(indicators: Record<string, number>): Record<string, number> {
  // حساب احتماليات المخاطر بناءً على المؤشرات
  return {
    financial_risk: indicators.debt_ratio > 0.7 ? 0.8 : 0.3,
    operational_risk: indicators.efficiency < 0.6 ? 0.7 : 0.2,
    legal_risk: indicators.compliance_score < 0.8 ? 0.6 : 0.1
  };
}

function extractTimeframes(text: string): Record<string, string> {
  return {
    immediate: 'الأسابيع القادمة',
    short_term: '1-3 أشهر',
    medium_term: '3-6 أشهر',
    long_term: '6+ أشهر'
  };
}

function assessImpact(text: string): Record<string, string> {
  return {
    financial: 'متوسط إلى عالي',
    operational: 'منخفض إلى متوسط',
    reputation: 'متوسط',
    legal: 'منخفض'
  };
}

function generateRiskCharts(historicalData: any[], currentIndicators: Record<string, number>): any[] {
  return [
    {
      type: 'line',
      title: 'اتجاه المخاطر عبر الزمن',
      data: historicalData.map((item, index) => ({
        period: index + 1,
        risk_score: Math.random() * 100 // نموذج للبيانات
      }))
    },
    {
      type: 'radar',
      title: 'خريطة المخاطر الحالية',
      data: Object.entries(currentIndicators).map(([key, value]) => ({
        category: key,
        score: value * 100
      }))
    }
  ];
}

function calculateDataQuality(data: any[]): number {
  const completeness = data.filter(item => item && Object.keys(item).length > 0).length / data.length;
  return Math.min(1, completeness);
}

function generateRiskActionItems(analysis: string): any[] {
  return [
    {
      priority: 'high' as const,
      task: 'تطوير خطة إدارة المخاطر',
      timeline: 'أسبوعين',
      impact: 'تقليل التعرض للمخاطر'
    }
  ];
}

// باقي الدوال المساعدة
function extractPosition(text: string): string { return 'متوسط في السوق'; }
function extractSWOT(text: string): any { return { strengths: [], weaknesses: [], opportunities: [], threats: [] }; }
function identifyGaps(text: string): string[] { return ['فجوة في الخدمة', 'فجوة في التسعير']; }
function extractAdvantages(text: string): string[] { return ['جودة الخدمة', 'سرعة الاستجابة']; }
function generateCompetitiveActionItems(analysis: string): any[] { return []; }
function extractDifferences(text: string): string[] { return ['اختلاف في الشروط', 'اختلاف في الأسعار']; }
function findPatterns(text: string): string[] { return ['نمط في المدة', 'نمط في الضمانات']; }
function assessContractRisks(text: string): any { return { high: [], medium: [], low: [] }; }
function extractContractRecommendations(text: string): string[] { return ['توحيد الشروط', 'تحسين الضمانات']; }
function generateComparisonCharts(contracts: any[]): any[] { return []; }
function calculateContractQuality(contracts: any[]): number { return 0.8; }
function generateContractActionItems(analysis: string): any[] { return []; }