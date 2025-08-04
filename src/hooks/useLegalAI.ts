import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// أنواع البيانات
export interface LegalAIQuery {
  query: string;
  country: string;
  company_id: string;
  user_id?: string;
}

export interface LegalAIFeedback {
  query: string;
  country: string;
  rating: number;
  feedback_text?: string;
  company_id: string;
  message_id: string;
}

export interface LegalAIResponse {
  success: boolean;
  advice?: string;
  system_data?: any;
  classification?: {
    type: 'system_data' | 'legal_advice' | 'mixed';
    confidence: number;
    components?: { system_data: string[], legal_advice: string[] };
    reasoning?: string;
  };
  metadata?: {
    source: 'cache' | 'local_knowledge' | 'api' | 'system_data' | 'system_data_with_ai' | 'mixed_query_ai';
    confidence: number;
    response_time: number;
    cost_saved?: boolean;
    usage_count?: number;
    match_score?: number;
    data_sources?: string[];
    query_type?: 'system_data' | 'consultation' | 'memo' | 'contract' | 'licensing' | 'general' | 'mixed';
    components?: { system_data: string[], legal_advice: string[] };
  };
  message?: string;
}

export interface LegalAIFeedbackResponse {
  success: boolean;
  rating?: number;
  message?: string;
}

// استخدام Supabase Edge Function

export const useLegalAI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // إرسال استفسار قانوني
  const submitQuery = async (queryData: LegalAIQuery): Promise<LegalAIResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      
      // Get better company_id from user profile if possible
      let effectiveCompanyId = queryData.company_id;
      if (user?.user?.id && (!effectiveCompanyId || effectiveCompanyId === 'default-company')) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.user.id)
            .single();
          if (profile?.company_id) {
            effectiveCompanyId = profile.company_id;
          }
        } catch (profileError) {
          console.warn('Could not fetch user profile for company ID');
        }
      }

      const { data, error } = await supabase.functions.invoke('legal-ai-api', {
        body: {
          ...queryData,
          company_id: effectiveCompanyId,
          path: 'legal-advice',
          user_id: user?.user?.id
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message);
      }

      if (data?.success) {
        // رسائل محسنة بناءً على نوع الاستفسار وتصنيفه
        if (data.metadata?.query_type === 'system_data') {
          toast.success('📊 تم جلب البيانات المطلوبة من النظام بنجاح');
        } else if (data.metadata?.source === 'cache') {
          toast.success('⚡ تم العثور على إجابة سريعة من الذاكرة المؤقتة');
        } else if (data.metadata?.source === 'local_knowledge') {
          toast.success('📚 تم العثور على الإجابة في قاعدة المعرفة المحلية');
        } else if (data.metadata?.source === 'mixed_query_ai') {
          toast.success('🤖 تم تحليل الاستفسار المختلط بنجاح');
        } else if (data.classification?.type === 'mixed') {
          toast.success('🔄 تم معالجة الاستفسار المختلط بنجاح');
        } else {
          toast.success('✅ تم الحصول على الاستشارة القانونية بنجاح');
        }
      } else {
        console.error('API returned unsuccessful response:', data);
        toast.error(data?.message || 'حدث خطأ في معالجة الطلب');
      }

      return data || { success: false, message: 'No response data received' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      
      // Show more specific error messages
      if (errorMessage.includes('Unauthorized')) {
        toast.error('غير مخول للوصول - تحقق من صلاحياتك');
      } else if (errorMessage.includes('Company mismatch')) {
        toast.error('خطأ في معرف الشركة - اتصل بالدعم التقني');
      } else {
        toast.error('حدث خطأ في الاتصال بالخادم');
      }
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  // إرسال تقييم
  const submitFeedback = async (feedbackData: LegalAIFeedback): Promise<LegalAIFeedbackResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-api', {
        body: {
          ...feedbackData,
          path: 'feedback'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast.success('تم تسجيل تقييمك بنجاح');
      } else {
        toast.error(data.message || 'حدث خطأ في تسجيل التقييم');
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      toast.error('حدث خطأ في إرسال التقييم');
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  // اختبار الاتصال بالخادم
  const testConnection = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-api', {
        body: { path: 'health' }
      });
      return !error && data;
    } catch (error) {
      return false;
    }
  };

  return {
    submitQuery,
    submitFeedback,
    testConnection,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};

