
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";

export interface PaymentAnalytics {
  total_receipts: number;
  total_payments: number;
  net_cash_flow: number;
  by_cost_center: Array<{
    cost_center_name: string;
    total_amount: number;
    transaction_count: number;
  }>;
  by_payment_type: Array<{
    payment_type: string;
    total_amount: number;
    transaction_count: number;
  }>;
  by_bank: Array<{
    bank_name: string;
    total_amount: number;
    transaction_count: number;
  }>;
}

export const usePaymentAnalytics = (startDate?: string, endDate?: string) => {
  const { companyId, user } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['payment-analytics', companyId, startDate, endDate],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');
      if (!companyId) throw new Error('لم يتم العثور على الشركة');

      console.log('🔍 Fetching payment analytics for company:', companyId);

      const { data, error } = await supabase.rpc('get_payment_analytics', {
        company_id_param: companyId,
        start_date_param: startDate || null,
        end_date_param: endDate || null
      });

      if (error) {
        console.error('❌ Error fetching payment analytics:', error);
        throw error;
      }

      console.log('✅ Successfully fetched payment analytics:', data?.[0]);
      return data[0] as PaymentAnalytics;
    },
    enabled: !!user?.id && !!companyId,
  });
};
