interface BreadcrumbConfig {
  label: string;
  parent?: string;
}

export const breadcrumbConfig: Record<string, BreadcrumbConfig> = {
  // Dashboard
  '/dashboard': { label: 'لوحة التحكم' },

  // Sales (Phase 7B)
  '/sales': { label: 'المبيعات' },
  '/sales/pipeline': { label: 'مسار المبيعات', parent: '/sales' },
  '/sales/leads': { label: 'العملاء المحتملين', parent: '/sales' },
  '/sales/orders': { label: 'الطلبات', parent: '/sales' },

  // Inventory (Phase 7B)
  '/inventory': { label: 'المخزون' },
  '/inventory/categories': { label: 'التصنيفات', parent: '/inventory' },
  '/inventory/movements': { label: 'حركات المخزون', parent: '/inventory' },
  '/inventory/reports': { label: 'التقارير', parent: '/inventory' },

  // Finance
  '/finance': { label: 'المالية' },
  '/finance/chart-of-accounts': { label: 'دليل الحسابات', parent: '/finance' },
  '/finance/account-mappings': { label: 'ربط الحسابات', parent: '/finance' },
  '/finance/ledger': { label: 'دفتر الأستاذ', parent: '/finance' },
  '/finance/treasury': { label: 'الخزينة والبنوك', parent: '/finance' },
  '/finance/invoices': { label: 'الفواتير', parent: '/finance' },
  '/finance/payments': { label: 'المدفوعات', parent: '/finance' },
  '/finance/budgets': { label: 'الموازنات', parent: '/finance' },
  '/finance/cost-centers': { label: 'مراكز التكلفة', parent: '/finance' },
  '/finance/assets': { label: 'الأصول الثابتة', parent: '/finance' },
  '/finance/vendors': { label: 'الموردين', parent: '/finance' },
  '/finance/vendor-categories': { label: 'تصنيفات الموردين', parent: '/finance' },
  '/finance/purchase-orders': { label: 'أوامر الشراء', parent: '/finance' },
  '/finance/analysis': { label: 'التحليل المالي', parent: '/finance' },
  '/finance/reports': { label: 'التقارير المالية', parent: '/finance' },

  // Fleet
  '/fleet': { label: 'الأسطول' },
  '/fleet/dispatch-permits': { label: 'تصاريح الحركة', parent: '/fleet' },
  '/fleet/maintenance': { label: 'الصيانة', parent: '/fleet' },
  '/fleet/traffic-violations': { label: 'المخالفات المرورية', parent: '/fleet' },
  '/fleet/traffic-violation-payments': { label: 'مدفوعات المخالفات', parent: '/fleet' },
  '/fleet/reports': { label: 'التقارير والتحليلات', parent: '/fleet' },
  '/fleet/vehicle-installments': { label: 'أقساط المركبات', parent: '/fleet' },

  // HR
  '/hr': { label: 'الموارد البشرية' },
  '/hr/employees': { label: 'إدارة الموظفين', parent: '/hr' },
  '/hr/attendance': { label: 'الحضور والانصراف', parent: '/hr' },
  '/hr/leave-management': { label: 'إدارة الإجازات', parent: '/hr' },
  '/hr/payroll': { label: 'الرواتب', parent: '/hr' },
  '/hr/reports': { label: 'تقارير الموارد البشرية', parent: '/hr' },
  '/hr/location-settings': { label: 'إعدادات الموقع', parent: '/hr' },
  '/hr/settings': { label: 'إعدادات الموارد البشرية', parent: '/hr' },

  // Legal
  '/legal': { label: 'الشؤون القانونية' },
  '/legal/cases': { label: 'تتبع القضايا', parent: '/legal' },

  // Other
  '/quotations': { label: 'عروض الأسعار' },
  '/contracts': { label: 'العقود' },
  '/reports': { label: 'التقارير' },
  '/support': { label: 'الدعم الفني' },
  '/approvals': { label: 'نظام الموافقات' },
  '/backup': { label: 'النسخ الاحتياطية' },
  '/audit': { label: 'سجل العمليات' },
  '/profile': { label: 'الملف الشخصي' },
  '/settings': { label: 'الإعدادات' },
};

/**
 * Get breadcrumb trail for a given path
 * @param path Current route path
 * @returns Array of breadcrumb items with label and href
 */
export function getBreadcrumbs(path: string): Array<{ label: string; href: string }> {
  const breadcrumbs: Array<{ label: string; href: string }> = [];
  const config = breadcrumbConfig[path];

  if (!config) {
    return breadcrumbs;
  }

  // Build breadcrumb trail by following parent chain
  let currentPath: string | undefined = path;
  const seen = new Set<string>(); // Prevent infinite loops

  while (currentPath && !seen.has(currentPath)) {
    seen.add(currentPath);
    const currentConfig = breadcrumbConfig[currentPath];

    if (currentConfig) {
      breadcrumbs.unshift({
        label: currentConfig.label,
        href: currentPath,
      });
      currentPath = currentConfig.parent;
    } else {
      break;
    }
  }

  // Always add home as first item
  if (breadcrumbs.length > 0 && breadcrumbs[0].href !== '/dashboard') {
    breadcrumbs.unshift({
      label: 'الرئيسية',
      href: '/dashboard',
    });
  }

  return breadcrumbs;
}

/**
 * Get page title from breadcrumb config
 * @param path Current route path
 * @returns Page title or default
 */
export function getPageTitle(path: string): string {
  return breadcrumbConfig[path]?.label || 'Fleetify';
}
