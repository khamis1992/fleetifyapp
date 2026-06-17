import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PermissionGuard } from './PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyIdWithInit } from '@/hooks/useUnifiedCompanyAccess';
import { Skeleton } from '@/components/ui/skeleton';
import { LazyLoadErrorBoundary } from './LazyLoadErrorBoundary';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
  feature?: string;
  role?: 'super_admin' | 'company_admin' | 'employee';
  requireCompanyAdmin?: boolean;
  requireGlobalAccess?: boolean;
  redirectTo?: string;
  showFallback?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  feature,
  role,
  requireCompanyAdmin = false,
  requireGlobalAccess = false,
  redirectTo = '/dashboard',
  showFallback = false
}) => {
  const { user, loading } = useAuth();
  const { isInitializing } = useCompanyIdWithInit();
  const location = useLocation();

  const isBusy = loading || isInitializing;

  if (isBusy && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6" dir="rtl">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 rounded-xl bg-teal-500 flex items-center justify-center shadow-lg mx-auto">
            <span className="text-white font-bold text-3xl">F</span>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
          <p className="text-sm text-slate-400">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const isMobileRoute = location.pathname.startsWith('/mobile');
    const authPath = isMobileRoute ? '/mobile' : '/auth';
    return <Navigate to={authPath} state={{ from: location }} replace />;
  }

  return (
    <PermissionGuard
      permission={permission}
      feature={feature}
      role={role}
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
