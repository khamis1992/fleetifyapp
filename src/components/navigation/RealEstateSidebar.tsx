import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminOnly } from '@/components/common/PermissionGuard';
import { 
  Building2, 
  FileText, 
  Users, 
  DollarSign, 
  Settings,
  LogOut,
  Home,
  Shield,
  BarChart3,
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
  Calendar,
  Wrench,
  AlertTriangle,
  Link,
  TrendingUp,
  Zap,
  Map,
  UserPlus,
  UserCog,
  Mail,
  Phone,
  Key,
  Wallet,
  PhoneCall,
  MessageSquare,
  Activity,
  TrendingUp as TrendingUpIcon
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
import { LazyImage } from '@/components/common/LazyImage';

const navigationItems = [
  { 
    name: 'لوحة التحكم', 
    href: '/dashboard', 
    icon: Home 
  }
];

const propertiesSubItems = [
  {
    name: 'إدارة العقارات',
    href: '/properties',
    icon: Building2
  },
  {
    name: 'خريطة العقارات',
    href: '/properties/map',
    icon: Map
  },
  {
    name: 'صيانة العقارات',
    href: '/properties/maintenance',
    icon: Wrench
  }
];

const tenantsSubItems = [
  {
    name: 'إدارة المستأجرين',
    href: '/tenants',
    icon: Users
  },
  {
    name: 'الملاك',
    href: '/owners',
    icon: UserCog
  }
];

const contractsSubItems = [
  {
    name: 'عقود الإيجار',
    href: '/properties/contracts',
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
    name: 'تتبع المدفوعات',
    href: '/financial-tracking',
    icon: Wallet
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
  {
    name: 'إدارة الودائع',
    href: '/finance/deposits',
    icon: Wallet
  }
];

const financeSettingsItems = [
  {
    name: 'معالج النظام المحاسبي',
    href: '/finance/accounting-wizard',
    icon: Zap
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

const crmSubItems = [
  {
    name: 'إدارة العلاقات (CRM)',
    href: '/customers/crm',
    icon: PhoneCall
  },
  {
    name: 'العملاء المحتملين',
    href: '/sales/leads',
    icon: UserPlus
  },
  {
    name: 'الفرص البيعية',
    href: '/sales/opportunities',
    icon: TrendingUpIcon
  },
  {
    name: 'خط الأنابيب',
    href: '/sales/pipeline',
    icon: Activity
  },
  {
    name: 'تحليلات المبيعات',
    href: '/sales/analytics',
    icon: BarChart3
  }
];

export function RealEstateSidebar() {
  const { signOut } = useAuth();
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  
  const isPropertiesActive = location.pathname.startsWith('/properties');
  const isTenantsActive = location.pathname.startsWith('/tenants');
  const isContractsActive = location.pathname.startsWith('/contracts');
  const isFinanceActive = location.pathname.startsWith('/finance');
  const isHRActive = location.pathname.startsWith('/hr');
  const isCRMActive = location.pathname.startsWith('/customers/crm') || location.pathname.startsWith('/sales');

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
          <LazyImage 
            src="/receipts/logo.png" 
            alt="Real Estate Logo" 
            className="h-16 w-auto filter brightness-0 invert"
          />
          {(!collapsed || isMobile) && (
            <p className="text-xs text-sidebar-foreground/60">نظام إدارة العقارات</p>
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
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink to={item.href} className={getNavClassName}>
                      <item.icon className="h-4 w-4" />
                      {(!collapsed || isMobile) && <span className="font-medium">{item.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
               
              {/* Properties Section with Submenu */}
              <SidebarMenuItem>
                <Collapsible defaultOpen={isPropertiesActive}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="h-10">
                      <Building2 className="h-4 w-4" />
                      {(!collapsed || isMobile) && (
                        <>
                          <span className="font-medium">العقارات</span>
                          <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {propertiesSubItems.map((subItem) => (
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

              {/* Tenants & Owners Section */}
              <SidebarMenuItem>
                <Collapsible defaultOpen={isTenantsActive}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="h-10">
                      <Users className="h-4 w-4" />
                      {(!collapsed || isMobile) && (
                        <>
                          <span className="font-medium">المستأجرين والملاك</span>
                          <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {tenantsSubItems.map((subItem) => (
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

              {/* Contracts Section */}
              <SidebarMenuItem>
                <Collapsible defaultOpen={isContractsActive}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="h-10">
                      <FileText className="h-4 w-4" />
                      {(!collapsed || isMobile) && (
                        <>
                          <span className="font-medium">العقود</span>
                          <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {contractsSubItems.map((subItem) => (
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

              {/* CRM Section with Submenu */}
              <SidebarMenuItem>
                <Collapsible defaultOpen={isCRMActive}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="h-10">
                      <PhoneCall className="h-4 w-4" />
                      {(!collapsed || isMobile) && (
                        <>
                          <span className="font-medium">إدارة العلاقات (CRM)</span>
                          <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {crmSubItems.map((subItem) => (
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

              {/* Settings */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/settings" className={getNavClassName}>
                    <Settings className="h-4 w-4" />
                    {(!collapsed || isMobile) && <span className="font-medium">الإعدادات</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          {(!collapsed || isMobile) && <span className="mr-2">تسجيل الخروج</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}