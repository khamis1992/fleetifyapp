import { useSyncExternalStore } from 'react';
import type { BalanceSheetAccount, BalanceSheetExportOptions, BalanceSheetLocale, BalanceSheetReviewConfirmations, BalanceSheetTotals, ProfessionalBalanceSheet, SavedBalanceSheet } from '@/types/balanceSheet';

export const parameters = new URLSearchParams(window.location.search);
export const locale: BalanceSheetLocale = parameters.get('lang') === 'en' ? 'en' : 'ar';
export const scenario = parameters.get('state') || 'draft';
const companyId = '11111111-1111-4111-8111-111111111111';
const creatorId = '22222222-2222-4222-8222-222222222222';
const reviewerId = '33333333-3333-4333-8333-333333333333';
const actorId = scenario === 'reviewer' || scenario === 'approved' ? reviewerId : creatorId;
const today = '2026-09-18';

export const financeToday = () => today;
export const useFleetifyTranslation = () => ({
  currentLanguage: locale, isRTL: locale === 'ar',
  t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue || (key === 'loading' ? locale === 'ar' ? 'تحميل' : 'Loading' : key),
});
export const useUnifiedCompanyAccess = () => ({ companyId, user: { id: actorId }, isInitializing: false, isAuthenticating: false });

// Importing a real service for validation remains safe: all database entry points fail closed.
export const supabase = {
  rpc: () => { throw new Error('Real RPC is forbidden in this synthetic fixture'); },
  from: () => { throw new Error('Real database access is forbidden in this synthetic fixture'); },
};

type Seed = [string, string, string, BalanceSheetAccount['type'], BalanceSheetAccount['classification'], number, number];
const accountSeeds: Seed[] = [
  ['1101', 'Cash and bank balances', 'النقد والأرصدة لدى البنوك', 'asset', 'current', 245000, 200000],
  ['1102', 'Trade receivables', 'الذمم المدينة التجارية', 'asset', 'current', 632450.75, 420000],
  ['1103', 'Legacy prepaid insurance', 'تأمين مدفوع مقدماً — رصيد المقارنة', 'asset', 'current', 0, 22000],
  ['1201', 'Rental vehicle fleet at cost', 'أسطول سيارات التأجير بالتكلفة', 'asset', 'non_current', 2840000, 2100000],
  ['1202', 'Accumulated vehicle depreciation', 'مجمع إهلاك سيارات التأجير', 'asset', 'non_current', -456000, -220000],
  ['1203', 'Office equipment and furniture', 'معدات وأثاث المكتب', 'asset', 'non_current', 35000, 25000],
  ['1204', 'Accumulated equipment depreciation', 'مجمع إهلاك المعدات والأثاث', 'asset', 'non_current', -9500, -5000],
  ['1205', 'Long-term refundable deposits', 'تأمينات مستردة طويلة الأجل', 'asset', 'non_current', 61000, 40000],
  ['2101', 'Customer deposits and advances', 'تأمينات ودفعات العملاء المقدمة', 'liability', 'current', 145000, 100000],
  ['2102', 'Trade payables', 'الذمم الدائنة التجارية', 'liability', 'current', 182350, 160000],
  ['2103', 'Accrued operating expenses', 'المصروفات التشغيلية المستحقة', 'liability', 'current', 63750.75, 32000],
  ['2201', 'Long-term vehicle financing', 'تمويل المركبات طويل الأجل', 'liability', 'non_current', 820000, 640000],
  ['3101', 'Paid-in capital', 'رأس المال المدفوع', 'equity', 'equity', 1800000, 1500000],
  ['3102', 'Owner drawings', 'مسحوبات الملاك', 'equity', 'equity', -120000, -75000],
  ['4101', 'Rental revenue', 'إيرادات تأجير السيارات', 'revenue', 'result', 2250000, 1500000],
  ['5101', 'Operating and depreciation expenses', 'المصروفات التشغيلية والإهلاك', 'expense', 'result', 1829150, 1175000],
];

function fingerprintFor(asOf: string, comparison: string | null) {
  const digits = `${asOf}${comparison || ''}`.replace(/-/g, '');
  return `${digits}${'a1b2c3d4'.repeat(8)}`.slice(0, 64);
}

export function makeSyntheticReport(asOf = '2026-08-31', comparison: string | null = '2025-12-31', stress = false): ProfessionalBalanceSheet {
  const accounts: BalanceSheetAccount[] = accountSeeds.map(([code, name, nameAr, type, classification, balance, comparisonBalance], index) => ({
    id: `44444444-4444-4444-8444-${String(index + 1).padStart(12, '0')}`,
    code, name, nameAr, type, classification, subtype: classification, level: 3, isHeader: false, isActive: true,
    debit: type === 'asset' || type === 'expense' ? Math.max(balance, 0) : Math.max(-balance, 0),
    credit: type === 'asset' || type === 'expense' ? Math.max(-balance, 0) : Math.max(balance, 0),
    balance, comparisonBalance: comparison ? comparisonBalance : 0,
  }));
  if (stress) {
    accounts[3].name = 'Rental vehicles purchased for long-term use, with complete supplier and asset reference details. '.repeat(42);
    accounts[3].nameAr = 'سيارات التأجير المشتراة للاستخدام طويل الأجل مع كامل تفاصيل مرجع المورد والأصل والمستندات المؤيدة. '.repeat(42);
    for (let index = 0; index < 42; index++) accounts.push({
      id: `55555555-5555-4555-8555-${String(index + 1).padStart(12, '0')}`, code: `1150${String(index + 1).padStart(2, '0')}`,
      name: `Prepayment subaccount ${index + 1}`, nameAr: `حساب فرعي للمصروفات المقدمة ${index + 1}`,
      type: 'asset', classification: 'current', subtype: 'current', level: 4, isHeader: false, isActive: true,
      debit: 100 + index, credit: 0, balance: 100 + index, comparisonBalance: comparison ? 50 + index : 0,
    });
  }
  const sum = (type: string, key: 'balance' | 'comparisonBalance') => Math.round(accounts.filter(account => account.type === type).reduce((total, account) => total + account[key], 0) * 100) / 100;
  // Keep the synthetic equation balanced, including the stress subaccounts.
  const revenue = accounts.find(account => account.type === 'revenue')!;
  revenue.balance = Math.round((sum('asset', 'balance') - sum('liability', 'balance') - sum('equity', 'balance') + sum('expense', 'balance')) * 100) / 100;
  revenue.credit = revenue.balance;
  revenue.comparisonBalance = comparison ? sum('asset', 'comparisonBalance') - sum('liability', 'comparisonBalance') - sum('equity', 'comparisonBalance') + sum('expense', 'comparisonBalance') : 0;
  const totals = (key: 'balance' | 'comparisonBalance'): BalanceSheetTotals => {
    const assets = sum('asset', key), liabilities = sum('liability', key), equityAccounts = sum('equity', key);
    const revenue = sum('revenue', key), expenses = sum('expense', key), unclosedResult = Math.round((revenue - expenses) * 100) / 100;
    const equity = Math.round((equityAccounts + unclosedResult) * 100) / 100;
    return { assets, liabilities, equityAccounts, revenue, expenses, unclosedResult, equity, liabilitiesAndEquity: Math.round((liabilities + equity) * 100) / 100, imbalance: 0, postedEntries: key === 'balance' ? 2486 : 1294, postedLines: key === 'balance' ? 5600 : 2800, draftEntries: 2 };
  };
  const report: ProfessionalBalanceSheet = {
    version: 1,
    company: { id: companyId, name: 'Demonstration Fleet Company — TEST DATA', nameAr: 'شركة الأسطول التجريبية — بيانات اختبار', commercialRegister: 'TEST-000123', currency: 'QAR', address: 'عنوان تجريبي للاختبار فقط — Synthetic Doha address' },
    asOfDate: asOf, comparisonDate: comparison, generatedAt: `${today}T09:00:00Z`, accounts,
    current: totals('balance'), comparison: comparison ? totals('comparisonBalance') : null,
    checks: [
      { code: 'negative_asset_balances', severity: 'warning', count: 2, asOfDate: asOf },
      { code: 'draft_entries', severity: 'warning', count: 2, asOfDate: asOf },
    ], fingerprint: fingerprintFor(asOf, comparison), permissions: { canSave: scenario !== 'readonly', canApprove: scenario !== 'readonly' },
  };
  if (scenario === 'blocked') { report.accounts[0].classification = 'unclassified'; report.checks.push({ code: 'unclassified_accounts', severity: 'error', count: 1, asOfDate: asOf }); }
  if (scenario === 'currency') { report.company.currency = ''; report.checks.push({ code: 'missing_company_currency', severity: 'error', count: 1, asOfDate: asOf }); }
  return report;
}

export function makeSyntheticSnapshot(report: ProfessionalBalanceSheet, status: SavedBalanceSheet['status'] = 'draft', stress = false): SavedBalanceSheet {
  return {
    id: '66666666-6666-4666-8666-666666666666', company_id: companyId, as_of_date: report.asOfDate, comparison_date: report.comparisonDate,
    payload: structuredClone(report), source_fingerprint: report.fingerprint, status,
    created_by: creatorId, created_by_name: locale === 'ar' ? 'محاسب الإعداد التجريبي' : 'Synthetic Preparer', created_at: `${today}T09:01:00Z`,
    approved_by: status === 'approved' ? reviewerId : null, approved_by_name: status === 'approved' ? locale === 'ar' ? 'المراجع المالي التجريبي' : 'Synthetic Reviewer' : null,
    approved_at: status === 'approved' ? `${today}T10:00:00Z` : null,
    notes: stress
      ? (locale === 'ar' ? 'ملاحظة اختبار مطولة للتحقق من اكتمال النص وترحيله إلى الصفحة التالية دون اقتصاص الحروف أو الأرصدة. ' : 'An extended synthetic preparation note verifies complete text continuation across page boundaries without clipping amounts or characters. ').repeat(70)
      : locale === 'ar' ? 'بيانات اختبار مصطنعة بالكامل. تمت مطابقة الأمثلة الحسابية لغرض اختبار العرض فقط.' : 'Entirely synthetic test data. Example balances are reconciled only to test presentation.',
    review_notes: status === 'approved' ? locale === 'ar' ? 'اعتماد تجريبي للعرض فقط؛ لا يمثل اعتماداً فعلياً لأي شركة.' : 'Synthetic approval for presentation only; it is not an actual company approval.' : null,
    void_reason: status === 'voided' ? 'Synthetic cancellation for a visual test only.' : null,
  };
}

export function syntheticExportOptions(stress = false): BalanceSheetExportOptions {
  const params = new URLSearchParams(window.location.search);
  const report = makeSyntheticReport(params.get('asOf') || '2026-08-31', params.get('compare') || null, stress);
  const status = scenario === 'approved' ? 'approved' : scenario === 'voided' ? 'voided' : 'draft';
  return { report, snapshot: makeSyntheticSnapshot(report, status, stress), locale };
}

let savedVersions = [makeSyntheticSnapshot(makeSyntheticReport(parameters.get('asOf') || '2026-08-31', parameters.get('compare') || '2025-12-31'), scenario === 'approved' ? 'approved' : scenario === 'voided' ? 'voided' : 'draft')];
let failed = scenario === 'error';
let revision = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const refresh = () => { revision++; listeners.forEach(listener => listener()); };
const useRevision = () => useSyncExternalStore(subscribe, () => revision);

export function useProfessionalBalanceSheet(asOf: string, comparison: string | null) {
  useRevision();
  return { data: failed || scenario === 'loading' ? undefined : makeSyntheticReport(asOf, comparison), error: failed ? new Error('Synthetic read failure — retry is safe') : null,
    isFetching: scenario === 'loading', isLoading: scenario === 'loading', refetch: async () => { failed = false; refresh(); } };
}
export function useSavedBalanceSheets() {
  useRevision();
  return { data: savedVersions, error: null, isFetching: false, isLoading: false, refetch: async () => { refresh(); return { data: savedVersions, error: null }; } };
}
export function useBalanceSheetActions() {
  return {
    save: { isPending: false, mutateAsync: async ({ asOf, comparison, notes }: { asOf: string; comparison: string | null; notes: string }) => {
      const saved = makeSyntheticSnapshot(makeSyntheticReport(asOf, comparison)); saved.notes = notes;
      savedVersions = [saved]; refresh(); return saved;
    } },
    approve: { isPending: false, mutateAsync: async ({ id, notes, confirmations }: { id: string; notes: string; confirmations: BalanceSheetReviewConfirmations }) => {
      const saved = savedVersions.find(row => row.id === id)!;
      if (saved.created_by === actorId) throw new Error('Different reviewer required');
      if (notes.trim().length < 20 || !Object.values(confirmations).every(Boolean)) throw new Error('Review confirmations required');
      const approved = { ...saved, status: 'approved' as const, approved_by: actorId, approved_by_name: locale === 'ar' ? 'المراجع المالي التجريبي' : 'Synthetic Reviewer', approved_at: `${today}T10:00:00Z`, review_notes: notes };
      savedVersions = [approved]; refresh(); return approved;
    } },
    voidReport: { isPending: false, mutateAsync: async ({ id, reason }: { id: string; reason: string }) => {
      const saved = { ...savedVersions.find(row => row.id === id)!, status: 'voided' as const, void_reason: reason };
      savedVersions = [saved]; refresh(); return saved;
    } },
  };
}
