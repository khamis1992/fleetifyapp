import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// أنواع البيانات
export interface LegalAIQuery {
  query: string;
  country: string;
  company_id: string;
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
  metadata?: {
    source: 'cache' | 'local_knowledge' | 'api';
    confidence: number;
    response_time: number;
    cost_saved?: boolean;
    usage_count?: number;
    match_score?: number;
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
      const { data, error } = await supabase.functions.invoke('legal-ai-api', {
        body: {
          ...queryData,
          path: 'legal-advice'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast.success('تم الحصول على الاستشارة بنجاح');
      } else {
        toast.error(data.message || 'حدث خطأ في معالجة الطلب');
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      setError(errorMessage);
      toast.error('حدث خطأ في الاتصال بالخادم');
      
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

