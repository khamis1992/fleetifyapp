import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Menu, 
  User, 
  Settings, 
  LogOut, 
  Search,
  MoreVertical
} from 'lucide-react';

import { HeaderAttendanceButton } from '@/components/hr/HeaderAttendanceButton';
import { QuickSearch } from '@/components/navigation/QuickSearch';
import { CompanySelector } from '@/components/navigation/CompanySelector';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';
import { LazyImage } from '@/components/common/LazyImage';

interface ResponsiveHeaderProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export const ResponsiveHeader: React.FC<ResponsiveHeaderProps> = ({ 
  onMenuToggle, 
  showMenuButton = false 
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useSimpleBreakpoint();
  const [searchOpen, setSearchOpen] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="h-14 md:h-16 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-3 md:px-4 lg:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile Menu Button */}
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Desktop Sidebar Trigger */}
        {!isMobile && <SidebarTrigger />}

        {/* Logo */}
        <LazyImage 
          src="/lovable-uploads/b8725fdf-dfaa-462a-b7fe-e9c9a86d17c2.png" 
          alt="Fleetify Logo" 
          className={`w-auto ${isMobile ? 'h-8' : 'h-10 md:h-12'}`}
        />
      </div>

      {/* Center Section - Search (Desktop/Tablet only) */}
      {!isMobile && (
        <div className="flex-1 max-w-md mx-4">
          <QuickSearch />
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Company Selector (Tablet/Desktop) */}
        {!isMobile && <CompanySelector />}

        {/* Mobile Search Button */}
        {isMobile && (
          <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="h-auto p-4">
              <QuickSearch />
            </SheetContent>
          </Sheet>
        )}

        {/* Unified Notification Bell */}
        <UnifiedNotificationBell />

        {/* Attendance Button (Non-mobile) */}
        {!isMobile && <HeaderAttendanceButton />}

        {/* User Menu */}
        {isMobile ? (
          /* Mobile: Simple dropdown */
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm font-medium">
                {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                الملف الشخصي
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                الإعدادات
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          /* Desktop/Tablet: Full user info */
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 hover:bg-accent/50 rounded-md p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {(user?.profile?.first_name_ar || user?.profile?.first_name || 'م')[0]}
                </AvatarFallback>
              </Avatar>
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
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                الملف الشخصي
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                الإعدادات
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};