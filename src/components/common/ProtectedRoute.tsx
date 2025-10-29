import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PermissionGuard } from './PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { LazyLoadErrorBoundary } from './LazyLoadErrorBoundary';

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
  const location = useLocation();

  // Show loading while authenticating
  if (loading) {
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