import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useReportingAccounts } from "./useReportingAccounts";
import { useEntryAllowedAccounts } from "./useEntryAllowedAccounts";

export interface EnhancedFinancialReport {
  reportType: 'income_statement' | 'balance_sheet' | 'cash_flow' | 'trial_balance';
  title: string;
  titleAr: string;
  sections: ReportSection[];
  totalDebits?: number;
  totalCredits?: number;
  netIncome?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
}

export interface ReportSection {
  title: string;
  titleAr: string;
  accounts: ReportAccount[];
  subtotal: number;
  accountType: string;
}

export interface ReportAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountNameAr?: string;
  accountLevel: number;
  isHeader: boolean;
  balance: number;
  balanceType: 'debit' | 'credit';
  children?: ReportAccount[];
}

export const useEnhancedFinancialReports = (
  reportType: string = 'income_statement',
  startDate?: string,
  endDate?: string
) => {
  const { companyId } = useUnifiedCompanyAccess();
  const { data: reportingAccounts } = useReportingAccounts();
  const { data: entryAllowedAccounts } = useEntryAllowedAccounts();

  return useQuery({
    queryKey: ["enhanced-financial-reports", companyId, reportType, startDate, endDate],
    queryFn: async () => {
      if (!companyId) return null;

      // Get trial balance data
      const { data: trialBalanceData, error } = await supabase.rpc(
        "get_trial_balance",
        {
          company_id_param: companyId,
          as_of_date: endDate || new Date().toISOString().split('T')[0]
        }
      );

      if (error) {
        console.error("Error fetching trial balance:", error);
        throw error;
      }

      // Process the data based on report type
      switch (reportType) {
        case 'income_statement':
          return generateIncomeStatement(trialBalanceData, reportingAccounts || []);
        case 'balance_sheet':
          return generateBalanceSheet(trialBalanceData, reportingAccounts || []);
        case 'trial_balance':
          return generateTrialBalance(trialBalanceData, entryAllowedAccounts || []);
        default:
          return generateIncomeStatement(trialBalanceData, reportingAccounts || []);
      }
    },
    enabled: !!companyId && !!(reportingAccounts || entryAllowedAccounts),
  });
};

const generateIncomeStatement = (trialBalanceData: any[], reportingAccounts: any[]): EnhancedFinancialReport => {
  const revenueAccounts = trialBalanceData.filter(acc => acc.account_type === 'revenue');
  const expenseAccounts = trialBalanceData.filter(acc => acc.account_type === 'expenses');

  const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + (acc.credit_balance || 0), 0);
  const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + (acc.debit_balance || 0), 0);
  const netIncome = totalRevenue - totalExpenses;

  return {
    reportType: 'income_statement',
    title: 'Income Statement',
    titleAr: 'قائمة الدخل',
    netIncome,
    sections: [
      {
        title: 'Revenue',
        titleAr: 'الإيرادات',
        accountType: 'revenue',
        subtotal: totalRevenue,
        accounts: revenueAccounts.map(acc => ({
          id: acc.account_id,
          accountCode: acc.account_code,
          accountName: acc.account_name,
          accountNameAr: acc.account_name_ar,
          accountLevel: acc.account_level,
          isHeader: acc.account_level < 5,
          balance: acc.credit_balance || 0,
          balanceType: 'credit' as const
        }))
      },
      {
        title: 'Expenses',
        titleAr: 'المصروفات',
        accountType: 'expenses',
        subtotal: totalExpenses,
        accounts: expenseAccounts.map(acc => ({
          id: acc.account_id,
          accountCode: acc.account_code,
          accountName: acc.account_name,
          accountNameAr: acc.account_name_ar,
          accountLevel: acc.account_level,
          isHeader: acc.account_level < 5,
          balance: acc.debit_balance || 0,
          balanceType: 'debit' as const
        }))
      }
    ]
  };
};

const generateBalanceSheet = (trialBalanceData: any[], reportingAccounts: any[]): EnhancedFinancialReport => {
  const assetAccounts = trialBalanceData.filter(acc => acc.account_type === 'assets');
  const liabilityAccounts = trialBalanceData.filter(acc => acc.account_type === 'liabilities');
  const equityAccounts = trialBalanceData.filter(acc => acc.account_type === 'equity');

  const totalAssets = assetAccounts.reduce((sum, acc) => sum + (acc.debit_balance || 0), 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + (acc.credit_balance || 0), 0);
  const totalEquity = equityAccounts.reduce((sum, acc) => sum + (acc.credit_balance || 0), 0);

  return {
    reportType: 'balance_sheet',
    title: 'Balance Sheet',
    titleAr: 'الميزانية العمومية',
    totalAssets,
    totalLiabilities,
    totalEquity,
    sections: [
      {
        title: 'Assets',
        titleAr: 'الأصول',
        accountType: 'assets',
        subtotal: totalAssets,
        accounts: assetAccounts.map(acc => ({
          id: acc.account_id,
          accountCode: acc.account_code,
          accountName: acc.account_name,
          accountNameAr: acc.account_name_ar,
          accountLevel: acc.account_level,
          isHeader: acc.account_level < 5,
          balance: acc.debit_balance || 0,
          balanceType: 'debit' as const
        }))
      },
      {
        title: 'Liabilities',
        titleAr: 'الخصوم',
        accountType: 'liabilities',
        subtotal: totalLiabilities,
        accounts: liabilityAccounts.map(acc => ({
          id: acc.account_id,
          accountCode: acc.account_code,
          accountName: acc.account_name,
          accountNameAr: acc.account_name_ar,
          accountLevel: acc.account_level,
          isHeader: acc.account_level < 5,
          balance: acc.credit_balance || 0,
          balanceType: 'credit' as const
        }))
      },
      {
        title: 'Equity',
        titleAr: 'حقوق الملكية',
        accountType: 'equity',
        subtotal: totalEquity,
        accounts: equityAccounts.map(acc => ({
          id: acc.account_id,
          accountCode: acc.account_code,
          accountName: acc.account_name,
          accountNameAr: acc.account_name_ar,
          accountLevel: acc.account_level,
          isHeader: acc.account_level < 5,
          balance: acc.credit_balance || 0,
          balanceType: 'credit' as const
        }))
      }
    ]
  };
};

const generateTrialBalance = (trialBalanceData: any[], entryAllowedAccounts: any[]): EnhancedFinancialReport => {
  const totalDebits = trialBalanceData.reduce((sum, acc) => sum + (acc.debit_balance || 0), 0);
  const totalCredits = trialBalanceData.reduce((sum, acc) => sum + (acc.credit_balance || 0), 0);

  // Group accounts by type
  const accountsByType = trialBalanceData.reduce((groups: Record<string, any[]>, acc: any) => {
    const type = acc.account_type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(acc);
    return groups;
  }, {} as Record<string, any[]>);

  const sections = Object.entries(accountsByType).map(([accountType, accounts]: [string, any[]]) => {
    const typeLabels: Record<string, { title: string; titleAr: string }> = {
      assets: { title: 'Assets', titleAr: 'الأصول' },
      liabilities: { title: 'Liabilities', titleAr: 'الخصوم' },
      equity: { title: 'Equity', titleAr: 'حقوق الملكية' },
      revenue: { title: 'Revenue', titleAr: 'الإيرادات' },
      expenses: { title: 'Expenses', titleAr: 'المصروفات' }
    };

    const subtotal = accounts.reduce((sum: number, acc: any) => 
      sum + (acc.debit_balance || 0) + (acc.credit_balance || 0), 0
    );

    return {
      title: typeLabels[accountType]?.title || accountType,
      titleAr: typeLabels[accountType]?.titleAr || accountType,
      accountType,
      subtotal,
      accounts: accounts.map((acc: any) => ({
        id: acc.account_id,
        accountCode: acc.account_code,
        accountName: acc.account_name,
        accountNameAr: acc.account_name_ar,
        accountLevel: acc.account_level,
        isHeader: acc.account_level < 5,
        balance: (acc.debit_balance || 0) + (acc.credit_balance || 0),
        balanceType: (acc.debit_balance > 0 ? 'debit' : 'credit') as 'debit' | 'credit'
      }))
    };
  });

  return {
    reportType: 'trial_balance',
    title: 'Trial Balance',
    titleAr: 'ميزان المراجعة',
    totalDebits,
    totalCredits,
    sections
  };
};

export const useAccountHierarchy = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const { data: reportingAccounts } = useReportingAccounts();
  const { data: entryAllowedAccounts } = useEntryAllowedAccounts();

  return useQuery({
    queryKey: ["account-hierarchy", companyId],
    queryFn: async () => {
      if (!companyId || !reportingAccounts || !entryAllowedAccounts) return null;

      // Build account hierarchy
      const allAccounts = [...reportingAccounts, ...entryAllowedAccounts];
      const accountMap = new Map();
      
      allAccounts.forEach(account => {
        accountMap.set(account.id, {
          ...account,
          children: []
        });
      });

      // Build parent-child relationships - Note: ReportingAccount interface doesn't have parent_account_id
      // This would need to be implemented differently if hierarchy is required
      const rootAccounts: any[] = [];
      
      // For now, just return all accounts as root accounts since we don't have parent relationships
      allAccounts.forEach(account => {
        rootAccounts.push(accountMap.get(account.id));
      });

      return rootAccounts;
    },
    enabled: !!companyId && !!reportingAccounts && !!entryAllowedAccounts,
  });
};