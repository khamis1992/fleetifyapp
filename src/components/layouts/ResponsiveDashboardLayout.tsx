import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AppSidebar } from './AppSidebar';
import { MobileNavigation } from './MobileNavigation';
import { ResponsiveHeader } from './ResponsiveHeader';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import ForcePasswordChangeDialog from '@/components/auth/ForcePasswordChangeDialog';
import { KeyboardShortcuts } from '@/components/navigation/KeyboardShortcuts';

export const ResponsiveDashboardLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const { isMobile, isTablet, isDesktop } = useSimpleBreakpoint();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

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
      <div className="min-h-screen flex w-full bg-background" dir="rtl">
        {/* Desktop/Tablet Sidebar */}
        {!isMobile && <AppSidebar />}
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Responsive Header */}
          <ResponsiveHeader 
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            showMenuButton={isMobile}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <ResponsiveContainer 
              className="py-4 md:py-6 lg:py-8"
              padding={isMobile ? 'sm' : isTablet ? 'default' : 'lg'}
            >
              <Outlet />
            </ResponsiveContainer>
          </main>

          {/* Mobile Bottom Navigation */}
          {isMobile && <MobileNavigation />}
        </div>

        {/* Mobile Sidebar Sheet */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="right" className="w-80 p-0">
              <AppSidebar />
            </SheetContent>
          </Sheet>
        )}

        <KeyboardShortcuts />
        <ForcePasswordChangeDialog />
      </div>
    </SidebarProvider>
  );
};