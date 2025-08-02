import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Enhanced Customer Balance Interface
export interface CustomerBalance {
  id: string;
  company_id: string;
  customer_id: string;
  account_id?: string;
  current_balance: number;
  last_payment_date?: string;
  last_payment_amount: number;
  credit_limit: number;
  credit_used: number;
  credit_available: number;
  overdue_amount: number;
  days_overdue: number;
  last_statement_date?: string;
  next_statement_date?: string;
  created_at: string;
  updated_at: string;
}

// Customer Aging Analysis Interface
export interface CustomerAgingAnalysis {
  id: string;
  company_id: string;
  customer_id: string;
  analysis_date: string;
  current_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_91_120: number;
  days_over_120: number;
  total_outstanding: number;
  created_at: string;
}

// Customer Credit Status Interface
export interface CustomerCreditStatus {
  credit_score: number;
  risk_level: 'low' | 'medium' | 'high';
  credit_available: number;
  payment_history_score: number;
  can_extend_credit: boolean;
}

// Customer Statement Data Interface
export interface CustomerStatementData {
  statement_period: string;
  opening_balance: number;
  total_charges: number;
  total_payments: number;
  closing_balance: number;
  transaction_count: number;
  overdue_amount: number;
}

// Hook to get customer outstanding balance
export const useCustomerOutstandingBalance = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-outstanding-balance', customerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_customer_outstanding_balance', {
        customer_id_param: customerId,
        company_id_param: (await supabase.auth.getUser()).data.user?.user_metadata?.company_id
      });

      if (error) throw error;
      return data[0] as {
        current_balance: number;
        overdue_amount: number;
        days_overdue: number;
        credit_available: number;
      };
    },
    enabled: !!customerId,
    refetchInterval: 300000, // Refetch every 5 minutes
  });
};

// Hook to get customer balances
export const useCustomerBalances = (customerId?: string) => {
  return useQuery({
    queryKey: ['customer-balances', customerId],
    queryFn: async () => {
      let query = supabase
        .from('customer_balances')
        .select('*')
        .order('updated_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerBalance[];
    },
  });
};

// Hook to get customer aging analysis
export const useCustomerAgingAnalysis = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-aging-analysis', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_aging_analysis')
        .select('*')
        .eq('customer_id', customerId)
        .order('analysis_date', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data[0] as CustomerAgingAnalysis | null;
    },
    enabled: !!customerId,
  });
};

// Hook to get customer credit status
export const useCustomerCreditStatus = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-credit-status', customerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_customer_credit_status', {
        customer_id_param: customerId,
        company_id_param: (await supabase.auth.getUser()).data.user?.user_metadata?.company_id
      });

      if (error) throw error;
      return data[0] as CustomerCreditStatus;
    },
    enabled: !!customerId,
    refetchInterval: 600000, // Refetch every 10 minutes
  });
};

// Hook to get customer statement data
export const useCustomerStatementData = (customerId: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['customer-statement-data', customerId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('generate_customer_statement_data', {
        customer_id_param: customerId,
        company_id_param: (await supabase.auth.getUser()).data.user?.user_metadata?.company_id,
        start_date_param: startDate || null,
        end_date_param: endDate || null
      });

      if (error) throw error;
      return data[0] as CustomerStatementData;
    },
    enabled: !!customerId,
  });
};

// Hook to update customer aging analysis
export const useUpdateCustomerAging = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ customerId }: { customerId: string }) => {
      const { data, error } = await supabase.rpc('update_customer_aging_analysis', {
        customer_id_param: customerId,
        company_id_param: (await supabase.auth.getUser()).data.user?.user_metadata?.company_id
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['customer-aging-analysis', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-outstanding-balance', customerId] });
      toast({
        title: "تم تحديث تحليل الأعمار",
        description: "تم تحديث تحليل أعمار الذمم بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في تحديث التحليل",
        description: "حدث خطأ أثناء تحديث تحليل أعمار الذمم",
        variant: "destructive",
      });
    },
  });
};

// Hook to get all customers aging report
export const useCustomersAgingReport = () => {
  return useQuery({
    queryKey: ['customers-aging-report'],
    queryFn: async () => {
      // First get aging analysis data
      const { data: agingData, error: agingError } = await supabase
        .from('customer_aging_analysis')
        .select('*')
        .eq('analysis_date', new Date().toISOString().split('T')[0])
        .order('total_outstanding', { ascending: false });

      if (agingError) throw agingError;

      if (!agingData || agingData.length === 0) return [];

      // Get customer data separately
      const customerIds = agingData.map(item => item.customer_id);
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type, phone, email')
        .in('id', customerIds);

      if (customerError) throw customerError;

      // Combine the data
      const combinedData = agingData.map(aging => {
        const customer = customerData?.find(c => c.id === aging.customer_id);
        return {
          ...aging,
          customers: customer || {
            id: aging.customer_id,
            first_name: '',
            last_name: '',
            company_name: 'عميل غير معروف',
            customer_type: 'individual' as const,
            phone: '',
            email: ''
          }
        };
      });

      return combinedData;
    },
    refetchInterval: 600000, // Refetch every 10 minutes
  });
};

// Hook to get customers with overdue amounts
export const useOverdueCustomers = () => {
  return useQuery({
    queryKey: ['overdue-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_balances')
        .select(`
          *,
          customers!inner(
            id,
            first_name,
            last_name,
            company_name,
            customer_type,
            phone,
            email
          )
        `)
        .gt('overdue_amount', 0)
        .order('days_overdue', { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });
};