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

export interface PublishedBalanceSheetRow {
  key: string;
  label: string;
  /** Note reference shown next to the line, e.g. "إيضاح 3". */
  note?: number;
  amount: number | null;
  comparisonAmount: number | null;
  kind: 'group' | 'subtotal' | 'total';
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

const publishedLabels = {
  ar: {
    cashAndEquivalents: 'النقد وما في حكمه',
    tradeReceivables: 'مدينون تجاريون',
    otherCurrentAssets: 'أصول متداولة أخرى',
    vehiclesNet: 'مركبات، صافي',
    otherNonCurrentAssets: 'أصول غير متداولة أخرى',
    assetsAwaitingClassification: 'أصول قيد التصنيف',
    totalAssets: 'إجمالي الأصول',
    customerDeposits: 'دفعات مقدمة من العملاء',
    tradePayables: 'دائنون تجاريون',
    shortTermLoans: 'تسهيلات بنكية قصيرة الأجل',
    otherCurrentLiabilities: 'التزامات متداولة أخرى',
    longTermLiabilities: 'التزامات طويلة الأجل',
    liabilitiesAwaitingClassification: 'التزامات قيد التصنيف',
    totalLiabilities: 'إجمالي الالتزامات',
    capital: 'رأس المال',
    retainedResult: 'نتيجة الأعمال المتراكمة',
    totalEquity: 'إجمالي حقوق الملكية',
    liabilitiesAndEquity: 'إجمالي الالتزامات وحقوق الملكية',
    noteRef: (n: number) => `إيضاح ${n}`,
  },
  en: {
    cashAndEquivalents: 'Cash and cash equivalents',
    tradeReceivables: 'Trade receivables',
    otherCurrentAssets: 'Other current assets',
    vehiclesNet: 'Vehicles, net',
    otherNonCurrentAssets: 'Other non-current assets',
    assetsAwaitingClassification: 'Assets pending classification',
    totalAssets: 'Total assets',
    customerDeposits: 'Customer deposits',
    tradePayables: 'Trade payables',
    shortTermLoans: 'Short-term bank facilities',
    otherCurrentLiabilities: 'Other current liabilities',
    longTermLiabilities: 'Long-term liabilities',
    liabilitiesAwaitingClassification: 'Liabilities pending classification',
    totalLiabilities: 'Total liabilities',
    capital: 'Capital',
    retainedResult: 'Accumulated results',
    totalEquity: 'Total equity',
    liabilitiesAndEquity: 'Total liabilities and equity',
    noteRef: (n: number) => `Note ${n}`,
  },
} as const;

/**
 * Groups an account into one of the published statement captions using the
 * server-provided subtype first and the account name as a documented fallback.
 * Cash boxes, bank accounts, per-customer receivables, and vehicle accounts
 * collapse into single professional captions without changing any balance.
 */
function publishedGroup(
  account: ProfessionalBalanceSheet['accounts'][number],
  locale: BalanceSheetLocale,
): { caption: keyof typeof publishedLabels.ar; note: number } | null {
  const subtype = (account.subtype || '').toLowerCase().trim();
  const name = (locale === 'ar' ? account.nameAr || account.name : account.name).toLowerCase();
  // Cash boxes and bank accounts are unambiguous regardless of a generic subtype.
  if (/صندوق|نقدي|حساب جاري|بنك|^(bank|cash)$|\bbank\b|\bcash\b/.test(name) ||
      subtype === 'cash' || subtype === 'bank' || subtype === 'cash_and_cash_equivalents') {
    return { caption: 'cashAndEquivalents', note: 2 };
  }
  // A specific subtype is authoritative; the name is only a fallback for the
  // many accounts in this chart that carry no subtype at all.
  switch (subtype) {
    case 'accounts_receivable': case 'receivables': case 'allowance_for_doubtful_accounts': case 'contra_current_asset':
      return { caption: 'tradeReceivables', note: 3 };
    case 'current_asset': case 'current_assets':
      return { caption: 'otherCurrentAssets', note: 4 };
    case 'prepayments': case 'prepaid_expenses': case 'inventory':
      return { caption: 'otherCurrentAssets', note: 4 };
    case 'fixed_asset': case 'fixed_assets': case 'property_plant_equipment':
    case 'non_current_asset': case 'non_current_assets':
    case 'accumulated_depreciation': case 'accumulated_amortization': case 'contra_non_current_asset':
      return { caption: 'vehiclesNet', note: 5 };
    case 'long_term_investments': case 'intangible_asset': case 'intangible_assets':
      return { caption: 'otherNonCurrentAssets', note: 6 };
    case 'customer_deposits':
      return { caption: 'customerDeposits', note: 7 };
    case 'accounts_payable': case 'current_liability': case 'current_liabilities': case 'accrued_expenses': case 'tax_payable':
      return { caption: 'tradePayables', note: 7 };
    case 'short_term_loans':
      return { caption: 'shortTermLoans', note: 8 };
    case 'non_current_liability': case 'non_current_liabilities': case 'noncurrent_liability': case 'noncurrent_liabilities':
    case 'long_term_liability': case 'long_term_liabilities': case 'long_term_loans': case 'long_term_debt':
      return { caption: 'longTermLiabilities', note: 9 };
    default: break;
  }
  if (/عميل|مدين|إيجار منتهي|ايجار منتهي|receivable|advances from customer/.test(name)) {
    return { caption: 'tradeReceivables', note: 3 };
  }
  if (/مركب|سيار|vehicle|car/.test(name)) {
    return { caption: 'vehiclesNet', note: 5 };
  }
  return null;
}

/**
 * The published face of the statement: aggregated professional captions with
 * note references, no account codes. Totals remain the server-signed numbers;
 * group rows are sums of the displayed accounts within each caption.
 */
export function getPublishedBalanceSheetRows(
  report: ProfessionalBalanceSheet,
  locale: BalanceSheetLocale,
): PublishedBalanceSheetRow[] {
  const copy = publishedLabels[locale];
  const comparison = report.comparisonDate !== null && report.comparison !== null;
  const visibleAccounts = report.accounts.filter(account =>
    account.balance !== 0 || (comparison && account.comparisonBalance !== 0));
  const rows: PublishedBalanceSheetRow[] = [];
  const add = (
    key: string, label: string, kind: PublishedBalanceSheetRow['kind'],
    amount: number | null, comparisonAmount: number | null, note?: number,
  ) => rows.push({ key, label, note, kind, amount, comparisonAmount: comparison ? comparisonAmount : null });

  const groupAccounts = (
    type: 'asset' | 'liability',
    caption: keyof typeof publishedLabels.ar,
    note: number,
    accounts: ProfessionalBalanceSheet['accounts'],
  ) => {
    const sum = (key: 'balance' | 'comparisonBalance') =>
      Math.round(accounts.reduce((total, account) => total + account[key], 0) * 100) / 100;
    add(`${type}-${caption}`, copy[caption] as string, 'group', sum('balance'), sum('comparisonBalance'), note);
  };

  for (const type of ['asset', 'liability'] as const) {
    const buckets = new Map<keyof typeof publishedLabels.ar, ProfessionalBalanceSheet['accounts']>();
    const pending: ProfessionalBalanceSheet['accounts'] = [];
    for (const account of visibleAccounts.filter(account => account.type === type)) {
      const group = publishedGroup(account, locale);
      if (!group) { pending.push(account); continue; }
      const list = buckets.get(group.caption) || [];
      list.push(account);
      buckets.set(group.caption, list);
    }
    const order: (keyof typeof publishedLabels.ar)[] = type === 'asset'
      ? ['cashAndEquivalents', 'tradeReceivables', 'otherCurrentAssets', 'vehiclesNet', 'otherNonCurrentAssets']
      : ['customerDeposits', 'tradePayables', 'shortTermLoans', 'otherCurrentLiabilities', 'longTermLiabilities'];
    let note = type === 'asset' ? 2 : 7;
    for (const caption of order) {
      const accounts = buckets.get(caption);
      if (!accounts || accounts.length === 0) continue;
      groupAccounts(type, caption, note, accounts);
      note += 1;
    }
    if (pending.length > 0) {
      groupAccounts(type,
        type === 'asset' ? 'assetsAwaitingClassification' : 'liabilitiesAwaitingClassification',
        type === 'asset' ? 6 : 10, pending);
    }
    add(`${type}-total`,
      type === 'asset' ? copy.totalAssets : copy.totalLiabilities,
      'total',
      type === 'asset' ? report.current.assets : report.current.liabilities,
      type === 'asset' ? report.comparison?.assets ?? null : report.comparison?.liabilities ?? null);
  }

  const capitalAccounts = visibleAccounts.filter(account => account.type === 'equity');
  if (capitalAccounts.length > 0) {
    const sum = (key: 'balance' | 'comparisonBalance') =>
      Math.round(capitalAccounts.reduce((total, account) => total + account[key], 0) * 100) / 100;
    add('capital', copy.capital, 'group', sum('balance'), sum('comparisonBalance'), 11);
  }
  add('retained-result', copy.retainedResult, 'group', report.current.unclosedResult, report.comparison?.unclosedResult ?? null, 12);
  add('equity-total', copy.totalEquity, 'total', report.current.equity, report.comparison?.equity ?? null);
  add('liabilities-equity-total', copy.liabilitiesAndEquity, 'total',
    report.current.liabilitiesAndEquity, report.comparison?.liabilitiesAndEquity ?? null);
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
  reversals_after_date: { ar: 'توجد قيود سُجّلت قبل تاريخ القائمة وعُكست بعده؛ القائمة تعرض أثرها التاريخي كما كان في تاريخها (سلوك متوقع للسجلات المكتملة، وليس مخالفة).', en: 'Some entries dated before the statement were reversed after it; the statement keeps their historical effect (expected for a completed audit trail, not a violation).' },
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
  missing_account_subtype: { ar: 'توجد حسابات عليها أرصدة دون تصنيف فرعي (متداول/غير متداول) — صنّفها من دليل الحسابات لفتح الاعتماد.', en: 'Some balance-bearing accounts have no current/non-current subtype — classify them in the chart of accounts to unblock approval.' },
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

/**
 * Accounting-firm number format: thousands separators, fixed decimals, and
 * parentheses for negative amounts instead of a leading minus sign. The
 * currency symbol is intentionally omitted on the published face; it is
 * stated once in the statement header (IAS 1 style).
 */
export function formatPublishedMoney(amount: number, locale: BalanceSheetLocale): string {
  if (!Number.isFinite(amount)) throw new Error('Invalid published amount');
  const value = Object.is(amount, -0) ? 0 : amount;
  const body = new Intl.NumberFormat(locale === 'ar' ? 'ar-QA-u-nu-latn' : 'en-QA', {
    minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true,
  }).format(Math.abs(value));
  return value < 0 ? `(${body})` : body;
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
