import {
  BookOpen,
  ChartNoAxesCombined,
  Landmark,
  LayoutDashboard,
  Receipt,
  Settings2,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { resolveFinanceLocation } from "./financeRouteAliases";
export type FinanceLanguage = "ar" | "en";
export interface FinanceDestination {
  id: string;
  href: string;
  ar: string;
  en: string;
  descriptionAr?: string;
  permission?: string;
  admin?: boolean;
  superAdmin?: boolean;
  parentId?: string;
}
export interface FinanceNavigationGroup {
  id: string;
  ar: string;
  en: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: LucideIcon;
  items: FinanceDestination[];
  secondaryItems: FinanceDestination[];
}
// Primary pages appear in the sidebar. Contextual tools and reports remain searchable.
export const financeNavigation: FinanceNavigationGroup[] = [
  {
    id: "overview",
    ar: "المركز المالي",
    en: "Finance home",
    descriptionAr: "النتائج المالية والتحصيل وما يحتاج إلى متابعة.",
    descriptionEn:
      "Financial results, collections and items needing attention.",
    items: [
      {
        id: "overview",
        href: "/finance/overview",
        ar: "نظرة عامة",
        en: "Overview",
        permission: "finance.view",
      },
    ],
    secondaryItems: [
      {
        id: "alerts",
        href: "/finance/overview?panel=alerts",
        ar: "التنبيهات المالية",
        en: "Financial alerts",
        permission: "finance.view",
        parentId: "overview",
      },
    ],
    icon: LayoutDashboard,
  },
  {
    id: "billing",
    ar: "الفوترة والتحصيل",
    en: "Billing & collections",
    descriptionAr: "الفواتير والدفعات والودائع والاستحقاقات الشهرية.",
    descriptionEn: "Invoices, payments, deposits and monthly rent.",
    items: [
      {
        id: "invoices",
        href: "/finance/invoices",
        ar: "الفواتير",
        en: "Invoices",
        permission: "finance.invoices.view",
      },
      {
        id: "payments",
        href: "/finance/payments",
        ar: "المدفوعات",
        en: "Payments",
        permission: "finance.invoices.view",
      },
      {
        id: "ai-collections",
        href: "/finance/collections",
        ar: "متابعة التحصيل",
        en: "Collection follow-up",
        permission: "finance.invoices.view",
      },
      {
        id: "deposits",
        href: "/finance/deposits",
        ar: "ودائع العملاء",
        en: "Customer deposits",
        permission: "finance.invoices.view",
      },
    ],
    secondaryItems: [
      {
        id: "rent",
        href: "/finance/collections/rent",
        ar: "الإيجارات الشهرية",
        en: "Monthly rent",
        permission: "finance.invoices.view",
        parentId: "ai-collections",
      },
      {
        id: "tracking",
        href: "/finance/tracking",
        ar: "كشف تحصيل العملاء",
        en: "Customer collections",
        admin: true,
        parentId: "ai-collections",
      },
      {
        id: "receive",
        href: "/finance/operations/receive-payment",
        ar: "استلام دفعة",
        en: "Receive payment",
        permission: "finance.payments.create",
        parentId: "payments",
      },
      {
        id: "payment-tracking",
        href: "/finance/payments/tracking",
        ar: "تتبع المدفوعات",
        en: "Payment tracking",
        admin: true,
        parentId: "payments",
      },
      {
        id: "scanner",
        href: "/finance/invoice-scanner",
        ar: "ماسح الفواتير",
        en: "Invoice scanner",
        admin: true,
        parentId: "invoices",
      },
      {
        id: "excel-import",
        href: "/finance/payments/import-excel",
        ar: "استيراد الدفعات",
        en: "Import payments",
        admin: true,
        parentId: "payments",
      },
      {
        id: "register",
        href: "/finance/payments/register",
        ar: "تسجيل دفعات العقود",
        en: "Register payments",
        admin: true,
        parentId: "payments",
      },
      {
        id: "sync",
        href: "/finance/sync-payments",
        ar: "مراجعة ربط المدفوعات",
        en: "Review payment links",
        admin: true,
        parentId: "payments",
      },
      {
        id: "cash-receipt",
        href: "/finance/cash-receipt",
        ar: "نموذج سند القبض",
        en: "Receipt template",
        permission: "finance.payments.view",
        parentId: "payments",
      },
    ],
    icon: Receipt,
  },
  {
    id: "accounting",
    ar: "المحاسبة العامة",
    en: "General accounting",
    descriptionAr: "هيكل الحسابات وحركة الأستاذ والقيود اليومية.",
    descriptionEn: "Account structure, ledger movements and journal entries.",
    items: [
      {
        id: "entries",
        href: "/finance/journal-entries",
        ar: "القيود اليومية",
        en: "Journal entries",
        permission: "finance.accounts.view",
      },
      {
        id: "opening-balances",
        href: "/finance/opening-balances",
        ar: "الأرصدة الافتتاحية",
        en: "Opening balances",
        descriptionAr: "استيراد أوراق العمل المالية وترحيل قيد افتتاحي متوازن.",
        permission: "finance.journal.create_draft",
        parentId: "entries",
      },
      {
        id: "fleet-bridge",
        href: "/finance/fleet-bridge",
        ar: "ترحيل الأسطول والتمويل",
        en: "Fleet & financing bridge",
        descriptionAr: "رسملة المركبات والتزامات التمويل والإهلاك الافتتاحي كقيود فعلية في الدفتر.",
        permission: "finance.journal.create_draft",
        parentId: "entries",
      },
      {
        id: "ledger",
        href: "/finance/general-ledger",
        ar: "دفتر الأستاذ",
        en: "General ledger",
        permission: "finance.accounts.view",
      },
      {
        id: "chart",
        href: "/finance/chart-of-accounts",
        ar: "دليل الحسابات",
        en: "Chart of accounts",
        permission: "finance.accounts.view",
      },
    ],
    secondaryItems: [
      {
        id: "journal-demo",
        href: "/finance/journal-entries-demo",
        ar: "نموذج القيود",
        en: "Journal preview",
        permission: "finance.ledger.view",
        parentId: "entries",
      },
    ],
    icon: BookOpen,
  },
  {
    id: "treasury",
    ar: "الخزينة",
    en: "Treasury & obligations",
    descriptionAr: "النقد والبنوك والتسويات والالتزامات المستحقة.",
    descriptionEn: "Cash, banks, reconciliation and upcoming obligations.",
    items: [
      {
        id: "treasury",
        href: "/finance/treasury",
        ar: "الحسابات البنكية",
        en: "Bank accounts",
        permission: "finance.treasury.view",
      },
      {
        id: "bank-reconciliation",
        href: "/finance/treasury/reconciliation",
        ar: "التسوية البنكية",
        en: "Bank reconciliation",
        permission: "finance.treasury.view",
      },
      {
        id: "bank-ledger-reconciliation",
        href: "/finance/bank-reconciliation",
        ar: "مطابقة البنك مع الدفتر",
        en: "Bank ↔ ledger reconciliation",
        descriptionAr: "مقارنة وحدة البنوك مع حساب البنك بالدفتر ومزامنة الحركات وترحيل ما بلا قيد.",
        permission: "finance.treasury.view",
      },
      {
        id: "obligations",
        href: "/finance/obligations",
        ar: "الالتزامات الشهرية",
        en: "Monthly obligations",
        permission: "finance.view",
      },
    ],
    secondaryItems: [
      {
        id: "bank-transactions",
        href: "/finance/treasury/transactions",
        ar: "الحركات المالية",
        en: "Bank transactions",
        permission: "finance.treasury.view",
        parentId: "treasury",
      },
    ],
    icon: Landmark,
  },
  // Vendors & purchasing menus are removed until a vendors/expenses module exists:
  // supplier and expense postings go through manual journal entries only
  // (PAYABLES role is mapped to 21111 — see the fleet-bridge mapping checklist,
  // and the journal-entries page notes this explicitly).
  {
    id: "planning",
    ar: "الأصول والموازنات",
    en: "Assets & planning",
    descriptionAr: "الأصول الثابتة والموازنات وتوزيع مراكز التكلفة.",
    descriptionEn: "Fixed assets, budgets and cost allocation.",
    items: [
      {
        id: "depreciation",
        href: "/finance/depreciation",
        ar: "الإهلاك الشهري",
        en: "Monthly depreciation",
        descriptionAr: "تشغيل إهلاك المركبات الشهري ومراجعة سجل الإهلاكات المرحّلة.",
        permission: "finance.assets.view",
        parentId: "assets",
      },
      {
        id: "assets",
        href: "/finance/assets",
        ar: "الأصول الثابتة",
        en: "Fixed assets",
        permission: "finance.assets.view",
      },
      {
        id: "budgets",
        href: "/finance/budgets",
        ar: "الموازنات",
        en: "Budgets",
        permission: "finance.budgets.view",
      },
      {
        id: "cost-centers",
        href: "/finance/cost-centers",
        ar: "مراكز التكلفة",
        en: "Cost centers",
        permission: "finance.budgets.view",
      },
    ],
    secondaryItems: [],
    icon: Wallet,
  },
  {
    id: "reports",
    ar: "التقارير والتحليل",
    en: "Reports & analysis",
    descriptionAr: "القوائم المالية وتحليل الأداء والنسب وأدوات الحساب.",
    descriptionEn: "Financial statements, performance, ratios and calculators.",
    items: [
      {
        id: "reports",
        href: "/finance/reports",
        ar: "مكتبة التقارير",
        en: "Report library",
        permission: "finance.view",
      },
      {
        id: "analysis",
        href: "/finance/analysis",
        ar: "التحليل المالي",
        en: "Financial analysis",
        permission: "finance.view",
      },
    ],
    secondaryItems: [
      {
        id: "report-trial-balance",
        descriptionAr: "أرصدة جميع الحسابات بمدينها ودائنها للتحقق من التوازن.",
        href: "/finance/reports/trial-balance",
        ar: "ميزان المراجعة",
        en: "Trial balance",
        permission: "finance.view",
        parentId: "reports",
      },
      {
        id: "report-income-statement",
        descriptionAr: "الإيرادات والمصروفات ونتيجة الأعمال للفترة المحددة.",
        href: "/finance/reports/income-statement",
        ar: "قائمة الدخل",
        en: "Income statement",
        permission: "finance.view",
        parentId: "reports",
      },
      {
        id: "report-financial-statements",
        descriptionAr: "حزمة القوائم المالية والإيضاحات في ملف واحد قابل للتصدير.",
        href: "/finance/reports/financial-statements",
        ar: "حزمة القوائم المالية",
        en: "Financial statement package",
        permission: "finance.reports.view",
        parentId: "reports",
      },
      {
        id: "report-balance-sheet",
        descriptionAr: "الأصول والالتزامات وحقوق الملكية كما في تاريخ محدد.",
        href: "/finance/reports/balance-sheet",
        ar: "الميزانية العمومية",
        en: "Balance sheet",
        permission: "finance.view",
        parentId: "reports",
      },
      {
        id: "report-cash-flow",
        descriptionAr: "التدفقات النقدية التشغيلية والاستثمارية والتمويلية.",
        href: "/finance/reports/cash-flow",
        ar: "التدفقات النقدية",
        en: "Cash flow",
        permission: "finance.view",
        parentId: "reports",
      },
      {
        id: "report-receivables",
        descriptionAr: "أعمار الذمم المدينة ومتابعة التحصيل.",
        href: "/finance/reports/receivables",
        ar: "الذمم المدينة",
        en: "Receivables",
        permission: "finance.view",
        parentId: "reports",
      },
      {
        id: "report-payables",
        descriptionAr: "أعمار الذمم الدائنة والالتزامات تجاه الموردين.",
        href: "/finance/reports/payables",
        ar: "الذمم الدائنة",
        en: "Payables",
        permission: "finance.view",
        parentId: "reports",
      },
      {
        id: "report-payroll",
        descriptionAr: "تقارير الرواتب والأثر المالي المرتبط بها.",
        href: "/finance/reports/payroll",
        ar: "تقارير الرواتب",
        en: "Payroll reports",
        permission: "finance.view",
        parentId: "reports",
      },
      {
        id: "report-cost-centers",
        descriptionAr: "تحليل الأداء والتكاليف حسب مراكز التكلفة.",
        href: "/finance/reports/cost-centers",
        ar: "تقارير مراكز التكلفة",
        en: "Cost center reports",
        permission: "finance.view",
        parentId: "reports",
      },
      {
        id: "ratios",
        href: "/finance/analysis/ratios",
        ar: "النسب المالية",
        en: "Financial ratios",
        permission: "finance.view",
        parentId: "analysis",
      },
      {
        id: "calculator",
        href: "/finance/tools/calculator",
        ar: "الحاسبة المالية",
        en: "Financial calculator",
        permission: "finance.view",
        parentId: "analysis",
      },
      {
        id: "ar-aging",
        href: "/finance/reports/ar-aging",
        ar: "أعمار الذمم المدينة",
        en: "Receivables aging",
        admin: true,
        parentId: "reports",
      },
      {
        id: "consolidation",
        href: "/finance/consolidation",
        ar: "التوحيد المالي",
        en: "Financial consolidation",
        permission: "finance.view",
        parentId: "reports",
      },
    ],
    icon: ChartNoAxesCombined,
  },
  {
    id: "controls",
    ar: "الرقابة والإقفال",
    en: "Controls & close",
    descriptionAr: "سلامة القيود والموافقات والإقفال وسجل التغييرات.",
    descriptionEn: "Integrity checks, approvals, close and change history.",
    items: [
      {
        id: "approvals",
        href: "/finance/approvals",
        ar: "الموافقات المالية",
        en: "Financial approvals",
        permission: "finance.view",
      },
      {
        id: "integrity",
        href: "/finance/integrity",
        ar: "سلامة البيانات المالية",
        en: "Financial integrity",
        permission: "finance.view",
      },
      {
        id: "close",
        href: "/finance/close",
        ar: "الإقفال الشهري",
        en: "Monthly close",
        permission: "finance.view",
      },
      {
        id: "audit",
        href: "/finance/audit",
        ar: "سجل التدقيق",
        en: "Audit trail",
        permission: "finance.view",
      },
    ],
    secondaryItems: [
      {
        id: "monthly-close-audit",
        href: "/finance/close/review",
        ar: "تدقيق الإقفال",
        en: "Close audit",
        permission: "finance.view",
        parentId: "close",
      },
      {
        id: "invoice-journal",
        href: "/finance/invoice-journal-report",
        ar: "ربط الفواتير بالقيود",
        en: "Invoice journal links",
        permission: "finance.view",
        parentId: "integrity",
      },
    ],
    icon: ShieldCheck,
  },
  {
    id: "settings",
    ar: "الإعدادات المالية",
    en: "Finance settings",
    descriptionAr: "ربط الحسابات وإعداد النظام وصلاحيات الوصول.",
    descriptionEn: "Account mappings, system setup and access permissions.",
    items: [
      {
        id: "mappings",
        href: "/finance/settings/account-mappings",
        ar: "ربط الحسابات",
        en: "Account mappings",
        permission: "finance.settings.view",
      },
      {
        id: "permissions",
        href: "/finance/settings/permissions",
        ar: "الصلاحيات المالية",
        en: "Finance permissions",
        permission: "finance.settings.view",
      },
      {
        id: "system-settings",
        href: "/finance/settings",
        ar: "إعدادات النظام",
        en: "System settings",
        permission: "finance.settings.view",
      },
    ],
    secondaryItems: [
      {
        id: "wizard",
        href: "/finance/settings/setup",
        ar: "معالج الإعداد",
        en: "Setup wizard",
        permission: "finance.settings.view",
        parentId: "system-settings",
      },
      {
        id: "system-analysis",
        href: "/finance/settings/financial-system-analysis",
        ar: "تحليل النظام المالي",
        en: "Financial system analysis",
        permission: "finance.accounts.view",
        parentId: "system-settings",
      },
      {
        id: "journal-settings",
        href: "/finance/settings/journal-entries",
        ar: "إعدادات القيود",
        en: "Journal settings",
        superAdmin: true,
        parentId: "system-settings",
      },
      {
        id: "accounts-settings",
        href: "/finance/settings/accounts",
        ar: "إعدادات الحسابات",
        en: "Account settings",
        superAdmin: true,
        parentId: "system-settings",
      },
      {
        id: "centers-settings",
        href: "/finance/settings/cost-centers",
        ar: "إعدادات مراكز التكلفة",
        en: "Cost center settings",
        superAdmin: true,
        parentId: "system-settings",
      },
      {
        id: "automatic-accounts",
        href: "/finance/settings/automatic-accounts",
        ar: "الحسابات التلقائية",
        en: "Automatic accounts",
        superAdmin: true,
        parentId: "system-settings",
      },
    ],
    icon: Settings2,
  },
];
export const allFinanceDestinations = financeNavigation.flatMap((group) => [
  ...group.items,
  ...group.secondaryItems,
]);
export const financeNavigationPermissions = [
  ...new Set(
    allFinanceDestinations.flatMap((item) =>
      item.permission ? [item.permission] : []
    )
  ),
];
export function isFinanceDestinationActive(
  href: string,
  pathname: string,
  search: string
) {
  const resolved = resolveFinanceLocation(pathname, search);
  const [actualPath, actualSearch = ""] = resolved.split("?");
  const [targetPath, targetSearch = ""] = href.split("?");
  if (targetPath !== actualPath) return false;
  const actual = new URLSearchParams(actualSearch);
  return [...new URLSearchParams(targetSearch)].every(
    ([key, value]) => actual.get(key) === value
  );
}
export function findFinanceDestination(pathname: string, search: string) {
  for (const group of financeNavigation) {
    // Query-specific and detail destinations take precedence over their parent.
    const item = [...group.secondaryItems, ...group.items].find((item) =>
      isFinanceDestinationActive(item.href, pathname, search)
    );
    if (item)
      return {
        group,
        item,
        parent: group.items.find((parent) => parent.id === item.parentId),
      };
  }
  return undefined;
}
export interface FinanceNavigationAccess {
  admin: boolean;
  superAdmin: boolean;
  permissions: ReadonlySet<string>;
}
export function canAccessFinanceDestination(
  item: FinanceDestination,
  access: FinanceNavigationAccess
) {
  if (item.superAdmin) return access.superAdmin;
  if (item.admin) return access.admin || access.superAdmin;
  return (
    access.admin ||
    access.superAdmin ||
    (!!item.permission && access.permissions.has(item.permission))
  );
}
export function filterFinanceNavigation(
  access: FinanceNavigationAccess,
  includeSecondary = false
) {
  return financeNavigation
    .map((group) => ({
      ...group,
      items: (includeSecondary
        ? [...group.items, ...group.secondaryItems]
        : group.items
      ).filter((item) => canAccessFinanceDestination(item, access)),
      secondaryItems: group.secondaryItems.filter((item) =>
        canAccessFinanceDestination(item, access)
      ),
    }))
    .filter((group) => group.items.length > 0);
}
