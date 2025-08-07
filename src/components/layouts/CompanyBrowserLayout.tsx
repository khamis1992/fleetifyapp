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
import { User, Settings, LogOut, Bell, BellRing, ArrowLeft, Eye, Building2 } from 'lucide-react';
import { QuickSearch } from '@/components/navigation/QuickSearch';
import { KeyboardShortcuts } from '@/components/navigation/KeyboardShortcuts';
import { EnhancedAlertsSystem } from '@/components/dashboard/EnhancedAlertsSystem';
import { useRealTimeAlerts } from '@/hooks/useRealTimeAlerts';
import { motion, AnimatePresence } from 'framer-motion';

export const CompanyBrowserLayout: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const { browsedCompany, exitBrowseMode, isBrowsingMode } = useCompanyContext();
  const navigate = useNavigate();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const { totalAlerts, criticalAlerts } = useRealTimeAlerts();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleExitBrowseMode = () => {
    exitBrowseMode();
    navigate('/super-admin/companies');
  };

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
    return <Navigate to="/dashboard" replace />;
  }

  // Must be in browsing mode
  if (!isBrowsingMode || !browsedCompany) {
    return <Navigate to="/super-admin/companies" replace />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background" dir="rtl">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Browse Mode Alert */}
          <Alert className="m-4 mb-0 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <Eye className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">
                  تصفح شركة: {browsedCompany.name_ar || browsedCompany.name}
                </span>
                <Badge variant="outline" className="text-xs">
                  وضع التصفح
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExitBrowseMode}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                العودة إلى الإدارة العليا
              </Button>
            </AlertDescription>
          </Alert>

          {/* Header */}
          <header className="h-14 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <img 
                src="/lovable-uploads/b8725fdf-dfaa-462a-b7fe-e9c9a86d17c2.png" 
                alt="Fleetify Logo" 
                className="h-12 w-auto"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <QuickSearch />
              
              {/* Combined Alerts Bell */}
              <Sheet open={alertsOpen} onOpenChange={setAlertsOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative hover:bg-accent/50 transition-colors"
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
                            className={`min-w-[20px] h-5 text-xs px-1 ${
                              criticalAlerts > 0 ? 'animate-pulse' : ''
                            }`}
                          >
                            {totalAlerts > 99 ? '99+' : totalAlerts}
                          </Badge>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:w-[600px] p-0">
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
              
              {/* Attendance Button - Disabled in browse mode */}
              <div className="opacity-50 pointer-events-none">
                <HeaderAttendanceButton />
              </div>
              
              {/* User Info in Header */}
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
                      مدير عام - وضع التصفح
                    </div>
                    <div className="text-xs text-orange-600 truncate">
                      تصفح: {browsedCompany.name_ar || browsedCompany.name}
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
        <KeyboardShortcuts />
      </div>
    </SidebarProvider>
  );
};