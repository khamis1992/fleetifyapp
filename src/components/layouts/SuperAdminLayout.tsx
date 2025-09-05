import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  DollarSign, 
  Settings,
  LogOut,
  Menu,
  BarChart3,
  Shield,
  Crown,
  Headphones,
  Layout,
  Home
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

// Import responsive components
import { ResponsiveLayout } from '@/components/responsive/ResponsiveLayout';
import { BottomNavigation, BottomNavItem } from '@/components/responsive/BottomNavigation';
import { MobileDrawer } from '@/components/responsive/MobileDrawer';
import { useResponsiveBreakpoint } from '@/hooks/use-mobile';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { cn } from '@/lib/utils';

const navigationItems = [
  { 
    name: 'لوحة التحكم الرئيسية', 
    href: '/super-admin/dashboard', 
    icon: BarChart3 
  },
  { 
    name: 'إدارة الشركات', 
    href: '/super-admin/companies', 
    icon: Building2 
  },
  { 
    name: 'إدارة المستخدمين', 
    href: '/super-admin/users', 
    icon: Users 
  },
  { 
    name: 'المدفوعات والاشتراكات', 
    href: '/super-admin/payments', 
    icon: DollarSign 
  },
  { 
    name: 'إدارة الدعم الفني', 
    href: '/super-admin/support', 
    icon: Headphones 
  },
  { 
    name: 'تقارير النظام', 
    href: '/super-admin/reports', 
    icon: BarChart3 
  },
  { 
    name: 'إدارة الصفحات المقصودة', 
    href: '/super-admin/landing-management', 
    icon: Layout 
  },
];

const Sidebar = ({ className = "" }: { className?: string }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isMobile, touchDevice } = useResponsiveBreakpoint();
  const { touchOptimized } = useAdaptiveLayout();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className={cn(
      "h-screen bg-card/80 backdrop-blur-xl border-l border-border/50",
      "overflow-y-auto overscroll-contain",
      isMobile ? "p-4" : "p-6",
      className
    )}>
      <div className="mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
            <Crown className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Super Admin
          </h1>
        </div>
        <p className="text-sm text-center text-muted-foreground">
          لوحة تحكم مزود الخدمة
        </p>
      </div>

      {/* User Info */}
      <div className="mb-6 p-4 bg-primary/5 rounded-lg backdrop-blur-sm border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          مدير النظام الرئيسي
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-all group",
                // Mobile optimizations
                isMobile ? "px-3 py-4 min-h-[48px]" : "px-4 py-3",
                // Touch optimizations
                touchOptimized && "active:scale-95",
                // Active/inactive states
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                  : 'hover:bg-primary/5 text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn(
                "transition-colors",
                isMobile ? "h-6 w-6" : "h-5 w-5",
                isActive ? 'text-primary' : 'group-hover:text-primary'
              )} />
              <span className={cn(
                "font-medium",
                isMobile ? "text-base" : "text-sm"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="space-y-2 mt-8">
        <Link
          to="/super-admin/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground group",
            isMobile ? "px-3 py-4 min-h-[48px]" : "px-4 py-3",
            touchOptimized && "active:scale-95"
          )}
        >
          <Settings className={cn(
            "group-hover:text-primary transition-colors",
            isMobile ? "h-6 w-6" : "h-5 w-5"
          )} />
          <span className={cn(
            isMobile ? "text-base" : "text-sm"
          )}>
            إعدادات النظام
          </span>
        </Link>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5",
            isMobile ? "h-12 px-3 text-base" : "h-10 px-4 text-sm",
            touchOptimized && "active:scale-95"
          )}
        >
          <LogOut className={cn(
            isMobile ? "h-6 w-6" : "h-5 w-5"
          )} />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
};

export const SuperAdminLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const { isMobile, isTablet } = useResponsiveBreakpoint();
  const { showBottomNav, showDrawer } = useAdaptiveLayout({
    mobileNavigation: 'both',
    contentDensity: 'comfortable'
  });
  
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/super-admin" replace />;
  }

  const isSuperAdmin = user?.roles?.includes('super_admin');
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Bottom navigation items for mobile
  const bottomNavItems: BottomNavItem[] = [
    {
      id: 'dashboard',
      label: 'الرئيسية',
      icon: <Home className="h-5 w-5" />,
      activeIcon: <Home className="h-5 w-5 fill-current" />,
      href: '/super-admin/dashboard'
    },
    {
      id: 'companies',
      label: 'الشركات',
      icon: <Building2 className="h-5 w-5" />,
      activeIcon: <Building2 className="h-5 w-5 fill-current" />,
      href: '/super-admin/companies'
    },
    {
      id: 'users',
      label: 'المستخدمين',
      icon: <Users className="h-5 w-5" />,
      activeIcon: <Users className="h-5 w-5 fill-current" />,
      href: '/super-admin/users'
    },
    {
      id: 'payments',
      label: 'المدفوعات',
      icon: <DollarSign className="h-5 w-5" />,
      activeIcon: <DollarSign className="h-5 w-5 fill-current" />,
      href: '/super-admin/payments'
    }
  ];

  // Determine active bottom nav item
  const currentPath = window.location.pathname;
  const activeBottomNavItem = bottomNavItems.find(item => 
    currentPath.includes(item.id)
  )?.id || 'dashboard';

  // Super Admin Header Component
  const SuperAdminHeader = () => (
    <header className={cn(
      "flex items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-xl",
      "transition-all duration-200",
      isMobile ? "h-16 px-4" : "h-14 px-6"
    )}>
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        {isMobile && showDrawer && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileDrawerOpen(true)}
            className="hover:bg-accent/50 transition-colors min-h-[44px] min-w-[44px]"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">فتح القائمة</span>
          </Button>
        )}
        
        <div className="flex items-center gap-2">
          <div className={cn(
            "rounded-lg bg-destructive/10 text-destructive",
            isMobile ? "p-1.5" : "p-2"
          )}>
            <Crown className={cn(
              isMobile ? "h-5 w-5" : "h-6 w-6"
            )} />
          </div>
          <h1 className={cn(
            "font-bold text-foreground",
            isMobile ? "text-lg" : "text-xl"
          )}>
            Super Admin
          </h1>
        </div>
      </div>
      
      {/* User info on desktop */}
      {!isMobile && user && (
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-medium">
            {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
          </span>
        </div>
      )}
    </header>
  );

  return (
    <ResponsiveLayout
      header={<SuperAdminHeader />}
      sidebar={<Sidebar />}
      mobileNavigation={
        showBottomNav ? (
          <BottomNavigation
            items={bottomNavItems}
            activeItem={activeBottomNavItem}
            onItemChange={(itemId) => {
              const item = bottomNavItems.find(nav => nav.id === itemId);
              if (item?.href) {
                window.location.href = item.href;
              }
            }}
            hideOnScroll={true}
            enableHapticFeedback={true}
            variant="default"
            showLabels={true}
          />
        ) : undefined
      }
      showMobileDrawer={showDrawer}
      stickyHeader={true}
      adaptToOrientation={true}
      contentDensity="comfortable"
      className="bg-background"
      contentClassName={cn(
        "overflow-auto",
        isMobile ? "pb-20 px-4 py-6" : "px-6 py-6"
      )}
    >
      {/* Main Content */}
      <div className="flex-1">
        <Outlet />
      </div>
      
      {/* Mobile Drawer */}
      {showDrawer && (
        <MobileDrawer
          isOpen={mobileDrawerOpen}
          onOpenChange={setMobileDrawerOpen}
          side="right"
          width="320px"
          closeOnBackdropClick={true}
          closeOnEscape={true}
          enableSwipeToClose={true}
          title="Super Admin Menu"
        >
          <Sidebar />
        </MobileDrawer>
      )}
    </ResponsiveLayout>
  );
};