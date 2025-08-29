import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

// Enhanced financial reports data structure
export interface FinancialReportData {
  title: string;
  titleAr: string;
  sections: Array<{
    sectionName: string;
    sectionNameAr: string;
    accounts: Array<{
      accountCode: string;
      accountName: string;
      accountNameAr: string;
      amount: number;
      level: number;
    }>;
    totalAmount: number;
  }>;
  totalDebits: number;
  totalCredits: number;
  netIncome?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
}

// Hook for enhanced customer financial summary
export const useEnhancedCustomerFinancialSummary = (customerId?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['enhanced-customer-financial-summary', customerId]),
    queryFn: async () => {
      if (!companyId || !customerId) return null;

      // Get customer basic info
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;

      const customerName = customer.customer_type === 'individual' 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : customer.company_name || '';

      // Mock enhanced data for now
      const mockData = {
        customer_id: customerId,
        customer_name: customerName,
        customer_type: customer.customer_type === 'corporate' ? 'company' : customer.customer_type,
        total_balance: {
          remaining_balance: 5000,
          overdue_amount: 1000,
          current_amount: 2000,
          aging_30_days: 800,
          aging_60_days: 200,
          aging_90_days: 0,
          aging_over_90_days: 0,
        },
        contracts_balances: [],
        recent_obligations: [],
        payment_history_summary: {
          total_payments: 10,
          last_payment_amount: 500,
          average_days_to_pay: 15,
        },
      };

      return mockData;
    },
    enabled: !!companyId && !!customerId,
  });
};

export const useCustomerFinancialSummary = (customerId?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['customer-financial-summary', customerId]),
    queryFn: async () => {
      if (!companyId || !customerId) return null;

      // Mock data for now
      return {
        customer_id: customerId,
        customer_name: 'Mock Customer',
        customer_type: 'individual' as const,
        total_balance: {
          remaining_balance: 5000,
          overdue_amount: 1000,
          current_amount: 2000,
          aging_30_days: 800,
          aging_60_days: 200,
          aging_90_days: 0,
          aging_over_90_days: 0,
        },
        contracts_balances: [],
        recent_obligations: [],
        payment_history_summary: {
          total_payments: 10,
          last_payment_amount: 500,
          average_days_to_pay: 15,
        },
      };
    },
    enabled: !!companyId && !!customerId,
  });
};

export const useCustomersWithAging = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['customers-with-aging']),
    queryFn: async () => {
      if (!companyId) return [];

      // Mock data for now
      return [
        {
          id: '1',
          customer_id: '1',
          company_id: companyId,
          analysis_date: new Date().toISOString().split('T')[0],
          current_amount: 2000,
          days_30: 800,
          days_60: 200,
          days_90: 0,
          over_90_days: 0,
          total_outstanding: 3000,
          overdue_percentage: 33.33,
          payment_trend: 'stable',
          risk_level: 'medium' as const,
          credit_limit: 10000,
          available_credit: 7000,
          last_payment_date: '2024-01-15',
          average_days_to_pay: 15,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          customers: {
            id: '1',
            first_name: 'أحمد',
            last_name: 'محمد',
            company_name: null,
            customer_type: 'individual' as const,
            phone: '+965-12345678',
            email: 'ahmed@example.com'
          }
        }
      ];
    },
    enabled: !!companyId,
  });
};

export const usePaymentAllocations = (paymentId?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['payment-allocations', paymentId]),
    queryFn: async () => {
      if (!companyId || !paymentId) return [];

      // Mock data for now
      return [
        {
          id: '1',
          company_id: companyId,
          payment_id: paymentId,
          obligation_id: '1',
          allocated_amount: 500,
          remaining_amount: 1500,
          allocation_type: 'automatic' as const,
          allocation_strategy: 'fifo' as const,
          allocation_date: new Date().toISOString().split('T')[0],
          allocation_notes: 'تخصيص تلقائي',
          notes: '',
          created_by: null,
          created_at: new Date().toISOString(),
          financial_obligations: {
            id: '1',
            company_id: companyId,
            contract_id: '1',
            customer_id: '1',
            obligation_type: 'installment' as const,
            amount: 2000,
            original_amount: 2000,
            due_date: '2024-02-01',
            status: 'partially_paid' as const,
            paid_amount: 500,
            remaining_amount: 1500,
            days_overdue: 5,
            obligation_number: 'OBL-001',
            description: 'قسط شهري',
            reference_number: 'REF-001',
            invoice_id: null,
            journal_entry_id: null,
            payment_method: null,
            notes: '',
            created_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          payments: {
            id: paymentId,
            payment_amount: 500,
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'cash'
          }
        }
      ];
    },
    enabled: !!companyId && !!paymentId,
  });
};

export const useFinancialObligationsWithDetails = (filters?: {
  customerId?: string;
  contractId?: string;
  status?: string;
  overdue?: boolean;
}) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['financial-obligations-with-details', JSON.stringify(filters)]),
    queryFn: async () => {
      if (!companyId) return [];

      // Mock data for now
      return [
        {
          id: '1',
          company_id: companyId,
          contract_id: '1',
          customer_id: '1',
          obligation_type: 'installment' as const,
          amount: 2000,
          original_amount: 2000,
          due_date: '2024-02-01',
          status: 'overdue' as const,
          paid_amount: 0,
          remaining_amount: 2000,
          days_overdue: 15,
          obligation_number: 'OBL-001',
          description: 'قسط شهري',
          reference_number: 'REF-001',
          invoice_id: null,
          journal_entry_id: null,
          payment_method: null,
          notes: '',
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          customers: {
            id: '1',
            first_name: 'أحمد',
            last_name: 'محمد',
            company_name: null,
            customer_type: 'individual' as const
          },
          contracts: {
            id: '1',
            contract_number: 'CNT-001',
            contract_amount: 50000,
            status: 'active'
          }
        }
      ];
    },
    enabled: !!companyId,
  });
};

// Main hook to use enhanced financial reports
export const useEnhancedFinancialReports = (
  reportType: string,
  startDate?: string,
  endDate?: string
) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['enhanced-financial-reports', reportType, startDate, endDate]),
    queryFn: async () => {
      if (!companyId) return null;

      // Mock financial report data for now
      return {
        title: reportType === 'income_statement' ? 'Income Statement' : 
               reportType === 'balance_sheet' ? 'Balance Sheet' : 'Trial Balance',
        titleAr: reportType === 'income_statement' ? 'قائمة الدخل' : 
                 reportType === 'balance_sheet' ? 'الميزانية العمومية' : 'ميزان المراجعة',
        sections: [],
        totalDebits: 0,
        totalCredits: 0,
        netIncome: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0
      };
    },
    enabled: !!companyId && !!endDate,
  });
};

// Hook to get detailed enhanced customer data for reporting
export const useDetailedCustomerEnhancedData = (customerId?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['detailed-customer-enhanced-data', customerId]),
    queryFn: async () => {
      if (!companyId || !customerId) return null;

      // Return mock data for now
      return {
        customer_id: customerId,
        customer_name: 'Mock Customer',
        customer_type: 'individual' as const,
        total_balance: 5000,
        overdue_amount: 1000,
        current_amount: 2000,
        aging_analysis: {
          current: 2000,
          days_30: 800,
          days_60: 200,
          days_90: 0,
          over_90: 0
        },
        payment_history: {
          total_payments: 10,
          last_payment_amount: 500,
          average_days_to_pay: 15
        },
        credit_status: {
          credit_limit: 10000,
          available_credit: 7000,
          risk_level: 'medium'
        }
      };
    },
    enabled: !!companyId && !!customerId,
  });
};

// Export default enhanced reports hook
export default useEnhancedFinancialReports;