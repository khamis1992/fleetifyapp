import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';
import type { 
  CustomerFinancialBalance, 
  CustomerFinancialSummary,
  FinancialDashboardStats,
  FinancialObligationWithDetails
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
      
      // Handle potential join failures by filtering out invalid data
      return (data || []).map(item => ({
        ...item,
        contracts: item.contracts && typeof item.contracts === 'object' && !Array.isArray(item.contracts) && 'id' in item.contracts 
          ? item.contracts as { id: string; contract_number: string; contract_amount: number; status: string }
          : null
      }));
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
      
      // Handle potential join failures and filter data
      const processedData = (data || []).map(item => {
        const customers = item.customers && typeof item.customers === 'object' && !Array.isArray(item.customers) && 'id' in item.customers
          ? {
              id: (item.customers as any).id,
              first_name: (item.customers as any).first_name,
              last_name: (item.customers as any).last_name,
              company_name: (item.customers as any).company_name,
              customer_type: (item.customers as any).customer_type === 'corporate' ? 'company' as const : (item.customers as any).customer_type as 'individual' | 'company',
              phone: (item.customers as any).phone,
              email: (item.customers as any).email
            }
          : null;
        
        return {
          ...item,
          customers
        };
      });
      
      let filteredData = processedData;
      
      if (filters?.customerType) {
        filteredData = processedData.filter(balance => 
          balance.customers?.customer_type === filters.customerType
        );
      }
      
      return filteredData;
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
          customers!inner(
            id,
            first_name,
            last_name,
            company_name,
            customer_type
          ),
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
      
      // Simplified payment history - avoiding type recursion
      const totalPayments = 0;
      const lastPayment: { amount: number; payment_date: string } | undefined = undefined;
      
      // Calculate average days to pay (simplified calculation)
      const averageDaysToPay = totalPayments > 0 ? 
        Math.round(totalPayments / (totalPayments > 5 ? 5 : totalPayments)) * 15 : 0;
      
      const customerName = customer.customer_type === 'individual' 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : customer.company_name || '';
      
      const totalBalance = balances?.find(b => b.contract_id === null);
      const contractsBalances = balances?.filter(b => b.contract_id !== null) || [];
      
      // Process obligations data to handle join failures
      const processedObligations: FinancialObligationWithDetails[] = (obligations || []).map(item => {
        const processedItem = { ...item } as any;
        
        // Fix customers data
        if (processedItem.customers && typeof processedItem.customers === 'object' && 'id' in processedItem.customers) {
          processedItem.customers = {
            ...processedItem.customers,
            customer_type: processedItem.customers.customer_type === 'corporate' ? 'company' : processedItem.customers.customer_type
          };
        } else {
          processedItem.customers = null;
        }
        
        // Fix contracts data
        if (processedItem.contracts && typeof processedItem.contracts === 'object' && 'id' in processedItem.contracts) {
          processedItem.contracts = processedItem.contracts;
        } else {
          processedItem.contracts = null;
        }
        
        return processedItem;
      });

      const summary: CustomerFinancialSummary = {
        customer_id: customerId,
        customer_name: customerName,
        customer_type: customer.customer_type === 'corporate' ? 'company' : customer.customer_type,
        total_balance: {
          ...totalBalance,
          available_credit: (totalBalance?.credit_limit || 0) - (totalBalance?.remaining_balance || 0),
          total_obligations: processedObligations.length,
          last_updated: new Date().toISOString()
        } as CustomerFinancialBalance,
        contracts_balances: contractsBalances.map(balance => ({
          ...balance,
          available_credit: (balance.credit_limit || 0) - (balance.remaining_balance || 0),
          total_obligations: 0,
          last_updated: new Date().toISOString()
        })) as CustomerFinancialBalance[],
        recent_obligations: processedObligations,
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
      
      // Process balances to handle join failures
      const processedBalances = (balances || []).map(item => {
        const customers = item.customers && typeof item.customers === 'object' && !Array.isArray(item.customers) && 'id' in item.customers
          ? {
              id: (item.customers as any).id,
              first_name: (item.customers as any).first_name,
              last_name: (item.customers as any).last_name,
              company_name: (item.customers as any).company_name,
              customer_type: (item.customers as any).customer_type === 'corporate' ? 'company' as const : (item.customers as any).customer_type as 'individual' | 'company'
            }
          : null;
        
        return {
          ...item,
          customers
        };
      });
      
      // Calculate stats
      const totalCustomersWithBalance = processedBalances?.length || 0;
      const totalOutstandingAmount = processedBalances?.reduce((sum, b) => sum + b.remaining_balance, 0) || 0;
      const totalOverdueAmount = processedBalances?.reduce((sum, b) => sum + b.overdue_amount, 0) || 0;
      const totalCurrentDue = processedBalances?.reduce((sum, b) => sum + b.current_amount, 0) || 0;
      
      // Aging analysis
      const agingAnalysis = {
        current: processedBalances?.reduce((sum, b) => sum + b.current_amount, 0) || 0,
        days_30: processedBalances?.reduce((sum, b) => sum + b.aging_30_days, 0) || 0,
        days_60: processedBalances?.reduce((sum, b) => sum + b.aging_60_days, 0) || 0,
        days_90: processedBalances?.reduce((sum, b) => sum + b.aging_90_days, 0) || 0,
        over_90: processedBalances?.reduce((sum, b) => sum + b.aging_over_90_days, 0) || 0,
      };

      // Top overdue customers
      const topOverdueCustomers = processedBalances
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