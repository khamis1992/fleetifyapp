/**
 * Report Labels and Translations
 * Extracted from useReportExport.ts for better organization
 * Contains all label translation functions for Arabic report generation
 */

/**
 * Get Arabic label for vehicle condition status
 */
export const getConditionLabel = (condition: string): string => {
  const labels: Record<string, string> = {
    excellent: 'ممتازة',
    good: 'جيدة',
    fair: 'مقبولة',
    poor: 'ضعيفة'
  };
  return labels[condition] || condition;
};

/**
 * Get Arabic label for damage severity level
 */
export const getSeverityLabel = (severity: string): string => {
  const labels: Record<string, string> = {
    minor: 'بسيط',
    moderate: 'متوسط',
    severe: 'شديد'
  };
  return labels[severity] || severity;
};

/**
 * Get Arabic label for report summary metrics
 */
export const getSummaryLabel = (key: string): string => {
  const labels: Record<string, string> = {
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
    minorDamages: 'أضرار بسيطة'
  };
  return labels[key] || key;
};

/**
 * Get Arabic title for module type
 */
export const getModuleTitle = (moduleType: string): string => {
  const titles: Record<string, string> = {
    finance: 'المالية',
    hr: 'الموارد البشرية',
    fleet: 'الأسطول',
    customers: 'العملاء',
    legal: 'القانونية',
    damage_report: 'تقرير الأضرار'
  };
  return titles[moduleType] || moduleType;
};
