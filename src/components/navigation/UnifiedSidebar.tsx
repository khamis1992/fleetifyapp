/**
 * Unified Sidebar Component
 * Consolidates CarRentalSidebar and RealEstateSidebar into a single component
 * Supports: car-rental, real-estate variants
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminOnly } from '@/components/common/PermissionGuard';
import { 
  Car, 
  Building2,
  FileText, 
  Users, 
  DollarSign, 
  Settings,
  LogOut,
  Home,
  Shield,
  BarChart3,
  ChevronDown,
  Clock,
  Calendar,
  Wrench,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  LayoutDashboard,
  Scale,
  Package,
  Map,
  UserCog,
  Key,
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
import { cn } from '@/lib/utils';

// Types
export type SidebarVariant = 'car-rental' | 'real-estate';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ElementType;
  description?: string;
  adminOnly?: boolean;
}

interface MenuGroup {
  name: string;
  icon: React.ElementType;
  items: MenuItem[];
  defaultOpen?: boolean;
}

interface UnifiedSidebarProps {
  variant?: SidebarVariant;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

// ========== Common Navigation Items ==========
const commonNavItems: MenuItem[] = [
  { name: 'لوحة التحكم', href: '/dashboard', icon: Home },
];

const commonFinanceItems: MenuItem[] = [
  { name: 'المركز المالي', href: '/finance/hub', icon: LayoutDashboard },
  { name: 'التقارير', href: '/finance/reports', icon: FileText },
  { name: 'الإعدادات', href: '/finance/settings', icon: Settings, adminOnly: true },
];

const commonHRItems: MenuItem[] = [
  { name: 'إدارة الموظفين', href: '/hr/employees', icon: Users },
  { name: 'الحضور والانصراف', href: '/hr/attendance', icon: Clock },
  { name: 'إدارة الإجازات', href: '/hr/leave-management', icon: Calendar },
  { name: 'الرواتب', href: '/hr/payroll', icon: DollarSign },
];

// ========== Car Rental Specific Items ==========
const carRentalFleetItems: MenuItem[] = [
  { name: 'إدارة المركبات', href: '/fleet', icon: Car },
  { name: 'تصاريح الحركة', href: '/fleet/dispatch-permits', icon: FileText },
  { name: 'الصيانة', href: '/fleet/maintenance', icon: Wrench },
  { name: 'المخالفات المرورية', href: '/fleet/traffic-violations', icon: AlertTriangle },
  { name: 'مدفوعات المخالفات', href: '/fleet/traffic-violation-payments', icon: CreditCard },
  { name: 'التقارير والتحليلات', href: '/fleet/reports', icon: BarChart3 },
  { name: 'أقساط المركبات', href: '/fleet/vehicle-installments', icon: TrendingUp },
];

// ========== Real Estate Specific Items ==========
const realEstatePropertyItems: MenuItem[] = [
  { name: 'إدارة العقارات', href: '/properties', icon: Building2 },
  { name: 'خريطة العقارات', href: '/properties/map', icon: Map },
  { name: 'صيانة العقارات', href: '/properties/maintenance', icon: Wrench },
];

const realEstateTenantItems: MenuItem[] = [
  { name: 'إدارة المستأجرين', href: '/tenants', icon: Users },
  { name: 'الملاك', href: '/owners', icon: UserCog },
  { name: 'العقود والإيجارات', href: '/leases', icon: Key },
];

// ========== Build Menu Groups by Variant ==========
const getMenuGroups = (variant: SidebarVariant): MenuGroup[] => {
  const groups: MenuGroup[] = [];

  if (variant === 'car-rental') {
    groups.push({
      name: 'إدارة الأسطول',
      icon: Car,
      items: carRentalFleetItems,
      defaultOpen: true,
    });
    groups.push({
      name: 'العقود',
      icon: FileText,
      items: [
        { name: 'إدارة العقود', href: '/contracts', icon: FileText },
        { name: 'عروض الأسعار', href: '/quotations', icon: FileText },
      ],
    });
    groups.push({
      name: 'العملاء',
      icon: Users,
      items: [
        { name: 'إدارة العملاء', href: '/customers', icon: Users },
      ],
    });
  }

  if (variant === 'real-estate') {
    groups.push({
      name: 'إدارة العقارات',
      icon: Building2,
      items: realEstatePropertyItems,
      defaultOpen: true,
    });
    groups.push({
      name: 'المستأجرين والملاك',
      icon: Users,
      items: realEstateTenantItems,
    });
  }

  // Common groups for both variants
  groups.push({
    name: 'المالية',
    icon: DollarSign,
    items: commonFinanceItems,
  });

  groups.push({
    name: 'الموارد البشرية',
    icon: Users,
    items: commonHRItems,
  });

  groups.push({
    name: 'القانونية',
    icon: Scale,
    items: [
      { name: 'القضايا', href: '/legal/cases', icon: Scale },
      { name: 'المستشار القانوني', href: '/legal/advisor', icon: Shield },
    ],
  });

  groups.push({
    name: 'المخزون',
    icon: Package,
    items: [
      { name: 'إدارة المخزون', href: '/inventory', icon: Package },
    ],
  });

  return groups;
};

// ========== Components ==========
const MenuItemLink: React.FC<{ item: MenuItem; isActive: boolean }> = ({ item, isActive }) => {
  const content = (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={isActive}>
        <NavLink to={item.href} className="flex items-center gap-2">
          <item.icon className="h-4 w-4" />
          <span>{item.name}</span>
        </NavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );

  if (item.adminOnly) {
    return <AdminOnly>{content}</AdminOnly>;
  }

  return content;
};

const CollapsibleMenuGroup: React.FC<{ group: MenuGroup }> = ({ group }) => {
  const location = useLocation();
  const isGroupActive = group.items.some(item => location.pathname.startsWith(item.href));

  return (
    <SidebarGroup>
      <Collapsible defaultOpen={group.defaultOpen || isGroupActive} className="group/collapsible">
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-accent rounded-md transition-colors">
            <span className="flex items-center gap-2">
              <group.icon className="h-4 w-4" />
              {group.name}
            </span>
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenuSub>
              {group.items.map((item) => (
                <MenuItemLink 
                  key={item.href} 
                  item={item} 
                  isActive={location.pathname === item.href}
                />
              ))}
            </SidebarMenuSub>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
};

// ========== Main Component ==========
export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  variant = 'car-rental',
  isMobile = false,
  onCloseMobile,
}) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const menuGroups = getMenuGroups(variant);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Sidebar 
      side="right" 
      collapsible="icon"
      className={cn(
        'border-l border-border/50 bg-card/95 backdrop-blur-sm',
        isMobile && 'w-full'
      )}
    >
      {/* Header */}
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <LazyImage 
            src="/receipts/logo.png" 
            alt="Fleetify Logo" 
            className="h-10 w-auto"
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg">Fleetify</span>
              <span className="text-xs text-muted-foreground">
                {variant === 'car-rental' ? 'تأجير السيارات' : 'إدارة العقارات'}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="px-2 py-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarMenu>
            {commonNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === item.href}
                  tooltip={isCollapsed ? item.name : undefined}
                >
                  <NavLink to={item.href} className="flex items-center gap-2">
                    <item.icon className="h-5 w-5" />
                    {!isCollapsed && <span>{item.name}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Menu Groups */}
        {menuGroups.map((group) => (
          <CollapsibleMenuGroup key={group.name} group={group} />
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border/50 p-4">
        <SidebarMenu>
          {/* Settings */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={isCollapsed ? 'الإعدادات' : undefined}>
              <NavLink to="/settings" className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {!isCollapsed && <span>الإعدادات</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Admin Link */}
          <AdminOnly>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={isCollapsed ? 'الإدارة' : undefined}>
                <NavLink to="/super-admin/dashboard" className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {!isCollapsed && <span>لوحة الإدارة</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </AdminOnly>

          {/* Sign Out */}
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleSignOut}
              tooltip={isCollapsed ? 'تسجيل الخروج' : undefined}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && <span>تسجيل الخروج</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User Info */}
        {!isCollapsed && user && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium truncate">
              {user.profile?.first_name_ar || user.profile?.first_name} {user.profile?.last_name_ar || user.profile?.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.profile?.position || 'موظف'}
            </p>
            {user.company && (
              <p className="text-xs text-primary truncate mt-1">
                {user.company.name_ar || user.company.name}
              </p>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default UnifiedSidebar;

