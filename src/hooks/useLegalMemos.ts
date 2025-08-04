import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface CustomerSearchResult {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  customer_type: 'individual' | 'corporate';
  email?: string;
  phone?: string;
  national_id?: string;
  passport_number?: string;
  is_blacklisted: boolean;
}

export interface CustomerAnalysis {
  customer: any;
  financial_summary: {
    total_contract_value: number;
    total_invoiced: number;
    total_paid: number;
    outstanding_amount: number;
    payment_status: string;
  };
  contracts: any[];
  recent_invoices: any[];
  recent_payments: any[];
  risk_factors: string[];
  recommendations: string[];
}

export interface LegalMemo {
  id: string;
  company_id: string;
  customer_id: string;
  memo_number: string;
  title: string;
  content: string;
  memo_type: string;
  status: string;
  template_id?: string;
  generated_by_ai: boolean;
  data_sources: any;
  recommendations: any;
  created_by: string;
  approved_by?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export const useLegalMemos = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, companyId } = useUnifiedCompanyAccess();

  // البحث عن العملاء
  const searchCustomers = async (searchTerm: string): Promise<CustomerSearchResult[]> => {
    if (!companyId || !user?.id) {
      throw new Error('Company ID and User ID are required');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-api', {
        body: {
          path: 'search-customers',
          company_id: companyId,
          user_id: user.id,
          search_term: searchTerm
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to search customers');
      }

      return data.customers;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ في البحث عن العملاء';
      setError(errorMessage);
      toast.error(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // تحليل العميل
  const analyzeCustomer = async (customerId: string): Promise<CustomerAnalysis | null> => {
    if (!companyId || !user?.id) {
      throw new Error('Company ID and User ID are required');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-api', {
        body: {
          path: 'analyze-customer',
          company_id: companyId,
          user_id: user.id,
          customer_id: customerId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to analyze customer');
      }

      return data.analysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ في تحليل العميل';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // إنشاء مذكرة قانونية بالذكاء الاصطناعي
  const generateMemo = async (customerId: string, memoType?: string, customPrompt?: string): Promise<LegalMemo | null> => {
    if (!companyId || !user?.id) {
      throw new Error('Company ID and User ID are required');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-api', {
        body: {
          path: 'generate-memo',
          company_id: companyId,
          user_id: user.id,
          customer_id: customerId,
          memo_type: memoType,
          custom_prompt: customPrompt
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to generate memo');
      }

      toast.success('تم إنشاء المذكرة القانونية بنجاح');
      return data.memo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ في إنشاء المذكرة القانونية';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // الحصول على المذكرات القانونية
  const getMemos = async (): Promise<LegalMemo[]> => {
    if (!companyId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('legal_memos')
        .select(`
          *,
          customer:customers(first_name, last_name, company_name, customer_type)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching memos:', error);
      return [];
    }
  };

  // تحديث حالة المذكرة
  const updateMemoStatus = async (memoId: string, status: string): Promise<boolean> => {
    if (!companyId) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('legal_memos')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'approved' && { approved_by: user?.id }),
          ...(status === 'sent' && { sent_at: new Date().toISOString() })
        })
        .eq('id', memoId)
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      toast.success('تم تحديث حالة المذكرة بنجاح');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ في تحديث المذكرة';
      toast.error(errorMessage);
      return false;
    }
  };

  // حذف المذكرة
  const deleteMemo = async (memoId: string): Promise<boolean> => {
    if (!companyId) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('legal_memos')
        .delete()
        .eq('id', memoId)
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      toast.success('تم حذف المذكرة بنجاح');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ في حذف المذكرة';
      toast.error(errorMessage);
      return false;
    }
  };

  return {
    searchCustomers,
    analyzeCustomer,
    generateMemo,
    getMemos,
    updateMemoStatus,
    deleteMemo,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};