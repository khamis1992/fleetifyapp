import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsiveBreakpoint } from '@/hooks/use-mobile';
import { useDeviceDetection } from '@/hooks/responsive/useDeviceDetection';
import { useScreenOrientation } from '@/hooks/responsive/useScreenOrientation';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

// Icons
import { 
  Menu, 
  Bell, 
  BellRing, 
  User, 
  Settings, 
  LogOut, 
  Search,
  Home,
  Users,
  FileText,
  Truck,
  DollarSign,
  BarChart3,
  Headphones,
  ArrowLeft,
  X
} from 'lucide-react';

// Components
import { BottomNavigation, BottomNavItem } from '@/components/responsive/BottomNavigation';
import { MobileDrawer } from '@/components/responsive/MobileDrawer';
import { QuickSearch } from '@/components/navigation/QuickSearch';
import { EnhancedAlertsSystem } from '@/components/dashboard/EnhancedAlertsSystem';
import { useUnifiedNotificationCount } from '@/hooks/useUnifiedNotificationCount';

// Animation
import { motion, AnimatePresence } from 'framer-motion';

export interface MobileLayoutProps {
  // Header configuration
  showHeader?: boolean
  headerTitle?: string
  showBackButton?: boolean
  onBackClick?: () => void
  
  // Navigation configuration
  showBottomNav?: boolean
  showDrawer?: boolean
  customBottomNavItems?: BottomNavItem[]
  
  // Content configuration
  fullScreen?: boolean
  paddingless?: boolean
  
  // Styling
  className?: string
  headerClassName?: string
  contentClassName?: string
  
  // Behavior
  hideHeaderOnScroll?: boolean
  swipeToGoBack?: boolean
}

/**
 * MobileLayout - تخطيط مخصص للأجهزة المحمولة
 * يوفر تجربة محسنة للموبايل مع تنقل سفلي وقوائم جانبية
 */
export const MobileLayout: React.FC<MobileLayoutProps> = ({
  showHeader = true,
  headerTitle,
  showBackButton = false,
  onBackClick,
  showBottomNav = true,
  showDrawer = true,
  customBottomNavItems,
  fullScreen = false,
  paddingless = false,
  className,
  headerClassName,
  contentClassName,
  hideHeaderOnScroll = false,
  swipeToGoBack = false
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Responsive hooks
  const { isMobile, touchDevice } = useResponsiveBreakpoint();
  const { touchSupport, os } = useDeviceDetection();
  const { orientation, isPortrait } = useScreenOrientation();
  const { touchOptimized, animationStyle } = useAdaptiveLayout();
  const { totalAlerts, criticalAlerts } = useUnifiedNotificationCount();

  // Handle scroll for header hiding
  useEffect(() => {
    if (!hideHeaderOnScroll) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY;
      const scrollThreshold = 10;

      if (Math.abs(currentScrollY - lastScrollY) > scrollThreshold) {
        setHeaderVisible(!scrollingDown || currentScrollY < 100);
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, hideHeaderOnScroll]);

  // Handle swipe to go back
  useEffect(() => {
    if (!swipeToGoBack || !touchSupport) return;

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // Check if it's a horizontal swipe from left edge
      if (
        startX < 50 && // Started near left edge
        deltaX > 100 && // Swiped right significantly
        Math.abs(deltaY) < 100 // Not too much vertical movement
      ) {
        if (onBackClick) {
          onBackClick();
        } else {
          navigate(-1);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [swipeToGoBack, touchSupport, onBackClick, navigate]);

  // Default bottom navigation items
  const defaultBottomNavItems: BottomNavItem[] = [
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

  const bottomNavItems = customBottomNavItems || defaultBottomNavItems;

  // Determine active bottom nav item
  const activeBottomNavItem = bottomNavItems.find(item => 
    location.pathname.includes(item.id)
  )?.id || 'dashboard';

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Drawer menu items
  const drawerMenuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: Home, href: '/dashboard' },
    { id: 'customers', label: 'العملاء', icon: Users, href: '/customers' },
    { id: 'contracts', label: 'العقود', icon: FileText, href: '/contracts' },
    { id: 'fleet', label: 'الأسطول', icon: Truck, href: '/fleet' },
    { id: 'finance', label: 'المالية', icon: DollarSign, href: '/finance' },
    { id: 'reports', label: 'التقارير', icon: BarChart3, href: '/reports' },
    { id: 'support', label: 'الدعم الفني', icon: Headphones, href: '/support' }
  ];

  // Mobile Header Component
  const MobileHeader = () => (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: headerVisible ? 0 : -100 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "flex items-center justify-between",
        "h-16 px-4 bg-card/95 backdrop-blur-md border-b border-border",
        "transition-all duration-200",
        headerClassName
      )}
    >
      <div className="flex items-center gap-3">
        {/* Back button */}
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBackClick || (() => navigate(-1))}
            className={cn(
              "hover:bg-accent/50 transition-colors",
              touchOptimized && "min-h-[44px] min-w-[44px]"
            )}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">رجوع</span>
          </Button>
        )}

        {/* Menu button */}
        {showDrawer && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "hover:bg-accent/50 transition-colors",
              touchOptimized && "min-h-[44px] min-w-[44px]"
            )}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">فتح القائمة</span>
          </Button>
        )}

        {/* Title */}
        <h1 className="text-lg font-semibold text-foreground truncate">
          {headerTitle || 'Fleetify'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search button */}
        <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hover:bg-accent/50 transition-colors",
                touchOptimized && "min-h-[44px] min-w-[44px]"
              )}
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">البحث</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="top" className="h-[200px]">
            <SheetHeader>
              <SheetTitle>البحث السريع</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <QuickSearch />
            </div>
          </SheetContent>
        </Sheet>

        {/* Notifications */}
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
          <SheetContent side="left" className="w-full p-0">
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

        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(
              "hover:bg-accent/50 rounded-full p-1 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              touchOptimized && "min-h-[44px] min-w-[44px] flex items-center justify-center"
            )}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {(user?.profile?.first_name_ar || user?.profile?.first_name || 'م')[0]}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-3 py-2 border-b">
                <div className="font-medium text-sm">
                  {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user?.profile?.position || 'موظف'}
                </div>
                {user?.company && (
                  <div className="text-xs text-primary">
                    {user.company.name_ar || user.company.name}
                  </div>
                )}
              </div>
              
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>الملف الشخصي</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate('/settings')}>
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
        )}
      </div>
    </motion.header>
  );

  // Mobile Drawer Content
  const DrawerContent = () => (
    <div className="flex flex-col h-full">
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/b8725fdf-dfaa-462a-b7fe-e9c9a86d17c2.png" 
            alt="Fleetify Logo" 
            className="h-8 w-auto"
          />
          <span className="font-semibold text-lg">Fleetify</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDrawerOpen(false)}
          className="hover:bg-accent/50"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-b bg-accent/20">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {(user?.profile?.first_name_ar || user?.profile?.first_name || 'م')[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
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
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {drawerMenuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => {
                  navigate(item.href);
                  setDrawerOpen(false);
                }}
                className={cn(
                  "w-full justify-start gap-3 h-12 px-3",
                  "transition-all duration-200",
                  touchOptimized && "active:scale-95",
                  isActive && "bg-accent text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Drawer Footer */}
      <div className="p-4 border-t space-y-2">
        <Button
          variant="ghost"
          onClick={() => {
            navigate('/settings');
            setDrawerOpen(false);
          }}
          className="w-full justify-start gap-3 h-12"
        >
          <Settings className="h-5 w-5" />
          <span>الإعدادات</span>
        </Button>
        
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
          <span>تسجيل الخروج</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn(
      "min-h-screen bg-background",
      fullScreen ? "h-screen overflow-hidden" : "",
      className
    )}>
      {/* Header */}
      {showHeader && <MobileHeader />}

      {/* Main Content */}
      <main className={cn(
        "flex-1",
        showHeader && "pt-16", // Account for fixed header
        showBottomNav && "pb-20", // Account for bottom navigation
        !paddingless && "px-4 py-6",
        contentClassName
      )}>
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <BottomNavigation
          items={bottomNavItems}
          activeItem={activeBottomNavItem}
          onItemChange={(itemId) => {
            const item = bottomNavItems.find(nav => nav.id === itemId);
            if (item?.onClick) {
              item.onClick();
            }
          }}
          hideOnScroll={hideHeaderOnScroll}
          enableHapticFeedback={true}
          variant="default"
          showLabels={true}
          className="z-40"
        />
      )}

      {/* Mobile Drawer */}
      {showDrawer && (
        <MobileDrawer
          isOpen={drawerOpen}
          onOpenChange={setDrawerOpen}
          side="right"
          width="320px"
          closeOnBackdropClick={true}
          closeOnEscape={true}
          enableSwipeToClose={true}
          title="القائمة الرئيسية"
        >
          <DrawerContent />
        </MobileDrawer>
      )}
    </div>
  );
};

export default MobileLayout;
