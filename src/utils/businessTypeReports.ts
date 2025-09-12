import { 
  DollarSign, 
  Users, 
  Car, 
  Building, 
  Scale,
  Package,
  Wrench,
  TrendingUp,
  BookOpen,
  Heart,
  Factory
} from 'lucide-react';

export interface ReportModule {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  count: number;
  reports: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

// Mapping of business types to their relevant report modules
export const BUSINESS_TYPE_MODULES: Record<string, string[]> = {
  'real_estate': ['finance', 'properties', 'customers', 'legal'],
  'car_rental': ['finance', 'fleet', 'customers', 'hr'],
  'retail': ['finance', 'inventory', 'customers', 'hr'],
  'construction': ['finance', 'projects', 'hr', 'customers', 'legal'],
  'manufacturing': ['finance', 'inventory', 'hr', 'customers', 'production'],
  'healthcare': ['finance', 'patients', 'hr', 'medical'],
  'education': ['finance', 'students', 'hr', 'academic'],
  'professional_services': ['finance', 'customers', 'hr', 'legal'],
  'default': ['finance', 'customers', 'hr'] // Fallback for unknown business types
};

// All available report modules
export const ALL_REPORT_MODULES: Record<string, ReportModule> = {
  finance: {
    id: 'finance',
    title: 'التقارير المالية',
    description: 'تقارير الحسابات والميزانيات والمدفوعات',
    icon: DollarSign,
    color: 'bg-green-100 text-green-600',
    count: 12,
    reports: [
      { id: 'invoices_summary', name: 'ملخص الفواتير', type: 'financial' },
      { id: 'payments_summary', name: 'ملخص المدفوعات', type: 'financial' },
      { id: 'income_statement', name: 'قائمة الدخل', type: 'financial' },
      { id: 'balance_sheet', name: 'الميزانية العمومية', type: 'financial' },
      { id: 'cash_flow', name: 'التدفق النقدي', type: 'financial' },
      { id: 'trial_balance', name: 'ميزان المراجعة', type: 'financial' }
    ]
  },
  hr: {
    id: 'hr',
    title: 'تقارير الموارد البشرية',
    description: 'تقارير الموظفين والحضور والرواتب',
    icon: Users,
    color: 'bg-blue-100 text-blue-600',
    count: 8,
    reports: [
      { id: 'employees_summary', name: 'ملخص الموظفين', type: 'hr' },
      { id: 'payroll_summary', name: 'ملخص الرواتب', type: 'hr' },
      { id: 'attendance_summary', name: 'ملخص الحضور', type: 'hr' },
      { id: 'leave_requests', name: 'تقرير الإجازات', type: 'hr' }
    ]
  },
  fleet: {
    id: 'fleet',
    title: 'تقارير الأسطول',
    description: 'تقارير المركبات والصيانة والمخالفات',
    icon: Car,
    color: 'bg-purple-100 text-purple-600',
    count: 10,
    reports: [
      { id: 'vehicles_summary', name: 'ملخص المركبات', type: 'fleet' },
      { id: 'maintenance_summary', name: 'ملخص الصيانة', type: 'fleet' },
      { id: 'traffic_violations', name: 'تقرير المخالفات المرورية', type: 'fleet' },
      { id: 'fuel_consumption', name: 'تقرير استهلاك الوقود', type: 'fleet' }
    ]
  },
  properties: {
    id: 'properties',
    title: 'تقارير العقارات',
    description: 'تقارير العقارات والإشغال والأداء المالي',
    icon: Building,
    color: 'bg-cyan-100 text-cyan-600',
    count: 15,
    reports: [
      { id: 'property_financial', name: 'التقرير المالي للعقارات', type: 'properties' },
      { id: 'property_occupancy', name: 'تقرير الإشغال والشغور', type: 'properties' },
      { id: 'property_performance', name: 'تقرير أداء العقارات', type: 'properties' },
      { id: 'property_portfolio', name: 'تقرير المحفظة العقارية', type: 'properties' },
      { id: 'property_owners', name: 'تقارير الملاك', type: 'properties' },
      { id: 'property_tenants', name: 'تقارير المستأجرين', type: 'properties' },
      { id: 'property_maintenance', name: 'تقارير الصيانة', type: 'properties' },
      { id: 'property_roi', name: 'تقرير عائد الاستثمار', type: 'properties' },
      { id: 'property_market', name: 'تحليل السوق العقاري', type: 'properties' }
    ]
  },
  customers: {
    id: 'customers',
    title: 'تقارير العملاء',
    description: 'تقارير العملاء والعقود والفواتير',
    icon: Users,
    color: 'bg-orange-100 text-orange-600',
    count: 6,
    reports: [
      { id: 'customers_summary', name: 'ملخص العملاء', type: 'customers' },
      { id: 'customer_contracts', name: 'عقود العملاء', type: 'customers' },
      { id: 'customer_invoices', name: 'فواتير العملاء', type: 'customers' }
    ]
  },
  legal: {
    id: 'legal',
    title: 'التقارير القانونية',
    description: 'تقارير القضايا والمراسلات القانونية',
    icon: Scale,
    color: 'bg-red-100 text-red-600',
    count: 4,
    reports: [
      { id: 'cases_summary', name: 'ملخص القضايا', type: 'legal' },
      { id: 'legal_correspondence', name: 'المراسلات القانونية', type: 'legal' }
    ]
  },
  inventory: {
    id: 'inventory',
    title: 'تقارير المخزون',
    description: 'تقارير المخزون والمبيعات والحركة',
    icon: Package,
    color: 'bg-yellow-100 text-yellow-600',
    count: 8,
    reports: [
      { id: 'inventory_summary', name: 'ملخص المخزون', type: 'inventory' },
      { id: 'stock_movement', name: 'حركة المخزون', type: 'inventory' },
      { id: 'low_stock', name: 'تقرير النواقص', type: 'inventory' },
      { id: 'sales_summary', name: 'ملخص المبيعات', type: 'inventory' }
    ]
  },
  projects: {
    id: 'projects',
    title: 'تقارير المشاريع',
    description: 'تقارير المشاريع والتقدم والميزانيات',
    icon: Wrench,
    color: 'bg-indigo-100 text-indigo-600',
    count: 10,
    reports: [
      { id: 'projects_summary', name: 'ملخص المشاريع', type: 'projects' },
      { id: 'project_progress', name: 'تقدم المشاريع', type: 'projects' },
      { id: 'project_budget', name: 'ميزانية المشاريع', type: 'projects' },
      { id: 'project_timeline', name: 'جدولة المشاريع', type: 'projects' }
    ]
  },
  production: {
    id: 'production',
    title: 'تقارير الإنتاج',
    description: 'تقارير الإنتاج والجودة والكفاءة',
    icon: Factory,
    color: 'bg-gray-100 text-gray-600',
    count: 7,
    reports: [
      { id: 'production_summary', name: 'ملخص الإنتاج', type: 'production' },
      { id: 'quality_control', name: 'مراقبة الجودة', type: 'production' },
      { id: 'efficiency_report', name: 'تقرير الكفاءة', type: 'production' }
    ]
  },
  patients: {
    id: 'patients',
    title: 'تقارير المرضى',
    description: 'تقارير المرضى والمواعيد والعلاج',
    icon: Heart,
    color: 'bg-pink-100 text-pink-600',
    count: 6,
    reports: [
      { id: 'patients_summary', name: 'ملخص المرضى', type: 'patients' },
      { id: 'appointments', name: 'تقرير المواعيد', type: 'patients' },
      { id: 'treatments', name: 'تقرير العلاجات', type: 'patients' }
    ]
  },
  medical: {
    id: 'medical',
    title: 'التقارير الطبية',
    description: 'تقارير طبية وإحصائيات صحية',
    icon: Heart,
    color: 'bg-rose-100 text-rose-600',
    count: 5,
    reports: [
      { id: 'medical_records', name: 'السجلات الطبية', type: 'medical' },
      { id: 'diagnosis_stats', name: 'إحصائيات التشخيص', type: 'medical' }
    ]
  },
  students: {
    id: 'students',
    title: 'تقارير الطلاب',
    description: 'تقارير الطلاب والدرجات والحضور',
    icon: BookOpen,
    color: 'bg-emerald-100 text-emerald-600',
    count: 8,
    reports: [
      { id: 'students_summary', name: 'ملخص الطلاب', type: 'students' },
      { id: 'grades_report', name: 'تقرير الدرجات', type: 'students' },
      { id: 'attendance_report', name: 'تقرير الحضور', type: 'students' }
    ]
  },
  academic: {
    id: 'academic',
    title: 'التقارير الأكاديمية',
    description: 'تقارير أكاديمية ومناهج وأداء',
    icon: BookOpen,
    color: 'bg-teal-100 text-teal-600',
    count: 6,
    reports: [
      { id: 'curriculum_report', name: 'تقرير المناهج', type: 'academic' },
      { id: 'performance_analysis', name: 'تحليل الأداء', type: 'academic' }
    ]
  }
};

export function getReportModulesForBusinessType(businessType: string): ReportModule[] {
  const moduleIds = BUSINESS_TYPE_MODULES[businessType] || BUSINESS_TYPE_MODULES.default;
  
  return moduleIds
    .map(moduleId => ALL_REPORT_MODULES[moduleId])
    .filter(Boolean); // Remove any undefined modules
}