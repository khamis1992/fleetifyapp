import { useState } from 'react';
import { toast } from 'sonner';

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

// عنوان API - استخدام Supabase Edge Function
const API_BASE_URL = '/functions/v1/legal-ai-api';

export const useLegalAI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // إرسال استفسار قانوني
  const submitQuery = async (queryData: LegalAIQuery): Promise<LegalAIResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/legal-advice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
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
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
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
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
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

