import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { 
  AIAssistantConfig, 
  AIAssistantState, 
  AIMessage, 
  AIResponse, 
  AISuggestion,
  AIUseCasePrimitive,
  SystemModule,
  TaskType,
  AIDataAnalysisResult,
  AIContentCreationResult,
  AIResearchResult
} from '@/types/ai-assistant';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

/**
 * Hook المساعد الذكي المشترك
 * يوفر واجهة موحدة للتفاعل مع جميع أنواع المساعدين الذكيين
 */
export const useAIAssistant = (config: AIAssistantConfig) => {
  const { companyId, user } = useUnifiedCompanyAccess();
  const [state, setState] = useState<AIAssistantState>({
    isActive: false,
    isLoading: false,
    messages: [],
    suggestions: [],
    context: config.context || {}
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // تحديث السياق
  const updateContext = useCallback((newContext: Record<string, any>) => {
    setState(prev => ({
      ...prev,
      context: { ...prev.context, ...newContext }
    }));
  }, []);

  // إضافة رسالة جديدة
  const addMessage = useCallback((message: Omit<AIMessage, 'id' | 'timestamp'>) => {
    const newMessage: AIMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));

    return newMessage;
  }, []);

  // تنفيذ مهمة ذكية
  const executeTask = useCallback(async (
    taskType: TaskType,
    prompt: string,
    additionalContext?: Record<string, any>
  ): Promise<AIResponse> => {
    // إلغاء أي طلب سابق
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isLoading: true,
      currentTask: taskType,
      error: undefined
    }));

    try {
      // إضافة رسالة المستخدم
      addMessage({
        role: 'user',
        content: prompt,
        metadata: { taskType }
      });

      // تحضير البيانات للإرسال
      const requestData = {
        module: config.module,
        taskType,
        prompt,
        context: {
          ...state.context,
          ...additionalContext,
          companyId,
          userId: user?.id,
          userRole: user?.role
        },
        primitives: config.primitives,
        priority: config.priority
      };

      // محاكاة استدعاء API (سيتم استبداله بـ API حقيقي)
      const response = await simulateAIResponse(requestData, abortControllerRef.current.signal);

      // إضافة رسالة المساعد
      addMessage({
        role: 'assistant',
        content: response.message,
        metadata: {
          taskType,
          confidence: response.confidence,
          sources: response.data?.sources
        }
      });

      // تحديث الاقتراحات
      if (response.suggestions) {
        setState(prev => ({
          ...prev,
          suggestions: response.suggestions || []
        }));
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        currentTask: undefined
      }));

      return response;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('AI request was aborted');
        return { success: false, message: 'تم إلغاء الطلب' };
      }

      const errorMessage = error.message || 'حدث خطأ في المساعد الذكي';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        currentTask: undefined,
        error: errorMessage
      }));

      toast.error(errorMessage);
      
      return { success: false, message: errorMessage };
    }
  }, [config, state.context, companyId, user, addMessage]);

  // تنفيذ مهام محددة حسب النوع
  const generateContent = useCallback(async (
    contentType: string,
    requirements: string,
    template?: string
  ): Promise<AIContentCreationResult | null> => {
    const response = await executeTask(
      'generate_document',
      `قم بإنشاء ${contentType} بناءً على المتطلبات التالية: ${requirements}${template ? `\nاستخدم هذا القالب: ${template}` : ''}`,
      { contentType, requirements, template }
    );

    return response.success ? response.data : null;
  }, [executeTask]);

  const analyzeData = useCallback(async (
    data: any[],
    analysisType: string,
    questions?: string[]
  ): Promise<AIDataAnalysisResult | null> => {
    const response = await executeTask(
      'analyze_data',
      `قم بتحليل البيانات التالية: ${JSON.stringify(data.slice(0, 100))} نوع التحليل: ${analysisType}${questions ? `\nالأسئلة المحددة: ${questions.join(', ')}` : ''}`,
      { data, analysisType, questions }
    );

    return response.success ? response.data : null;
  }, [executeTask]);

  const researchTopic = useCallback(async (
    topic: string,
    scope: string,
    sources?: string[]
  ): Promise<AIResearchResult | null> => {
    const response = await executeTask(
      'research_topic',
      `ابحث عن معلومات حول: ${topic} النطاق: ${scope}${sources ? `\nالمصادر المفضلة: ${sources.join(', ')}` : ''}`,
      { topic, scope, sources }
    );

    return response.success ? response.data : null;
  }, [executeTask]);

  const suggestActions = useCallback(async (
    situation: string,
    goals: string[],
    constraints?: string[]
  ): Promise<AISuggestion[]> => {
    const response = await executeTask(
      'suggest_action',
      `الوضع الحالي: ${situation}\nالأهداف: ${goals.join(', ')}${constraints ? `\nالقيود: ${constraints.join(', ')}` : ''}`,
      { situation, goals, constraints }
    );

    return response.suggestions || [];
  }, [executeTask]);

  // تفعيل/إلغاء تفعيل المساعد
  const toggleAssistant = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: !prev.isActive
    }));
  }, []);

  // مسح المحادثة
  const clearConversation = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      suggestions: [],
      error: undefined
    }));
  }, []);

  // إلغاء المهمة الحالية
  const cancelCurrentTask = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState(prev => ({
      ...prev,
      isLoading: false,
      currentTask: undefined
    }));
  }, []);

  // تنظيف عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // الحالة
    ...state,
    
    // الوظائف الأساسية
    executeTask,
    updateContext,
    addMessage,
    toggleAssistant,
    clearConversation,
    cancelCurrentTask,
    
    // الوظائف المتخصصة
    generateContent,
    analyzeData,
    researchTopic,
    suggestActions,
    
    // معلومات التكوين
    config,
    isConfigured: config.primitives.length > 0
  };
};

/**
 * محاكاة استجابة المساعد الذكي
 * سيتم استبدالها بـ API حقيقي لاحقاً
 */
async function simulateAIResponse(
  requestData: any, 
  signal: AbortSignal
): Promise<AIResponse> {
  // محاكاة وقت المعالجة
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
  
  if (signal.aborted) {
    throw new Error('Request aborted');
  }

  const { taskType, prompt, module, context } = requestData;

  // استجابات محاكاة حسب نوع المهمة
  const responses: Record<TaskType, () => AIResponse> = {
    generate_document: () => ({
      success: true,
      message: `تم إنشاء الوثيقة بنجاح. الوثيقة تحتوي على جميع العناصر المطلوبة وتتبع أفضل الممارسات في ${module}.`,
      data: {
        content: `# الوثيقة المُنشأة\n\nبناءً على طلبك: "${prompt}"\n\nتم إنشاء هذه الوثيقة تلقائياً باستخدام الذكاء الاصطناعي...`,
        type: 'document',
        format: 'markdown',
        metadata: {
          wordCount: 250,
          readingTime: 2,
          tone: 'professional',
          language: 'ar'
        }
      },
      suggestions: [
        {
          id: 'edit_doc',
          title: 'تعديل الوثيقة',
          description: 'قم بتعديل أجزاء معينة من الوثيقة',
          action: 'edit_document',
          confidence: 0.9,
          primitive: 'content_creation'
        },
        {
          id: 'export_pdf',
          title: 'تصدير PDF',
          description: 'تصدير الوثيقة كملف PDF',
          action: 'export_pdf',
          confidence: 0.95,
          primitive: 'automation'
        }
      ],
      confidence: 0.87,
      processingTime: 2.3
    }),

    analyze_data: () => ({
      success: true,
      message: `تم تحليل البيانات بنجاح. وجدت ${Math.floor(Math.random() * 5) + 3} رؤى مهمة و ${Math.floor(Math.random() * 3) + 2} توصيات قابلة للتنفيذ.`,
      data: {
        summary: 'تحليل شامل للبيانات المقدمة يظهر اتجاهات إيجابية مع بعض المجالات التي تحتاج تحسين.',
        insights: [
          'نمو بنسبة 15% في الأداء خلال الربع الأخير',
          'انخفاض في معدل الشكاوى بنسبة 8%',
          'زيادة في رضا العملاء بنسبة 12%'
        ],
        recommendations: [
          'التركيز على تحسين الخدمات في المناطق ذات الأداء المنخفض',
          'زيادة الاستثمار في التدريب والتطوير'
        ],
        confidence: 0.82,
        dataQuality: 0.91
      },
      confidence: 0.82,
      processingTime: 3.1
    }),

    create_report: () => ({
      success: true,
      message: 'تم إنشاء التقرير بنجاح مع جميع الرسوم البيانية والتحليلات المطلوبة.',
      data: {
        reportId: `report_${Date.now()}`,
        title: 'تقرير تحليلي شامل',
        sections: ['الملخص التنفيذي', 'التحليل التفصيلي', 'التوصيات', 'الخطوات التالية'],
        charts: 3,
        pages: 12
      },
      suggestions: [
        {
          id: 'schedule_report',
          title: 'جدولة التقرير',
          description: 'إنشاء تقارير دورية تلقائية',
          action: 'schedule_report',
          confidence: 0.88,
          primitive: 'automation'
        }
      ],
      confidence: 0.91,
      processingTime: 4.2
    }),

    suggest_action: () => ({
      success: true,
      message: 'تم تحليل الوضع وإعداد قائمة بالإجراءات المقترحة مرتبة حسب الأولوية والتأثير المتوقع.',
      suggestions: [
        {
          id: 'action_1',
          title: 'تحسين العملية الحالية',
          description: 'تطبيق تحسينات على العملية لزيادة الكفاءة بنسبة 20%',
          action: 'optimize_process',
          confidence: 0.85,
          primitive: 'ideation_strategy'
        },
        {
          id: 'action_2',
          title: 'أتمتة المهام المتكررة',
          description: 'أتمتة 60% من المهام اليدوية لتوفير الوقت',
          action: 'automate_tasks',
          confidence: 0.78,
          primitive: 'automation'
        }
      ],
      confidence: 0.83,
      processingTime: 2.8
    }),

    automate_process: () => ({
      success: true,
      message: 'تم تحديد العمليات القابلة للأتمتة وإعداد خطة التنفيذ.',
      data: {
        automationPlan: {
          processes: 4,
          estimatedTimeSaving: '15 ساعة أسبوعياً',
          implementationTime: '2-3 أسابيع',
          roi: '300%'
        }
      },
      confidence: 0.79,
      processingTime: 3.5
    }),

    research_topic: () => ({
      success: true,
      message: 'تم البحث في الموضوع وجمع معلومات شاملة من مصادر موثوقة.',
      data: {
        query: prompt,
        results: [
          {
            title: 'دراسة حديثة في المجال',
            summary: 'نتائج مهمة تظهر اتجاهات جديدة...',
            source: 'مجلة علمية محكمة',
            relevance: 0.92
          },
          {
            title: 'تقرير صناعي شامل',
            summary: 'تحليل السوق والتوقعات المستقبلية...',
            source: 'مؤسسة بحثية',
            relevance: 0.87
          }
        ],
        synthesis: 'بناءً على البحث، يمكن استنتاج أن...',
        recommendations: [
          'التركيز على الاتجاهات الناشئة',
          'الاستثمار في التقنيات الجديدة'
        ],
        confidence: 0.84
      },
      confidence: 0.84,
      processingTime: 5.1
    }),

    optimize_workflow: () => ({
      success: true,
      message: 'تم تحليل سير العمل الحالي وتحديد نقاط التحسين الرئيسية.',
      data: {
        currentEfficiency: 0.67,
        optimizedEfficiency: 0.89,
        improvements: [
          'إزالة الخطوات المكررة',
          'تحسين التواصل بين الأقسام',
          'أتمتة المهام الروتينية'
        ],
        estimatedImpact: 'توفير 25% من الوقت'
      },
      confidence: 0.81,
      processingTime: 3.7
    }),

    predict_outcome: () => ({
      success: true,
      message: 'تم إنشاء نموذج تنبؤي بناءً على البيانات التاريخية والاتجاهات الحالية.',
      data: {
        predictions: [
          { metric: 'الإيرادات', prediction: '+12%', confidence: 0.78 },
          { metric: 'رضا العملاء', prediction: '+8%', confidence: 0.82 },
          { metric: 'الكفاءة التشغيلية', prediction: '+15%', confidence: 0.75 }
        ],
        timeframe: '6 أشهر',
        accuracy: 0.79
      },
      confidence: 0.79,
      processingTime: 4.8
    })
  };

  return responses[taskType]?.() || {
    success: false,
    message: 'نوع المهمة غير مدعوم حالياً',
    confidence: 0
  };
}
