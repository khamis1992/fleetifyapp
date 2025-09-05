import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsiveBreakpoint } from '@/hooks/use-mobile';
import { useDeviceDetection } from '@/hooks/responsive/useDeviceDetection';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { useUnifiedNotificationCount } from '@/hooks/useUnifiedNotificationCount';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { SidebarTrigger } from "@/components/ui/sidebar";

// Icons
import { 
  Menu, 
  Bell, 
  BellRing, 
  User, 
  Settings, 
  LogOut, 
  Search,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';

// Components
import { QuickSearch } from '@/components/navigation/QuickSearch';
import { CompanySelector } from '@/components/navigation/CompanySelector';
import { EnhancedAlertsSystem } from '@/components/dashboard/EnhancedAlertsSystem';
import { HeaderAttendanceButton } from '@/components/hr/HeaderAttendanceButton';

// Animation
import { motion, AnimatePresence } from 'framer-motion';

export interface ResponsiveHeaderProps {
  // Layout control
  showMenuButton?: boolean
  showSidebarTrigger?: boolean
  showLogo?: boolean
  
  // Content control
  showCompanySelector?: boolean
  showQuickSearch?: boolean
  showNotifications?: boolean
  showAttendance?: boolean
  showUserMenu?: boolean
  
  // Mobile behavior
  compactMode?: boolean
  hideElementsOnMobile?: string[]
  
  // Styling
  className?: string
  logoClassName?: string
  
  // Events
  onMenuClick?: () => void
  onLogoClick?: () => void
}

/**
 * ResponsiveHeader - هيدر متجاوب متقدم
 * يتكيف مع جميع أحجام الشاشات ويوفر تجربة مستخدم محسنة
 */
export const ResponsiveHeader: React.FC<ResponsiveHeaderProps> = ({
  showMenuButton = true,
  showSidebarTrigger = true,
  showLogo = true,
  showCompanySelector = true,
  showQuickSearch = true,
  showNotifications = true,
  showAttendance = true,
  showUserMenu = true,
  compactMode = false,
  hideElementsOnMobile = ['companySelector', 'quickSearch', 'attendance'],
  className,
  logoClassName,
  onMenuClick,
  onLogoClick
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Responsive hooks
  const { isMobile, isTablet, touchDevice } = useResponsiveBreakpoint();
  const { touchSupport } = useDeviceDetection();
  const { touchOptimized } = useAdaptiveLayout();
  const { totalAlerts, criticalAlerts } = useUnifiedNotificationCount();

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Check if element should be hidden on mobile
  const shouldHideOnMobile = (elementName: string) => {
    return isMobile && hideElementsOnMobile.includes(elementName);
  };

  // Header height based on device and mode
  const headerHeight = compactMode 
    ? (isMobile ? "h-14" : "h-12")
    : (isMobile ? "h-16" : "h-14");

  // Logo size based on device
  const logoSize = compactMode
    ? (isMobile ? "h-8" : "h-10")
    : (isMobile ? "h-10" : "h-12");

  return (
    <header className={cn(
      "flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm",
      "transition-all duration-200 sticky top-0 z-40",
      headerHeight,
      isMobile ? "px-4" : "px-6",
      className
    )}>
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        {isMobile && showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
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
        {!isMobile && showSidebarTrigger && <SidebarTrigger />}
        
        {/* Logo */}
        {showLogo && (
          <div 
            className={cn(
              "cursor-pointer transition-transform hover:scale-105",
              touchSupport && "active:scale-95"
            )}
            onClick={onLogoClick}
          >
            <img 
              src="/lovable-uploads/b8725fdf-dfaa-462a-b7fe-e9c9a86d17c2.png" 
              alt="Fleetify Logo" 
              className={cn(
                "w-auto",
                logoSize,
                logoClassName
              )}
            />
          </div>
        )}
      </div>
      
      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Company Selector */}
        {showCompanySelector && !shouldHideOnMobile('companySelector') && (
          <CompanySelector />
        )}
        
        {/* Quick Search */}
        {showQuickSearch && !shouldHideOnMobile('quickSearch') && (
          <div className="hidden md:block">
            <QuickSearch />
          </div>
        )}
        
        {/* Mobile Search Button */}
        {showQuickSearch && isMobile && (
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
        )}
        
        {/* Notifications */}
        {showNotifications && (
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
        )}
        
        {/* Attendance Button */}
        {showAttendance && !shouldHideOnMobile('attendance') && (
          <HeaderAttendanceButton />
        )}
        
        {/* User Menu */}
        {showUserMenu && user && (
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
              
              {/* Chevron - Hidden on mobile */}
              {!isMobile && (
                <ChevronDown className="h-4 w-4 opacity-50" />
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
                      {user?.profile?.position || 'موظف'}
                    </div>
                    {user?.company && (
                      <div className="text-xs text-primary">
                        {user.company.name_ar || user.company.name}
                      </div>
                    )}
                  </div>
                </>
              )}
              
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>الملف الشخصي</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>الإعدادات</span>
              </DropdownMenuItem>
              
              {/* Mobile-only items */}
              {isMobile && shouldHideOnMobile('companySelector') && (
                <DropdownMenuItem onClick={() => navigate('/companies')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>تبديل الشركة</span>
                </DropdownMenuItem>
              )}
              
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
        
        {/* Mobile overflow menu */}
        {isMobile && (showAttendance || showCompanySelector) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "hover:bg-accent/50 transition-colors",
                  touchOptimized && "min-h-[44px] min-w-[44px]"
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="sr-only">المزيد</span>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-48">
              {shouldHideOnMobile('attendance') && showAttendance && (
                <DropdownMenuItem onClick={() => navigate('/hr/attendance')}>
                  <span>الحضور والانصراف</span>
                </DropdownMenuItem>
              )}
              
              {shouldHideOnMobile('companySelector') && showCompanySelector && (
                <DropdownMenuItem onClick={() => navigate('/companies')}>
                  <span>تبديل الشركة</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default ResponsiveHeader;
