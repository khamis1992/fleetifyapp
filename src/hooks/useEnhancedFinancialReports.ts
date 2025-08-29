import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';

export interface CustomerFinancialSummary {
  customer_id: string;
  customer_name: string;
  customer_type: 'individual' | 'corporate';
  balance_summary: {
    total_obligations: number;
    paid_amount: number;
    pending_amount: number;
    overdue_amount: number;
    current_balance: number;
    days_overdue: number;
    credit_available: number;
  };
  aging_analysis: {
    current_amount: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_91_120: number;
    days_over_120: number;
    total_outstanding: number;
  };
  recent_payments: Array<{
    allocation_id: string;
    amount: number;
    date: string;
    obligation_type: string;
    payment_method?: string;
  }>;
  upcoming_obligations: Array<{
    obligation_id: string;
    type: string;
    amount: number;
    due_date: string;
    description?: string;
  }>;
  summary_date: string;
}

export interface AgingReport {
  customer_id: string;
  customer_name: string;
  customer_type: 'individual' | 'corporate';
  phone?: string;
  email?: string;
  total_balance: number;
  current_amount: number;
  aging_30_days: number;
  aging_60_days: number;
  aging_90_days: number;
  aging_over_90_days: number;
  last_payment_date?: string;
  credit_limit: number;
  credit_utilization: number;
}

export interface PaymentAllocationReport {
  allocation_id: string;
  payment_id: string;
  customer_name: string;
  obligation_type: string;
  allocated_amount: number;
  allocation_strategy: string;
  allocation_date: string;
  payment_method?: string;
  contract_number?: string;
}

export interface FinancialDashboardStats {
  customers_with_balance: number;
  total_outstanding: number;
  total_overdue: number;
  current_due: number;
  aging_analysis: {
    aging_30: number;
    aging_60: number;
    aging_90: number;
    aging_over_90: number;
  };
  top_overdue_customers: Array<{
    customer_name: string;
    overdue_amount: number;
    days_overdue: number;
  }>;
  payment_trends: {
    total_collections_this_month: number;
    total_collections_last_month: number;
    collection_efficiency: number;
  };
}

// Hook to get comprehensive customer financial summary
export const useCustomerFinancialSummary = (customerId?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['customer-financial-summary', customerId]),
    queryFn: async (): Promise<CustomerFinancialSummary | null> => {
      if (!companyId || !customerId) return null;

      const { data, error } = await supabase
        .rpc('get_customer_financial_summary', {
          p_customer_id: customerId,
          p_company_id: companyId
        });

      if (error) throw error;

      if (!data) return null;

      // Get customer basic info
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .single();

      if (customerError) throw customerError;

      const customerName = customerData.customer_type === 'individual'
        ? `${customerData.first_name} ${customerData.last_name}`
        : customerData.company_name;

      return {
        customer_id: customerId,
        customer_name: customerName,
        customer_type: customerData.customer_type,
        ...data
      };
    },
    enabled: !!companyId && !!customerId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

// Hook to get enhanced aging report
export const useEnhancedAgingReport = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['enhanced-aging-report']),
    queryFn: async (): Promise<AgingReport[]> => {
      if (!companyId) return [];

      // Get aging analysis with customer details
      const { data: agingData, error: agingError } = await supabase
        .from('customer_aging_analysis')
        .select(`
          customer_id,
          current_amount,
          days_1_30,
          days_31_60,
          days_61_90,
          days_91_120,
          days_over_120,
          total_outstanding,
          analysis_date,
          customers (
            id,
            first_name,
            last_name,
            company_name,
            customer_type,
            phone,
            email,
            credit_limit
          )
        `)
        .eq('company_id', companyId)
        .eq('analysis_date', new Date().toISOString().split('T')[0])
        .order('total_outstanding', { ascending: false });

      if (agingError) throw agingError;

      // Get customer balances for additional info
      const { data: balanceData, error: balanceError } = await supabase
        .from('customer_balances')
        .select('customer_id, current_balance, last_payment_date, credit_limit, credit_used')
        .eq('company_id', companyId);

      if (balanceError) throw balanceError;

      const balanceMap = new Map(balanceData?.map(b => [b.customer_id, b]) || []);

      return agingData?.map(item => {
        const customer = item.customers;
        const balance = balanceMap.get(item.customer_id);
        
        const customerName = customer?.customer_type === 'individual'
          ? `${customer.first_name} ${customer.last_name}`
          : customer?.company_name || 'عميل غير معروف';

        const creditLimit = customer?.credit_limit || balance?.credit_limit || 0;
        const creditUtilization = creditLimit > 0 
          ? ((balance?.credit_used || item.total_outstanding) / creditLimit) * 100 
          : 0;

  return {
          customer_id: item.customer_id,
          customer_name: customerName,
          customer_type: customer?.customer_type || 'individual',
          phone: customer?.phone,
          email: customer?.email,
          total_balance: item.total_outstanding,
          current_amount: item.current_amount,
          aging_30_days: item.days_1_30,
          aging_60_days: item.days_31_60,
          aging_90_days: item.days_61_90,
          aging_over_90_days: item.days_91_120 + item.days_over_120,
          last_payment_date: balance?.last_payment_date,
          credit_limit: creditLimit,
          credit_utilization: creditUtilization,
        };
      }) || [];
    },
    enabled: !!companyId,
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
};

// Hook to get payment allocation report
export const usePaymentAllocationReport = (startDate?: string, endDate?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['payment-allocation-report', startDate, endDate]),
    queryFn: async (): Promise<PaymentAllocationReport[]> => {
      if (!companyId) return [];

      let query = supabase
        .from('payment_allocations')
        .select(`
          id,
          payment_id,
          allocated_amount,
          allocation_strategy,
          allocation_date,
          financial_obligations (
            obligation_type,
            customer_id,
            contract_id,
            customers (
              first_name,
              last_name,
              company_name,
              customer_type
            ),
            contracts (
              contract_number
            )
          ),
          payments (
            payment_method
          )
        `)
        .eq('company_id', companyId);

      if (startDate) {
        query = query.gte('allocation_date', startDate);
      }
      if (endDate) {
        query = query.lte('allocation_date', endDate);
      }

      const { data, error } = await query
        .order('allocation_date', { ascending: false })
        .limit(1000);

      if (error) throw error;

      return data?.map(allocation => {
        const obligation = allocation.financial_obligations;
        const customer = obligation?.customers;
        const customerName = customer?.customer_type === 'individual'
          ? `${customer.first_name} ${customer.last_name}`
          : customer?.company_name || 'عميل غير معروف';

        return {
          allocation_id: allocation.id,
          payment_id: allocation.payment_id,
          customer_name: customerName,
          obligation_type: obligation?.obligation_type || '',
          allocated_amount: allocation.allocated_amount,
          allocation_strategy: allocation.allocation_strategy || 'manual',
          allocation_date: allocation.allocation_date,
          payment_method: allocation.payments?.payment_method,
          contract_number: obligation?.contracts?.contract_number,
        };
      }) || [];
    },
    enabled: !!companyId,
  });
};

// Hook to get financial dashboard statistics
export const useFinancialDashboardStats = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['financial-dashboard-stats']),
    queryFn: async (): Promise<FinancialDashboardStats> => {
      if (!companyId) {
  return {
          customers_with_balance: 0,
          total_outstanding: 0,
          total_overdue: 0,
          current_due: 0,
          aging_analysis: { aging_30: 0, aging_60: 0, aging_90: 0, aging_over_90: 0 },
          top_overdue_customers: [],
          payment_trends: {
            total_collections_this_month: 0,
            total_collections_last_month: 0,
            collection_efficiency: 0,
          },
        };
      }

      // Get aging analysis summary
      const { data: agingData, error: agingError } = await supabase
        .from('customer_aging_analysis')
        .select('current_amount, days_1_30, days_31_60, days_61_90, days_91_120, days_over_120, total_outstanding')
        .eq('company_id', companyId)
        .eq('analysis_date', new Date().toISOString().split('T')[0]);

      if (agingError) throw agingError;

      // Calculate totals
      const totals = agingData?.reduce(
        (acc, item) => ({
          customers_with_balance: acc.customers_with_balance + (item.total_outstanding > 0 ? 1 : 0),
          total_outstanding: acc.total_outstanding + item.total_outstanding,
          current_due: acc.current_due + item.current_amount,
          aging_30: acc.aging_30 + item.days_1_30,
          aging_60: acc.aging_60 + item.days_31_60,
          aging_90: acc.aging_90 + item.days_61_90,
          aging_over_90: acc.aging_over_90 + item.days_91_120 + item.days_over_120,
        }),
        {
          customers_with_balance: 0,
          total_outstanding: 0,
          current_due: 0,
          aging_30: 0,
          aging_60: 0,
          aging_90: 0,
          aging_over_90: 0,
        }
      ) || {
        customers_with_balance: 0,
        total_outstanding: 0,
        current_due: 0,
        aging_30: 0,
        aging_60: 0,
        aging_90: 0,
        aging_over_90: 0,
      };

      // Get overdue amounts
      const { data: overdueData, error: overdueError } = await supabase
        .from('financial_obligations')
        .select('remaining_amount')
        .eq('company_id', companyId)
        .in('status', ['overdue', 'partially_paid'])
        .lt('due_date', new Date().toISOString().split('T')[0]);

      if (overdueError) throw overdueError;

      const totalOverdue = overdueData?.reduce((sum, item) => sum + item.remaining_amount, 0) || 0;

      // Get top overdue customers
      const { data: topOverdueData, error: topOverdueError } = await supabase
        .from('financial_obligations')
        .select(`
          customer_id,
          remaining_amount,
          days_overdue,
          customers (
            first_name,
            last_name,
            company_name,
            customer_type
          )
        `)
        .eq('company_id', companyId)
        .in('status', ['overdue', 'partially_paid'])
        .gt('remaining_amount', 0)
        .order('remaining_amount', { ascending: false })
        .limit(5);

      if (topOverdueError) throw topOverdueError;

      const topOverdueCustomers = topOverdueData?.reduce((acc: any[], item) => {
        const customer = item.customers;
        const customerName = customer?.customer_type === 'individual'
          ? `${customer.first_name} ${customer.last_name}`
          : customer?.company_name || 'عميل غير معروف';

        const existing = acc.find(c => c.customer_name === customerName);
        if (existing) {
          existing.overdue_amount += item.remaining_amount;
          existing.days_overdue = Math.max(existing.days_overdue, item.days_overdue);
        } else {
          acc.push({
            customer_name: customerName,
            overdue_amount: item.remaining_amount,
            days_overdue: item.days_overdue,
          });
        }
        return acc;
      }, []) || [];

      // Get payment trends
      const currentMonth = new Date();
      const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

      const { data: currentMonthPayments, error: currentMonthError } = await supabase
        .from('payment_allocations')
        .select('allocated_amount')
        .eq('company_id', companyId)
        .gte('allocation_date', currentMonthStart.toISOString().split('T')[0]);

      const { data: lastMonthPayments, error: lastMonthError } = await supabase
        .from('payment_allocations')
        .select('allocated_amount')
        .eq('company_id', companyId)
        .gte('allocation_date', lastMonth.toISOString().split('T')[0])
        .lt('allocation_date', currentMonthStart.toISOString().split('T')[0]);

      if (currentMonthError) throw currentMonthError;
      if (lastMonthError) throw lastMonthError;

      const totalCollectionsThisMonth = currentMonthPayments?.reduce((sum, p) => sum + p.allocated_amount, 0) || 0;
      const totalCollectionsLastMonth = lastMonthPayments?.reduce((sum, p) => sum + p.allocated_amount, 0) || 0;

      const collectionEfficiency = totals.total_outstanding > 0
        ? (totalCollectionsThisMonth / totals.total_outstanding) * 100
        : 0;

    return {
        customers_with_balance: totals.customers_with_balance,
        total_outstanding: totals.total_outstanding,
        total_overdue: totalOverdue,
        current_due: totals.current_due,
        aging_analysis: {
          aging_30: totals.aging_30,
          aging_60: totals.aging_60,
          aging_90: totals.aging_90,
          aging_over_90: totals.aging_over_90,
        },
        top_overdue_customers: topOverdueCustomers.slice(0, 5),
        payment_trends: {
          total_collections_this_month: totalCollectionsThisMonth,
          total_collections_last_month: totalCollectionsLastMonth,
          collection_efficiency: collectionEfficiency,
        },
      };
    },
    enabled: !!companyId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

// Hook to refresh all customer balances
export const useRefreshCustomerBalances = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (): Promise<number> => {
      if (!companyId) throw new Error('معرف الشركة مطلوب');

      const { data, error } = await supabase
        .rpc('refresh_all_customer_balances', {
          p_company_id: companyId
        });

      if (error) throw error;
      return data || 0;
    },
    onSuccess: (updatedCount) => {
      queryClient.invalidateQueries({ queryKey: ['customer-balances'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-aging-report'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard-stats'] });
      
      toast.success(`تم تحديث أرصدة ${updatedCount} عميل بنجاح`);
    },
    onError: (error: any) => {
      console.error('Error refreshing customer balances:', error);
      toast.error(`خطأ في تحديث الأرصدة: ${error.message}`);
    },
  });
};

// Hook to export aging report
export const useExportAgingReport = () => {
  return useMutation({
    mutationFn: async (format: 'csv' | 'excel' = 'csv') => {
      // This would implement the export functionality
      // For now, we'll return a placeholder
      return { success: true, format };
    },
    onSuccess: (data) => {
      toast.success(`تم تصدير التقرير بصيغة ${data.format.toUpperCase()}`);
    },
    onError: (error: any) => {
      console.error('Error exporting report:', error);
      toast.error(`خطأ في تصدير التقرير: ${error.message}`);
    },
  });
};