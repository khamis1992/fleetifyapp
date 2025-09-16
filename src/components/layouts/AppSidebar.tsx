
import * as React from 'react';
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
  Headphones,
  TrendingUp,
  Zap
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
]

// Finance Settings for Admin and Super Admin
const financeSettingsItems = [
  {
    name: 'معالج النظام المحاسبي',
    href: '/finance/accounting-wizard',
    icon: Zap
  },
  {
    name: 'تحليل النظام المالي الذكي',
    href: '/finance/smart-analysis',
    icon: Activity
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
  },
  {
    name: 'أقساط المركبات',
    href: '/fleet/vehicle-installments',
    icon: TrendingUp
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
  const { state, isMobile } = useSidebar();
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
        <div className="flex flex-col items-center text-center space-y-2">
          <img 
            src="/lovable-uploads/b8725fdf-dfaa-462a-b7fe-e9c9a86d17c2.png" 
            alt="Fleetify Logo" 
            className="h-16 w-auto filter brightness-0 invert"
          />
          {(!collapsed || isMobile) && (
            <p className="text-xs text-sidebar-foreground/60">نظام إدارة تأجير السيارات</p>
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
                        {(!collapsed || isMobile) && <span className="font-medium">{item.name}</span>}
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
                        {(!collapsed || isMobile) && (
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
                                {(!collapsed || isMobile) && <span>{subItem.name}</span>}
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
                     {(!collapsed || isMobile) && <span className="font-medium">عروض الأسعار</span>}
                   </NavLink>
                 </SidebarMenuButton>
               </SidebarMenuItem>

               {/* Contracts */}
               <SidebarMenuItem>
                 <SidebarMenuButton asChild className="h-10">
                   <NavLink to="/contracts" className={getNavClassName}>
                     <FileText className="h-4 w-4" />
                     {(!collapsed || isMobile) && <span className="font-medium">العقود</span>}
                   </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {/* Payments Section */}
                <AdminOnly hideIfNoAccess>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink to="/finance/payments" className={getNavClassName}>
                        <CreditCard className="h-4 w-4" />
                        {(!collapsed || isMobile) && <span className="font-medium">المدفوعات</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </AdminOnly>
                
               
                {/* Finance Section with Submenu */}
                <AdminOnly hideIfNoAccess>
                  <SidebarMenuItem>
                    <Collapsible defaultOpen={isFinanceActive}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="h-10">
                          <DollarSign className="h-4 w-4" />
                           {(!collapsed || isMobile) && (
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
                                    {(!collapsed || isMobile) && <span>{subItem.name}</span>}
                                 </NavLink>
                               </SidebarMenuSubButton>
                             </SidebarMenuSubItem>
                           ))}
                           
                            {/* Finance Settings - Admin and Super Admin */}
                            <AdminOnly hideIfNoAccess>
                             <SidebarMenuSubItem>
                               <Collapsible>
                                 <CollapsibleTrigger asChild>
                                   <SidebarMenuSubButton>
                                     <Settings className="h-4 w-4" />
                                      {(!collapsed || isMobile) && (
                                        <>
                                          <span>إعدادات المالية</span>
                                          <ChevronDown className="h-3 w-3 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                                        </>
                                      )}
                                   </SidebarMenuSubButton>
                                 </CollapsibleTrigger>
                                 <CollapsibleContent>
                                   <SidebarMenuSub>
                                     {financeSettingsItems.map((settingItem) => (
                                       <SidebarMenuSubItem key={settingItem.href}>
                                         <SidebarMenuSubButton asChild>
                                           <NavLink to={settingItem.href} className={getNavClassName}>
                                             <settingItem.icon className="h-3 w-3" />
                                             {(!collapsed || isMobile) && <span className="text-xs">{settingItem.name}</span>}
                                           </NavLink>
                                         </SidebarMenuSubButton>
                                       </SidebarMenuSubItem>
                                     ))}
                                   </SidebarMenuSub>
                                 </CollapsibleContent>
                               </Collapsible>
                             </SidebarMenuSubItem>
                            </AdminOnly>
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
                           {(!collapsed || isMobile) && (
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
                                  {(!collapsed || isMobile) && <span>{subItem.name}</span>}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                </AdminOnly>

                {/* Legal Section with Submenu */}
                <SidebarMenuItem>
                  <Collapsible defaultOpen={location.pathname.startsWith('/legal')}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="h-10">
                        <Shield className="h-4 w-4" />
                         {(!collapsed || isMobile) && (
                           <>
                             <span className="font-medium">الشؤون القانونية</span>
                             <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                           </>
                         )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink to="/legal/advisor" className={getNavClassName}>
                              <UserCog className="h-4 w-4" />
                              {(!collapsed || isMobile) && <span>المستشار القانوني</span>}
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink to="/legal/cases" className={getNavClassName}>
                              <FileText className="h-4 w-4" />
                              {(!collapsed || isMobile) && <span>تتبع القضايا</span>}
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>

               {/* Reports */}
               <SidebarMenuItem>
                 <SidebarMenuButton asChild className="h-10">
                   <NavLink to="/reports" className={getNavClassName}>
                     <BarChart3 className="h-4 w-4" />
                     {(!collapsed || isMobile) && <span className="font-medium">التقارير</span>}
                   </NavLink>
                 </SidebarMenuButton>
               </SidebarMenuItem>

               {/* Support */}
               <SidebarMenuItem>
                 <SidebarMenuButton asChild className="h-10">
                   <NavLink to="/support" className={getNavClassName}>
                     <Headphones className="h-4 w-4" />
                     {(!collapsed || isMobile) && <span className="font-medium">الدعم الفني</span>}
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
                               {(!collapsed || isMobile) && <span className="font-medium">{item.name}</span>}
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
                          {(!collapsed || isMobile) && <span className="font-medium">{item.name}</span>}
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
