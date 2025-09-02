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

      // استدعاء API الحقيقي
      const response = await callAIContractAssistant(requestData, abortControllerRef.current.signal);

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
 * استدعاء مساعد العقود الذكي عبر Supabase Edge Function
 */
async function callAIContractAssistant(
  requestData: any, 
  signal: AbortSignal
): Promise<AIResponse> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase.functions.invoke('ai-contract-assistant', {
      body: requestData
    });

    if (error) {
      console.error('Error calling AI contract assistant:', error);
      throw new Error(error.message || 'فشل في الاتصال بالمساعد الذكي');
    }

    if (!data.success) {
      throw new Error(data.error || 'حدث خطأ في المساعد الذكي');
    }

    return data;
  } catch (error: any) {
    if (signal.aborted) {
      throw new Error('Request aborted');
    }
    
    console.error('AI Assistant API Error:', error);
    throw new Error(error.message || 'حدث خطأ في الاتصال بالمساعد الذكي');
  }
}
