import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from './AppSidebar';
import { HeaderAttendanceButton } from '@/components/hr/HeaderAttendanceButton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QuickSearch } from '@/components/navigation/QuickSearch';
import { KeyboardShortcuts } from '@/components/navigation/KeyboardShortcuts';
import { CompanySelector } from '@/components/navigation/CompanySelector';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';
import { LazyImage } from '@/components/common/LazyImage';
import { QuickActionBar } from '@/components/quick-actions/QuickActionBar';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

import ForcePasswordChangeDialog from '@/components/auth/ForcePasswordChangeDialog';


interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
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

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background" dir="rtl">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <LazyImage 
                src="/receipts/logo.png" 
                alt="Fleetify Logo" 
                className="h-12 w-auto"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <CompanySelector />
              <QuickSearch />
              
              {/* Unified Notification Bell */}
              <UnifiedNotificationBell />
              
              {/* Attendance Button */}
              <HeaderAttendanceButton />
              
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

          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            {children || <Outlet />}
          </main>
        </div>
        <QuickActionBar />
        <KeyboardShortcuts />
        <ForcePasswordChangeDialog />
      </div>
    </SidebarProvider>
  );
};
