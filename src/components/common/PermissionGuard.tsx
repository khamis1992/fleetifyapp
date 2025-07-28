import React from 'react';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock, ShieldOff, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  feature?: string;
  role?: 'super_admin' | 'company_admin' | 'employee';
  requireCompanyAdmin?: boolean;
  requireGlobalAccess?: boolean;
  fallback?: React.ReactNode;
  showUpgradeMessage?: boolean;
  hideIfNoAccess?: boolean;
  loading?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  feature,
  role,
  requireCompanyAdmin = false,
  requireGlobalAccess = false,
  fallback,
  showUpgradeMessage = true,
  hideIfNoAccess = false,
  loading
}) => {
  const { 
    hasCompanyAdminAccess, 
    hasGlobalAccess, 
    user,
    context 
  } = useUnifiedCompanyAccess();

  const { 
    data: permissionData, 
    isLoading: permissionLoading 
  } = usePermissionCheck(permission || '');

  const { 
    data: hasFeatureAccess, 
    isLoading: featureLoading 
  } = useFeatureAccess(feature || '');

  // Determine loading state
  const isLoading = (permission && permissionLoading) || (feature && featureLoading);

  if (isLoading) {
    if (loading) return <>{loading}</>;
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  // Check role-based access
  if (role && (!user || !context.userRoles?.includes(role))) {
    return hideIfNoAccess ? null : renderAccessDenied('insufficient_role');
  }

  // Check company admin access
  if (requireCompanyAdmin && !hasCompanyAdminAccess) {
    return hideIfNoAccess ? null : renderAccessDenied('require_admin');
  }

  // Check global access
  if (requireGlobalAccess && !hasGlobalAccess) {
    return hideIfNoAccess ? null : renderAccessDenied('require_global');
  }

  // Check specific permission
  if (permission && (!permissionData?.hasPermission)) {
    return hideIfNoAccess ? null : renderAccessDenied('no_permission', permissionData?.reason);
  }

  // Check feature access
  if (feature && !hasFeatureAccess) {
    return hideIfNoAccess ? null : renderFeatureUpgrade();
  }

  // All checks passed, render children
  return <>{children}</>;

  function renderAccessDenied(type: string, reason?: string) {
    if (fallback) return <>{fallback}</>;

    const getMessage = () => {
      switch (type) {
        case 'insufficient_role':
          return 'ليس لديك الدور المطلوب للوصول لهذه الميزة';
        case 'require_admin':
          return 'تحتاج صلاحيات إدارية للوصول لهذه الميزة';
        case 'require_global':
          return 'تحتاج صلاحيات شاملة للوصول لهذه الميزة';
        case 'no_permission':
          return reason || 'ليس لديك الصلاحية المطلوبة';
        default:
          return 'غير مصرح لك بالوصول لهذه الميزة';
      }
    };

    return (
      <Card className="w-full max-w-md mx-auto border-destructive/20">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldOff className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="flex items-center gap-2 justify-center text-destructive">
            <Lock className="w-4 h-4" />
            وصول محظور
          </CardTitle>
          <CardDescription>
            {getMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex items-center gap-2 justify-center text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">تواصل مع المدير لمنحك الصلاحيات المطلوبة</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderFeatureUpgrade() {
    if (fallback) return <>{fallback}</>;
    if (!showUpgradeMessage) return null;

    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="flex items-center gap-2 justify-center">
            <Lock className="w-4 h-4" />
            ميزة محدودة
          </CardTitle>
          <CardDescription>
            هذه الميزة تتطلب ترقية خطة الاشتراك
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            للوصول إلى هذه الميزة، يرجى ترقية خطة الاشتراك الخاصة بك
          </p>
          <Button className="w-full">
            <Crown className="w-4 h-4 mr-2" />
            ترقية الخطة
          </Button>
        </CardContent>
      </Card>
    );
  }
};

// Convenience components for common use cases
export const AdminOnly: React.FC<{ children: React.ReactNode; hideIfNoAccess?: boolean }> = ({ 
  children, 
  hideIfNoAccess = true 
}) => (
  <PermissionGuard requireCompanyAdmin hideIfNoAccess={hideIfNoAccess}>
    {children}
  </PermissionGuard>
);

export const SuperAdminOnly: React.FC<{ children: React.ReactNode; hideIfNoAccess?: boolean }> = ({ 
  children, 
  hideIfNoAccess = true 
}) => (
  <PermissionGuard requireGlobalAccess hideIfNoAccess={hideIfNoAccess}>
    {children}
  </PermissionGuard>
);

export const FeatureGuard: React.FC<{ 
  feature: string; 
  children: React.ReactNode; 
  hideIfNoAccess?: boolean;
  showUpgradeMessage?: boolean;
}> = ({ 
  feature, 
  children, 
  hideIfNoAccess = false, 
  showUpgradeMessage = true 
}) => (
  <PermissionGuard 
    feature={feature} 
    hideIfNoAccess={hideIfNoAccess}
    showUpgradeMessage={showUpgradeMessage}
  >
    {children}
  </PermissionGuard>
);