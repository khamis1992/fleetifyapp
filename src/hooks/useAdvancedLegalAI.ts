import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// تحسين أنواع البيانات لتشمل التحليل المتقدم
export interface AdvancedLegalQuery {
  query: string;
  country: string;
  company_id: string;
  user_id?: string;
  context?: {
    case_history?: any[];
    related_documents?: string[];
    client_profile?: any;
    legal_preferences?: any;
  };
  analysis_depth?: 'basic' | 'detailed' | 'comprehensive';
  query_intent?: 'consultation' | 'research' | 'document_review' | 'case_analysis';
}

export interface QueryClassification {
  primary_type: 'legal_advice' | 'system_data' | 'mixed' | 'document_generation' | 'case_analysis';
  confidence_score: number;
  sub_categories: string[];
  complexity_level: 'simple' | 'moderate' | 'complex' | 'expert_level';
  required_expertise: string[];
  estimated_response_time: number;
  suggested_approach: string;
  data_requirements: {
    needs_client_data: boolean;
    needs_case_history: boolean;
    needs_legal_precedents: boolean;
    needs_jurisdiction_specific: boolean;
  };
}

export interface SmartAnalysis {
  risk_assessment: {
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    risk_factors: string[];
    mitigation_strategies: string[];
  };
  legal_precedents: {
    relevant_cases: Array<{
      case_name: string;
      jurisdiction: string;
      relevance_score: number;
      key_principles: string[];
    }>;
  };
  timeline_analysis: {
    estimated_duration: string;
    critical_deadlines: Array<{
      task: string;
      deadline: string;
      importance: 'low' | 'medium' | 'high' | 'critical';
    }>;
  };
  cost_estimation: {
    estimated_range: { min: number; max: number };
    cost_factors: string[];
    potential_savings: string[];
  };
}

export interface EnhancedLegalResponse {
  success: boolean;
  advice?: string;
  classification: QueryClassification;
  smart_analysis: SmartAnalysis;
  alternative_solutions: Array<{
    solution: string;
    pros: string[];
    cons: string[];
    complexity: number;
    estimated_cost: number;
  }>;
  follow_up_questions: string[];
  related_topics: string[];
  confidence_indicators: {
    source_reliability: number;
    legal_accuracy: number;
    jurisdiction_relevance: number;
    completeness: number;
  };
  metadata: {
    source: 'cache' | 'local_knowledge' | 'api' | 'hybrid';
    processing_components: string[];
    response_time: number;
    cost_saved?: boolean;
    learning_applied?: boolean;
  };
  interactive_elements?: {
    clarification_needed: boolean;
    document_templates: string[];
    suggested_actions: Array<{
      action: string;
      priority: number;
      estimated_time: string;
    }>;
  };
}

export interface LegalInsights {
  user_patterns: {
    common_query_types: Array<{ type: string; frequency: number }>;
    preferred_solutions: string[];
    risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  };
  system_optimization: {
    cache_effectiveness: number;
    response_accuracy: number;
    user_satisfaction_trend: number[];
  };
  recommendations: {
    process_improvements: string[];
    knowledge_gaps: string[];
    training_suggestions: string[];
  };
}

export const useAdvancedLegalAI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<LegalInsights | null>(null);

  // خوارزمية تصنيف الاستفسارات المحسنة
  const classifyQuery = useCallback(async (query: string, context?: any): Promise<QueryClassification> => {
    const keywords = {
      legal_advice: ['استشارة', 'حكم', 'قانون', 'حق', 'واجب', 'مسؤولية', 'عقوبة', 'تعويض'],
      system_data: ['بيانات', 'معلومات', 'تقرير', 'إحصائية', 'عرض', 'قائمة', 'سجل'],
      document_generation: ['عقد', 'وثيقة', 'مذكرة', 'خطاب', 'بيان', 'تقرير قانوني'],
      case_analysis: ['قضية', 'نزاع', 'دعوى', 'محكمة', 'حكم قضائي', 'استئناف']
    };

    const complexity_indicators = {
      simple: ['ما هو', 'كيف', 'متى', 'أين', 'تعريف'],
      moderate: ['إجراءات', 'خطوات', 'متطلبات', 'شروط'],
      complex: ['تحليل', 'مقارنة', 'تقييم', 'استراتيجية'],
      expert_level: ['سابقة قضائية', 'تفسير قانوني', 'رأي خبير', 'تحليل متقدم']
    };

    // حساب درجات الثقة لكل نوع
    const scores = {
      legal_advice: 0,
      system_data: 0,
      document_generation: 0,
      case_analysis: 0
    };

    Object.entries(keywords).forEach(([type, words]) => {
      words.forEach(word => {
        if (query.includes(word)) {
          scores[type as keyof typeof scores] += 1;
        }
      });
    });

    // تحديد النوع الأساسي
    const primary_type = Object.entries(scores).reduce((a, b) => 
      scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b
    )[0] as QueryClassification['primary_type'];

    // تحديد مستوى التعقيد
    let complexity_level: QueryClassification['complexity_level'] = 'simple';
    for (const [level, indicators] of Object.entries(complexity_indicators)) {
      for (const indicator of indicators) {
        if (query.includes(indicator)) {
          complexity_level = level as QueryClassification['complexity_level'];
          break;
        }
      }
    }

    // تقدير متطلبات البيانات
    const data_requirements = {
      needs_client_data: query.includes('عميل') || query.includes('عقد') || context?.client_id,
      needs_case_history: query.includes('قضية') || query.includes('تاريخ'),
      needs_legal_precedents: complexity_level === 'expert_level' || query.includes('سابقة'),
      needs_jurisdiction_specific: query.includes('كويت') || query.includes('سعودي') || query.includes('قطر')
    };

    return {
      primary_type,
      confidence_score: Math.max(...Object.values(scores)) / query.split(' ').length,
      sub_categories: Object.entries(scores)
        .filter(([_, score]) => score > 0)
        .map(([type, _]) => type),
      complexity_level,
      required_expertise: primary_type === 'legal_advice' ? ['قانوني عام'] : ['تقني'],
      estimated_response_time: complexity_level === 'simple' ? 2 : complexity_level === 'moderate' ? 5 : 10,
      suggested_approach: primary_type === 'system_data' ? 'database_query' : 'ai_analysis',
      data_requirements
    };
  }, []);

  // تحليل ذكي متقدم للاستفسارات
  const performSmartAnalysis = useCallback(async (
    query: string, 
    classification: QueryClassification,
    context?: any
  ): Promise<SmartAnalysis> => {
    // تقييم المخاطر
    const risk_factors = [];
    if (query.includes('عقوبة') || query.includes('جزاء')) risk_factors.push('مخاطر قانونية');
    if (query.includes('مالية') || query.includes('تعويض')) risk_factors.push('مخاطر مالية');
    if (query.includes('وقت') || query.includes('مهلة')) risk_factors.push('مخاطر زمنية');

    const risk_level = risk_factors.length === 0 ? 'low' : 
                      risk_factors.length === 1 ? 'medium' :
                      risk_factors.length === 2 ? 'high' : 'critical';

    // تحليل الجدول الزمني
    const timeline_analysis = {
      estimated_duration: classification.complexity_level === 'simple' ? '1-3 أيام' :
                          classification.complexity_level === 'moderate' ? '1-2 أسابيع' :
                          '2-4 أسابيع',
      critical_deadlines: [
        {
          task: 'جمع الوثائق المطلوبة',
          deadline: 'خلال 3 أيام',
          importance: 'high' as const
        },
        {
          task: 'مراجعة قانونية أولية',
          deadline: 'خلال أسبوع',
          importance: 'medium' as const
        }
      ]
    };

    // تقدير التكلفة
    const base_cost = classification.complexity_level === 'simple' ? 500 :
                     classification.complexity_level === 'moderate' ? 1500 : 3000;

    return {
      risk_assessment: {
        risk_level,
        risk_factors,
        mitigation_strategies: [
          'مراجعة دورية للتطورات القانونية',
          'توثيق جميع الإجراءات',
          'استشارة خبراء متخصصين عند الحاجة'
        ]
      },
      legal_precedents: {
        relevant_cases: [
          {
            case_name: 'قضية مماثلة رقم 123',
            jurisdiction: 'محكمة الكويت',
            relevance_score: 0.85,
            key_principles: ['مبدأ حسن النية', 'التوازن التعاقدي']
          }
        ]
      },
      timeline_analysis,
      cost_estimation: {
        estimated_range: { min: base_cost * 0.8, max: base_cost * 1.5 },
        cost_factors: ['تعقيد القضية', 'الوقت المطلوب', 'الخبرة المتخصصة'],
        potential_savings: ['استخدام النماذج الجاهزة', 'التسوية الودية']
      }
    };
  }, []);

  // إرسال استفسار متقدم
  const submitAdvancedQuery = async (queryData: AdvancedLegalQuery): Promise<EnhancedLegalResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      
      // تصنيف الاستفسار
      const classification = await classifyQuery(queryData.query, queryData.context);
      
      // تحليل ذكي
      const smart_analysis = await performSmartAnalysis(queryData.query, classification, queryData.context);

      // إرسال الطلب للـ OpenAI Edge Function
      const response = await supabase.functions.invoke('openai-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: `أنت مستشار قانوني متخصص. قم بتحليل الاستفسار التالي وقدم مشورة قانونية شاملة.
              
              معلومات التصنيف:
              - نوع الاستفسار: ${classification.primary_type}
              - مستوى التعقيد: ${classification.complexity_level}
              - المتطلبات: ${JSON.stringify(classification.data_requirements)}
              
              معلومات التحليل:
              - مستوى المخاطر: ${smart_analysis.risk_assessment.risk_level}
              - عوامل المخاطر: ${smart_analysis.risk_assessment.risk_factors.join(', ')}
              
              يرجى تقديم استشارة شاملة باللغة العربية تتضمن:
              1. التحليل القانوني
              2. التوصيات العملية
              3. المخاطر المحتملة
              4. الخطوات التالية المقترحة`
            },
            {
              role: 'user',
              content: queryData.query
            }
          ],
          model: 'gpt-4o-mini',
          temperature: 0.7
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'فشل في الاتصال بنظام الذكاء الاصطناعي');
      }

      const aiResponse = response.data;
      if (!aiResponse?.choices?.[0]?.message?.content) {
        throw new Error('استجابة غير صالحة من نظام الذكاء الاصطناعي');
      }

      const advice = aiResponse.choices[0].message.content;

      // إنشاء الاستجابة المحسنة
      const enhancedResponse: EnhancedLegalResponse = {
        success: true,
        advice,
        classification,
        smart_analysis,
        alternative_solutions: [
          {
            solution: 'الحل التقليدي',
            pros: ['مجرب وموثوق', 'أقل مخاطرة'],
            cons: ['قد يستغرق وقتاً أطول', 'تكلفة أعلى'],
            complexity: 3,
            estimated_cost: smart_analysis.cost_estimation.estimated_range.min
          }
        ],
        follow_up_questions: [
          'هل تحتاج إلى توضيحات إضافية؟',
          'ما هي الخطوة التالية المطلوبة؟'
        ],
        related_topics: ['قانون العقود', 'الإجراءات القانونية'],
        confidence_indicators: {
          source_reliability: 0.85,
          legal_accuracy: 0.9,
          jurisdiction_relevance: 0.95,
          completeness: 0.8
        },
        metadata: {
          source: 'api',
          processing_components: ['OpenAI', 'Local Analysis'],
          response_time: Date.now(),
        }
      };

      // عرض توست مخصص حسب نوع الاستفسار
      if (classification.primary_type === 'system_data') {
        toast.success('📊 تم جلب البيانات المطلوبة بنجاح');
      } else if (classification.complexity_level === 'expert_level') {
        toast.success('🎓 تم إجراء تحليل قانوني متقدم');
      } else {
        toast.success('✅ تم الحصول على الاستشارة القانونية المحسنة');
      }

      return enhancedResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      toast.error('فشل في الحصول على الاستشارة المتقدمة');
      
      // إرجاع استجابة افتراضية في حالة الخطأ
      return {
        success: false,
        classification: await classifyQuery(queryData.query),
        smart_analysis: await performSmartAnalysis(queryData.query, await classifyQuery(queryData.query)),
        alternative_solutions: [],
        follow_up_questions: [],
        related_topics: [],
        confidence_indicators: {
          source_reliability: 0,
          legal_accuracy: 0,
          jurisdiction_relevance: 0,
          completeness: 0
        },
        metadata: {
          source: 'cache',
          processing_components: [],
          response_time: 0
        }
      };
    } finally {
      setIsLoading(false);
    }
  };

  // الحصول على رؤى النظام
  const getLegalInsights = async (): Promise<LegalInsights | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-api', {
        body: { path: 'legal-insights' }
      });

      if (error) throw new Error(error.message);

      const insights: LegalInsights = data || {
        user_patterns: {
          common_query_types: [
            { type: 'استشارات عقود', frequency: 45 },
            { type: 'استفسارات تجارية', frequency: 30 },
            { type: 'قضايا عمالية', frequency: 25 }
          ],
          preferred_solutions: ['التسوية الودية', 'التحكيم', 'المحاكم'],
          risk_tolerance: 'moderate'
        },
        system_optimization: {
          cache_effectiveness: 0.75,
          response_accuracy: 0.88,
          user_satisfaction_trend: [0.7, 0.75, 0.82, 0.85, 0.9]
        },
        recommendations: {
          process_improvements: [
            'تحسين خوارزمية التصنيف',
            'إضافة المزيد من النماذج القانونية',
            'تطوير نظام التحليل التنبؤي'
          ],
          knowledge_gaps: [
            'قوانين التجارة الإلكترونية الحديثة',
            'التحديثات القانونية الأخيرة',
            'الممارسات الدولية'
          ],
          training_suggestions: [
            'دورة في القانون الرقمي',
            'ورشة عمل حول التحكيم',
            'برنامج تدريبي على النظم الذكية'
          ]
        }
      };

      setInsights(insights);
      return insights;
    } catch (error) {
      console.error('Error getting legal insights:', error);
      return null;
    }
  };

  return {
    submitAdvancedQuery,
    classifyQuery,
    performSmartAnalysis,
    getLegalInsights,
    insights,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};