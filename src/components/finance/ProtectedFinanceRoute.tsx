import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useModuleAccess } from '@/modules/core/hooks/useModuleConfig';
import { FinanceErrorBoundary } from './FinanceErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useQueryClient } from '@tanstack/react-query';

interface ProtectedFinanceRouteProps {
  children: React.ReactNode;
  permission?: string;
  requireModule?: boolean;
  title?: string;
}

export const ProtectedFinanceRoute = ({
  children,
  permission = 'finance.view',
  requireModule = true,
  title = 'الصفحة المحاسبية',
}: ProtectedFinanceRouteProps) => {
  const { user, loading } = useAuth();
  const { companyId, hasCompanyAdminAccess, isAuthenticating } = useUnifiedCompanyAccess();
  const { hasAccess, isLoading: moduleLoading } = useModuleAccess('finance');
  const permissionCheck = usePermissionCheck(permission);
  const queryClient = useQueryClient();

  if (
    loading ||
    isAuthenticating ||
    (user && (permissionCheck.isLoading || (requireModule && moduleLoading)))
  ) {
    return (
      <div role="status" className="flex min-h-[300px] items-center justify-center gap-3">
        <span aria-hidden="true">
          <LoadingSpinner size="lg" />
        </span>
        <span>جاري التحقق من الصلاحيات...</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const message = !companyId
    ? 'لا توجد شركة محددة للوصول إلى النظام المالي.'
    : permissionCheck.error
    ? 'تعذر التحقق من الصلاحيات. أعد المحاولة.'
    : requireModule && !hasAccess
    ? 'الوحدة المحاسبية غير مفعلة لشركتك.'
    : !permissionCheck.data?.hasPermission && !hasCompanyAdminAccess
    ? 'ليس لديك صلاحية الوصول إلى هذه الصفحة.'
    : null;

  return (
    <FinanceErrorBoundary
      error={message ? new Error(message) : null}
      onRetry={() => {
        for (const key of ['user-permissions-check', 'company', 'module-settings']) {
          void queryClient.invalidateQueries({ queryKey: [key] });
        }
      }}
      title={title}
    >
      {message ? null : children}
    </FinanceErrorBoundary>
  );
};
