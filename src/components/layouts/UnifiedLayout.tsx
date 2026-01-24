/**
 * Unified Layout Component
 * Consolidates all layout systems into a single, configurable component
 * Supports: dashboard, admin, simple variants
 * Features: Mobile responsive, RTL, Auth check, Breadcrumbs
 */

import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, Settings, LogOut, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { QuickSearch } from '@/components/navigation/QuickSearch';
import { KeyboardShortcuts } from '@/components/navigation/KeyboardShortcuts';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';
import { VerificationTaskAlert } from '@/components/notifications/VerificationTaskAlert';
import { cn } from '@/lib/utils';

// Layout Variants
export type LayoutVariant = 'dashboard' | 'admin' | 'simple';

interface UnifiedLayoutProps {
  children?: React.ReactNode;
  variant?: LayoutVariant;
  /** Custom sidebar component */
  sidebar?: React.ReactNode;
  /** Show header */
  showHeader?: boolean;
  /** Show breadcrumbs */
  showBreadcrumbs?: boolean;
  /** Require authentication */
  requireAuth?: boolean;
  /** Required roles for access */
  requiredRoles?: string[];
  /** Redirect path if not authenticated */
  authRedirect?: string;
  /** Page title for header */
  pageTitle?: string;
}

export const UnifiedLayout: React.FC<UnifiedLayoutProps> = ({
  children,
  variant = 'dashboard',
  sidebar,
  showHeader = true,
  showBreadcrumbs = true,
  requireAuth = true,
  requiredRoles = [],
  authRedirect = '/auth',
  pageTitle,
}) => {
  const { user, loading, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Auth check
  if (requireAuth && !user) {
    return <Navigate to={authRedirect} replace />;
  }

  // Role check
  if (requiredRoles.length > 0 && user) {
    const hasRequiredRole = requiredRoles.some(role => user.roles?.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Simple variant (no sidebar, minimal UI)
  if (variant === 'simple') {
    return (
      <div className="min-h-screen bg-neutral-50" dir="rtl">
        <main className="p-4 md:p-6">
          {children || <Outlet />}
        </main>
      </div>
    );
  }

  // Get variant-specific styles
  const variantStyles = {
    dashboard: {
      sidebarWidth: 'w-64',
      headerBg: 'bg-white border-b border-neutral-200',
      mainBg: 'bg-neutral-50',
    },
    admin: {
      sidebarWidth: 'w-80',
      headerBg: 'bg-card/80 backdrop-blur-xl border-b border-border/50',
      mainBg: 'bg-background',
    },
  };

  const styles = variantStyles[variant] || variantStyles.dashboard;

  return (
    <div className={cn('min-h-screen flex', styles.mainBg)} dir="rtl">
      {/* Mobile Header */}
      <div className={cn(
        'lg:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4',
        styles.headerBg
      )}>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        
        <span className="font-bold text-neutral-900">
          {pageTitle || 'Fleetify'}
        </span>
        
        <div className="flex items-center gap-2">
          <UnifiedNotificationBell />
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn('lg:hidden fixed top-0 right-0 bottom-0 z-50', styles.sidebarWidth)}
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className={cn('hidden lg:block flex-shrink-0', styles.sidebarWidth)}>
        {sidebar}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        {showHeader && (
          <header className={cn(
            'hidden lg:flex h-14 items-center justify-between px-4',
            styles.headerBg
          )}>
            <div className="flex items-center gap-3">
              {pageTitle && (
                <h1 className="text-lg font-semibold text-neutral-900">{pageTitle}</h1>
              )}
            </div>

            <div className="flex items-center gap-4">
              <QuickSearch />
              <UnifiedNotificationBell />
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-9">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-rose-500 text-white text-xs">
                        {(user?.profile?.first_name_ar || user?.profile?.first_name || 'م')[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden xl:inline">
                      {user?.profile?.first_name_ar || user?.profile?.first_name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">
                      {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.profile?.position || 'موظف'}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="ml-2 h-4 w-4" />
                    الملف الشخصي
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="ml-2 h-4 w-4" />
                    الإعدادات
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="ml-2 h-4 w-4" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}

        {/* Breadcrumbs */}
        {showBreadcrumbs && <Breadcrumbs />}

        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-auto pt-14 lg:pt-0"
        >
          <div className="p-4 md:p-6 min-h-full">
            {children || <Outlet />}
          </div>
        </motion.main>
      </div>

      {/* Global Components */}
      <KeyboardShortcuts />
      <VerificationTaskAlert />
    </div>
  );
};

// Pre-configured variants for convenience
export const DashboardLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  // Dynamically import sidebar to avoid circular dependencies
  const BentoSidebar = React.lazy(() => import('@/components/dashboard/bento/BentoSidebar'));
  
  return (
    <UnifiedLayout
      variant="dashboard"
      sidebar={
        <React.Suspense fallback={<div className="w-64 bg-white" />}>
          <BentoSidebar />
        </React.Suspense>
      }
    >
      {children}
    </UnifiedLayout>
  );
};

export const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <UnifiedLayout
      variant="admin"
      requiredRoles={['super_admin']}
      authRedirect="/super-admin"
      pageTitle="Super Admin"
    >
      {children}
    </UnifiedLayout>
  );
};

export const SimpleLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <UnifiedLayout variant="simple" requireAuth={false}>
      {children}
    </UnifiedLayout>
  );
};

export default UnifiedLayout;

