import React from 'react';
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
  Activity,
  Wallet,
  Package,
  PhoneCall,
  LayoutDashboard,
  ListTodo,
  Sparkles,
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
  },
];

// ⭐ القائمة الم بسطة - 3 عناصر رئيسية فقط
const financeSubItems = [
  {
    name: 'المركز المالي',
    href: '/finance/hub',
    icon: LayoutDashboard,
    description: 'نقطة البداية - جميع العمليات والإحصائيات'
  },
  {
    name: 'التقارير',
    href: '/finance/reports',
    icon: FileText,
    description: 'التقارير المالية والتحليلات'
  },
  {
    name: 'الإعدادات',
    href: '/finance/settings',
    icon: Settings,
    description: 'إعدادات النظام المالي (Admin فقط)'
  },
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

export function CarRentalSidebar() {
  const { signOut } = useAuth();
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  
  const isFinanceActive = location.pathname.startsWith('/finance');
  const isHRActive = location.pathname.startsWith('/hr');
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
          <LazyImage 
            src="/receipts/logo.png" 
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

                      {/* Booking System */}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <NavLink to="/fleet/reservation-system" className={getNavClassName}>
                            <Calendar className="h-4 w-4" />
                            {(!collapsed || isMobile) && <span>نظام الحجوزات</span>}
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
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

              {/* Customers */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/customers" className={getNavClassName}>
                    <Users className="h-4 w-4" />
                    {(!collapsed || isMobile) && <span className="font-medium">العملاء</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* CRM - Customer Communications */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/customers/crm" className={getNavClassName}>
                    <PhoneCall className="h-4 w-4" />
                    {(!collapsed || isMobile) && <span className="font-medium">التواصل مع العملاء</span>}
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
                        
                        {/* Finance Settings integrated into /finance/settings page */}
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
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <NavLink to="/legal/document-generator" className={getNavClassName}>
                            <Sparkles className="h-4 w-4" />
                            {(!collapsed || isMobile) && <span>مساعد الكتب الذكي</span>}
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>

              {/* Booking System Section with Submenu */}
              {/* REMOVED - Booking System is now under Fleet Management */}

              {/* Task Management */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/tasks" className={getNavClassName}>
                    <ListTodo className="h-4 w-4" />
                    {(!collapsed || isMobile) && <span className="font-medium">إدارة المهام</span>}
                  </NavLink>
                </SidebarMenuButton>
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