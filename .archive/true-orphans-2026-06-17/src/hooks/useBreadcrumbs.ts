import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Breadcrumb item interface
 */
export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

/**
 * Custom hook for generating breadcrumbs based on current route
 * Automatically maps routes to breadcrumb labels
 */
export const useBreadcrumbs = (): BreadcrumbItem[] => {
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const pathname = location.pathname;

    // Split path into segments
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 0) {
      return [{ label: 'Home', path: '/', isActive: true }];
    }

    const items: BreadcrumbItem[] = [];
    let currentPath = '';

    // Add Dashboard as first item for non-root paths
    if (segments[0] !== 'auth') {
      items.push({
        label: 'لوحة التحكم',
        path: '/dashboard',
        isActive: pathname === '/dashboard',
      });
    }

    // Generate breadcrumbs from path segments
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;

      // Format label from segment
      const label = formatSegmentToLabel(segment);

      items.push({
        label,
        path: currentPath,
        isActive: isLast,
      });
    });

    return items;
  }, [location.pathname]);

  return breadcrumbs;
};

/**
 * Helper function to format URL segment into readable label
 */
function formatSegmentToLabel(segment: string): string {
  // Arabic translations for common segments
  const translations: Record<string, string> = {
    dashboard: 'لوحة التحكم',
    finance: 'المالية',
    fleet: 'إدارة الأسطول',
    customers: 'العملاء',
    contracts: 'العقود',
    sales: 'المبيعات',
    inventory: 'المخزون',
    reports: 'التقارير',
    hr: 'الموارد البشرية',
    legal: 'الشؤون القانونية',
    settings: 'الإعدادات',
    profile: 'الملف الشخصي',
    quotations: 'عروض الأسعار',
    support: 'الدعم الفني',
    maintenance: 'الصيانة',
    violations: 'المخالفات',
    'traffic-violations': 'المخالفات المرورية',
    'dispatch-permits': 'تصاريح الحركة',
    'chart-of-accounts': 'دليل الحسابات',
    ledger: 'دفتر الأستاذ',
    invoices: 'الفواتير',
    payments: 'المدفوعات',
    treasury: 'الخزينة والبنوك',
    'ar-aging': 'الذمم المدينة',
    'ap-aging': 'الذمم الدائنة',
    employees: 'الموظفون',
    attendance: 'الحضور والغياب',
    leave: 'الإجازات',
    payroll: 'الرواتب',
    cases: 'القضايا',
    'invoice-disputes': 'نزاعات الفواتير',
    'late-fees': 'غرامات التأخير',
    pipeline: 'خط الأنابيب',
    leads: 'العملاء المحتملين',
    opportunities: 'الفرص',
    quotes: 'عروض الأسعار',
    orders: 'الطلبات',
    analytics: 'التحليلات',
    approval: 'الموافقة',
    'vehicle-installments': 'أقساط المركبات',
    backup: 'النسخ الاحتياطية',
    audit: 'سجل العمليات',
    approvals: 'نظام الموافقات',
    // Super Admin routes
    'super-admin': 'إدارة النظام',
    companies: 'الشركات',
    users: 'المستخدمون',
    'create-company': 'إنشاء شركة',
    tenants: 'المستأجرون',
  };

  return translations[segment] || segment.replace(/-/g, ' ');
}
