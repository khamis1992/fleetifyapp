import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home, ChevronLeft } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ComponentType<any>;
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'لوحة التحكم',
  '/profile': 'الملف الشخصي',
  '/settings': 'الإعدادات',
  '/subscription': 'الاشتراك',
  '/performance': 'الأداء',
  '/backup': 'النسخ الاحتياطي',
  '/audit': 'سجل التدقيق',
  '/fleet': 'إدارة الأسطول',
  '/fleet/maintenance': 'الصيانة',
  '/fleet/traffic-violations': 'المخالفات المرورية',
  '/fleet/traffic-violation-payments': 'مدفوعات المخالفات',
  '/fleet/reports': 'تقارير الأسطول',
  '/contracts': 'العقود',
  '/customers': 'العملاء',
  '/quotations': 'عروض الأسعار',
  '/finance': 'المالية',
  '/finance/accounts': 'الحسابات',
  '/finance/budgets': 'الميزانيات',
  '/finance/chart-of-accounts': 'دليل الحسابات',
  '/finance/cost-centers': 'مراكز التكلفة',
  '/finance/financial-analysis': 'التحليل المالي',
  '/finance/fixed-assets': 'الأصول الثابتة',
  '/finance/general-ledger': 'دفتر الأستاذ العام',
  '/finance/invoice-reports': 'تقارير الفواتير',
  '/finance/invoices': 'الفواتير',
  '/finance/ledger': 'دفتر الأستاذ',
  '/finance/payments': 'المدفوعات',
  '/finance/reports': 'التقارير المالية',
  '/finance/treasury': 'الخزينة',
  '/finance/vendors': 'الموردون',
  '/finance/account-mappings': 'ربط الحسابات',
  '/hr/employees': 'الموظفون',
  '/hr/user-management': 'إدارة المستخدمين',
  '/hr/attendance': 'الحضور والانصراف',
  '/hr/leave-management': 'إدارة الإجازات',
  '/hr/location-settings': 'إعدادات الموقع',
  '/hr/payroll': 'الرواتب',
  '/hr/reports': 'تقارير الموارد البشرية',
  '/hr/settings': 'إعدادات الموارد البشرية',
  '/reports': 'التقارير',
  '/legal': 'الشؤون القانونية'
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: 'الرئيسية',
        path: '/dashboard',
        icon: Home
      }
    ];

    let currentPath = '';
    pathnames.forEach((pathname, index) => {
      currentPath += `/${pathname}`;
      
      // Skip dashboard as it's already added as home
      if (currentPath === '/dashboard') {
        return;
      }

      const label = routeLabels[currentPath] || pathname;
      const isLast = index === pathnames.length - 1;

      breadcrumbs.push({
        label,
        path: isLast ? undefined : currentPath
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on dashboard page
  if (location.pathname === '/dashboard' || breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <div className="mb-6" dir="rtl">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {breadcrumb.path ? (
                  <BreadcrumbLink asChild>
                    <Link 
                      to={breadcrumb.path}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      {breadcrumb.icon && <breadcrumb.icon className="h-4 w-4" />}
                      {breadcrumb.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="flex items-center gap-2 font-medium">
                    {breadcrumb.icon && <breadcrumb.icon className="h-4 w-4" />}
                    {breadcrumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && (
                <BreadcrumbSeparator>
                  <ChevronLeft className="h-4 w-4" />
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};