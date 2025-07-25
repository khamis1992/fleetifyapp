import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
  ChevronDown,
  User,
  Building2
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigationItems = [
  { 
    name: 'لوحة التحكم', 
    name_en: 'Dashboard',
    href: '/dashboard', 
    icon: Home 
  },
  { 
    name: 'الأسطول', 
    name_en: 'Fleet',
    href: '/fleet', 
    icon: Car 
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
    name: 'المالية', 
    name_en: 'Finance',
    href: '/finance', 
    icon: DollarSign 
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

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const isActive = (href: string) => location.pathname.startsWith(href);

  return (
    <Sidebar className="border-sidebar-border bg-sidebar-background">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex flex-col items-center space-y-2 py-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Car className="w-4 h-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="text-right">
                <h1 className="text-lg font-bold text-sidebar-foreground">
                  KW RentFlow
                </h1>
                <p className="text-xs text-sidebar-foreground/60">
                  نظام إدارة تأجير السيارات
                </p>
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-medium">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.href)}
                    className="transition-smooth hover:bg-sidebar-accent"
                  >
                    <NavLink to={item.href}>
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span className="font-medium">{item.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4" />

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-medium">
            الإعدادات
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === '/settings'}
                  className="transition-smooth hover:bg-sidebar-accent"
                >
                  <NavLink to="/settings">
                    <Settings className="w-4 h-4" />
                    {!collapsed && <span className="font-medium">الإعدادات</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Info */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton 
                  size="lg" 
                  className="data-[state=open]:bg-sidebar-accent transition-smooth"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                      {getInitials(
                        user?.profile?.first_name_ar || user?.profile?.first_name,
                        user?.profile?.last_name_ar || user?.profile?.last_name
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="grid flex-1 text-right text-sm leading-tight">
                      <span className="truncate font-semibold text-sidebar-foreground">
                        {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground/60">
                        {user?.profile?.position || 'موظف'}
                      </span>
                    </div>
                  )}
                  {!collapsed && <ChevronDown className="ml-auto h-4 w-4" />}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56" 
                align="end" 
                side={collapsed ? "right" : "bottom"}
              >
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                      {getInitials(
                        user?.profile?.first_name_ar || user?.profile?.first_name,
                        user?.profile?.last_name_ar || user?.profile?.last_name
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-right text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.profile?.position || 'موظف'}
                    </span>
                  </div>
                </div>
                
                {user?.company && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="flex items-center gap-2 p-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-accent font-medium">
                        {user.company.name_ar || user.company.name}
                      </span>
                    </div>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    الملف الشخصي
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <NavLink to="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    الإعدادات
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}