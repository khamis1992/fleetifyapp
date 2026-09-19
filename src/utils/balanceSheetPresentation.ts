import type {
  BalanceSheetCheck,
  BalanceSheetLocale,
  ProfessionalBalanceSheet,
} from '@/types/balanceSheet';

export interface BalanceSheetPresentationRow {
  key: string;
  label: string;
  code?: string;
  amount: number | null;
  comparisonAmount: number | null;
  kind: 'section' | 'account' | 'subtotal' | 'total' | 'result';
}

const labels = {
  ar: {
    asset: 'الأصول', liability: 'الالتزامات', equity: 'حقوق الملكية',
    currentAssets: 'الأصول المتداولة', nonCurrentAssets: 'الأصول غير المتداولة',
    unclassifiedAssets: 'أصول تحتاج إلى تصنيف', currentLiabilities: 'الالتزامات المتداولة',
    nonCurrentLiabilities: 'الالتزامات غير المتداولة', unclassifiedLiabilities: 'التزامات تحتاج إلى تصنيف',
    totalAssets: 'إجمالي الأصول', totalLiabilities: 'إجمالي الالتزامات', totalEquity: 'إجمالي حقوق الملكية',
    result: 'نتيجة الأعمال المتراكمة غير المقفلة', total: 'الإجمالي',
    liabilitiesAndEquity: 'إجمالي الالتزامات وحقوق الملكية', imbalance: 'فرق المعادلة المحاسبية',
  },
  en: {
    asset: 'Assets', liability: 'Liabilities', equity: 'Equity',
    currentAssets: 'Current assets', nonCurrentAssets: 'Non-current assets',
    unclassifiedAssets: 'Assets awaiting classification', currentLiabilities: 'Current liabilities',
    nonCurrentLiabilities: 'Non-current liabilities', unclassifiedLiabilities: 'Liabilities awaiting classification',
    totalAssets: 'Total assets', totalLiabilities: 'Total liabilities', totalEquity: 'Total equity',
    result: 'Accumulated unclosed earnings / (losses)', total: 'Subtotal',
    liabilitiesAndEquity: 'Total liabilities and equity', imbalance: 'Accounting equation difference',
  },
} as const;

/** Presentation consumes the server's signed ledger amounts, never account-code guesses. */
export function getBalanceSheetRows(
  report: ProfessionalBalanceSheet,
  locale: BalanceSheetLocale,
): BalanceSheetPresentationRow[] {
  const copy = labels[locale];
  const comparison = report.comparisonDate !== null && report.comparison !== null;
  const rows: BalanceSheetPresentationRow[] = [];
  const add = (
    key: string, label: string, kind: BalanceSheetPresentationRow['kind'],
    amount: number | null = null, comparisonAmount: number | null = null,
  ) => rows.push({ key, label, kind, amount, comparisonAmount: comparison ? comparisonAmount : null });
  const visibleAccounts = report.accounts.filter(account =>
    account.balance !== 0 || (comparison && account.comparisonBalance !== 0),
  );
  const appendAccount = (account: ProfessionalBalanceSheet['accounts'][number]) => rows.push({
    key: `account-${account.id}`, code: account.code,
    label: locale === 'ar' ? account.nameAr || account.name : account.name || account.nameAr || account.code,
    kind: 'account', amount: account.balance,
    comparisonAmount: comparison ? account.comparisonBalance : null,
  });
  const sum = (accounts: ProfessionalBalanceSheet['accounts'], key: 'balance' | 'comparisonBalance') =>
    Math.round(accounts.reduce((total, account) => total + account[key], 0) * 100) / 100;

  for (const type of ['asset', 'liability'] as const) {
    add(type, copy[type], 'section');
    for (const classification of ['current', 'non_current', 'unclassified'] as const) {
      const accounts = visibleAccounts.filter(account => account.type === type && (
        classification === 'unclassified'
          ? !['current', 'non_current'].includes(account.classification)
          : account.classification === classification
      )).sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }) || a.id.localeCompare(b.id));
      if (classification === 'unclassified' && accounts.length === 0) continue;
      const label = type === 'asset'
        ? classification === 'current' ? copy.currentAssets : classification === 'non_current' ? copy.nonCurrentAssets : copy.unclassifiedAssets
        : classification === 'current' ? copy.currentLiabilities : classification === 'non_current' ? copy.nonCurrentLiabilities : copy.unclassifiedLiabilities;
      add(`${type}-${classification}`, label, 'section');
      accounts.forEach(appendAccount);
      add(`${type}-${classification}-subtotal`, `${copy.total}: ${label}`, 'subtotal', sum(accounts, 'balance'), sum(accounts, 'comparisonBalance'));
    }
    add(`${type}-total`, type === 'asset' ? copy.totalAssets : copy.totalLiabilities, 'total',
      type === 'asset' ? report.current.assets : report.current.liabilities,
      type === 'asset' ? report.comparison?.assets ?? null : report.comparison?.liabilities ?? null);
  }
  add('equity', copy.equity, 'section');
  visibleAccounts.filter(account => account.type === 'equity')
    .sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }) || a.id.localeCompare(b.id))
    .forEach(appendAccount);
  add('unclosed-result', copy.result, 'result', report.current.unclosedResult, report.comparison?.unclosedResult ?? null);
  add('equity-total', copy.totalEquity, 'total', report.current.equity, report.comparison?.equity ?? null);
  add('liabilities-equity-total', copy.liabilitiesAndEquity, 'total', report.current.liabilitiesAndEquity, report.comparison?.liabilitiesAndEquity ?? null);
  add('imbalance', copy.imbalance, 'result', report.current.imbalance, report.comparison?.imbalance ?? null);
  return rows;
}

const checkMessages: Record<string, { ar: string; en: string }> = {
  malformed_journal_lines: { ar: 'توجد أسطر قيود بمبالغ غير صالحة؛ يلزم تصحيحها قبل الاعتماد.', en: 'Some journal lines contain invalid amounts and must be corrected before approval.' },
  insufficient_journal_lines: { ar: 'توجد قيود مرحلة تحتوي أقل من سطرين.', en: 'Some posted journals contain fewer than two lines.' },
  unbalanced_journals: { ar: 'توجد قيود مرحلة غير متوازنة.', en: 'Some posted journals are unbalanced.' },
  journal_header_mismatch: { ar: 'إجمالي بعض القيود لا يطابق مجموع أسطرها.', en: 'Some journal header totals differ from their line totals.' },
  invalid_ledger_accounts: { ar: 'توجد أسطر قيود دون حساب محاسبي صالح للشركة.', en: 'Some journal lines lack a valid ledger account for this company.' },
  invalid_reversal_link: { ar: 'توجد علاقة غير صالحة بين قيد أصلي وقيد عكسه؛ يجب تصحيحها قبل الاعتماد.', en: 'An original journal and its reversal have an invalid link; correct it before approval.' },
  balance_sheet_imbalance: { ar: 'الأصول لا تتطابق مع الالتزامات وحقوق الملكية.', en: 'Assets do not equal liabilities and equity.' },
  missing_company_currency: { ar: 'يلزم تحديد عملة الشركة قبل إصدار القائمة.', en: 'The company currency is required before issuing the statement.' },
  legacy_posting_accounts: { ar: 'توجد قيود قديمة على حسابات رئيسية أو بمستوى لا يسمح بالترحيل؛ أدرج أثرها ويجب مراجعتها.', en: 'Legacy entries use header or otherwise non-posting account levels; their balances are included and need review.' },
  negative_asset_balances: { ar: 'توجد أصول ذات أرصدة دائنة، وقد تشمل حسابات مقابلة مثل مجمع الإهلاك؛ أبقيت الإشارة الأصلية للمراجعة.', en: 'Some assets have credit balances, potentially including contra accounts such as accumulated depreciation; original signs are retained for review.' },
  reversals_after_date: { ar: 'توجد قيود عكست بعد تاريخ التقرير؛ يعرض التقرير أثرها كما كان في تاريخه.', en: 'Some entries were reversed after the report date; their historical effect is retained as at that date.' },
  legacy_reversed_entries: { ar: 'توجد قيود عكس قديمة تحتاج إلى مراجعة ارتباط القيد الأصلي بقيد العكس.', en: 'Legacy reversed entries need a review of the link between original and reversal journals.' },
  no_expense_movements: { ar: 'لا توجد حركات مصروفات؛ راجع اكتمال تسجيل المصروفات والإهلاك.', en: 'There are no expense movements; review completeness of expenses and depreciation.' },
  no_equity_movements: { ar: 'لا توجد حركات حقوق ملكية؛ راجع تسجيل رأس المال وحسابات الملاك.', en: 'There are no equity movements; review capital and owners’ accounts.' },
  no_fixed_asset_movements: { ar: 'لا توجد حركات أصول غير متداولة؛ راجع تكلفة الأصول ومجمع الإهلاك.', en: 'There are no non-current asset movements; review asset costs and accumulated depreciation.' },
  current_vehicles_missing_cost: { ar: 'سجل المركبات الحالي يتضمن مركبات دون تكلفة شراء. هذا فحص للبيانات الحالية وليس إثباتاً لحالة الأسطول التاريخية.', en: 'The current vehicle register includes vehicles without purchase costs. This checks current records, not the historical fleet position.' },
  current_vehicles_missing_purchase_date: { ar: 'سجل المركبات الحالي يتضمن مركبات دون تاريخ شراء. هذا فحص للبيانات الحالية وليس إثباتاً لحالة الأسطول التاريخية.', en: 'The current vehicle register includes vehicles without purchase dates. This checks current records, not the historical fleet position.' },
  imbalance: { ar: 'الأصول لا تتطابق مع الالتزامات وحقوق الملكية.', en: 'Assets do not equal liabilities and equity.' },
  unbalanced_entries: { ar: 'توجد قيود مرحلة غير متوازنة.', en: 'Some posted journal entries are unbalanced.' },
  invalid_accounts: { ar: 'توجد قيود على حسابات غير صالحة للترحيل.', en: 'Some journal entries use accounts that cannot accept postings.' },
  unknown_account_types: { ar: 'توجد حسابات بنوع محاسبي غير معروف.', en: 'Some accounts have an unknown accounting type.' },
  unclassified_accounts: { ar: 'يلزم تحديد التصنيف المتداول أو غير المتداول لبعض الحسابات.', en: 'Some accounts need current or non-current classification.' },
  draft_entries: { ar: 'توجد قيود غير مرحلة حتى تاريخ التقرير؛ لم تدخل في الأرصدة.', en: 'Unposted entries exist up to the report date and are excluded from balances.' },
  no_posted_entries: { ar: 'لا توجد قيود مرحلة حتى تاريخ التقرير.', en: 'There are no posted entries up to the report date.' },
  inactive_accounts: { ar: 'توجد أرصدة على حسابات غير نشطة؛ أدرجت للحفاظ على اكتمال التقرير.', en: 'Inactive accounts have balances; they remain included for completeness.' },
  missing_company_identity: { ar: 'يلزم استكمال بيانات هوية الشركة.', en: 'Company identity information is incomplete.' },
};

export function getBalanceSheetCheckMessage(check: BalanceSheetCheck, locale: BalanceSheetLocale): string {
  const known = checkMessages[check.code]?.[locale];
  const severity = locale === 'ar' ? check.severity === 'error' ? 'خطأ' : 'ملاحظة' : check.severity === 'error' ? 'Error' : 'Warning';
  const text = known || `${severity}: ${check.code}`;
  return `${text} (${check.count}) — ${check.asOfDate}`;
}

export function formatBalanceSheetMoney(amount: number, currency: string, locale: BalanceSheetLocale): string {
  if (!Number.isFinite(amount)) throw new Error('Invalid balance sheet amount');
  if (!/^[A-Z]{3}$/.test(currency)) {
    return `${new Intl.NumberFormat(locale === 'ar' ? 'ar-QA' : 'en-QA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Object.is(amount, -0) ? 0 : amount)} ${locale === 'ar' ? '(العملة غير محددة)' : '(currency unspecified)'}`;
  }
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-QA' : 'en-QA', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Object.is(amount, -0) ? 0 : amount);
}

export interface BalanceSheetDerivedIndicators {
  currentAssets: number;
  currentLiabilities: number;
  workingCapital: number;
  /** Null when the denominator is zero — displayed as an em dash instead of a misleading number. */
  currentRatio: number | null;
  quickRatio: number | null;
  debtToEquity: number | null;
  classificationTotal: number;
  classificationUnclassified: number;
}

/**
 * Reading aids derived from the same server-signed balances the statement shows.
 * They are presentation indicators, never statement line items.
 */
export function deriveBalanceSheetIndicators(report: ProfessionalBalanceSheet): BalanceSheetDerivedIndicators {
  const round = (value: number) => Math.round(value * 100) / 100;
  const hasAmount = (account: ProfessionalBalanceSheet['accounts'][number]) =>
    account.balance !== 0 || account.comparisonBalance !== 0;
  const sumBy = (predicate: (account: ProfessionalBalanceSheet['accounts'][number]) => boolean) =>
    round(report.accounts.filter(account => hasAmount(account) && predicate(account))
      .reduce((total, account) => total + account.balance, 0));
  const currentAssets = sumBy(account => account.type === 'asset' && account.classification === 'current');
  const currentLiabilities = sumBy(account => account.type === 'liability' && account.classification === 'current');
  const inventory = sumBy(account =>
    account.type === 'asset' && account.classification === 'current' &&
    !!account.subtype && account.subtype.startsWith('inventory'));
  const division = (numerator: number, denominator: number) => (denominator === 0 ? null : round(numerator / denominator));
  const statementLines = report.accounts.filter(account =>
    hasAmount(account) && (account.type === 'asset' || account.type === 'liability'));
  return {
    currentAssets,
    currentLiabilities,
    workingCapital: round(currentAssets - currentLiabilities),
    currentRatio: division(currentAssets, currentLiabilities),
    quickRatio: division(round(currentAssets - inventory), currentLiabilities),
    debtToEquity: division(report.current.liabilities, report.current.equity),
    classificationTotal: statementLines.length,
    classificationUnclassified: statementLines.filter(account =>
      account.classification !== 'current' && account.classification !== 'non_current').length,
  };
}
