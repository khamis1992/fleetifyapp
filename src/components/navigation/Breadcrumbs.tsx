import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Breadcrumb item definition
 */
export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

/**
 * Breadcrumb route mapping
 */
const BREADCRUMB_ROUTES: Record<string, BreadcrumbItem[]> = {
  // Dashboard
  '/dashboard': [
    { label: 'لوحة التحكم', path: '/dashboard', isActive: true },
  ],

  // Finance
  '/finance': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المالية', path: '/finance', isActive: true },
  ],
  '/finance/chart-of-accounts': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المالية', path: '/finance' },
    { label: 'دليل الحسابات', path: '/finance/chart-of-accounts', isActive: true },
  ],
  '/finance/ledger': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المالية', path: '/finance' },
    { label: 'دفتر الأستاذ', path: '/finance/ledger', isActive: true },
  ],
  '/finance/invoices': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المالية', path: '/finance' },
    { label: 'الفواتير', path: '/finance/invoices', isActive: true },
  ],
  '/finance/payments': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المالية', path: '/finance' },
    { label: 'المدفوعات', path: '/finance/payments', isActive: true },
  ],
  '/finance/treasury': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المالية', path: '/finance' },
    { label: 'الخزينة والبنوك', path: '/finance/treasury', isActive: true },
  ],
  '/finance/ar-aging': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المالية', path: '/finance' },
    { label: 'الذمم المدينة', path: '/finance/ar-aging', isActive: true },
  ],
  '/finance/ap-aging': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المالية', path: '/finance' },
    { label: 'الذمم الدائنة', path: '/finance/ap-aging', isActive: true },
  ],

  // Fleet
  '/fleet': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'إدارة الأسطول', path: '/fleet', isActive: true },
  ],
  '/fleet/maintenance': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'إدارة الأسطول', path: '/fleet' },
    { label: 'الصيانة', path: '/fleet/maintenance', isActive: true },
  ],
  '/fleet/traffic-violations': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'إدارة الأسطول', path: '/fleet' },
    { label: 'المخالفات المرورية', path: '/fleet/traffic-violations', isActive: true },
  ],
  '/fleet/dispatch-permits': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'إدارة الأسطول', path: '/fleet' },
    { label: 'تصاريح الحركة', path: '/fleet/dispatch-permits', isActive: true },
  ],
  '/fleet/reports': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'إدارة الأسطول', path: '/fleet' },
    { label: 'التقارير', path: '/fleet/reports', isActive: true },
  ],
  '/fleet/traffic-violation-payments': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'إدارة الأسطول', path: '/fleet' },
    { label: 'مدفوعات المخالفات', path: '/fleet/traffic-violation-payments', isActive: true },
  ],
  '/fleet/vehicle-installments': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'إدارة الأسطول', path: '/fleet' },
    { label: 'أقساط المركبات', path: '/fleet/vehicle-installments', isActive: true },
  ],
  '/fleet/reservation-system': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'إدارة الأسطول', path: '/fleet' },
    { label: 'نظام الحجوزات', path: '/fleet/reservation-system', isActive: true },
  ],
  '/fleet/financial-analysis': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'إدارة الأسطول', path: '/fleet' },
    { label: 'التحليل المالي', path: '/fleet/financial-analysis', isActive: true },
  ],

  // Customers
  '/customers': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'العملاء', path: '/customers', isActive: true },
  ],

  // Contracts
  '/contracts': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'العقود', path: '/contracts', isActive: true },
  ],

  // Sales
  '/sales/pipeline': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المبيعات', path: '/sales/pipeline', isActive: true },
  ],
  '/sales/leads': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المبيعات', path: '/sales/leads', isActive: true },
  ],
  '/sales/opportunities': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المبيعات', path: '/sales/opportunities', isActive: true },
  ],
  '/sales/quotes': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المبيعات', path: '/sales/quotes', isActive: true },
  ],
  '/sales/orders': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المبيعات', path: '/sales/orders', isActive: true },
  ],
  '/sales/analytics': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المبيعات', path: '/sales/analytics', isActive: true },
  ],

  // HR
  '/hr/employees': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'الموارد البشرية', path: '/hr/employees', isActive: true },
  ],
  '/hr/attendance': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'الموارد البشرية', path: '/hr/attendance', isActive: true },
  ],
  '/hr/leave': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'الموارد البشرية', path: '/hr/leave', isActive: true },
  ],
  '/hr/payroll': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'الموارد البشرية', path: '/hr/payroll', isActive: true },
  ],

  // Inventory
  '/inventory': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'المخزون', path: '/inventory', isActive: true },
  ],

  // Reports
  '/reports': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'التقارير', path: '/reports', isActive: true },
  ],

  // Legal
  '/legal/cases': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'الشؤون القانونية', path: '/legal/cases', isActive: true },
  ],
  '/legal/invoice-disputes': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'الشؤون القانونية', path: '/legal/cases' },
    { label: 'نزاعات الفواتير', path: '/legal/invoice-disputes', isActive: true },
  ],
  '/legal/late-fees': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'الشؤون القانونية', path: '/legal/cases' },
    { label: 'إدارة غرامات التأخير', path: '/legal/late-fees', isActive: true },
  ],

  // Settings
  '/settings': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'الإعدادات', path: '/settings', isActive: true },
  ],
  '/profile': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'الملف الشخصي', path: '/profile', isActive: true },
  ],

  // Quotations
  '/quotations': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'عروض الأسعار', path: '/quotations', isActive: true },
  ],

  // Support
  '/support': [
    { label: 'لوحة التحكم', path: '/dashboard' },
    { label: 'الدعم الفني', path: '/support', isActive: true },
  ],
};

/**
 * Breadcrumbs Component
 * Displays navigation breadcrumbs at the top of content area
 * Shows current page and clickable links to parent pages
 */
export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get breadcrumbs for current route
  const breadcrumbs = useMemo(() => {
    // Check for exact match first
    let items = BREADCRUMB_ROUTES[location.pathname];

    // Handle dynamic routes
    if (!items) {
      // Vehicle details
      if (location.pathname.startsWith('/fleet/vehicles/')) {
        items = [
          { label: 'لوحة التحكم', path: '/dashboard' },
          { label: 'إدارة الأسطول', path: '/fleet' },
          { label: 'تفاصيل المركبة', path: undefined, isActive: true },
        ];
      }
      // Customer details
      else if (location.pathname.startsWith('/customers/')) {
        items = [
          { label: 'لوحة التحكم', path: '/dashboard' },
          { label: 'العملاء', path: '/customers' },
          { label: 'تفاصيل العميل', path: undefined, isActive: true },
        ];
      }
      // Contract details
      else if (location.pathname.startsWith('/contracts/')) {
        items = [
          { label: 'لوحة التحكم', path: '/dashboard' },
          { label: 'العقود', path: '/contracts' },
          { label: 'تفاصيل العقد', path: undefined, isActive: true },
        ];
      }
      // Invoice details
      else if (location.pathname.startsWith('/finance/invoices/')) {
        items = [
          { label: 'لوحة التحكم', path: '/dashboard' },
          { label: 'المالية', path: '/finance' },
          { label: 'الفواتير', path: '/finance/invoices' },
          { label: 'تفاصيل الفاتورة', path: undefined, isActive: true },
        ];
      }
      // Payment details
      else if (location.pathname.startsWith('/finance/payments/')) {
        items = [
          { label: 'لوحة التحكم', path: '/dashboard' },
          { label: 'المالية', path: '/finance' },
          { label: 'المدفوعات', path: '/finance/payments' },
          { label: 'تفاصيل الدفعة', path: undefined, isActive: true },
        ];
      }
      // Legal case details
      else if (location.pathname.startsWith('/legal/cases/')) {
        items = [
          { label: 'لوحة التحكم', path: '/dashboard' },
          { label: 'الشؤون القانونية', path: '/legal/cases' },
          { label: 'تفاصيل القضية', path: undefined, isActive: true },
        ];
      }
      // Employee details
      else if (location.pathname.startsWith('/hr/employees/')) {
        items = [
          { label: 'لوحة التحكم', path: '/dashboard' },
          { label: 'الموارد البشرية', path: '/hr/employees' },
          { label: 'تفاصيل الموظف', path: undefined, isActive: true },
        ];
      }
    }

    // If no exact match, try to find a partial match
    if (!items) {
      const pathname = location.pathname;
      for (const [route, routeBreadcrumbs] of Object.entries(BREADCRUMB_ROUTES)) {
        if (pathname.startsWith(route) && route !== '/') {
          items = routeBreadcrumbs;
          break;
        }
      }
    }

    // Default to dashboard breadcrumb if no match found
    if (!items) {
      items = [
        { label: 'لوحة التحكم', path: '/dashboard', isActive: true },
      ];
    }

    return items;
  }, [location.pathname]);

  // Don't show breadcrumbs on login/auth pages
  if (location.pathname.includes('/auth') || location.pathname === '/') {
    return null;
  }

  return (
    <nav
      className="flex items-center gap-1 px-6 py-3 bg-card/30 border-b border-border/50"
      aria-label="Breadcrumb Navigation"
    >
      {/* Home Icon */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/dashboard')}
        className="h-8 w-8 p-0 hover:bg-accent/50 transition-colors"
        title="Go to Dashboard"
      >
        <Home className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
      </Button>

      {/* Breadcrumb Items */}
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <React.Fragment key={item.path || index}>
            {/* Chevron Separator */}
            <ChevronLeft className="h-4 w-4 text-muted-foreground/60 mx-1 flex-shrink-0" />

            {/* Breadcrumb Item */}
            {isLast ? (
              // Current Page (Not Clickable)
              <span
                className={cn(
                  'text-sm font-medium px-2 py-1 rounded transition-colors',
                  'text-foreground bg-primary/10 border border-primary/20'
                )}
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              // Clickable Link
              <button
                onClick={() => item.path && navigate(item.path)}
                className={cn(
                  'text-sm px-2 py-1 rounded transition-colors',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-accent/50',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                )}
                type="button"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
