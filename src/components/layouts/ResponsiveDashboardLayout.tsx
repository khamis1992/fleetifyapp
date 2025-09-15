import { useState, useEffect } from 'react';
import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DynamicSidebar } from '@/modules/core/components';
import { MobileSidebar } from './MobileSidebar';
import { MobileNavigation } from './MobileNavigation';
import { ResponsiveHeader } from './ResponsiveHeader';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import ForcePasswordChangeDialog from '@/components/auth/ForcePasswordChangeDialog';
import { KeyboardShortcuts } from '@/components/navigation/KeyboardShortcuts';

export const ResponsiveDashboardLayout: React.FC = () => {
  const { user, loading, validateSession } = useAuth();
  const { isMobile, isTablet, isDesktop } = useSimpleBreakpoint();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [loadingTimeoutExceeded, setLoadingTimeoutExceeded] = useState(false);
  const navigate = useNavigate();

  // Smart loading timeout
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ [DASHBOARD_LAYOUT] Loading timeout exceeded');
        setLoadingTimeoutExceeded(true);
      }, 5000);

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeoutExceeded(false);
    }
  }, [loading]);

  // Show diagnostic screen if loading takes too long
  if (loading && loadingTimeoutExceeded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>مشكلة في التحميل</CardTitle>
            <CardDescription>
              استغرق تحميل التطبيق وقتاً أطول من المعتاد
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              يمكنك المحاولة مرة أخرى أو الانتقال إلى صفحة تسجيل الدخول
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  setLoadingTimeoutExceeded(false);
                  validateSession();
                }}
                className="w-full"
              >
                إعادة المحاولة
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                صفحة تسجيل الدخول
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                تحديث الصفحة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        {!isMobile && <DynamicSidebar />}
        
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
            <SheetContent side="right" className="w-80 p-0 overflow-hidden">
              <MobileSidebar />
            </SheetContent>
          </Sheet>
        )}

        <KeyboardShortcuts />
        <ForcePasswordChangeDialog />
      </div>
    </SidebarProvider>
  );
};