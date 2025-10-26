/**
 * Protected Route with Error Boundary
 * 
 * Combines route protection with error boundaries
 * Provides both authentication and error handling
 */

import React, { Suspense, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeletonFallback } from '@/components/common/PageSkeletonFallback';

interface ProtectedRouteWithErrorBoundaryProps {
  children: ReactNode;
  routeName?: string;
  requiredRole?: 'admin' | 'super_admin' | 'user';
  fallbackPath?: string;
}

export const ProtectedRouteWithErrorBoundary: React.FC<ProtectedRouteWithErrorBoundaryProps> = ({
  children,
  routeName,
  requiredRole,
  fallbackPath = '/dashboard'
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSkeletonFallback />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Role check
  if (requiredRole) {
    const userRole = user.user_metadata?.role || 'user';
    
    if (requiredRole === 'super_admin' && userRole !== 'super_admin') {
      return <Navigate to="/dashboard" replace />;
    }

    if (requiredRole === 'admin' && !['admin', 'super_admin'].includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <RouteErrorBoundary routeName={routeName} fallbackPath={fallbackPath}>
      <Suspense fallback={<PageSkeletonFallback />}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
};

/**
 * Lazy Route with Error Boundary
 * 
 * Wraps lazy-loaded routes with error boundaries and suspense
 */
interface LazyRouteProps {
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  routeName?: string;
  fallbackPath?: string;
}

export const LazyRoute: React.FC<LazyRouteProps> = ({
  component: Component,
  routeName,
  fallbackPath
}) => {
  return (
    <RouteErrorBoundary routeName={routeName} fallbackPath={fallbackPath}>
      <Suspense fallback={<PageSkeletonFallback />}>
        <Component />
      </Suspense>
    </RouteErrorBoundary>
  );
};

/**
 * Route Error Wrapper
 * 
 * Simple wrapper to add error boundary to any route content
 */
interface RouteWrapperProps {
  children: ReactNode;
  routeName: string;
  fallbackPath?: string;
}

export const RouteWrapper: React.FC<RouteWrapperProps> = ({
  children,
  routeName,
  fallbackPath
}) => {
  return (
    <RouteErrorBoundary routeName={routeName} fallbackPath={fallbackPath}>
      {children}
    </RouteErrorBoundary>
  );
};

RouteWrapper.displayName = 'RouteWrapper';
