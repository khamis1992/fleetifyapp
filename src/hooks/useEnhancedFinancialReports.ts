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

      // Fetch real accounting data from database
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('account_code');

      if (accountsError) throw accountsError;

      // Fetch journal entry lines for the period
      let query = supabase
        .from('journal_entry_lines')
        .select(`
          *,
          journal_entries!inner(
            entry_date,
            status,
            company_id
          ),
          chart_of_accounts!account_id(
            account_code,
            account_name,
            account_type,
            account_level,
            is_header
          )
        `)
        .eq('journal_entries.company_id', companyId)
        .eq('journal_entries.status', 'posted');

      if (startDate) {
        query = query.gte('journal_entries.entry_date', startDate);
      }
      if (endDate) {
        query = query.lte('journal_entries.entry_date', endDate);
      }

      const { data: journalLines, error: linesError } = await query;

      if (linesError) {
        console.error('❌ [BALANCE_SHEET] Error fetching journal lines:', linesError);
        throw linesError;
      }

      console.log('✅ [BALANCE_SHEET] Journal lines fetched:', {
        count: journalLines?.length || 0,
        sample: journalLines?.[0],
        companyId,
        startDate,
        endDate
      });

      // Calculate account balances from journal lines
      const accountBalances = new Map();
      
      journalLines?.forEach((line: any) => {
        const accountId = line.account_id;
        const debit = Number(line.debit_amount || 0);
        const credit = Number(line.credit_amount || 0);
        
        if (!accountBalances.has(accountId)) {
          accountBalances.set(accountId, {
            debit: 0,
            credit: 0,
            balance: 0,
            account: line.chart_of_accounts
          });
        }
        
        const current = accountBalances.get(accountId);
        current.debit += debit;
        current.credit += credit;
        
        // Calculate balance based on account type
        const accountType = line.chart_of_accounts?.account_type;
        if (['assets', 'expenses'].includes(accountType)) {
          current.balance = current.debit - current.credit;
        } else {
          current.balance = current.credit - current.debit;
        }
      });

      console.log('📊 [BALANCE_SHEET] Account balances calculated:', {
        totalAccounts: accountBalances.size,
        sampleBalances: Array.from(accountBalances.entries()).slice(0, 3).map(([id, data]) => ({
          accountId: id,
          account: data.account?.account_name,
          debit: data.debit,
          credit: data.credit,
          balance: data.balance
        }))
      });

      // Generate report based on type
      if (reportType === 'trial_balance') {
        const sections = accounts?.filter(acc => !acc.is_header).map(acc => {
          const balance = accountBalances.get(acc.id);
          return {
            accountCode: acc.account_code,
            accountName: acc.account_name,
            accountNameAr: acc.account_name,
            accountLevel: acc.account_level,
            isHeader: acc.is_header,
            balance: balance?.balance || 0,
            debit: balance?.debit || 0,
            credit: balance?.credit || 0
          };
        }) || [];

        const totalDebits = sections.reduce((sum, acc) => sum + acc.debit, 0);
        const totalCredits = sections.reduce((sum, acc) => sum + acc.credit, 0);

        return {
          title: 'Trial Balance',
          titleAr: 'ميزان المراجعة',
          sections: [{
            title: 'All Accounts',
            titleAr: 'جميع الحسابات',
            accounts: sections,
            subtotal: totalDebits
          }],
          totalDebits,
          totalCredits
        };
      }

      if (reportType === 'income_statement') {
        const revenueAccounts = accounts?.filter(acc => 
          acc.account_type === 'revenue' && !acc.is_header
        ).map(acc => {
          const balance = accountBalances.get(acc.id);
          return {
            accountCode: acc.account_code,
            accountName: acc.account_name,
            accountNameAr: acc.account_name,
            accountLevel: acc.account_level,
            isHeader: acc.is_header,
            balance: Math.abs(balance?.balance || 0)
          };
        }) || [];

        const expenseAccounts = accounts?.filter(acc => 
          acc.account_type === 'expenses' && !acc.is_header
        ).map(acc => {
          const balance = accountBalances.get(acc.id);
          return {
            accountCode: acc.account_code,
            accountName: acc.account_name,
            accountNameAr: acc.account_name,
            accountLevel: acc.account_level,
            isHeader: acc.is_header,
            balance: Math.abs(balance?.balance || 0)
          };
        }) || [];

        const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        const netIncome = totalRevenue - totalExpenses;

        return {
          title: 'Income Statement',
          titleAr: 'قائمة الدخل',
          sections: [
            {
              title: 'Revenue',
              titleAr: 'الإيرادات',
              accounts: revenueAccounts,
              subtotal: totalRevenue
            },
            {
              title: 'Expenses',
              titleAr: 'المصروفات',
              accounts: expenseAccounts,
              subtotal: totalExpenses
            }
          ],
          totalDebits: totalExpenses,
          totalCredits: totalRevenue,
          netIncome
        };
      }

      if (reportType === 'balance_sheet') {
        console.log('🔍 [BALANCE_SHEET] Processing balance sheet report:', {
          totalAccounts: accounts?.length,
          accountBalancesSize: accountBalances.size
        });

        const assetAccounts = accounts?.filter(acc => 
          acc.account_type === 'assets' && !acc.is_header
        ).map(acc => {
          const balance = accountBalances.get(acc.id);
          console.log(`  💰 Asset: ${acc.account_name} (${acc.account_code})`, {
            hasBalance: !!balance,
            balance: balance?.balance || 0,
            debit: balance?.debit || 0,
            credit: balance?.credit || 0
          });
          return {
            accountCode: acc.account_code,
            accountName: acc.account_name,
            accountNameAr: acc.account_name,
            accountLevel: acc.account_level,
            isHeader: acc.is_header,
            balance: Math.abs(balance?.balance || 0)
          };
        }) || [];

        const liabilityAccounts = accounts?.filter(acc => 
          acc.account_type === 'liabilities' && !acc.is_header
        ).map(acc => {
          const balance = accountBalances.get(acc.id);
          return {
            accountCode: acc.account_code,
            accountName: acc.account_name,
            accountNameAr: acc.account_name,
            accountLevel: acc.account_level,
            isHeader: acc.is_header,
            balance: Math.abs(balance?.balance || 0)
          };
        }) || [];

        const equityAccounts = accounts?.filter(acc => 
          acc.account_type === 'equity' && !acc.is_header
        ).map(acc => {
          const balance = accountBalances.get(acc.id);
          return {
            accountCode: acc.account_code,
            accountName: acc.account_name,
            accountNameAr: acc.account_name,
            accountLevel: acc.account_level,
            isHeader: acc.is_header,
            balance: Math.abs(balance?.balance || 0)
          };
        }) || [];

        const totalAssets = assetAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        const totalEquity = equityAccounts.reduce((sum, acc) => sum + acc.balance, 0);

        console.log('✅ [BALANCE_SHEET] Balance sheet calculated:', {
          totalAssets,
          totalLiabilities,
          totalEquity,
          assetAccountsCount: assetAccounts.length,
          liabilityAccountsCount: liabilityAccounts.length,
          equityAccountsCount: equityAccounts.length
        });

        return {
          title: 'Balance Sheet',
          titleAr: 'الميزانية العمومية',
          sections: [
            {
              title: 'Assets',
              titleAr: 'الأصول',
              accounts: assetAccounts,
              subtotal: totalAssets
            },
            {
              title: 'Liabilities',
              titleAr: 'الخصوم',
              accounts: liabilityAccounts,
              subtotal: totalLiabilities
            },
            {
              title: 'Equity',
              titleAr: 'حقوق الملكية',
              accounts: equityAccounts,
              subtotal: totalEquity
            }
          ],
          totalAssets,
          totalLiabilities,
          totalEquity,
          totalDebits: 0,
          totalCredits: 0
        };
      }

      return null;
    },
    enabled: !!companyId, // إزالة شرط endDate لأن الميزانية يمكن عرضها بدون تواريخ
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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