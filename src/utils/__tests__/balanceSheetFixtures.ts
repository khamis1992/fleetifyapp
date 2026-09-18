import type { BalanceSheetAccount, ProfessionalBalanceSheet } from '@/types/balanceSheet';

export const makeBalanceSheetFixture = (): ProfessionalBalanceSheet => {
  const account = (id: string, type: BalanceSheetAccount['type'], balance: number, comparisonBalance: number, classification: BalanceSheetAccount['classification']): BalanceSheetAccount => ({
    id, code: id, name: id === '1202' ? 'Accumulated depreciation' : `Account ${id}`, nameAr: id === '1202' ? 'مجمع الإهلاك' : `حساب ${id}`,
    type, subtype: classification, classification, level: 3, isHeader: false, isActive: true,
    debit: type === 'asset' ? Math.max(balance, 0) : 0, credit: type === 'asset' ? Math.max(-balance, 0) : Math.max(balance, 0), balance, comparisonBalance,
  });
  return {
    version: 1, company: { id: 'company-a', name: 'Example Rental Ltd', nameAr: 'شركة المثال للتأجير', commercialRegister: 'CR-900', currency: 'QAR', address: 'Doha <Test>' },
    asOfDate: '2026-08-31', comparisonDate: '2025-12-31', generatedAt: '2026-09-18T12:00:00Z',
    accounts: [account('1101', 'asset', 300, 100, 'current'), account('1201', 'asset', 1000, 1000, 'non_current'), account('1202', 'asset', -200, -100, 'non_current'), account('1102', 'asset', 0, 50, 'current'), account('2101', 'liability', 100, 50, 'current'), account('3101', 'equity', 900, 900, 'equity'), account('4101', 'revenue', 300, 100, 'result'), account('5101', 'expense', 200, 0, 'result')],
    current: { assets: 1100, liabilities: 100, equityAccounts: 900, revenue: 300, expenses: 200, unclosedResult: 100, equity: 1000, liabilitiesAndEquity: 1100, imbalance: 0, postedEntries: 20, postedLines: 40, draftEntries: 2 },
    comparison: { assets: 1050, liabilities: 50, equityAccounts: 900, revenue: 100, expenses: 0, unclosedResult: 100, equity: 1000, liabilitiesAndEquity: 1050, imbalance: 0, postedEntries: 10, postedLines: 20, draftEntries: 0 },
    fingerprint: 'aabbccdd00112233445566778899', checks: [{ code: 'draft_entries', severity: 'warning', count: 2, asOfDate: '2026-08-31' }], permissions: { canSave: true, canApprove: true },
  };
};


