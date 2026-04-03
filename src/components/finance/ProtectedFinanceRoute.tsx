import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useModuleAccess } from '@/modules/core/hooks/useModuleConfig';
import { FinanceErrorBoundary } from './FinanceErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Building, Settings } from 'lucide-react';

interface ProtectedFinanceRouteProps {
  children: React.ReactNode;
  permission?: string;
  requireModule?: boolean;
  title?: string;
}

export const ProtectedFinanceRoute: React.FC<ProtectedFinanceRouteProps> = ({ 
  children, 
  permission = 'finance.view',
  requireModule = true,
  title = "الصفحة المحاسبية"
}) => {
  const { user } = useAuth();
  const { companyId, hasCompanyAdminAccess } = useUnifiedCompanyAccess();
  const { hasAccess: hasModuleAccess, isLoading: moduleLoading } = useModuleAccess('finance');
  const permissionCheck = usePermissionCheck(permission);
  
  const [error, setError] = useState<Error | null>(null);

  // Stable references to prevent infinite loops
  const hasPermission = permissionCheck.data?.hasPermission ?? false;
  const permIsLoading = permissionCheck.isLoading;
  const permError = permissionCheck.error;
  const hasModule = hasModuleAccess;
  const modLoading = moduleLoading;

  // Basic auth check
  const hasBasicAuth = !!user && !!companyId;
  const hasAllPermissions = !modLoading && !permIsLoading && (hasPermission || hasCompanyAdminAccess);
  const isLoading = !hasBasicAuth || modLoading || permIsLoading;

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading only if no basic auth yet
  if (isLoading && !hasBasicAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // Permission error checks (computed, not in useEffect — no infinite loop)
  if (!companyId) {
    error !== undefined || setError(new Error('لا توجد بيانات شركة مرتبطة بحسابك. يرجى التواصل مع المدير.'));
    return (
      <FinanceErrorBoundary error={error} onRetry={() => setError(null)} title={`خطأ في الوصول إلى ${title}`}>
        {children}
      </FinanceErrorBoundary>
    );
  }

  if (requireModule && !modLoading && !hasModule) {
    setError(new Error('الوحدة المحاسبية غير مفعلة لشركتك.'));
    return (
      <FinanceErrorBoundary error={error} onRetry={() => setError(null)} title={`خطأ في الوصول إلى ${title}`}>
        {children}
      </FinanceErrorBoundary>
    );
  }

  if (!permIsLoading && permError) {
    setError(new Error(`خطأ في التحقق من الصلاحيات: ${permError.message}`));
    return (
      <FinanceErrorBoundary error={error} onRetry={() => setError(null)} title={`خطأ في الوصول إلى ${title}`}>
        {children}
      </FinanceErrorBoundary>
    );
  }

  if (!permIsLoading && !hasPermission && !hasCompanyAdminAccess) {
    setError(new Error(`ليس لديك صلاحية "${permission}".`));
    return (
      <FinanceErrorBoundary error={error} onRetry={() => setError(null)} title={`خطأ في الوصول إلى ${title}`}>
        {children}
      </FinanceErrorBoundary>
    );
  }

  // All checks passed — render children
  return (
    <FinanceErrorBoundary
      error={null}
      isLoading={false}
      title={`خطأ في الوصول إلى ${title}`}
    >
      {children}
    </FinanceErrorBoundary>
  );
};