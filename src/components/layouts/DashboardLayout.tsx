import React from 'react';
import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const coreNavigationItems = [
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
];

const managementNavigationItems = [
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

const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm" 
      : "text-muted-foreground hover:bg-muted hover:text-foreground";

  const getUserDisplayName = () => {
    const firstName = user?.profile?.first_name_ar || user?.profile?.first_name || '';
    const lastName = user?.profile?.last_name_ar || user?.profile?.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'مستخدم';
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <Sidebar className="border-l shadow-lg" collapsible="icon">
      <SidebarHeader className="border-b bg-card/50">
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            KW
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-foreground">RentFlow</h1>
              <p className="text-xs text-muted-foreground">نظام إدارة تأجير السيارات</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-6 p-4">
        {/* Core Operations */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
            العمليات الأساسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreNavigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild className="transition-all duration-200">
                    <NavLink to={item.href} end className={getNavClassName}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="font-medium">{item.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
            الإدارة والتحليل
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementNavigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild className="transition-all duration-200">
                    <NavLink to={item.href} end className={getNavClassName}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="font-medium">{item.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t bg-card/50 p-4">
        {!collapsed ? (
          <div className="space-y-3">
            {/* User Info Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start h-auto p-3 hover:bg-muted/50">
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profile?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-right min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {getUserDisplayName()}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user?.profile?.position || 'موظف'}
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-right">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.profile?.position || 'موظف'}
                    </p>
                    {user?.company && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {user.company.name_ar || user.company.name}
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/settings" className="w-full cursor-pointer">
                    <Settings className="ml-2 h-4 w-4" />
                    الإعدادات
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="ml-2 h-4 w-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="space-y-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.profile?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-right">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.profile?.position || 'موظف'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/settings" className="w-full cursor-pointer">
                    <Settings className="ml-2 h-4 w-4" />
                    الإعدادات
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="ml-2 h-4 w-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export const DashboardLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background" dir="rtl">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with Sidebar Trigger */}
          <header className="flex h-14 items-center border-b bg-card/50 px-4 lg:px-6">
            <SidebarTrigger className="ml-auto" />
          </header>
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};