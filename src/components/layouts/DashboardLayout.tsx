import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/AppSidebar';


export const DashboardLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-soft">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background-soft" dir="rtl">
        {/* Desktop Sidebar */}
        <AppSidebar />

        {/* Mobile Header - shown only on mobile */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar-background border-b border-sidebar-border">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-lg font-bold text-sidebar-foreground">KW RentFlow</h1>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-80">
                <AppSidebar />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header with sidebar trigger - only visible on desktop */}
          <header className="hidden lg:flex items-center h-16 px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="mr-2" />
            <div className="flex-1" />
          </header>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6 lg:pt-6 pt-20">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};