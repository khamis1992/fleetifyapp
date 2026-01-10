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
  const hasMountedRef = React.useRef(false);

  // Mark that component has mounted at least once
  React.useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  // CRITICAL FIX: Reduce timeout to 1.5s and improve the timeout logic
  // This prevents navigation from hanging when loading state gets stuck
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || isInitializing) {
        console.warn('[ProtectedRoute] Initialization timeout - forcing render', {
          loading,
          isInitializing,
          companyId,
          path: location.pathname
        });
        setHasTimedOut(true);
      }
    }, 1500); // Reduced from 3000ms to 1500ms for faster response

    return () => clearTimeout(timer);
  }, [loading, isInitializing, companyId, location.pathname]);

  // CRITICAL FIX: Don't show loading if we already have a user
  // This prevents unnecessary loading spinners during navigation
  const shouldShowLoading = (loading || isInitializing) && !hasTimedOut && !user && !hasMountedRef.current;

  if (shouldShowLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
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