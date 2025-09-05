
import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from './AppSidebar';
import { HeaderAttendanceButton } from '@/components/hr/HeaderAttendanceButton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Settings, LogOut, Bell, BellRing, Menu, Home, Users, FileText, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QuickSearch } from '@/components/navigation/QuickSearch';
import { KeyboardShortcuts } from '@/components/navigation/KeyboardShortcuts';
import { CompanySelector } from '@/components/navigation/CompanySelector';
import { EnhancedAlertsSystem } from '@/components/dashboard/EnhancedAlertsSystem';
import { useUnifiedNotificationCount } from '@/hooks/useUnifiedNotificationCount';
import { motion, AnimatePresence } from 'framer-motion';
import ForcePasswordChangeDialog from '@/components/auth/ForcePasswordChangeDialog';

// Import responsive components
import { ResponsiveLayout } from '@/components/responsive/ResponsiveLayout';
import { BottomNavigation, BottomNavItem } from '@/components/responsive/BottomNavigation';
import { MobileDrawer } from '@/components/responsive/MobileDrawer';
import { useResponsiveBreakpoint } from '@/hooks/use-mobile';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { cn } from '@/lib/utils';


export const DashboardLayout: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { totalAlerts, criticalAlerts } = useUnifiedNotificationCount();
  
  // Responsive hooks
  const { isMobile, isTablet, deviceType } = useResponsiveBreakpoint();
  const { 
    showBottomNav, 
    showDrawer, 
    containerPadding, 
    touchOptimized 
  } = useAdaptiveLayout({
    mobileNavigation: 'both',
    contentDensity: 'comfortable'
  });

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
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

  // Determine active bottom nav item based on current path
  const currentPath = window.location.pathname;
  const activeBottomNavItem = bottomNavItems.find(item => 
    currentPath.includes(item.id)
  )?.id || 'dashboard';

  // Responsive Header Component
  const ResponsiveHeader = () => (
    <header className={cn(
      "flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm",
      "transition-all duration-200 relative z-10 responsive-header",
      isMobile ? "h-16 px-4" : "h-16 px-6"
    )}>
      <div className={cn(
        "flex items-center gap-3",
        !isMobile && "header-left"
      )}>
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
            "w-auto header-logo",
            isMobile ? "h-10" : "h-12"
          )}
              />
            </div>
            
      <div className={cn(
        "flex items-center gap-2 md:gap-4",
        !isMobile && "header-right"
      )}>
        {/* Company Selector - Hidden on small mobile */}
        {!isMobile && <CompanySelector />}
        
        {/* Quick Search - Responsive */}
        <div className={cn(
          isMobile ? "hidden" : "block"
        )}>
              <QuickSearch />
        </div>
              
        {/* Alerts Bell */}
              <Sheet open={alertsOpen} onOpenChange={setAlertsOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
              className={cn(
                "relative hover:bg-accent/50 transition-colors z-20",
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
              "p-0 z-[70]",
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
              
        {/* Attendance Button - Hidden on mobile */}
        {!isMobile && <HeaderAttendanceButton />}
              
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
                    {user?.profile?.position || 'موظف'}
                  </div>
                  {user?.company && (
                    <div className="text-xs text-primary truncate">
                      {user.company.name_ar || user.company.name}
                    </div>
                  )}
                </div>
            )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>الملف الشخصي</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>الإعدادات</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </header>
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

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className={cn(
        "min-h-screen flex flex-col bg-background",
        !isMobile && "desktop-layout"
      )}>
        {/* Header */}
        <div className={cn(
          !isMobile && "desktop-header"
        )}>
          <ResponsiveHeader />
        </div>
        
        {/* Main Layout */}
        <div className={cn(
          "flex flex-1 overflow-hidden",
          !isMobile && "desktop-main-container"
        )}>
          {/* Desktop Sidebar */}
          {!isMobile && (
            <div className="desktop-sidebar">
              <AppSidebar />
            </div>
          )}

          {/* Main Content */}
          <main className={cn(
            "flex-1 overflow-auto main-content-area",
            !isMobile && "desktop-content",
            containerPadding,
            isMobile ? "pb-20" : "pb-0"
          )}>
            <Outlet />
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        {showBottomNav && (
          <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
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
          </div>
        )}

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
        <ForcePasswordChangeDialog />
      </div>
    </SidebarProvider>
  );
};
