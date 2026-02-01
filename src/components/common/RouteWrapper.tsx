/**
 * Protected Route with Error Boundary
 * 
 * Combines route protection with error boundaries
 * Provides both authentication and error handling
 */

import React, { Suspense, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { PageSkeletonFallback } from './LazyPageWrapper';

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
    // Mobile routes should redirect to mobile login page
    const isMobileRoute = window.location.pathname.startsWith('/mobile');
    const authPath = isMobileRoute ? '/mobile' : '/auth';
    return <Navigate to={authPath} replace />;
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

/**
 * Route Key Wrapper
 * 
 * Forces component remount on route change by adding a key based on location.pathname
 * This ensures components reload properly when navigating between pages
 */
interface RouteKeyWrapperProps {
  children: ReactNode;
  routeName?: string;
  fallbackPath?: string;
}

export const RouteKeyWrapper: React.FC<RouteKeyWrapperProps> = ({
  children,
  routeName,
  fallbackPath
}) => {
  const location = useLocation();
  
  // Use location.pathname as key to force remount on navigation
  const routeKey = location.pathname + location.search;
  
  return (
    <RouteErrorBoundary routeName={routeName} fallbackPath={fallbackPath}>
      <div key={routeKey}>
        {children}
      </div>
    </RouteErrorBoundary>
  );
};

RouteWrapper.displayName = 'RouteWrapper';
