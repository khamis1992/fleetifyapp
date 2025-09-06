import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminOnly } from '@/components/common/PermissionGuard';
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
  CheckSquare,
  Database,
  Headphones,
  TrendingUp,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const navigationItems = [
  { 
    name: 'لوحة التحكم', 
    href: '/dashboard', 
    icon: Home 
  },
  { 
    name: 'العملاء', 
    href: '/customers', 
    icon: Users 
  }
];

const financeSubItems = [
  { name: 'دليل الحسابات', href: '/finance/chart-of-accounts', icon: BookOpen },
  { name: 'ربط الحسابات', href: '/finance/account-mappings', icon: Link },
  { name: 'دفتر الأستاذ', href: '/finance/ledger', icon: Calculator },
  { name: 'الخزينة والبنوك', href: '/finance/treasury', icon: Landmark },
  { name: 'الفواتير', href: '/finance/invoices', icon: Receipt },
  { name: 'المدفوعات', href: '/finance/payments', icon: CreditCard },
  { name: 'الموازنات', href: '/finance/budgets', icon: Target },
  { name: 'مراكز التكلفة', href: '/finance/cost-centers', icon: MapPin },
  { name: 'الأصول الثابتة', href: '/finance/assets', icon: Building },
  { name: 'الموردين', href: '/finance/vendors', icon: Building },
  { name: 'التحليل المالي', href: '/finance/analysis', icon: PieChart },
  { name: 'التقارير المالية', href: '/finance/reports', icon: FileText },
];

const fleetSubItems = [
  { name: 'إدارة المركبات', href: '/fleet', icon: Car },
  { name: 'تصاريح الحركة', href: '/fleet/dispatch-permits', icon: FileText },
  { name: 'الصيانة', href: '/fleet/maintenance', icon: Wrench },
  { name: 'المخالفات المرورية', href: '/fleet/traffic-violations', icon: AlertTriangle },
  { name: 'مدفوعات المخالفات', href: '/fleet/traffic-violation-payments', icon: CreditCard },
  { name: 'التقارير والتحليلات', href: '/fleet/reports', icon: BarChart3 },
  { name: 'أقساط المركبات', href: '/fleet/vehicle-installments', icon: TrendingUp }
];

const hrSubItems = [
  { name: 'إدارة الموظفين', href: '/hr/employees', icon: Users },
  { name: 'الحضور والانصراف', href: '/hr/attendance', icon: Clock },
  { name: 'إدارة الإجازات', href: '/hr/leave-management', icon: Calendar },
  { name: 'الرواتب', href: '/hr/payroll', icon: DollarSign },
  { name: 'تقارير الموارد البشرية', href: '/hr/reports', icon: BarChart3 },
  { name: 'إعدادات الموقع', href: '/hr/location-settings', icon: MapPin },
  { name: 'إعدادات الموارد البشرية', href: '/hr/settings', icon: Settings }
];

export function MobileSidebar() {
  const { signOut } = useAuth();
  const location = useLocation();
  
  const [financeOpen, setFinanceOpen] = useState(location.pathname.startsWith('/finance'));
  const [fleetOpen, setFleetOpen] = useState(location.pathname.startsWith('/fleet'));
  const [hrOpen, setHrOpen] = useState(location.pathname.startsWith('/hr'));
  const [legalOpen, setLegalOpen] = useState(location.pathname.startsWith('/legal'));

  const handleSignOut = async () => {
    await signOut();
  };

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href);
  
  const getNavClassName = (href: string) => 
    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      isActive(href) 
        ? "bg-primary text-primary-foreground" 
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <img 
            src="/lovable-uploads/b8725fdf-dfaa-462a-b7fe-e9c9a86d17c2.png" 
            alt="Fleetify Logo" 
            className="h-16 w-auto"
          />
          <p className="text-xs text-muted-foreground">نظام إدارة تأجير السيارات</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-3">القائمة الرئيسية</p>
          
          {navigationItems.map((item) => (
            <NavLink key={item.href} to={item.href} className={getNavClassName(item.href)}>
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </NavLink>
          ))}

          {/* Fleet Section */}
          <Collapsible open={fleetOpen} onOpenChange={setFleetOpen}>
            <CollapsibleTrigger className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground w-full">
              <Car className="h-4 w-4" />
              <span>الأسطول</span>
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${fleetOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1 mr-4">
              {fleetSubItems.map((subItem) => (
                <NavLink key={subItem.href} to={subItem.href} className={getNavClassName(subItem.href)}>
                  <subItem.icon className="h-4 w-4" />
                  <span>{subItem.name}</span>
                </NavLink>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Quotations */}
          <NavLink to="/quotations" className={getNavClassName('/quotations')}>
            <FileText className="h-4 w-4" />
            <span>عروض الأسعار</span>
          </NavLink>

          {/* Contracts */}
          <NavLink to="/contracts" className={getNavClassName('/contracts')}>
            <FileText className="h-4 w-4" />
            <span>العقود</span>
          </NavLink>

          {/* Finance Section */}
          <AdminOnly hideIfNoAccess>
            <Collapsible open={financeOpen} onOpenChange={setFinanceOpen}>
              <CollapsibleTrigger className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground w-full">
                <DollarSign className="h-4 w-4" />
                <span>المالية</span>
                <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${financeOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1 mr-4">
                {financeSubItems.map((subItem) => (
                  <NavLink key={subItem.href} to={subItem.href} className={getNavClassName(subItem.href)}>
                    <subItem.icon className="h-4 w-4" />
                    <span>{subItem.name}</span>
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </AdminOnly>

          {/* HR Section */}
          <AdminOnly hideIfNoAccess>
            <Collapsible open={hrOpen} onOpenChange={setHrOpen}>
              <CollapsibleTrigger className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground w-full">
                <UserCheck className="h-4 w-4" />
                <span>الموارد البشرية</span>
                <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${hrOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1 mr-4">
                {hrSubItems.map((subItem) => (
                  <NavLink key={subItem.href} to={subItem.href} className={getNavClassName(subItem.href)}>
                    <subItem.icon className="h-4 w-4" />
                    <span>{subItem.name}</span>
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </AdminOnly>

          {/* Legal Section */}
          <Collapsible open={legalOpen} onOpenChange={setLegalOpen}>
            <CollapsibleTrigger className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground w-full">
              <Shield className="h-4 w-4" />
              <span>الشؤون القانونية</span>
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${legalOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1 mr-4">
              <NavLink to="/legal/advisor" className={getNavClassName('/legal/advisor')}>
                <UserCog className="h-4 w-4" />
                <span>المستشار القانوني</span>
              </NavLink>
              <NavLink to="/legal/cases" className={getNavClassName('/legal/cases')}>
                <FileText className="h-4 w-4" />
                <span>تتبع القضايا</span>
              </NavLink>
            </CollapsibleContent>
          </Collapsible>

          {/* Reports */}
          <NavLink to="/reports" className={getNavClassName('/reports')}>
            <BarChart3 className="h-4 w-4" />
            <span>التقارير</span>
          </NavLink>

          {/* Settings */}
          <NavLink to="/settings" className={getNavClassName('/settings')}>
            <Settings className="h-4 w-4" />
            <span>الإعدادات</span>
          </NavLink>

          {/* Support */}
          <NavLink to="/support" className={getNavClassName('/support')}>
            <Headphones className="h-4 w-4" />
            <span>الدعم الفني</span>
          </NavLink>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <Button 
          onClick={handleSignOut}
          variant="outline" 
          className="w-full flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}