import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PermissionGuard } from './PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyIdWithInit } from '@/hooks/useUnifiedCompanyAccess';
import { Skeleton } from '@/components/ui/skeleton';
import { LazyLoadErrorBoundary } from './LazyLoadErrorBoundary';

/**
 * ProtectedRoute - Route protection with safety timeout
 *
 * CRITICAL FIX: Added 3-second timeout to prevent infinite loading
 * when React Query or auth/company initialization hangs during navigation.
 *
 * @see App.tsx networkMode: 'always' - Primary fix for query hanging
 */

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
  feature?: string;
  requireCompanyAdmin?: boolean;
  requireGlobalAccess?: boolean;
  redirectTo?: string;
  showFallback?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  feature,
  requireCompanyAdmin = false,
  requireGlobalAccess = false,
  redirectTo = '/dashboard',
  showFallback = false
}) => {
  const { user, loading } = useAuth();
  const { companyId, isInitializing } = useCompanyIdWithInit();
  const location = useLocation();
  const [hasTimedOut, setHasTimedOut] = React.useState(false);

  // CRITICAL FIX: Simplified timeout logic
  // Only start timeout if actually loading and no user
  React.useEffect(() => {
    // Don't set timeout if we already have a user - navigation should be instant
    if (user) {
      setHasTimedOut(false);
      return;
    }
    
    // Only set timeout for initial auth loading, not during navigation
    if (!loading && !isInitializing) {
      return;
    }
    
    const timer = setTimeout(() => {
      console.warn('[ProtectedRoute] Initialization timeout - forcing render', {
        loading,
        isInitializing,
        path: location.pathname
      });
      setHasTimedOut(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [loading, isInitializing, user, location.pathname]);

  // CRITICAL FIX: Simplified loading check
  // If we have a user, NEVER show loading - this is the key fix for navigation
  
  // DEBUG: Log state for mobile routes
  if (location.pathname.startsWith('/mobile')) {
    console.log('🛡️ [ProtectedRoute] Mobile route check:', {
      path: location.pathname,
      user: !!user,
      loading,
      isInitializing,
      hasTimedOut
    });
  }
  
  if (user) {
    // User exists - proceed immediately, don't wait for anything
    console.log('✅ [ProtectedRoute] User authenticated, allowing access to:', location.pathname);
  } else if ((loading || isInitializing) && !hasTimedOut) {
    // Only show loading if no user AND auth is still loading
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  } else if (!user) {
    // Not loading, no user - redirect to appropriate auth page
    // Mobile routes should redirect to mobile login page
    const isMobileRoute = location.pathname.startsWith('/mobile');
    const authPath = isMobileRoute ? '/mobile' : '/auth';
    console.warn('❌ [ProtectedRoute] No user found, redirecting to:', authPath, 'from:', location.pathname);
    return <Navigate to={authPath} state={{ from: location }} replace />;
  }

  // If no company ID, redirect to dashboard (not onboarding)
  // Onboarding should only be accessed manually from landing page
  // The dashboard will handle showing appropriate content for users without a company

  // Check permissions using PermissionGuard
  return (
    <PermissionGuard
      permission={permission}
      feature={feature}
      requireCompanyAdmin={requireCompanyAdmin}
      requireGlobalAccess={requireGlobalAccess}
      fallback={
        showFallback ? undefined : <Navigate to={redirectTo} replace />
      }
      hideIfNoAccess={!showFallback}
    >
      {children}
    </PermissionGuard>
  );
};

// Convenience components for common route protection patterns
export const AdminRoute: React.FC<{ children: React.ReactNode; redirectTo?: string }> = ({ 
  children, 
  redirectTo = '/dashboard' 
}) => (
  <ProtectedRoute requireCompanyAdmin redirectTo={redirectTo}>
    <LazyLoadErrorBoundary>
      {children}
    </LazyLoadErrorBoundary>
  </ProtectedRoute>
);

export const SuperAdminRoute: React.FC<{ children: React.ReactNode; redirectTo?: string }> = ({ 
  children, 
  redirectTo = '/dashboard' 
}) => (
  <ProtectedRoute requireGlobalAccess redirectTo={redirectTo}>
    <LazyLoadErrorBoundary>
      {children}
    </LazyLoadErrorBoundary>
  </ProtectedRoute>
);

export const FeatureRoute: React.FC<{ 
  children: React.ReactNode; 
  feature: string; 
  redirectTo?: string;
  showFallback?: boolean;
}> = ({ 
  children, 
  feature, 
  redirectTo = '/dashboard',
  showFallback = true 
}) => (
  <ProtectedRoute feature={feature} redirectTo={redirectTo} showFallback={showFallback}>
    {children}
  </ProtectedRoute>
);