/**
 * مكون Breadcrumb للتنقل بين الصفحات
 * يعرض مسار الصفحة الحالية مع إمكانية الرجوع للصفحات السابقة
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// ======== Route Configuration ========

interface RouteConfig {
  label: string;
  parent?: string;
}

/**
 * تعريف المسارات وأسماءها العربية
 * parent: المسار الأب للرجوع إليه
 */
const ROUTE_CONFIG: Record<string, RouteConfig> = {
  // الرئيسية
  '/dashboard': { label: 'لوحة التحكم' },
  
  // العملاء
  '/customers': { label: 'إدارة العملاء', parent: '/dashboard' },
  '/customers/crm': { label: 'إدارة العلاقات (CRM)', parent: '/customers' },
  
  // الأسطول
  '/fleet': { label: 'إدارة الأسطول', parent: '/dashboard' },
  '/fleet/maintenance': { label: 'الصيانة', parent: '/fleet' },
  '/fleet/reservations': { label: 'الحجوزات', parent: '/fleet' },
  '/fleet/traffic-violations': { label: 'المخالفات المرورية', parent: '/fleet' },
  '/fleet/reports': { label: 'تقارير الأسطول', parent: '/fleet' },
  
  // العقود
  '/contracts': { label: 'العقود', parent: '/dashboard' },
  '/quotations': { label: 'عروض الأسعار', parent: '/dashboard' },
  
  // المالية
  '/finance': { label: 'المالية', parent: '/dashboard' },
  '/finance/hub': { label: 'المركز المالي', parent: '/dashboard' },
  '/payments': { label: 'المدفوعات', parent: '/finance/hub' },
  
  // الشؤون القانونية
  '/legal': { label: 'الشؤون القانونية', parent: '/dashboard' },
  '/legal/cases': { label: 'تتبع القضايا', parent: '/dashboard' },
  '/legal/delinquency': { label: 'إدارة المتعثرات', parent: '/dashboard' },
  '/legal/lawsuit/prepare': { label: 'تجهيز الدعوى', parent: '/legal/delinquency' },
  
  // الموارد البشرية
  '/hr': { label: 'الموارد البشرية', parent: '/dashboard' },
  '/hr/employees': { label: 'الموظفين', parent: '/hr' },
  '/hr/recruitment': { label: 'التوظيف', parent: '/hr' },
  
  // العمليات
  '/operations': { label: 'العمليات', parent: '/dashboard' },
  '/operations/reminders': { label: 'التذكيرات', parent: '/operations' },
  '/operations/notifications': { label: 'الإشعارات', parent: '/operations' },
  
  // النظام
  '/tasks': { label: 'إدارة المهام', parent: '/dashboard' },
  '/reports': { label: 'التقارير', parent: '/dashboard' },
  '/settings': { label: 'الإعدادات', parent: '/dashboard' },
};

// ======== Helper Functions ========

/**
 * الحصول على تسمية المسار
 */
function getRouteLabel(path: string): string {
  // محاولة المطابقة المباشرة
  if (ROUTE_CONFIG[path]) {
    return ROUTE_CONFIG[path].label;
  }
  
  // محاولة المطابقة للمسارات الديناميكية
  const basePath = path.replace(/\/[a-f0-9-]{36}$/, ''); // إزالة UUID
  if (ROUTE_CONFIG[basePath]) {
    return ROUTE_CONFIG[basePath].label;
  }
  
  // محاولة المطابقة الجزئية
  for (const [route, config] of Object.entries(ROUTE_CONFIG)) {
    if (path.startsWith(route + '/')) {
      return config.label;
    }
  }
  
  return 'الصفحة';
}

/**
 * الحصول على المسار الأب
 */
function getParentPath(path: string): string | null {
  // محاولة المطابقة المباشرة
  if (ROUTE_CONFIG[path]?.parent) {
    return ROUTE_CONFIG[path].parent!;
  }
  
  // محاولة المطابقة للمسارات الديناميكية
  const basePath = path.replace(/\/[a-f0-9-]{36}$/, '');
  if (ROUTE_CONFIG[basePath]?.parent) {
    return ROUTE_CONFIG[basePath].parent!;
  }
  
  // محاولة المطابقة الجزئية
  for (const [route, config] of Object.entries(ROUTE_CONFIG)) {
    if (path.startsWith(route + '/') && config.parent) {
      return route; // الرجوع للمسار الأصلي
    }
  }
  
  return null;
}

/**
 * بناء سلسلة المسارات (Breadcrumb chain)
 */
function buildBreadcrumbChain(currentPath: string): { path: string; label: string }[] {
  const chain: { path: string; label: string }[] = [];
  let path: string | null = currentPath;
  
  // بناء السلسلة من الصفحة الحالية للخلف
  while (path) {
    chain.unshift({
      path,
      label: getRouteLabel(path),
    });
    path = getParentPath(path);
  }
  
  // إضافة الرئيسية في البداية إذا لم تكن موجودة
  if (chain.length === 0 || chain[0].path !== '/dashboard') {
    chain.unshift({ path: '/dashboard', label: 'لوحة التحكم' });
  }
  
  return chain;
}

// ======== Component ========

interface PageBreadcrumbProps {
  className?: string;
  /** تجاوز المسار الحالي */
  currentPath?: string;
  /** تجاوز العنوان الحالي */
  currentLabel?: string;
}

export function PageBreadcrumb({ className, currentPath, currentLabel }: PageBreadcrumbProps) {
  const location = useLocation();
  const path = currentPath || location.pathname;
  
  const breadcrumbChain = buildBreadcrumbChain(path);
  
  // تحديث التسمية الأخيرة إذا تم تمريرها
  if (currentLabel && breadcrumbChain.length > 0) {
    breadcrumbChain[breadcrumbChain.length - 1].label = currentLabel;
  }
  
  // لا تعرض شيء إذا كنا في الرئيسية فقط
  if (breadcrumbChain.length <= 1) {
    return null;
  }
  
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1 text-sm mb-3', className)}
    >
      {breadcrumbChain.map((item, index) => {
        const isLast = index === breadcrumbChain.length - 1;
        const isFirst = index === 0;
        
        return (
          <React.Fragment key={item.path}>
            {isFirst ? (
              // أيقونة الرئيسية
              <Link
                to={item.path}
                className="flex items-center gap-1 text-neutral-500 hover:text-coral-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ) : isLast ? (
              // الصفحة الحالية (غير قابلة للنقر)
              <span className="text-neutral-900 font-medium">
                {item.label}
              </span>
            ) : (
              // صفحة وسطية (قابلة للنقر)
              <Link
                to={item.path}
                className="text-neutral-500 hover:text-coral-600 transition-colors"
              >
                {item.label}
              </Link>
            )}
            
            {/* الفاصل */}
            {!isLast && (
              <ChevronLeft className="w-4 h-4 text-neutral-300 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default PageBreadcrumb;

