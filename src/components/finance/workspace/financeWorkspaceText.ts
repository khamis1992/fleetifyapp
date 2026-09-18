import { useFleetifyTranslation } from '@/hooks/useTranslation';

// Defaults also keep the workspace readable while its translation namespace loads.
const copy = {
  account_classification: {
    ar: 'حسابات تحتاج استكمال التصنيف المالي',
    en: 'Accounts with incomplete financial classification',
  },
  title: {
    ar: 'المركز المالي',
    en: 'Finance workspace',
  },
  subtitle: {
    ar: 'المحاسبة والتحصيل والرقابة في مكان واحد',
    en: 'Accounting, collection and controls in one place',
  },
  today: {
    ar: 'حتى اليوم',
    en: 'Through today',
  },
  refresh: {
    ar: 'تحديث البيانات',
    en: 'Refresh',
  },
  loading: {
    ar: 'جاري قراءة السجلات المالية…',
    en: 'Reading financial records…',
  },
  unavailable: {
    ar: 'تعذر تحميل الوضع المالي',
    en: 'Financial data unavailable',
  },
  retry: {
    ar: 'إعادة المحاولة',
    en: 'Try again',
  },
  errorHint: {
    ar: 'تعذر إكمال قراءة البيانات. أعد المحاولة لعرض الأرصدة والفحوص.',
    en: 'The data could not be read completely. Retry to view balances and checks.',
  },
  overview: {
    ar: 'نظرة عامة',
    en: 'Overview',
  },
  accounting: {
    ar: 'المحاسبة',
    en: 'Accounting',
  },
  billing: {
    ar: 'الفواتير والتحصيل',
    en: 'Billing & collection',
  },
  treasury: {
    ar: 'الخزينة والبنوك',
    en: 'Treasury & banks',
  },
  reports: {
    ar: 'التقارير',
    en: 'Reports',
  },
  obligations: {
    ar: 'الالتزامات',
    en: 'Obligations',
  },
  controls: {
    ar: 'الرقابة والإعدادات',
    en: 'Controls & settings',
  },
  monthRevenue: {
    ar: 'إيراد الشهر المرحّل',
    en: 'Posted revenue this month',
  },
  monthExpenses: {
    ar: 'مصروفات الشهر المرحّلة',
    en: 'Posted expenses this month',
  },
  netIncome: {
    ar: 'صافي نتيجة الشهر',
    en: 'Net income this month',
  },
  monthReceipts: {
    ar: 'المقبوضات المسجلة هذا الشهر',
    en: 'Recorded receipts this month',
  },
  ledgerBasis: {
    ar: 'حسب القيود المرحّلة حتى تاريخ العرض',
    en: 'From posted entries through the reporting date',
  },
  receiptBasis: {
    ar: 'من سندات القبض المكتملة',
    en: 'From completed receipt records',
  },
  receivables: {
    ar: 'الذمم والتحصيل',
    en: 'Receivables & collection',
  },
  outstanding: {
    ar: 'إجمالي المستحق على العملاء',
    en: 'Customer outstanding',
  },
  overdue: {
    ar: 'المبلغ المتأخر',
    en: 'Overdue amount',
  },
  overdueInvoices: {
    ar: 'فاتورة متأخرة',
    en: 'overdue invoices',
  },
  settlementNote: {
    ar: 'الأرصدة المسجلة الحالية للفواتير السارية؛ تشمل السداد الجزئي.',
    en: 'Current recorded balances of active invoices, including partial settlements.',
  },
  receive: {
    ar: 'تسجيل قبض',
    en: 'Record receipt',
  },
  openBilling: {
    ar: 'متابعة الفواتير',
    en: 'Review invoices',
  },
  newJournal: {
    ar: 'قيد محاسبي',
    en: 'Journal entry',
  },
  trend: {
    ar: 'الإيرادات والمصروفات',
    en: 'Revenue & expenses',
  },
  sixMonths: {
    ar: 'آخر ستة أشهر • من دفتر الأستاذ',
    en: 'Last six months · from the ledger',
  },
  revenue: {
    ar: 'الإيراد',
    en: 'Revenue',
  },
  expenses: {
    ar: 'المصروفات',
    en: 'Expenses',
  },
  month: {
    ar: 'الشهر',
    en: 'Month',
  },
  table: {
    ar: 'عرض الأرقام في جدول',
    en: 'View data table',
  },
  review: {
    ar: 'ما يحتاج إلى مراجعة',
    en: 'Needs review',
  },
  checksNote: {
    ar: 'فحوص محددة للسجلات المرئية حسب الصلاحيات؛ لا تغني عن إقفال الفترة والمطابقة.',
    en: 'Checks cover visible records under your permissions. Period closing and reconciliation remain required.',
  },
  passed: {
    ar: 'لم تظهر فروقات في الفحوص المتاحة',
    en: 'No differences in the available checks',
  },
  checkCount: {
    ar: 'فحوص تحتاج متابعة',
    en: 'checks need attention',
  },
  drafts: {
    ar: 'قيود مسودة',
    en: 'Draft entries',
  },
  posted: {
    ar: 'قيود مرحّلة',
    en: 'Posted entries',
  },
  openReview: {
    ar: 'فتح المراجعة',
    en: 'Open review',
  },
  balanceSheet: {
    ar: 'المركز المالي',
    en: 'Financial position',
  },
  assets: {
    ar: 'الأصول',
    en: 'Assets',
  },
  liabilities: {
    ar: 'الالتزامات',
    en: 'Liabilities',
  },
  equity: {
    ar: 'حقوق الملكية',
    en: 'Equity',
  },
  positionNote: {
    ar: 'أرصدة تراكمية من الدفتر. حقوق الملكية تشمل نتيجة الأعمال غير المقفلة.',
    en: 'Cumulative ledger balances. Equity includes earnings not yet closed.',
  },
  departments: {
    ar: 'المالية عبر أقسام الشركة',
    en: 'Finance across departments',
  },
  departmentsNote: {
    ar: 'انتقل إلى مصدر العملية لمتابعة مستنداتها وأثرها المحاسبي.',
    en: 'Follow each operation to its source documents and accounting records.',
  },
  contracts: {
    ar: 'العقود',
    en: 'Contracts',
  },
  contractsDesc: {
    ar: 'الإيجارات والفوترة واستحقاقات العقود',
    en: 'Rental billing and contract obligations',
  },
  customers: {
    ar: 'العملاء',
    en: 'Customers',
  },
  customersDesc: {
    ar: 'الأرصدة والتحصيل وكشوف الحساب',
    en: 'Balances, collections and statements',
  },
  fleet: {
    ar: 'الأسطول',
    en: 'Fleet',
  },
  fleetDesc: {
    ar: 'تكلفة المركبة والإهلاك والتمويل',
    en: 'Vehicle costs, depreciation and financing',
  },
  maintenance: {
    ar: 'الصيانة',
    en: 'Maintenance',
  },
  maintenanceDesc: {
    ar: 'أوامر العمل والمصروفات والفواتير',
    en: 'Work orders, expenses and invoices',
  },
  payroll: {
    ar: 'الموارد البشرية',
    en: 'Human resources',
  },
  payrollDesc: {
    ar: 'اعتماد الرواتب وترحيلها وصرفها',
    en: 'Payroll approval, posting and payment',
  },
  purchasing: {
    ar: 'المشتريات والموردون',
    en: 'Purchasing & vendors',
  },
  purchasingDesc: {
    ar: 'أوامر الشراء والاستلام والمستحقات',
    en: 'Purchase orders, receiving and payables',
  },
  inventory: {
    ar: 'المخزون',
    en: 'Inventory',
  },
  inventoryDesc: {
    ar: 'حركات الأصناف والتكلفة والاستلام',
    en: 'Stock movements, cost and receiving',
  },
  legal: {
    ar: 'الشؤون القانونية',
    en: 'Legal',
  },
  legalDesc: {
    ar: 'المطالبات والتحصيل والتسويات',
    en: 'Claims, collections and settlements',
  },
  properties: {
    ar: 'العقارات',
    en: 'Properties',
  },
  propertiesDesc: {
    ar: 'عقود العقارات والدفعات والقيود',
    en: 'Property contracts, payments and entries',
  },
  budgets: {
    ar: 'الموازنات ومراكز التكلفة',
    en: 'Budgets & cost centers',
  },
  budgetsDesc: {
    ar: 'التخصيص والمصروفات والرقابة',
    en: 'Allocation, expenditure and controls',
  },
  journal_balance: {
    ar: 'قيود غير مكتملة أو غير متوازنة',
    en: 'Incomplete or unbalanced journals',
  },
  posting_accounts: {
    ar: 'حركات على حسابات تحتاج تصحيح إعداداتها',
    en: 'Movements on accounts requiring configuration review',
  },
  receipt_journal: {
    ar: 'مقبوضات دون قيد مرحّل مرتبط',
    en: 'Receipts without a linked posted journal',
  },
  invoice_balance: {
    ar: 'فروقات في أرصدة الفواتير',
    en: 'Invoice balance differences',
  },
  prepaid_due_date: {
    ar: 'تواريخ استحقاق تخالف الفوترة المسبقة',
    en: 'Due dates inconsistent with prepaid billing',
  },
  allocation_overflow: {
    ar: 'توزيعات تتجاوز مبلغ القبض',
    en: 'Allocations exceed receipt amounts',
  },
  payroll_journal: {
    ar: 'رواتب دون قيد مرحّل مرتبط',
    en: 'Payroll without a linked posted journal',
  },
  maintenance_journal: {
    ar: 'صيانة منجزة دون قيد مرحّل مرتبط',
    en: 'Completed maintenance without a linked posted journal',
  },
  property_journal: {
    ar: 'دفعات عقارات دون قيد مرحّل مرتبط',
    en: 'Property payments without a linked posted journal',
  },
  unknownCheck: {
    ar: 'فحص مالي إضافي',
    en: 'Additional financial check',
  },
  updated: {
    ar: 'آخر قراءة',
    en: 'Last read',
  },
  refreshing: {
    ar: 'جاري التحديث…',
    en: 'Refreshing…',
  },
  financeNavigation: {
    ar: 'التنقل المالي',
    en: 'Finance navigation',
  },
} as const;
export type FinanceWorkspaceTextKey = keyof typeof copy;
export function useFinanceWorkspaceText() {
  const { t, currentLanguage } = useFleetifyTranslation('financial');
  const language = currentLanguage === 'ar' ? 'ar' : 'en';
  return {
    language,
    text: (key: FinanceWorkspaceTextKey) => t('workspace.' + key, { defaultValue: copy[key][language] }),
  };
}
