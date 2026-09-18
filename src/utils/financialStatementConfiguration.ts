import type { FinancialStatementConfiguration, FinancialStatementNote, IncomeLine, PositionLine, StatementAccountMapping, StatementNoteCode } from '@/types/financialStatementPackage';

export const positionLineOptions: { value: PositionLine; ar: string; en: string; type: 'asset' | 'liability' | 'equity' }[] = [
  { value: 'cash', ar: 'النقد وما في حكمه', en: 'Cash and cash equivalents', type: 'asset' },
  { value: 'receivables', ar: 'الذمم المدينة', en: 'Receivables', type: 'asset' },
  { value: 'inventories', ar: 'المخزون', en: 'Inventories', type: 'asset' },
  { value: 'current_tax_assets', ar: 'أصول الضريبة الحالية', en: 'Current tax assets', type: 'asset' },
  { value: 'other_current_assets', ar: 'أصول متداولة أخرى', en: 'Other current assets', type: 'asset' },
  { value: 'property_equipment', ar: 'الممتلكات والمعدات', en: 'Property and equipment', type: 'asset' },
  { value: 'right_of_use_assets', ar: 'أصول حق الاستخدام', en: 'Right-of-use assets', type: 'asset' },
  { value: 'intangibles', ar: 'الأصول غير الملموسة', en: 'Intangible assets', type: 'asset' },
  { value: 'investments', ar: 'الاستثمارات', en: 'Investments', type: 'asset' },
  { value: 'investment_property', ar: 'العقارات الاستثمارية', en: 'Investment property', type: 'asset' },
  { value: 'deferred_tax_assets', ar: 'أصول الضريبة المؤجلة', en: 'Deferred tax assets', type: 'asset' },
  { value: 'other_noncurrent_assets', ar: 'أصول غير متداولة أخرى', en: 'Other non-current assets', type: 'asset' },
  { value: 'payables', ar: 'الذمم الدائنة', en: 'Payables', type: 'liability' },
  { value: 'customer_deposits', ar: 'تأمينات ودفعات العملاء', en: 'Customer deposits and advances', type: 'liability' },
  { value: 'current_borrowings', ar: 'قروض متداولة', en: 'Current borrowings', type: 'liability' },
  { value: 'current_lease_liabilities', ar: 'التزامات إيجار متداولة', en: 'Current lease liabilities', type: 'liability' },
  { value: 'current_tax_liabilities', ar: 'التزامات الضريبة الحالية', en: 'Current tax liabilities', type: 'liability' },
  { value: 'current_provisions', ar: 'مخصصات متداولة', en: 'Current provisions', type: 'liability' },
  { value: 'other_current_liabilities', ar: 'التزامات متداولة أخرى', en: 'Other current liabilities', type: 'liability' },
  { value: 'noncurrent_borrowings', ar: 'قروض غير متداولة', en: 'Non-current borrowings', type: 'liability' },
  { value: 'noncurrent_lease_liabilities', ar: 'التزامات إيجار غير متداولة', en: 'Non-current lease liabilities', type: 'liability' },
  { value: 'employee_benefits', ar: 'التزامات منافع الموظفين', en: 'Employee benefit obligations', type: 'liability' },
  { value: 'deferred_tax_liabilities', ar: 'التزامات الضريبة المؤجلة', en: 'Deferred tax liabilities', type: 'liability' },
  { value: 'noncurrent_provisions', ar: 'مخصصات غير متداولة', en: 'Non-current provisions', type: 'liability' },
  { value: 'other_noncurrent_liabilities', ar: 'التزامات غير متداولة أخرى', en: 'Other non-current liabilities', type: 'liability' },
  { value: 'share_capital', ar: 'رأس المال', en: 'Share capital', type: 'equity' },
  { value: 'statutory_reserve', ar: 'الاحتياطي القانوني', en: 'Statutory reserve', type: 'equity' },
  { value: 'retained_earnings', ar: 'الأرباح المحتجزة', en: 'Retained earnings', type: 'equity' },
  { value: 'other_reserves', ar: 'احتياطيات أخرى', en: 'Other reserves', type: 'equity' },
  { value: 'other_equity', ar: 'حقوق ملكية أخرى', en: 'Other equity', type: 'equity' },
];
export const incomeLineOptions: { value: IncomeLine; ar: string; en: string }[] = [
  { value: 'rental_revenue', ar: 'إيرادات التأجير', en: 'Rental revenue' },
  { value: 'other_revenue', ar: 'إيرادات أخرى', en: 'Other revenue' },
  { value: 'cost_of_revenue', ar: 'تكلفة الإيرادات', en: 'Cost of revenue' },
  { value: 'staff_costs', ar: 'تكاليف الموظفين', en: 'Staff costs' },
  { value: 'depreciation', ar: 'الإهلاك والإطفاء', en: 'Depreciation and amortisation' },
  { value: 'administrative_expenses', ar: 'المصروفات الإدارية', en: 'Administrative expenses' },
  { value: 'impairment', ar: 'انخفاض القيمة', en: 'Impairment' },
  { value: 'finance_income', ar: 'إيرادات التمويل', en: 'Finance income' },
  { value: 'finance_costs', ar: 'تكاليف التمويل', en: 'Finance costs' },
  { value: 'other_income', ar: 'دخل آخر', en: 'Other income' },
  { value: 'other_expenses', ar: 'مصروفات أخرى', en: 'Other expenses' },
  { value: 'income_tax', ar: 'ضريبة الدخل', en: 'Income tax' },
];
export const noteDefinitions: { code: StatementNoteCode; ar: string; en: string; hintAr: string; hintEn: string }[] = [
  { code: 'entity', ar: 'الشركة ونشاطها', en: 'Entity and activities', hintAr: 'الشكل القانوني، النشاط، الملكية، العنوان، ونطاق الكيان الذي تغطيه القوائم.', hintEn: 'Legal form, activities, ownership, address and reporting entity boundary.' },
  { code: 'basis', ar: 'أساس الإعداد', en: 'Basis of preparation', hintAr: 'الإطار المحاسبي المنطبق، أساس القياس، العملة والسنة المالية. لا تذكر المطابقة إلا بعد استيفاء جميع المتطلبات.', hintEn: 'Applicable framework, measurement basis, currency and financial year. Do not claim compliance before all requirements are satisfied.' },
  { code: 'policies', ar: 'السياسات المحاسبية الجوهرية', en: 'Material accounting policies', hintAr: 'السياسات الفعلية للإيراد والإيجار والأصول والإهلاك والذمم والضرائب ومنافع الموظفين.', hintEn: 'Actual revenue, lease, asset, depreciation, receivable, tax and employee benefit policies.' },
  { code: 'estimates', ar: 'الأحكام والتقديرات', en: 'Judgements and estimates', hintAr: 'الأعمار الإنتاجية والقيمة المتبقية وخسائر الائتمان والمخصصات ومصادر عدم التأكد.', hintEn: 'Useful lives, residual values, credit losses, provisions and estimation uncertainty.' },
  { code: 'assets', ar: 'الأصول والإهلاك', en: 'Assets and depreciation', hintAr: 'أرصدة البداية والإضافات والاستبعادات والإهلاك والانخفاض وأرصدة النهاية والضمانات.', hintEn: 'Opening balances, additions, disposals, depreciation, impairment, closing balances and security.' },
  { code: 'receivables', ar: 'الذمم المدينة', en: 'Receivables', hintAr: 'تفصيل الأرصدة والأعمار ومخصص خسائر الائتمان والحركات خلال الفترة.', hintEn: 'Balances, ageing, credit-loss allowances and movements during the period.' },
  { code: 'liabilities', ar: 'الالتزامات والتمويل', en: 'Liabilities and financing', hintAr: 'الدائنون والقروض والإيجار والودائع ومنافع الموظفين والضرائب والآجال والتعهدات.', hintEn: 'Payables, borrowings, leases, deposits, employee benefits, taxes, maturities and covenants.' },
  { code: 'equity', ar: 'رأس المال والاحتياطيات', en: 'Capital and reserves', hintAr: 'رأس المال وحركات الملاك وتوزيعات الأرباح وانطباق الاحتياطي القانوني وقرارات الشركاء.', hintEn: 'Capital, owner movements, dividends, statutory reserve applicability and shareholder resolutions.' },
  { code: 'related_parties', ar: 'الأطراف ذات العلاقة', en: 'Related parties', hintAr: 'الأرصدة والمعاملات والالتزامات وشروط التعامل مع الأطراف ذات العلاقة.', hintEn: 'Balances, transactions, commitments and terms with related parties.' },
  { code: 'commitments', ar: 'الالتزامات المحتملة والتعهدات', en: 'Contingencies and commitments', hintAr: 'القضايا والضمانات والتعهدات والارتباطات التي تحتاج إلى إثبات أو إفصاح.', hintEn: 'Litigation, guarantees and commitments requiring recognition or disclosure.' },
  { code: 'subsequent_events', ar: 'الأحداث اللاحقة', en: 'Subsequent events', hintAr: 'الأحداث بين تاريخ القوائم وتاريخ إجازة إصدارها والجهة التي أجازتها.', hintEn: 'Events between the reporting date and authorisation for issue, including the authorising party.' },
  { code: 'going_concern', ar: 'الاستمرارية', en: 'Going concern', hintAr: 'تقييم الاستمرارية والافتراضات وحالات عدم التأكد الجوهرية إن وجدت.', hintEn: 'Going-concern assessment, assumptions and any material uncertainties.' },
  { code: 'noncash_transactions', ar: 'التدفقات والمعاملات غير النقدية', en: 'Cash flows and non-cash transactions', hintAr: 'مكونات النقد والسياسات والتسوية مع المركز المالي والمعاملات الاستثمارية والتمويلية غير النقدية.', hintEn: 'Cash components, policies, reconciliation to financial position and non-cash investing/financing transactions.' },
  { code: 'interim_changes', ar: 'التغيرات والأحداث خلال الفترة', en: 'Interim changes and events', hintAr: 'الأحداث والتغيرات الجوهرية منذ آخر قوائم سنوية والموسمية والتغير في التقديرات.', hintEn: 'Significant changes since the last annual statements, seasonality and changes in estimates.' },
];

export function emptyAccountMapping(accountId: string): StatementAccountMapping {
  return { accountId, positionLine: null, comparisonPositionLine: null, thirdPositionLine: null, incomeLine: null,
    cashFlowCategory: null, isCashEquivalent: false, currentSplit: null, comparisonSplit: null, thirdSplit: null };
}
export function defaultStatementNotes(): FinancialStatementNote[] {
  return noteDefinitions.map((note, index) => ({ code: note.code, number: index + 1,
    titleAr: note.ar, titleEn: note.en, status: 'pending', text: '', evidence: '' }));
}
export function previousYearDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
  return `${year - 1}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}
export function dateBefore(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}
export function defaultStatementConfiguration(end = '2026-08-31'): FinancialStatementConfiguration {
  const year = end.slice(0, 4), periodStart = `${year}-01-01`;
  return { version: 1, kind: end.endsWith('-12-31') ? 'annual' : 'interim', scope: 'individual_entity', framework: 'IFRS',
    legalForm: 'unspecified', periodStart, periodEnd: end, positionComparisonDate: dateBefore(periodStart),
    comparativePeriodStart: previousYearDate(periodStart), comparativePeriodEnd: previousYearDate(end),
    thirdPositionDate: null, requiresThirdPosition: false, accountMappings: [], journalOverrides: [],
    notes: defaultStatementNotes(), preparationNotes: '' };
}
