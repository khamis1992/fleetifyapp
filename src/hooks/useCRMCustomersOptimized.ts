import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CRMCustomerData {
  customer_id: string;
  customer_code: string;
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  phone: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  contract_id?: string;
  contract_number?: string;
  contract_status?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  days_until_expiry?: number;
  total_invoices?: number;
  total_invoiced_amount?: number;
  total_paid_amount?: number;
  outstanding_amount?: number;
  overdue_invoices?: number;
  overdue_amount?: number;
  total_interactions?: number;
  last_interaction_date?: string;
  last_interaction_type?: string;
  days_since_last_interaction?: number;
}

/**
 * Hook محسّن لجلب بيانات CRM
 * يستخدم RPC function واحدة لجلب جميع البيانات
 * يحسّن الأداء بشكل كبير
 */
export function useCRMCustomersOptimized(companyId: string | null) {
  return useQuery({
    queryKey: ['crm-customers-optimized', companyId],
    queryFn: async (): Promise<CRMCustomerData[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .rpc('get_crm_customers_data', { p_company_id: companyId });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
}

/**
 * دالة مساعدة لتحديد حالة الدفع
 * تعتمد على البيانات المحسوبة من الـ RPC
 */
export function getPaymentStatusOptimized(customer: CRMCustomerData): 'paid' | 'due' | 'late' | 'none' {
  if (!customer.total_invoices || customer.total_invoices === 0) {
    return 'none';
  }

  if (customer.outstanding_amount === 0) {
    return 'paid';
  }

  if (customer.overdue_invoices && customer.overdue_invoices > 0) {
    return 'late';
  }

  return 'due';
}

/**
 * دالة مساعدة لتحديد آخر تواصل
 * تعتمد على البيانات المحسوبة من الـ RPC
 */
export function getLastContactDaysOptimized(customer: CRMCustomerData): number | null {
  if (!customer.days_since_last_interaction) {
    return null;
  }
  return customer.days_since_last_interaction;
}

/**
 * دالة مساعدة للتحقق مما إذا العميل جديد
 * يستند على created_at (آخر 30 يوم)
 */
export function isNewCustomerOptimized(customer: CRMCustomerData): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const customerDate = new Date(customer.created_at);
  return customerDate >= thirtyDaysAgo;
}

