const CONDITION_LABELS: Record<string, string> = {
  excellent: 'ممتازة',
  good: 'جيدة',
  fair: 'مقبولة',
  poor: 'ضعيفة',
};

const SEVERITY_LABELS: Record<string, string> = {
  minor: 'بسيط',
  moderate: 'متوسط',
  severe: 'شديد',
};

const SUMMARY_LABELS: Record<string, string> = {
  totalEmployees: 'إجمالي الموظفين',
  activeEmployees: 'الموظفون النشطون',
  departments: 'عدد الأقسام',
  totalPayroll: 'إجمالي الرواتب',
  employeesPaid: 'الموظفون المدفوعة رواتبهم',
  totalVehicles: 'إجمالي المركبات',
  availableVehicles: 'المركبات المتاحة',
  rentedVehicles: 'المركبات المؤجرة',
  maintenanceVehicles: 'مركبات تحت الصيانة',
  totalCustomers: 'إجمالي العملاء',
  activeCustomers: 'العملاء النشطون',
  newCustomers: 'العملاء الجدد',
  totalCases: 'إجمالي القضايا',
  activeCases: 'القضايا النشطة',
  closedCases: 'القضايا المغلقة',
  totalInvoices: 'إجمالي الفواتير',
  totalAmount: 'إجمالي المبلغ',
  paidInvoices: 'الفواتير المدفوعة',
  totalPayments: 'إجمالي المدفوعات',
  totalDamagePoints: 'إجمالي نقاط الضرر',
  severeDamages: 'أضرار شديدة',
  moderateDamages: 'أضرار متوسطة',
  minorDamages: 'أضرار بسيطة',
};

const MODULE_TITLES: Record<string, string> = {
  finance: 'المالية',
  hr: 'الموارد البشرية',
  fleet: 'الأسطول',
  customers: 'العملاء',
  legal: 'القانونية',
  damage_report: 'تقرير الأضرار',
};

export const getConditionLabel = (condition: string): string => CONDITION_LABELS[condition] || condition;
export const getSeverityLabel = (severity: string): string => SEVERITY_LABELS[severity] || severity;
export const getSummaryLabel = (key: string): string => SUMMARY_LABELS[key] || key;
export const getModuleTitle = (moduleType: string): string => MODULE_TITLES[moduleType] || moduleType;
