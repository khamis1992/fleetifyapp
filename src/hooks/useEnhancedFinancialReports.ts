import { useQuery } from '@tanstack/react-query';
import * as Sentry from "@sentry/react";
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

const normalizeAccountType = (value?: string | null) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'assets') return 'asset';
  if (normalized === 'liabilities') return 'liability';
  if (normalized === 'expenses') return 'expense';
  if (normalized === 'income') return 'revenue';
  return normalized;
};

const isAccountType = (value: string | null | undefined, ...types: string[]) =>
  types.includes(normalizeAccountType(value));

const calculateBalanceByType = (accountType: string | null | undefined, debit: number, credit: number) => {
  const normalizedType = normalizeAccountType(accountType);
  if (['asset', 'expense'].includes(normalizedType)) {
    return debit - credit;
  }
  return credit - debit;
};

const getCashFlowCategory = (
  accountType: string | null | undefined,
  accountCode: string | null | undefined
): 'operating' | 'investing' | 'financing' => {
  const normalizedType = normalizeAccountType(accountType);
  const code = String(accountCode || '');

  if (normalizedType === 'asset' && /^(15|16|17|18)/.test(code)) {
    return 'investing';
  }

  if (['liability', 'equity'].includes(normalizedType)) {
    return 'financing';
  }

  return 'operating';
};

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

      // Get customer's invoices for balance calculation
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, balance_due, payment_status, due_date, invoice_date')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .order('invoice_date', { ascending: false });

      // Get customer's payments
      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, payment_date, payment_status')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .eq('payment_status', 'completed')
        .order('payment_date', { ascending: false });

      const totalOutstanding = (invoices || []).reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
      const now = new Date();
      const overdueAmount = (invoices || [])
        .filter(inv => inv.due_date && new Date(inv.due_date) < now && Number(inv.balance_due || 0) > 0)
        .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
      const currentAmount = totalOutstanding - overdueAmount;

      const totalPayments = (payments || []).length;
      const lastPayment = payments?.[0];
      const lastPaymentAmount = lastPayment ? Number(lastPayment.amount) : 0;

      return {
        customer_id: customerId,
        customer_name: customerName,
        customer_type: customer.customer_type === 'corporate' ? 'company' : customer.customer_type,
        total_balance: {
          remaining_balance: totalOutstanding,
          overdue_amount: overdueAmount,
          current_amount: currentAmount,
          aging_30_days: 0,
          aging_60_days: 0,
          aging_90_days: 0,
          aging_over_90_days: 0,
        },
        contracts_balances: [],
        recent_obligations: (invoices || []).slice(0, 5).map(inv => ({
          id: inv.id,
          amount: Number(inv.total_amount || 0),
          due_date: inv.due_date,
          status: inv.payment_status,
        })),
        payment_history_summary: {
          total_payments: totalPayments,
          last_payment_amount: lastPaymentAmount,
          average_days_to_pay: 0,
        },
      };
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

      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type')
        .eq('id', customerId)
        .single();

      if (error) throw error;

      const customerName = customer.customer_type === 'individual'
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : customer.company_name || '';

      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, balance_due, payment_status, due_date')
        .eq('company_id', companyId)
        .eq('customer_id', customerId);

      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, payment_date')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .eq('payment_status', 'completed')
        .order('payment_date', { ascending: false });

      const totalOutstanding = (invoices || []).reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
      const now = new Date();
      const overdueAmount = (invoices || [])
        .filter(inv => inv.due_date && new Date(inv.due_date) < now && Number(inv.balance_due || 0) > 0)
        .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);

      return {
        customer_id: customerId,
        customer_name: customerName,
        customer_type: (customer.customer_type || 'individual') as 'individual',
        total_balance: {
          remaining_balance: totalOutstanding,
          overdue_amount: overdueAmount,
          current_amount: totalOutstanding - overdueAmount,
          aging_30_days: 0,
          aging_60_days: 0,
          aging_90_days: 0,
          aging_over_90_days: 0,
        },
        contracts_balances: [],
        recent_obligations: [],
        payment_history_summary: {
          total_payments: (payments || []).length,
          last_payment_amount: payments?.[0] ? Number(payments[0].amount) : 0,
          average_days_to_pay: 0,
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

      // Fetch real customer aging analysis from the database
      const { data: agingData, error } = await supabase
        .from('customer_aging_analysis')
        .select(`
          id,
          customer_id,
          company_id,
          analysis_date,
          current_amount,
          days_30,
          days_60,
          days_90,
          over_90_days,
          total_outstanding,
          overdue_percentage,
          payment_trend,
          risk_level,
          credit_limit,
          available_credit,
          last_payment_date,
          average_days_to_pay,
          created_at,
          updated_at,
          customers (
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
        .order('total_outstanding', { ascending: false });

      if (error) {
        console.error('Error fetching customer aging:', error);
        return [];
      }

      return agingData || [];
    },
    enabled: !!companyId,
  });
};

// NOTE: usePaymentAllocations has been removed - use the one from useFinancialObligations.ts instead

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

      // Fetch real payment installments / obligations
      let query = supabase
        .from('payment_installments')
        .select(`
          id,
          company_id,
          contract_id,
          customer_id,
          installment_amount,
          original_amount,
          due_date,
          payment_status,
          paid_amount,
          remaining_amount,
          days_overdue,
          installment_number,
          notes,
          created_at,
          updated_at,
          customers (
            id,
            first_name,
            last_name,
            company_name,
            customer_type
          ),
          contracts (
            id,
            contract_number,
            contract_amount,
            status
          )
        `)
        .eq('company_id', companyId);

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters?.contractId) {
        query = query.eq('contract_id', filters.contractId);
      }
      if (filters?.status) {
        query = query.eq('payment_status', filters.status);
      }
      if (filters?.overdue) {
        query = query.gt('days_overdue', 0);
      }

      const { data, error } = await query.order('due_date', { ascending: false });

      if (error) {
        console.error('Error fetching financial obligations:', error);
        return [];
      }

      return data || [];
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
      Sentry.addBreadcrumb({ category: "enhancedfinancialreports", message: "Fetching data", level: "info" });
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
        
        current.balance = calculateBalanceByType(
          line.chart_of_accounts?.account_type,
          current.debit,
          current.credit
        );
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
          isAccountType(acc.account_type, 'revenue') && !acc.is_header
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
          isAccountType(acc.account_type, 'expense') && !acc.is_header
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
          isAccountType(acc.account_type, 'asset') && !acc.is_header
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
          isAccountType(acc.account_type, 'liability') && !acc.is_header
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
          isAccountType(acc.account_type, 'equity') && !acc.is_header
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

      if (reportType === 'cash_flow') {
        const cashFlowGroups = new Map<string, {
          accountCode: string;
          accountName: string;
          accountNameAr: string;
          accountType: string;
          category: 'operating' | 'investing' | 'financing';
          amount: number;
        }>();

        journalLines?.forEach((line: any) => {
          const account = line.chart_of_accounts;
          if (!account?.account_code) return;

          const accountType = normalizeAccountType(account.account_type);
          const category = getCashFlowCategory(accountType, account.account_code);
          const debit = Number(line.debit_amount || 0);
          const credit = Number(line.credit_amount || 0);
          const amount = calculateBalanceByType(accountType, debit, credit);
          const key = `${category}:${account.account_code}`;

          const current = cashFlowGroups.get(key) || {
            accountCode: account.account_code,
            accountName: account.account_name,
            accountNameAr: account.account_name,
            accountType,
            category,
            amount: 0,
          };

          current.amount += amount;
          cashFlowGroups.set(key, current);
        });

        const makeCashFlowSection = (
          category: 'operating' | 'investing' | 'financing',
          title: string,
          titleAr: string
        ) => {
          const accountsInSection = Array.from(cashFlowGroups.values())
            .filter(item => item.category === category && Math.abs(item.amount) > 0.01)
            .map(item => ({
              accountCode: item.accountCode,
              accountName: item.accountName,
              accountNameAr: item.accountNameAr,
              accountLevel: 0,
              isHeader: false,
              amount: Number(item.amount.toFixed(2)),
              balance: Number(item.amount.toFixed(2)),
            }));

          const subtotal = accountsInSection.reduce((sum, account) => sum + account.amount, 0);

          return {
            title,
            titleAr,
            sectionName: title,
            sectionNameAr: titleAr,
            accounts: accountsInSection,
            subtotal,
            totalAmount: subtotal,
          };
        };

        const sections = [
          makeCashFlowSection('operating', 'Operating Activities', 'الأنشطة التشغيلية'),
          makeCashFlowSection('investing', 'Investing Activities', 'الأنشطة الاستثمارية'),
          makeCashFlowSection('financing', 'Financing Activities', 'الأنشطة التمويلية'),
        ];

        const totalCredits = sections.reduce(
          (sum, section) => sum + Math.max(section.subtotal, 0),
          0
        );
        const totalDebits = sections.reduce(
          (sum, section) => sum + Math.abs(Math.min(section.subtotal, 0)),
          0
        );

        return {
          title: 'Cash Flow Statement',
          titleAr: 'قائمة التدفقات النقدية',
          sections,
          totalDebits,
          totalCredits,
          netIncome: totalCredits - totalDebits,
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

      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type')
        .eq('id', customerId)
        .single();

      if (error) throw error;

      const customerName = customer.customer_type === 'individual'
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : customer.company_name || '';

      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, balance_due, payment_status, due_date')
        .eq('company_id', companyId)
        .eq('customer_id', customerId);

      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, payment_date')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .eq('payment_status', 'completed')
        .order('payment_date', { ascending: false });

      const totalBalance = (invoices || []).reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
      const now = new Date();
      const overdueAmount = (invoices || [])
        .filter(inv => inv.due_date && new Date(inv.due_date) < now && Number(inv.balance_due || 0) > 0)
        .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
      const currentAmount = totalBalance - overdueAmount;

      return {
        customer_id: customerId,
        customer_name: customerName,
        customer_type: (customer.customer_type || 'individual') as string,
        total_balance: totalBalance,
        overdue_amount: overdueAmount,
        current_amount: currentAmount,
        aging_analysis: {
          current: currentAmount,
          days_30: 0,
          days_60: 0,
          days_90: 0,
          over_90: 0
        },
        payment_history: {
          total_payments: (payments || []).length,
          last_payment_amount: payments?.[0] ? Number(payments[0].amount) : 0,
          average_days_to_pay: 0
        },
        credit_status: {
          credit_limit: 0,
          available_credit: 0,
          risk_level: overdueAmount > 0 ? 'medium' : 'low'
        }
      };
    },
    enabled: !!companyId && !!customerId,
  });
};

// Export default enhanced reports hook
export default useEnhancedFinancialReports;
