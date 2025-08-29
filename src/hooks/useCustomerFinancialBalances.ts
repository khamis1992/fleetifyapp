import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';
import type { 
  CustomerFinancialBalance, 
  CustomerFinancialSummary,
  FinancialDashboardStats
} from '@/types/financial-obligations';

// Hook to fetch customer financial balance (unified and per contract)
export function useCustomerFinancialBalances(customerId?: string) {
  const { user, companyId } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: ['customer-financial-balances', companyId, customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from('customer_financial_balances')
        .select(`
          *,
          contracts(
            id,
            contract_number,
            contract_amount,
            status
          )
        `)
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('contract_id', { ascending: false, nullsFirst: true }); // الرصيد الإجمالي أولاً

      if (error) throw error;
      return data as (CustomerFinancialBalance & {
        contracts?: {
          id: string;
          contract_number: string;
          contract_amount: number;
          status: string;
        } | null;
      })[];
    },
    enabled: !!user?.id && !!companyId && !!customerId,
  });
}

// Hook to fetch all customers with financial balances
export function useCompanyCustomersBalances(filters?: {
  hasOverdue?: boolean;
  minimumBalance?: number;
  customerType?: string;
}) {
  const { user, companyId } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: ['company-customers-balances', companyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('customer_financial_balances')
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
        .eq('company_id', companyId)
        .is('contract_id', null) // الرصيد الإجمالي فقط
        .gt('remaining_balance', 0);

      if (filters?.hasOverdue) {
        query = query.gt('overdue_amount', 0);
      }
      
      if (filters?.minimumBalance) {
        query = query.gte('remaining_balance', filters.minimumBalance);
      }

      const { data, error } = await query.order('overdue_amount', { ascending: false });

      if (error) throw error;
      
      let filteredData = data;
      
      if (filters?.customerType) {
        filteredData = data.filter(balance => 
          balance.customers?.customer_type === filters.customerType
        );
      }
      
      return filteredData as (CustomerFinancialBalance & {
        customers?: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          company_name?: string | null;
          customer_type: 'individual' | 'company';
          phone?: string | null;
          email?: string | null;
        } | null;
      })[];
    },
    enabled: !!user?.id && !!companyId,
  });
}

// Hook to fetch customer financial summary (complete overview)
export function useCustomerFinancialSummary(customerId?: string) {
  const { user, companyId } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: ['customer-financial-summary', companyId, customerId],
    queryFn: async () => {
      if (!customerId) return null;
      
      // Get customer info
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;
      
      // Get financial balances
      const { data: balances, error: balancesError } = await supabase
        .from('customer_financial_balances')
        .select(`
          *,
          contracts(
            id,
            contract_number,
            contract_amount,
            status
          )
        `)
        .eq('customer_id', customerId)
        .eq('company_id', companyId);

      if (balancesError) throw balancesError;
      
      // Get recent obligations
      const { data: obligations, error: obligationsError } = await supabase
        .from('customer_financial_obligations')
        .select(`
          *,
          contracts(
            id,
            contract_number,
            contract_amount
          )
        `)
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('due_date', { ascending: false })
        .limit(10);

      if (obligationsError) throw obligationsError;
      
      // Get payment history summary
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;
      
      // Calculate payment history summary
      const totalPayments = payments?.length || 0;
      const lastPayment = payments?.[0];
      const totalPaymentAmount = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      
      // Calculate average days to pay (simplified calculation)
      const averageDaysToPay = totalPayments > 0 ? 
        Math.round(totalPayments / (totalPayments > 5 ? 5 : totalPayments)) * 15 : 0;
      
      const customerName = customer.customer_type === 'individual' 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : customer.company_name || '';
      
      const totalBalance = balances?.find(b => b.contract_id === null);
      const contractsBalances = balances?.filter(b => b.contract_id !== null) || [];
      
      const summary: CustomerFinancialSummary = {
        customer_id: customerId,
        customer_name: customerName,
        customer_type: customer.customer_type,
        total_balance: totalBalance || {} as CustomerFinancialBalance,
        contracts_balances: contractsBalances,
        recent_obligations: obligations || [],
        payment_history_summary: {
          total_payments: totalPayments,
          last_payment_date: lastPayment?.payment_date,
          last_payment_amount: lastPayment?.amount || 0,
          average_days_to_pay: averageDaysToPay,
        },
      };
      
      return summary;
    },
    enabled: !!user?.id && !!companyId && !!customerId,
  });
}

// Hook to fetch financial dashboard statistics
export function useFinancialDashboardStats() {
  const { user, companyId } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: ['financial-dashboard-stats', companyId],
    queryFn: async () => {
      // Get all customers with balances (unified balances only)
      const { data: balances, error } = await supabase
        .from('customer_financial_balances')
        .select(`
          *,
          customers!inner(
            id,
            first_name,
            last_name,
            company_name,
            customer_type
          )
        `)
        .eq('company_id', companyId)
        .is('contract_id', null) // الرصيد الإجمالي فقط
        .gt('remaining_balance', 0);

      if (error) throw error;
      
      // Calculate stats
      const totalCustomersWithBalance = balances?.length || 0;
      const totalOutstandingAmount = balances?.reduce((sum, b) => sum + b.remaining_balance, 0) || 0;
      const totalOverdueAmount = balances?.reduce((sum, b) => sum + b.overdue_amount, 0) || 0;
      const totalCurrentDue = balances?.reduce((sum, b) => sum + b.current_amount, 0) || 0;
      
      // Aging analysis
      const agingAnalysis = {
        current: balances?.reduce((sum, b) => sum + b.current_amount, 0) || 0,
        days_30: balances?.reduce((sum, b) => sum + b.aging_30_days, 0) || 0,
        days_60: balances?.reduce((sum, b) => sum + b.aging_60_days, 0) || 0,
        days_90: balances?.reduce((sum, b) => sum + b.aging_90_days, 0) || 0,
        over_90: balances?.reduce((sum, b) => sum + b.aging_over_90_days, 0) || 0,
      };
      
      // Top overdue customers
      const topOverdueCustomers = balances
        ?.filter(b => b.overdue_amount > 0)
        .sort((a, b) => b.overdue_amount - a.overdue_amount)
        .slice(0, 10)
        .map(balance => {
          const customer = balance.customers;
          const customerName = customer?.customer_type === 'individual' 
            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
            : customer?.company_name || '';
          
          return {
            customer_id: balance.customer_id,
            customer_name: customerName,
            overdue_amount: balance.overdue_amount,
            days_overdue: balance.days_overdue,
          };
        }) || [];
      
      const stats: FinancialDashboardStats = {
        total_customers_with_balance: totalCustomersWithBalance,
        total_outstanding_amount: totalOutstandingAmount,
        total_overdue_amount: totalOverdueAmount,
        total_current_due: totalCurrentDue,
        aging_analysis: agingAnalysis,
        top_overdue_customers: topOverdueCustomers,
      };
      
      return stats;
    },
    enabled: !!user?.id && !!companyId,
  });
}

// Hook to manually recalculate customer balance
export function useRecalculateCustomerBalance() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ customerId, contractId }: { customerId: string; contractId?: string }) => {
      const { data, error } = await supabase.rpc('calculate_customer_financial_balance', {
        customer_id_param: customerId,
        contract_id_param: contractId || null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['customer-financial-balances', companyId, variables.customerId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['customer-financial-summary', companyId, variables.customerId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['company-customers-balances', companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['financial-dashboard-stats', companyId] 
      });
      toast.success('تم إعادة حساب الرصيد بنجاح');
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ في إعادة حساب الرصيد: ${error.message}`);
    },
  });
}