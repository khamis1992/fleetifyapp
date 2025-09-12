import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { AdminOnly, SuperAdminOnly } from '@/components/common/PermissionGuard';
import { 
  Car, 
  FileText, 
  Users, 
  DollarSign, 
  Settings,
  LogOut,
  Home,
  Shield,
  BarChart3,
  Building2,
  Calculator,
  Receipt,
  CreditCard,
  Building,
  Target,
  PieChart,
  ChevronDown,
  BookOpen,
  Landmark,
  MapPin,
  Clock,
  UserCheck,
  UserCog,
  Calendar,
  Wrench,
  AlertTriangle,
  Link,
  Crown,
  Activity,
  Database,
  CheckSquare,
  Headphones,
  TrendingUp,
  Zap
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigationItems = [
  { 
    name: 'لوحة التحكم', 
    name_en: 'Dashboard',
    href: '/dashboard', 
    icon: Home 
  },
  { 
    name: 'العملاء', 
    name_en: 'Customers',
    href: '/customers', 
    icon: Users 
  }
];

const adminItems = [
  {
    name: 'نظام الموافقات',
    href: '/approvals',
    icon: CheckSquare
  },
  {
    name: 'النسخ الاحتياطية',
    href: '/backup',
    icon: Database
  },
  {
    name: 'سجل العمليات',
    href: '/audit',
    icon: FileText
  }
];

const financeSubItems = [
  {
    name: 'دليل الحسابات',
    href: '/finance/chart-of-accounts',
    icon: BookOpen
  },
  {
    name: 'ربط الحسابات',
    href: '/finance/account-mappings',
    icon: Link
  },
  {
    name: 'دفتر الأستاذ',
    href: '/finance/ledger',
    icon: Calculator
  },
  {
    name: 'الخزينة والبنوك',
    href: '/finance/treasury',
    icon: Landmark
  },
  {
    name: 'الفواتير',
    href: '/finance/invoices',
    icon: Receipt
  },
  {
    name: 'المدفوعات',
    href: '/finance/payments',
    icon: CreditCard
  },
  {
    name: 'الموازنات',
    href: '/finance/budgets',
    icon: Target
  },
  {
    name: 'مراكز التكلفة',
    href: '/finance/cost-centers',
    icon: MapPin
  },
  {
    name: 'الأصول الثابتة',
    href: '/finance/assets',
    icon: Building
  },
  {
    name: 'الموردين',
    href: '/finance/vendors',
    icon: Building
  },
  {
    name: 'التحليل المالي',
    href: '/finance/analysis',
    icon: PieChart
  },
  {
    name: 'التقارير المالية',
    href: '/finance/reports',
    icon: FileText
  },
];

const financeSettingsItems = [
  {
    name: 'معالج النظام المحاسبي',
    href: '/finance/accounting-wizard',
    icon: Zap
  }
];

const fleetSubItems = [
  {
    name: 'إدارة المركبات',
    href: '/fleet',
    icon: Car
  },
  {
    name: 'تصاريح الحركة',
    href: '/fleet/dispatch-permits',
    icon: FileText
  },
  {
    name: 'الصيانة',
    href: '/fleet/maintenance',
    icon: Wrench
  },
  {
    name: 'المخالفات المرورية',
    href: '/fleet/traffic-violations',
    icon: AlertTriangle
  },
  {
    name: 'مدفوعات المخالفات',
    href: '/fleet/traffic-violation-payments',
    icon: CreditCard
  },
  {
    name: 'التقارير والتحليلات',
    href: '/fleet/reports',
    icon: BarChart3
  },
  {
    name: 'أقساط المركبات',
    href: '/fleet/vehicle-installments',
    icon: TrendingUp
  }
];

const hrSubItems = [
  {
    name: 'إدارة الموظفين',
    href: '/hr/employees',
    icon: Users
  },
  {
    name: 'الحضور والانصراف',
    href: '/hr/attendance',
    icon: Clock
  },
  {
    name: 'إدارة الإجازات',
    href: '/hr/leave-management',
    icon: Calendar
  },
  {
    name: 'الرواتب',
    href: '/hr/payroll',
    icon: DollarSign
  },
  {
    name: 'تقارير الموارد البشرية',
    href: '/hr/reports',
    icon: BarChart3
  },
  {
    name: 'إعدادات الموقع',
    href: '/hr/location-settings',
    icon: MapPin
  },
  {
    name: 'إعدادات الموارد البشرية',
    href: '/hr/settings',
    icon: Settings
  }
];

export function MobileSidebar() {
  const { signOut } = useAuth();
  const location = useLocation();
  const { hasCompanyAdminAccess, hasGlobalAccess } = useUnifiedCompanyAccess();
  
  // Check active sections
  const isFinanceActive = location.pathname.startsWith('/finance');
  const isHRActive = location.pathname.startsWith('/hr');
  const isFleetActive = location.pathname.startsWith('/fleet');

  const handleSignOut = async () => {
    await signOut();
  };

  const isActive = (href: string) => location.pathname.startsWith(href);
  const getNavClassName = ({ isActive: active }: { isActive: boolean }) => 
    cn(
      "flex items-center gap-3 w-full px-4 py-3 text-right transition-colors rounded-md",
      active 
        ? "bg-primary/10 text-primary font-medium border-r-4 border-primary" 
        : "text-foreground hover:bg-accent/60"
    );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <img 
            src="/lovable-uploads/b8725fdf-dfaa-462a-b7fe-e9c9a86d17c2.png" 
            alt="Fleetify Logo" 
            className="h-16 w-auto"
          />
          <p className="text-xs text-muted-foreground">نظام إدارة تأجير السيارات</p>
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {/* Main Navigation */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-muted-foreground mb-3 px-3">
            القائمة الرئيسية
          </h3>
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink key={item.href} to={item.href} className={getNavClassName}>
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            ))}
            
            {/* Fleet Section */}
            <Collapsible defaultOpen={isFleetActive}>
              <CollapsibleTrigger className="flex items-center gap-3 w-full px-4 py-3 text-right transition-colors rounded-md hover:bg-accent/60">
                <Car className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium flex-1">الأسطول</span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mr-8 mt-1 space-y-1">
                  {fleetSubItems.map((subItem) => (
                    <NavLink key={subItem.href} to={subItem.href} className={getNavClassName}>
                      <subItem.icon className="h-4 w-4 flex-shrink-0" />
                      <span>{subItem.name}</span>
                    </NavLink>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Quotations */}
            <NavLink to="/quotations" className={getNavClassName}>
              <FileText className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">عروض الأسعار</span>
            </NavLink>

            {/* Contracts */}
            <NavLink to="/contracts" className={getNavClassName}>
              <FileText className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">العقود</span>
            </NavLink>
            
            {/* Finance Section */}
            <AdminOnly hideIfNoAccess>
              <Collapsible defaultOpen={isFinanceActive}>
                <CollapsibleTrigger className="flex items-center gap-3 w-full px-4 py-3 text-right transition-colors rounded-md hover:bg-accent/60">
                  <DollarSign className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium flex-1">المالية</span>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mr-8 mt-1 space-y-1">
                    {financeSubItems.map((subItem) => (
                      <NavLink key={subItem.href} to={subItem.href} className={getNavClassName}>
                        <subItem.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{subItem.name}</span>
                      </NavLink>
                    ))}
                    
                    {/* Finance Settings */}
                    <AdminOnly hideIfNoAccess>
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-3 w-full px-4 py-2 text-right transition-colors rounded-md hover:bg-accent/60">
                          <Settings className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1 text-sm">إعدادات المالية</span>
                          <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mr-8 mt-1 space-y-1">
                            {financeSettingsItems.map((settingItem) => (
                              <NavLink key={settingItem.href} to={settingItem.href} className={getNavClassName}>
                                <settingItem.icon className="h-3 w-3 flex-shrink-0" />
                                <span className="text-xs">{settingItem.name}</span>
                              </NavLink>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </AdminOnly>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </AdminOnly>

            {/* HR Section */}
            <AdminOnly hideIfNoAccess>
              <Collapsible defaultOpen={isHRActive}>
                <CollapsibleTrigger className="flex items-center gap-3 w-full px-4 py-3 text-right transition-colors rounded-md hover:bg-accent/60">
                  <UserCheck className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium flex-1">الموارد البشرية</span>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mr-8 mt-1 space-y-1">
                    {hrSubItems.map((subItem) => (
                      <NavLink key={subItem.href} to={subItem.href} className={getNavClassName}>
                        <subItem.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{subItem.name}</span>
                      </NavLink>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </AdminOnly>

            {/* Legal Section */}
            <Collapsible defaultOpen={location.pathname.startsWith('/legal')}>
              <CollapsibleTrigger className="flex items-center gap-3 w-full px-4 py-3 text-right transition-colors rounded-md hover:bg-accent/60">
                <Shield className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium flex-1">الشؤون القانونية</span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mr-8 mt-1 space-y-1">
                  <NavLink to="/legal/advisor" className={getNavClassName}>
                    <UserCog className="h-4 w-4 flex-shrink-0" />
                    <span>المستشار القانوني</span>
                  </NavLink>
                  <NavLink to="/legal/cases" className={getNavClassName}>
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span>تتبع القضايا</span>
                  </NavLink>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Reports */}
            <NavLink to="/reports" className={getNavClassName}>
              <BarChart3 className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">التقارير</span>
            </NavLink>

            {/* Settings */}
            <AdminOnly hideIfNoAccess>
              <NavLink to="/settings" className={getNavClassName}>
                <Settings className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">الإعدادات</span>
              </NavLink>
            </AdminOnly>
          </div>
        </div>

        {/* Admin Section */}
        <SuperAdminOnly hideIfNoAccess>
          <div className="mb-6">
            <h3 className="text-xs font-medium text-muted-foreground mb-3 px-3">
              إدارة النظام
            </h3>
            <div className="space-y-1">
              {adminItems.map((item) => (
                <NavLink key={item.href} to={item.href} className={getNavClassName}>
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </SuperAdminOnly>

        {/* Support Section */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-muted-foreground mb-3 px-3">
            الدعم والمساعدة
          </h3>
          <div className="space-y-1">
            <NavLink to="/support" className={getNavClassName}>
              <Headphones className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">الدعم الفني</span>
            </NavLink>
            <NavLink to="/help" className={getNavClassName}>
              <FileText className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">المساعدة</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
          <span>تسجيل الخروج</span>
        </Button>
      </div>
    </div>
  );
}