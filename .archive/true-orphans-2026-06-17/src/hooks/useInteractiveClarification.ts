import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClarificationRequest {
  id: string;
  original_query: string;
  ambiguity_type: 'missing_context' | 'multiple_interpretations' | 'unclear_intent' | 'incomplete_data';
  confidence_score: number;
  clarification_questions: Array<{
    question: string;
    type: 'single_choice' | 'multiple_choice' | 'text_input' | 'confirmation';
    options?: string[];
    priority: 'high' | 'medium' | 'low';
  }>;
  suggested_interpretations: Array<{
    interpretation: string;
    confidence: number;
    consequences: string[];
  }>;
  context_hints: string[];
  created_at: Date;
}

export interface ClarificationResponse {
  request_id: string;
  responses: Record<string, any>;
  user_selected_interpretation?: string;
  additional_context?: string;
  confidence_improvement: number;
}

export interface QueryRefinement {
  original_query: string;
  refined_query: string;
  refinement_type: 'disambiguation' | 'context_addition' | 'intent_clarification' | 'scope_narrowing';
  confidence_before: number;
  confidence_after: number;
  applied_context: Record<string, any>;
}

export const useInteractiveClarification = () => {
  const [pendingClarifications, setPendingClarifications] = useState<ClarificationRequest[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // تحليل الغموض في الاستفسار
  const analyzeQueryAmbiguity = useCallback((
    query: string,
    context?: Record<string, any>
  ): {
    has_ambiguity: boolean;
    ambiguity_score: number;
    ambiguity_sources: Array<{
      type: ClarificationRequest['ambiguity_type'];
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  } => {
    const ambiguity_sources: Array<{
      type: ClarificationRequest['ambiguity_type'];
      description: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    let ambiguity_score = 0;

    // تحليل السياق المفقود
    const contextClues = [
      { pattern: /كم\s+(?!.*من|.*في|.*عن)/, missing: 'المجال المحدد', severity: 'high' as const },
      { pattern: /هذا|هذه|ذلك|تلك(?!\s+\w+)/, missing: 'المرجع المحدد', severity: 'medium' as const },
      { pattern: /العميل(?!\s+\w+)/, missing: 'هوية العميل', severity: 'medium' as const },
      { pattern: /القضية(?!\s+\w+)/, missing: 'تفاصيل القضية', severity: 'medium' as const },
      { pattern: /الوثيقة(?!\s+\w+)/, missing: 'نوع الوثيقة', severity: 'low' as const }
    ];

    contextClues.forEach(({ pattern, missing, severity }) => {
      if (pattern.test(query)) {
        ambiguity_sources.push({
          type: 'missing_context',
          description: `السياق المفقود: ${missing}`,
          severity
        });
        ambiguity_score += severity === 'high' ? 0.3 : severity === 'medium' ? 0.2 : 0.1;
      }
    });

    // تحليل التفسيرات المتعددة
    const multipleInterpretations = [
      {
        pattern: /دفع|سداد/,
        interpretations: ['دفع نقدي', 'دفع بنكي', 'دفع مؤجل'],
        description: 'نوع الدفع غير محدد'
      },
      {
        pattern: /عميل/,
        interpretations: ['عميل حالي', 'عميل سابق', 'عميل محتمل'],
        description: 'حالة العميل غير واضحة'
      },
      {
        pattern: /قضية/,
        interpretations: ['قضية جنائية', 'قضية مدنية', 'قضية تجارية'],
        description: 'نوع القضية غير محدد'
      }
    ];

    multipleInterpretations.forEach(({ pattern, interpretations, description }) => {
      if (pattern.test(query) && interpretations.length > 1) {
        ambiguity_sources.push({
          type: 'multiple_interpretations',
          description,
          severity: 'medium'
        });
        ambiguity_score += 0.15;
      }
    });

    // تحليل النية غير الواضحة
    const intentMarkers = [
      /\?\s*$/, // علامة استفهام
      /كيف|ماذا|متى|أين|لماذا/, // كلمات استفهام
      /أريد|أحتاج|ممكن/, // تعبيرات الطلب
      /اشرح|وضح|اعرض/ // تعبيرات التوضيح
    ];

    const hasIntentMarkers = intentMarkers.some(pattern => pattern.test(query));
    if (!hasIntentMarkers && query.split(' ').length < 4) {
      ambiguity_sources.push({
        type: 'unclear_intent',
        description: 'النية من الاستفسار غير واضحة',
        severity: 'high'
      });
      ambiguity_score += 0.25;
    }

    // تحليل نقص البيانات
    const dataRequirements = [
      { keyword: 'تقرير', requirement: 'فترة زمنية' },
      { keyword: 'مقارنة', requirement: 'عناصر المقارنة' },
      { keyword: 'تحليل', requirement: 'معايير التحليل' },
      { keyword: 'إحصائية', requirement: 'نطاق الإحصائية' }
    ];

    dataRequirements.forEach(({ keyword, requirement }) => {
      if (query.includes(keyword) && !context?.[requirement]) {
        ambiguity_sources.push({
          type: 'incomplete_data',
          description: `بيانات مفقودة: ${requirement}`,
          severity: 'medium'
        });
        ambiguity_score += 0.15;
      }
    });

    return {
      has_ambiguity: ambiguity_score > 0.2,
      ambiguity_score: Math.min(ambiguity_score, 1.0),
      ambiguity_sources
    };
  }, []);

  // إنشاء طلب توضيح
  const createClarificationRequest = useCallback((
    query: string,
    ambiguityAnalysis: ReturnType<typeof analyzeQueryAmbiguity>,
    context?: Record<string, any>
  ): ClarificationRequest => {
    const clarificationId = `clarify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const clarification_questions: ClarificationRequest['clarification_questions'] = [];
    const suggested_interpretations: ClarificationRequest['suggested_interpretations'] = [];
    const context_hints: string[] = [];

    // إنشاء أسئلة التوضيح حسب نوع الغموض
    ambiguityAnalysis.ambiguity_sources.forEach(source => {
      switch (source.type) {
        case 'missing_context':
          if (source.description.includes('المجال المحدد')) {
            clarification_questions.push({
              question: 'في أي مجال تريد الاستفسار؟',
              type: 'single_choice',
              options: ['العملاء', 'القضايا', 'المالية', 'الوثائق', 'العقود'],
              priority: 'high'
            });
          }
          
          if (source.description.includes('هوية العميل')) {
            clarification_questions.push({
              question: 'عن أي عميل تتحدث؟',
              type: 'text_input',
              priority: 'medium'
            });
            context_hints.push('يمكنك ذكر اسم العميل أو رقم حسابه');
          }
          break;

        case 'multiple_interpretations':
          if (source.description.includes('نوع الدفع')) {
            clarification_questions.push({
              question: 'ما نوع الدفع المطلوب؟',
              type: 'single_choice',
              options: ['جميع أنواع الدفع', 'الدفع النقدي فقط', 'الدفع البنكي فقط', 'الدفع المؤجل'],
              priority: 'medium'
            });
          }

          if (source.description.includes('نوع القضية')) {
            clarification_questions.push({
              question: 'ما نوع القضايا المطلوب عرضها؟',
              type: 'multiple_choice',
              options: ['قضايا جنائية', 'قضايا مدنية', 'قضايا تجارية', 'قضايا عمالية'],
              priority: 'medium'
            });
          }
          break;

        case 'unclear_intent':
          clarification_questions.push({
            question: 'ما الهدف من استفسارك؟',
            type: 'single_choice',
            options: [
              'الحصول على معلومات وبيانات',
              'طلب استشارة قانونية',
              'توضيح إجراء معين',
              'حل مشكلة تقنية'
            ],
            priority: 'high'
          });
          break;

        case 'incomplete_data':
          if (source.description.includes('فترة زمنية')) {
            clarification_questions.push({
              question: 'ما الفترة الزمنية المطلوبة؟',
              type: 'single_choice',
              options: ['آخر أسبوع', 'آخر شهر', 'آخر ثلاثة أشهر', 'آخر سنة', 'فترة مخصصة'],
              priority: 'high'
            });
          }
          break;
      }
    });

    // إنشاء التفسيرات المقترحة
    if (query.includes('كم') && query.includes('عميل')) {
      suggested_interpretations.push(
        {
          interpretation: 'عدد العملاء الإجمالي',
          confidence: 0.7,
          consequences: ['سيتم عرض العدد الكلي لجميع العملاء']
        },
        {
          interpretation: 'عدد العملاء الذين لم يسددوا',
          confidence: 0.8,
          consequences: ['سيتم عرض العملاء المتأخرين في السداد فقط']
        },
        {
          interpretation: 'عدد العملاء الجدد',
          confidence: 0.6,
          consequences: ['سيتم عرض العملاء المضافين مؤخراً']
        }
      );
    }

    // إضافة تلميحات السياق
    if (context?.recent_topics?.length) {
      context_hints.push(`المواضيع الأخيرة: ${context.recent_topics.join(', ')}`);
    }

    context_hints.push(
      'يمكنك إعادة صياغة السؤال بوضوح أكبر',
      'تأكد من تحديد التفاصيل المهمة في استفسارك'
    );

    return {
      id: clarificationId,
      original_query: query,
      ambiguity_type: ambiguityAnalysis.ambiguity_sources[0]?.type || 'unclear_intent',
      confidence_score: 1 - ambiguityAnalysis.ambiguity_score,
      clarification_questions,
      suggested_interpretations,
      context_hints,
      created_at: new Date()
    };
  }, []);

  // معالجة رد التوضيح
  const processClarificationResponse = useCallback((
    response: ClarificationResponse
  ): QueryRefinement => {
    const request = pendingClarifications.find(req => req.id === response.request_id);
    if (!request) {
      throw new Error('طلب التوضيح غير موجود');
    }

    let refined_query = request.original_query;
    const applied_context: Record<string, any> = {};
    let refinement_type: QueryRefinement['refinement_type'] = 'disambiguation';

    // تطبيق ردود التوضيح
    Object.entries(response.responses).forEach(([questionKey, answer]) => {
      const question = request.clarification_questions.find(q => 
        q.question.toLowerCase().includes(questionKey.toLowerCase())
      );

      if (question) {
        switch (question.type) {
          case 'single_choice':
            if (questionKey.includes('مجال')) {
              refined_query = refined_query.replace(/كم/, `كم ${answer}`);
              applied_context.domain = answer;
              refinement_type = 'scope_narrowing';
            }
            
            if (questionKey.includes('نوع الدفع')) {
              refined_query += ` (${answer})`;
              applied_context.payment_type = answer;
            }

            if (questionKey.includes('الهدف')) {
              applied_context.intent = answer;
              refinement_type = 'intent_clarification';
            }
            break;

          case 'multiple_choice':
            if (Array.isArray(answer)) {
              refined_query += ` شامل: ${answer.join(' و ')}`;
              applied_context.categories = answer;
            }
            break;

          case 'text_input':
            refined_query = refined_query.replace(/العميل/, `العميل ${answer}`);
            applied_context.specific_entity = answer;
            refinement_type = 'context_addition';
            break;

          case 'confirmation':
            if (answer === true) {
              applied_context.confirmed = true;
            }
            break;
        }
      }
    });

    // إضافة السياق الإضافي
    if (response.additional_context) {
      refined_query += ` (ملاحظة: ${response.additional_context})`;
      applied_context.user_note = response.additional_context;
    }

    // تطبيق التفسير المختار
    if (response.user_selected_interpretation) {
      applied_context.selected_interpretation = response.user_selected_interpretation;
    }

    // إزالة طلب التوضيح من القائمة المعلقة
    setPendingClarifications(prev => 
      prev.filter(req => req.id !== response.request_id)
    );

    return {
      original_query: request.original_query,
      refined_query,
      refinement_type,
      confidence_before: request.confidence_score,
      confidence_after: Math.min(request.confidence_score + response.confidence_improvement, 1.0),
      applied_context
    };
  }, [pendingClarifications]);

  // تقييم الحاجة للتوضيح
  const assessClarificationNeed = useCallback(async (
    query: string,
    context?: Record<string, any>
  ): Promise<{
    needs_clarification: boolean;
    clarification_request?: ClarificationRequest;
    auto_suggestions?: string[];
  }> => {
    setIsProcessing(true);

    try {
      const ambiguityAnalysis = analyzeQueryAmbiguity(query, context);

      if (!ambiguityAnalysis.has_ambiguity) {
        return {
          needs_clarification: false,
          auto_suggestions: [
            'الاستفسار واضح ويمكن معالجته مباشرة',
            'يمكنك إضافة تفاصيل أكثر للحصول على نتائج أدق'
          ]
        };
      }

      // إنشاء طلب التوضيح
      const clarificationRequest = createClarificationRequest(query, ambiguityAnalysis, context);
      
      // إضافة الطلب للقائمة المعلقة
      setPendingClarifications(prev => [...prev, clarificationRequest]);

      return {
        needs_clarification: true,
        clarification_request: clarificationRequest
      };

    } finally {
      setIsProcessing(false);
    }
  }, [analyzeQueryAmbiguity, createClarificationRequest]);

  // اقتراح تحسينات تلقائية
  const suggestQueryImprovements = useCallback((query: string): string[] => {
    const suggestions: string[] = [];

    // اقتراحات لتحسين الوضوح
    if (query.length < 10) {
      suggestions.push('حاول إضافة المزيد من التفاصيل لاستفسارك');
    }

    if (!query.includes('؟') && /^(كم|ماذا|كيف|متى|أين|لماذا)/.test(query)) {
      suggestions.push('أضف علامة استفهام (؟) في نهاية السؤال');
    }

    if (/هذا|هذه|ذلك|تلك/.test(query)) {
      suggestions.push('حدد بوضوح ما تقصده بـ "هذا" أو "ذلك"');
    }

    if (query.includes('عميل') && !query.includes('العملاء')) {
      suggestions.push('وضح إذا كنت تقصد عميل محدد أم جميع العملاء');
    }

    return suggestions;
  }, []);

  return {
    assessClarificationNeed,
    processClarificationResponse,
    suggestQueryImprovements,
    analyzeQueryAmbiguity,
    pendingClarifications,
    isProcessing
  };
};