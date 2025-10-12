import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '@/components/ui/breadcrumb';
import { 
  Home, 
  ChevronLeft, 
  DollarSign, 
  Users, 
  FileText, 
  TrendingUp, 
  Settings, 
  Building, 
  Car, 
  BarChart3,
  CreditCard,
  BookOpen,
  Package,
  Calculator,
  PieChart,
  Wallet,
  Target,
  FolderOpen,
  ShoppingCart,
  Receipt,
  Briefcase,
  UserCircle,
  Shield,
  MapPin,
  Calendar,
  Scale,
  FileCheck
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ComponentType<any>;
}

interface RouteConfig {
  label: string;
  icon?: React.ComponentType<any>;
}

const routeConfig: Record<string, RouteConfig> = {
  // Main sections
  '/dashboard': { label: 'لوحة التحكم', icon: Home },
  '/profile': { label: 'الملف الشخصي', icon: UserCircle },
  '/settings': { label: 'الإعدادات', icon: Settings },
  '/subscription': { label: 'الاشتراك', icon: CreditCard },
  '/performance': { label: 'الأداء', icon: TrendingUp },
  '/backup': { label: 'النسخ الاحتياطي', icon: FolderOpen },
  '/audit': { label: 'سجل التدقيق', icon: FileCheck },
  '/reports': { label: 'التقارير', icon: BarChart3 },
  '/legal': { label: 'الشؤون القانونية', icon: Scale },
  
  // Finance Module
  '/finance': { label: 'المالية', icon: DollarSign },
  '/finance/accounts': { label: 'الحسابات', icon: Wallet },
  '/finance/budgets': { label: 'الميزانيات', icon: PieChart },
  '/finance/chart-of-accounts': { label: 'دليل الحسابات', icon: BookOpen },
  '/finance/cost-centers': { label: 'مراكز التكلفة', icon: Target },
  '/finance/financial-analysis': { label: 'التحليل المالي', icon: TrendingUp },
  '/finance/fixed-assets': { label: 'الأصول الثابتة', icon: Building },
  '/finance/general-ledger': { label: 'دفتر الأستاذ العام', icon: BookOpen },
  '/finance/invoice-reports': { label: 'تقارير الفواتير', icon: BarChart3 },
  '/finance/invoices': { label: 'الفواتير', icon: Receipt },
  '/finance/ledger': { label: 'دفتر الأستاذ', icon: BookOpen },
  '/finance/payments': { label: 'المدفوعات', icon: CreditCard },
  '/finance/reports': { label: 'التقارير المالية', icon: BarChart3 },
  '/finance/treasury': { label: 'الخزينة', icon: Wallet },
  '/finance/vendors': { label: 'الموردون', icon: ShoppingCart },
  '/finance/account-mappings': { label: 'ربط الحسابات', icon: Settings },
  '/finance/purchase-orders': { label: 'أوامر الشراء', icon: ShoppingCart },
  '/finance/deposits': { label: 'الودائع', icon: Wallet },
  '/finance/calculator': { label: 'الآلة الحاسبة', icon: Calculator },
  '/finance/unified-financial-dashboard': { label: 'لوحة التحكم المالية', icon: BarChart3 },
  
  // Finance Settings
  '/finance/settings': { label: 'الإعدادات', icon: Settings },
  '/finance/settings/accounts': { label: 'إعدادات الحسابات', icon: Settings },
  '/finance/settings/automatic-accounts': { label: 'الحسابات التلقائية', icon: Settings },
  '/finance/settings/cost-centers': { label: 'إعدادات مراكز التكلفة', icon: Settings },
  '/finance/settings/customer-accounts': { label: 'حسابات العملاء', icon: Settings },
  '/finance/settings/journal-entries': { label: 'إعدادات القيود', icon: Settings },
  '/finance/settings/account-recovery': { label: 'استرجاع الحسابات', icon: Settings },
  '/finance/settings/financial-system-analysis': { label: 'تحليل النظام المالي', icon: TrendingUp },
  
  // Fleet Management
  '/fleet': { label: 'إدارة الأسطول', icon: Car },
  '/fleet/maintenance': { label: 'الصيانة', icon: Settings },
  '/fleet/traffic-violations': { label: 'المخالفات المرورية', icon: FileText },
  '/fleet/traffic-violation-payments': { label: 'مدفوعات المخالفات', icon: CreditCard },
  '/fleet/reports': { label: 'تقارير الأسطول', icon: BarChart3 },
  '/fleet/dispatch-permits': { label: 'تصاريح التشغيل', icon: FileText },
  '/fleet/vehicle-condition-check': { label: 'فحص حالة المركبة', icon: FileCheck },
  '/fleet/financial-analysis': { label: 'التحليل المالي', icon: TrendingUp },
  '/fleet/vehicle-installments': { label: 'أقساط المركبات', icon: CreditCard },
  
  // Contracts & Customers
  '/contracts': { label: 'العقود', icon: FileText },
  '/customers': { label: 'العملاء', icon: Users },
  '/tenants': { label: 'المستأجرين', icon: Users },
  '/quotations': { label: 'عروض الأسعار', icon: Receipt },
  
  // HR Module
  '/hr': { label: 'الموارد البشرية', icon: Users },
  '/hr/employees': { label: 'الموظفون', icon: Users },
  '/hr/user-management': { label: 'إدارة المستخدمين', icon: Shield },
  '/hr/attendance': { label: 'الحضور والانصراف', icon: Calendar },
  '/hr/leave-management': { label: 'إدارة الإجازات', icon: Calendar },
  '/hr/location-settings': { label: 'إعدادات الموقع', icon: MapPin },
  '/hr/payroll': { label: 'الرواتب', icon: Wallet },
  '/hr/reports': { label: 'تقارير الموارد البشرية', icon: BarChart3 },
  '/hr/settings': { label: 'إعدادات الموارد البشرية', icon: Settings },
  
  // Properties
  '/properties': { label: 'العقارات', icon: Building },
  '/properties/add': { label: 'إضافة عقار', icon: Building },
  '/properties/owners': { label: 'ملاك العقارات', icon: Users },
  '/properties/map': { label: 'خريطة العقارات', icon: MapPin },
  '/properties/maintenance': { label: 'صيانة العقارات', icon: Settings },
  '/properties/contracts': { label: 'عقود العقارات', icon: FileText },
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

      const config = routeConfig[currentPath];
      const label = config?.label || pathname;
      const icon = config?.icon;
      const isLast = index === pathnames.length - 1;

      breadcrumbs.push({
        label,
        path: isLast ? undefined : currentPath,
        icon
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on dashboard page
  if (location.pathname === '/dashboard' || breadcrumbs.length <= 1) {
    return null;
  }

  // For deep hierarchies (>4 levels), collapse middle items
  const renderBreadcrumbs = () => {
    if (breadcrumbs.length <= 4) {
      // Show all breadcrumbs normally
      return breadcrumbs.map((breadcrumb, index) => (
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
      ));
    }

    // Collapse middle items for deep hierarchies
    const first = breadcrumbs[0];
    const last = breadcrumbs[breadcrumbs.length - 1];
    const middle = breadcrumbs.slice(1, -1);

    return (
      <>
        {/* First breadcrumb (Home) */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link 
              to={first.path!}
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              {first.icon && <first.icon className="h-4 w-4" />}
              {first.label}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronLeft className="h-4 w-4" />
        </BreadcrumbSeparator>

        {/* Collapsed middle items with dropdown */}
        <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary transition-colors">
              <BreadcrumbEllipsis className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {middle.map((breadcrumb, index) => (
                <DropdownMenuItem key={index} asChild>
                  <Link 
                    to={breadcrumb.path!}
                    className="flex items-center gap-2 w-full"
                  >
                    {breadcrumb.icon && <breadcrumb.icon className="h-4 w-4" />}
                    {breadcrumb.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronLeft className="h-4 w-4" />
        </BreadcrumbSeparator>

        {/* Last breadcrumb (current page) */}
        <BreadcrumbItem>
          <BreadcrumbPage className="flex items-center gap-2 font-medium">
            {last.icon && <last.icon className="h-4 w-4" />}
            {last.label}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </>
    );
  };

  return (
    <div className="mb-6" dir="rtl">
      <Breadcrumb>
        <BreadcrumbList>
          {renderBreadcrumbs()}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};