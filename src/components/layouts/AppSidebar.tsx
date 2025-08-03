
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { AdminOnly, SuperAdminOnly } from '@/components/common/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
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
  Headphones
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from '@/components/ui/button';

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
  }
];

// Fleet sub-items with Arabic names
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
  }
];

// HR sub-items with Arabic names
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

export function AppSidebar() {
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { hasCompanyAdminAccess, hasGlobalAccess } = useUnifiedCompanyAccess();
  
  // Check if finance section should be open
  const isFinanceActive = location.pathname.startsWith('/finance');
  // Check if HR section should be open
  const isHRActive = location.pathname.startsWith('/hr');
  // Check if fleet section should be open
  const isFleetActive = location.pathname.startsWith('/fleet');

  const handleSignOut = async () => {
    await signOut();
  };

  const isActive = (href: string) => location.pathname.startsWith(href);
  const getNavClassName = ({ isActive: active }: { isActive: boolean }) => 
    active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/60";

  return (
    <Sidebar side="right" className="border-l border-sidebar-border bg-sidebar-background">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/877be161-8ac1-46f5-9d33-81c9e531172d.png" 
            alt="Fleetify Logo" 
            className="h-10 w-auto"
          />
          {!collapsed && (
            <div>
              <p className="text-xs text-sidebar-foreground/60">نظام إدارة تأجير السيارات</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 mb-2">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                console.log('Navigation item:', item.name, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink to={item.href} className={getNavClassName}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span className="font-medium">{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                   </SidebarMenuItem>
                );
              })}
               
               {/* Fleet Section with Submenu */}
               <SidebarMenuItem>
                 <Collapsible defaultOpen={isFleetActive}>
                   <CollapsibleTrigger asChild>
                     <SidebarMenuButton className="h-10">
                       <Car className="h-4 w-4" />
                       {!collapsed && (
                         <>
                           <span className="font-medium">الأسطول</span>
                           <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                         </>
                       )}
                     </SidebarMenuButton>
                   </CollapsibleTrigger>
                   <CollapsibleContent>
                     <SidebarMenuSub>
                       {fleetSubItems.map((subItem) => (
                         <SidebarMenuSubItem key={subItem.href}>
                           <SidebarMenuSubButton asChild>
                             <NavLink to={subItem.href} className={getNavClassName}>
                               <subItem.icon className="h-4 w-4" />
                               {!collapsed && <span>{subItem.name}</span>}
                             </NavLink>
                           </SidebarMenuSubButton>
                         </SidebarMenuSubItem>
                       ))}
                     </SidebarMenuSub>
                   </CollapsibleContent>
                 </Collapsible>
               </SidebarMenuItem>

               {/* Quotations */}
               <SidebarMenuItem>
                 <SidebarMenuButton asChild className="h-10">
                   <NavLink to="/quotations" className={getNavClassName}>
                     <FileText className="h-4 w-4" />
                     {!collapsed && <span className="font-medium">عروض الأسعار</span>}
                   </NavLink>
                 </SidebarMenuButton>
               </SidebarMenuItem>

               {/* Contracts */}
               <SidebarMenuItem>
                 <SidebarMenuButton asChild className="h-10">
                   <NavLink to="/contracts" className={getNavClassName}>
                     <FileText className="h-4 w-4" />
                     {!collapsed && <span className="font-medium">العقود</span>}
                   </NavLink>
                 </SidebarMenuButton>
               </SidebarMenuItem>
               
                {/* Finance Section with Submenu */}
                <AdminOnly hideIfNoAccess>
                  <SidebarMenuItem>
                    <Collapsible defaultOpen={isFinanceActive}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="h-10">
                          <DollarSign className="h-4 w-4" />
                          {!collapsed && (
                            <>
                              <span className="font-medium">المالية</span>
                              <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {financeSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton asChild>
                                <NavLink to={subItem.href} className={getNavClassName}>
                                  <subItem.icon className="h-4 w-4" />
                                  {!collapsed && <span>{subItem.name}</span>}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                </AdminOnly>

               {/* HR Section with Submenu */}
                <AdminOnly hideIfNoAccess>
                  <SidebarMenuItem>
                    <Collapsible defaultOpen={isHRActive}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="h-10">
                          <UserCheck className="h-4 w-4" />
                          {!collapsed && (
                            <>
                              <span className="font-medium">الموارد البشرية</span>
                              <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {hrSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton asChild>
                                <NavLink to={subItem.href} className={getNavClassName}>
                                  <subItem.icon className="h-4 w-4" />
                                  {!collapsed && <span>{subItem.name}</span>}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                </AdminOnly>

               {/* Legal */}
               <SidebarMenuItem>
                 <SidebarMenuButton asChild className="h-10">
                   <NavLink to="/legal" className={getNavClassName}>
                     <Shield className="h-4 w-4" />
                     {!collapsed && <span className="font-medium">الشؤون القانونية</span>}
                   </NavLink>
                 </SidebarMenuButton>
               </SidebarMenuItem>

               {/* Reports */}
               <SidebarMenuItem>
                 <SidebarMenuButton asChild className="h-10">
                   <NavLink to="/reports" className={getNavClassName}>
                     <BarChart3 className="h-4 w-4" />
                     {!collapsed && <span className="font-medium">التقارير</span>}
                   </NavLink>
                 </SidebarMenuButton>
               </SidebarMenuItem>

               {/* Support */}
               <SidebarMenuItem>
                 <SidebarMenuButton asChild className="h-10">
                   <NavLink to="/support" className={getNavClassName}>
                     <Headphones className="h-4 w-4" />
                     {!collapsed && <span className="font-medium">الدعم الفني</span>}
                   </NavLink>
                 </SidebarMenuButton>
               </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        <AdminOnly hideIfNoAccess>
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 mb-2">
              الإدارة
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  // Filter admin items based on permissions
                  if (item.href === '/backup') {
                    return (
                      <SuperAdminOnly key={item.href} hideIfNoAccess>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild className="h-10">
                            <NavLink to={item.href} className={getNavClassName}>
                              <item.icon className="h-4 w-4" />
                              {!collapsed && <span className="font-medium">{item.name}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SuperAdminOnly>
                    );
                  }
                  
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild className="h-10">
                        <NavLink to={item.href} className={getNavClassName}>
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span className="font-medium">{item.name}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </AdminOnly>
      </SidebarContent>
    </Sidebar>
  );
}
