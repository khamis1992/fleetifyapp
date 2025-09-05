import React, { useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from './AppSidebar';
import { HeaderAttendanceButton } from '@/components/hr/HeaderAttendanceButton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Settings, LogOut, Bell, BellRing, ArrowLeft, Eye, Building2, Menu, Home, Users, FileText, Truck } from 'lucide-react';
import { QuickSearch } from '@/components/navigation/QuickSearch';
import { KeyboardShortcuts } from '@/components/navigation/KeyboardShortcuts';
import { EnhancedAlertsSystem } from '@/components/dashboard/EnhancedAlertsSystem';
import { useUnifiedNotificationCount } from '@/hooks/useUnifiedNotificationCount';
import { motion, AnimatePresence } from 'framer-motion';

// Import responsive components
import { ResponsiveLayout } from '@/components/responsive/ResponsiveLayout';
import { BottomNavigation, BottomNavItem } from '@/components/responsive/BottomNavigation';
import { MobileDrawer } from '@/components/responsive/MobileDrawer';
import { useResponsiveBreakpoint } from '@/hooks/use-mobile';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { cn } from '@/lib/utils';

export const CompanyBrowserLayout: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const { browsedCompany, exitBrowseMode, isBrowsingMode } = useCompanyContext();
  const navigate = useNavigate();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { totalAlerts, criticalAlerts } = useUnifiedNotificationCount();
  
  // Responsive hooks
  const { isMobile, isTablet, touchDevice } = useResponsiveBreakpoint();
  const { 
    showBottomNav, 
    showDrawer, 
    containerPadding, 
    touchOptimized 
  } = useAdaptiveLayout({
    mobileNavigation: 'both',
    contentDensity: 'comfortable'
  });

  // Debug logging for browser layout
  console.log('🖥️ [COMPANY_BROWSER_LAYOUT] Rendering with state:', {
    user: user?.id,
    userRoles: user?.roles,
    isBrowsingMode,
    browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null,
    loading
  });

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleExitBrowseMode = () => {
    console.log('🖥️ [COMPANY_BROWSER_LAYOUT] Exiting browse mode');
    try {
      exitBrowseMode();
      navigate('/super-admin/companies');
    } catch (error) {
      console.error('🖥️ [COMPANY_BROWSER_LAYOUT] Error exiting browse mode:', error);
    }
  };

  // Bottom navigation items for mobile
  const bottomNavItems: BottomNavItem[] = [
    {
      id: 'dashboard',
      label: 'الرئيسية',
      icon: <Home className="h-5 w-5" />,
      activeIcon: <Home className="h-5 w-5 fill-current" />,
      onClick: () => navigate('/dashboard')
    },
    {
      id: 'customers',
      label: 'العملاء',
      icon: <Users className="h-5 w-5" />,
      activeIcon: <Users className="h-5 w-5 fill-current" />,
      onClick: () => navigate('/customers')
    },
    {
      id: 'contracts',
      label: 'العقود',
      icon: <FileText className="h-5 w-5" />,
      activeIcon: <FileText className="h-5 w-5 fill-current" />,
      onClick: () => navigate('/contracts')
    },
    {
      id: 'fleet',
      label: 'الأسطول',
      icon: <Truck className="h-5 w-5" />,
      activeIcon: <Truck className="h-5 w-5 fill-current" />,
      onClick: () => navigate('/fleet')
    }
  ];

  // Determine active bottom nav item
  const currentPath = window.location.pathname;
  const activeBottomNavItem = bottomNavItems.find(item => 
    currentPath.includes(item.id)
  )?.id || 'dashboard';

  // Company Browser Header Component
  const CompanyBrowserHeader = () => (
    <div className="space-y-0">
      {/* Browse Mode Alert */}
      <Alert className={cn(
        "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950",
        isMobile ? "mx-2 mt-2" : "mx-4 mt-4"
      )}>
        <Eye className="h-4 w-4" />
        <AlertDescription className={cn(
          "flex items-center justify-between",
          isMobile && "flex-col gap-3"
        )}>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className={cn(
              "font-medium",
              isMobile ? "text-sm" : "text-base"
            )}>
              تصفح شركة: {browsedCompany?.name_ar || browsedCompany?.name}
            </span>
            <Badge variant="outline" className="text-xs">
              وضع التصفح
            </Badge>
          </div>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={handleExitBrowseMode}
            className={cn(
              "flex items-center gap-2",
              isMobile && "w-full justify-center"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            العودة إلى الإدارة العليا
          </Button>
        </AlertDescription>
      </Alert>

      {/* Header */}
      <header className={cn(
        "flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm",
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
              className={cn(
                "hover:bg-accent/50 transition-colors",
                touchOptimized && "min-h-[44px] min-w-[44px]"
              )}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">فتح القائمة</span>
            </Button>
          )}
          
          {/* Desktop sidebar trigger */}
          {!isMobile && <SidebarTrigger />}
          
          {/* Logo */}
          <img 
            src="/lovable-uploads/b8725fdf-dfaa-462a-b7fe-e9c9a86d17c2.png" 
            alt="Fleetify Logo" 
            className={cn(
              "w-auto",
              isMobile ? "h-10" : "h-12"
            )}
          />
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {/* Quick Search - Hidden on mobile */}
          {!isMobile && <QuickSearch />}
          
          {/* Alerts Bell */}
          <Sheet open={alertsOpen} onOpenChange={setAlertsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative hover:bg-accent/50 transition-colors",
                  touchOptimized && "min-h-[44px] min-w-[44px]"
                )}
              >
                <motion.div
                  animate={totalAlerts > 0 ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {totalAlerts > 0 ? (
                    <BellRing className="h-5 w-5" />
                  ) : (
                    <Bell className="h-5 w-5" />
                  )}
                </motion.div>
                
                <AnimatePresence>
                  {totalAlerts > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1"
                    >
                      <Badge 
                        variant={criticalAlerts > 0 ? "destructive" : "secondary"}
                        className={cn(
                          "min-w-[20px] h-5 text-xs px-1",
                          criticalAlerts > 0 && "animate-pulse"
                        )}
                      >
                        {totalAlerts > 99 ? '99+' : totalAlerts}
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="left" 
              className={cn(
                "p-0",
                isMobile ? "w-full" : "w-full sm:w-[600px]"
              )}
            >
              <SheetHeader className="p-6 pb-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  نظام التنبيهات المتقدم
                  {totalAlerts > 0 && (
                    <Badge variant="secondary">{totalAlerts}</Badge>
                  )}
                </SheetTitle>
              </SheetHeader>
              <div className="p-6">
                <EnhancedAlertsSystem />
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Attendance Button - Disabled in browse mode, Hidden on mobile */}
          {!isMobile && (
            <div className="opacity-50 pointer-events-none">
              <HeaderAttendanceButton />
            </div>
          )}
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(
              "flex items-center gap-3 hover:bg-accent/50 rounded-md p-2 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              touchOptimized && "min-h-[44px]"
            )}>
              <Avatar className={cn(
                isMobile ? "h-10 w-10" : "h-8 w-8"
              )}>
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {(user?.profile?.first_name_ar || user?.profile?.first_name || 'م')[0]}
                </AvatarFallback>
              </Avatar>
              
              {/* User info - Hidden on mobile */}
              {!isMobile && (
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-sm font-medium text-foreground truncate">
                    {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    مدير عام - وضع التصفح
                  </div>
                  <div className="text-xs text-orange-600 truncate">
                    تصفح: {browsedCompany?.name_ar || browsedCompany?.name}
                  </div>
                </div>
              )}
            </DropdownMenuTrigger>
            
            <DropdownMenuContent 
              align="end" 
              className={cn(
                isMobile ? "w-64" : "w-56"
              )}
            >
              {/* Mobile user info */}
              {isMobile && (
                <>
                  <div className="px-3 py-2 border-b">
                    <div className="font-medium text-sm">
                      {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      مدير عام - وضع التصفح
                    </div>
                    <div className="text-xs text-orange-600">
                      تصفح: {browsedCompany?.name_ar || browsedCompany?.name}
                    </div>
                  </div>
                </>
              )}
              
              <DropdownMenuItem onClick={handleExitBrowseMode}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                <span>الخروج من وضع التصفح</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>الملف الشخصي</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate('/super-admin/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>الإعدادات</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleSignOut} 
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </div>
  );

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

  // Only super admins can access this layout
  if (!user.roles?.includes('super_admin')) {
    console.warn('🖥️ [COMPANY_BROWSER_LAYOUT] User is not super admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Must be in browsing mode
  if (!isBrowsingMode || !browsedCompany) {
    console.warn('🖥️ [COMPANY_BROWSER_LAYOUT] Not in browse mode or no browsed company, redirecting:', {
      isBrowsingMode,
      browsedCompany: browsedCompany?.id
    });
    return <Navigate to="/super-admin/companies" replace />;
  }

  console.log('🖥️ [COMPANY_BROWSER_LAYOUT] All checks passed, rendering layout');

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <ResponsiveLayout
        header={<CompanyBrowserHeader />}
        sidebar={<AppSidebar />}
        mobileNavigation={
          showBottomNav ? (
            <BottomNavigation
              items={bottomNavItems}
              activeItem={activeBottomNavItem}
              onItemChange={(itemId) => {
                const item = bottomNavItems.find(nav => nav.id === itemId);
                if (item?.onClick) {
                  item.onClick();
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
          containerPadding,
          isMobile ? "pb-20" : "pb-0" // Add bottom padding for mobile nav
        )}
      >
        {/* Main Content */}
        <div className="flex-1">
          <Outlet />
        </div>
      </ResponsiveLayout>

      {/* Mobile Drawer */}
      {showDrawer && (
        <MobileDrawer
          isOpen={mobileDrawerOpen}
          onOpenChange={setMobileDrawerOpen}
          side="right"
          width="280px"
          closeOnBackdropClick={true}
          closeOnEscape={true}
          enableSwipeToClose={true}
          title="القائمة الرئيسية"
        >
          <AppSidebar />
        </MobileDrawer>
      )}

      <KeyboardShortcuts />
    </SidebarProvider>
  );
};