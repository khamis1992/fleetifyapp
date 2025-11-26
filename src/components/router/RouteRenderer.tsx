/**
 * Route Renderer Component
 * Handles route rendering with lazy loading, error boundaries, and layout management
 */

import React, { Suspense, useEffect, useState } from 'react';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { RouteConfig } from '@/routes/types';
import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';
import { LazyLoadErrorBoundary } from '@/components/common/LazyLoadErrorBoundary';
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary';
import { RouteWrapper } from '@/components/common/RouteWrapper';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AdminRoute } from '@/components/common/ProtectedRoute';
import { SuperAdminRoute } from '@/components/common/ProtectedRoute';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { CompanyBrowserLayout } from '@/components/layouts/CompanyBrowserLayout';

interface RouteRendererProps {
  routes: RouteConfig[];
  fallback?: React.ComponentType;
  errorBoundary?: React.ComponentType<{ error: Error; retry: () => void }>;
}

const RouteRenderer: React.FC<RouteRendererProps> = ({
  routes,
  fallback: FallbackComponent = PageSkeletonFallback,
  errorBoundary: ErrorBoundaryComponent = RouteErrorBoundary,
}) => {
  const location = useLocation();
  const [routeConfig, setRouteConfig] = useState<RouteConfig | undefined>();

  // Find current route configuration
  useEffect(() => {
    const currentRoute = routes.find(route => {
      // Handle wildcard route (404)
      if (route.path === '*') return false;
      const pathPattern = route.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pathPattern}$`);
      return regex.test(location.pathname);
    });
    setRouteConfig(currentRoute);
  }, [location.pathname, routes]);

  const renderRoute = (route: RouteConfig) => {
    const Component = route.component;
    const isLazy = route.lazy;
    const isProtected = route.protected;
    const requiredRole = route.requiredRole;
    const layout = route.layout || 'none';

    // Route protection wrapper
    let ProtectedComponent = Component;
    if (isProtected) {
      if (requiredRole === 'super_admin') {
        ProtectedComponent = () => (
          <SuperAdminRoute>
            <Component />
          </SuperAdminRoute>
        );
      } else if (requiredRole === 'admin') {
        ProtectedComponent = () => (
          <AdminRoute>
            <Component />
          </AdminRoute>
        );
      } else {
        ProtectedComponent = () => (
          <ProtectedRoute>
            <Component />
          </ProtectedRoute>
        );
      }
    }

    // Layout wrapper
    const WithLayout = () => {
      switch (layout) {
        case 'dashboard':
          return (
            <DashboardLayout>
              <LazyLoadErrorBoundary>
                <Suspense fallback={<FallbackComponent />}>
                  <RouteWrapper route={route}>
                    <ProtectedComponent />
                  </RouteWrapper>
                </Suspense>
              </LazyLoadErrorBoundary>
            </DashboardLayout>
          );
        case 'admin':
          return (
            <SuperAdminLayout>
              <LazyLoadErrorBoundary>
                <Suspense fallback={<FallbackComponent />}>
                  <RouteWrapper route={route}>
                    <ProtectedComponent />
                  </RouteWrapper>
                </Suspense>
              </LazyLoadErrorBoundary>
            </SuperAdminLayout>
          );
        case 'company':
          return (
            <CompanyBrowserLayout>
              <LazyLoadErrorBoundary>
                <Suspense fallback={<FallbackComponent />}>
                  <RouteWrapper route={route}>
                    <ProtectedComponent />
                  </RouteWrapper>
                </Suspense>
              </LazyLoadErrorBoundary>
            </CompanyBrowserLayout>
          );
        default:
          return (
            <LazyLoadErrorBoundary>
              <Suspense fallback={<FallbackComponent />}>
                <RouteWrapper route={route}>
                  <ProtectedComponent />
                </RouteWrapper>
              </Suspense>
            </LazyLoadErrorBoundary>
          );
      }
    };

    return <WithLayout />;
  };

  return (
    <ErrorBoundaryComponent>
      <Routes>
        {routes
          .sort((a, b) => a.priority - b.priority)
          .map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={renderRoute(route)}
              exact={route.exact}
            />
          ))}

        {/* Redirect for root path if not handled */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* 404 fallback - should be last */}
        <Route
          path="*"
          element={
            <LazyLoadErrorBoundary>
              <Suspense fallback={<FallbackComponent />}>
                <RouteWrapper route={{
                  path: '*',
                  component: () => React.createElement('div'),
                  lazy: false,
                  exact: false,
                  title: 'Not Found',
                  description: 'Page not found',
                  group: 'public',
                  priority: 999,
                }}>
                  <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-lg text-gray-600 mb-8">Page not found</p>
                      <a
                        href="/dashboard"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Go to Dashboard
                      </a>
                    </div>
                  </div>
                </RouteWrapper>
              </Suspense>
            </LazyLoadErrorBoundary>
          }
        />
      </Routes>
    </ErrorBoundaryComponent>
  );
};

export default RouteRenderer;