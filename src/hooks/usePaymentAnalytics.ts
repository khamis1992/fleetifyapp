import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PaymentAnalytics {
  total_receipts: number;
  total_payments: number;
  net_cash_flow: number;
  by_cost_center: Array<{
    cost_center_name: string;
    total_amount: number;
    transaction_count: number;
  }>;
  by_payment_method: Array<{
    payment_method: string;
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
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payment-analytics', user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // الحصول على company_id من profile المستخدم
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      const { data, error } = await supabase.rpc('get_payment_analytics', {
        company_id_param: profile.company_id,
        start_date_param: startDate || null,
        end_date_param: endDate || null
      });

      if (error) throw error;

      return data[0] as PaymentAnalytics;
    },
    enabled: !!user?.id,
  });
};