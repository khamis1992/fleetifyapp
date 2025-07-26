
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  AlertTriangle
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
    name: 'العقود', 
    name_en: 'Contracts',
    href: '/contracts', 
    icon: FileText 
  },
  { 
    name: 'العملاء', 
    name_en: 'Customers',
    href: '/customers', 
    icon: Users 
  },
  { 
    name: 'التقارير', 
    name_en: 'Reports',
    href: '/reports', 
    icon: BarChart3 
  },
  { 
    name: 'الشؤون القانونية', 
    name_en: 'Legal',
    href: '/legal', 
    icon: Shield 
  },
];

const financeSubItems = [
  {
    name: 'دليل الحسابات',
    href: '/finance/chart-of-accounts',
    icon: BookOpen
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
    name: 'إدارة المستخدمين',
    href: '/hr/user-management',
    icon: UserCog
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
    active ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  return (
    <Sidebar side="right" className="border-l border-border bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <SidebarHeader className="border-b border-border/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-foreground">KW RentFlow</h1>
              <p className="text-xs text-muted-foreground">نظام إدارة تأجير السيارات</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground mb-2">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink to={item.href} className={getNavClassName}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="font-medium">{item.name}</span>}
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
               
               {/* Finance Section with Submenu */}
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

              {/* HR Section with Submenu */}
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
