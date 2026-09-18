import type { BalanceSheetAccount, ProfessionalBalanceSheet, SavedBalanceSheet } from '@/types/balanceSheet';

export const BALANCE_SHEET_COMPANY = '11111111-1111-4111-8111-111111111111';
export const BALANCE_SHEET_OTHER_COMPANY = '22222222-2222-4222-8222-222222222222';
export const BALANCE_SHEET_PREPARER = '33333333-3333-4333-8333-333333333333';
export const BALANCE_SHEET_REVIEWER = '44444444-4444-4444-8444-444444444444';

function ledgerAccount(index: number, type: BalanceSheetAccount['type'], name: string, balance: number,
  comparisonBalance: number, classification: BalanceSheetAccount['classification'], subtype: string): BalanceSheetAccount {
  const debitBalance = ['asset', 'expense'].includes(type) ? balance : -balance;
  return {
    id: `55555555-5555-4555-8555-${String(index).padStart(12, '0')}`,
    code: String(index * 1000), name, nameAr: null, type, subtype, classification,
    level: 3, isHeader: false, isActive: true,
    debit: Math.max(debitBalance, 0), credit: Math.max(-debitBalance, 0), balance, comparisonBalance,
  };
}

export function makeBalanceSheet(overrides: Partial<ProfessionalBalanceSheet> = {}): ProfessionalBalanceSheet {
  return {
    version: 1,
    company: { id: BALANCE_SHEET_COMPANY, name: 'Synthetic Rental Company', nameAr: 'شركة اختبار محاسبي',
      commercialRegister: 'TEST-001', currency: 'QAR', address: 'Test address' },
    asOfDate: '2026-08-31', comparisonDate: '2025-12-31', generatedAt: '2026-09-18T00:00:00Z',
    accounts: [
      ledgerAccount(1, 'asset', 'Cash', 1000, 700, 'current', 'current_asset'),
      ledgerAccount(2, 'asset', 'Accumulated depreciation', -100, -50, 'non_current', 'contra_non_current_asset'),
      ledgerAccount(3, 'liability', 'Customer advances', 200, 100, 'current', 'current_liability'),
      ledgerAccount(4, 'equity', 'Retained earnings', 500, 400, 'equity', 'retained_earnings'),
      ledgerAccount(5, 'revenue', 'Rental revenue', 300, 200, 'result', 'rental_revenue'),
      ledgerAccount(6, 'expense', 'Maintenance expenses', 100, 50, 'result', 'maintenance'),
    ],
    current: { assets: 900, liabilities: 200, equityAccounts: 500, revenue: 300, expenses: 100,
      unclosedResult: 200, equity: 700, liabilitiesAndEquity: 900, imbalance: 0,
      postedEntries: 7, postedLines: 14, draftEntries: 2 },
    comparison: { assets: 650, liabilities: 100, equityAccounts: 400, revenue: 200, expenses: 50,
      unclosedResult: 150, equity: 550, liabilitiesAndEquity: 650, imbalance: 0,
      postedEntries: 4, postedLines: 8, draftEntries: 1 },
    checks: [], fingerprint: 'a'.repeat(64), permissions: { canSave: true, canApprove: true },
    ...overrides,
  };
}

export function makeSavedBalanceSheet(overrides: Partial<SavedBalanceSheet> = {}): SavedBalanceSheet {
  const payload = overrides.payload ?? makeBalanceSheet();
  return {
    id: '66666666-6666-4666-8666-666666666666', company_id: payload.company.id,
    as_of_date: payload.asOfDate, comparison_date: payload.comparisonDate, payload,
    source_fingerprint: payload.fingerprint, status: 'draft', created_by: BALANCE_SHEET_PREPARER,
    created_by_name: 'Test Preparer', created_at: '2026-09-18T00:01:00Z',
    approved_by: null, approved_by_name: null, approved_at: null, notes: null, review_notes: null,
    ...overrides,
  };
}

export function makeApprovedBalanceSheet(): SavedBalanceSheet {
  return makeSavedBalanceSheet({ status: 'approved', approved_by: BALANCE_SHEET_REVIEWER,
    approved_by_name: 'Test Reviewer', approved_at: '2026-09-18T01:00:00Z',
    review_notes: 'Reviewed supporting documents and reconciled all balances.' });
}
