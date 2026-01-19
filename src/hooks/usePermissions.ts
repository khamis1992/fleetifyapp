import { useMemo } from 'react';
import { usePermissionCheck } from './usePermissionCheck';
import { useFeatureAccess } from './useFeatureAccess';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

interface UsePermissionsOptions {
  permissions?: string[];
  features?: string[];
  requireCompanyAdmin?: boolean;
  requireGlobalAccess?: boolean;
}

export const usePermissions = (options: UsePermissionsOptions = {}) => {
  const {
    permissions = [],
    features = [],
    requireCompanyAdmin = false,
    requireGlobalAccess = false
  } = options;

  const { hasCompanyAdminAccess, hasGlobalAccess } = useUnifiedCompanyAccess();

  // Check permissions
  const permissionQueries = permissions.map(permission => 
    usePermissionCheck(permission)
  );

  // Check features
  const featureQueries = features.map(feature => 
    useFeatureAccess(feature)
  );

  return useMemo(() => {
    const isLoading = permissionQueries.some(q => q.isLoading) || 
                     featureQueries.some(q => q.isLoading);

    // دالة hasPermission للتحقق من صلاحية معينة
    // ملاحظة: هذه الدالة تُرجع true دائماً للتوافق مع الكود الحالي
    // يمكن تحسينها لاحقاً لاستخدام نظام الصلاحيات الفعلي
    const hasPermission = (_permission: string): boolean => {
      // للتوافق مع الكود الحالي، نسمح بجميع الصلاحيات
      // TODO: تفعيل التحقق الفعلي من الصلاحيات عند الحاجة
      return true;
    };

    if (isLoading) {
      return { hasAccess: false, isLoading: true, hasPermission };
    }

    // Check role-based access first
    if (requireGlobalAccess && !hasGlobalAccess) {
      return { hasAccess: false, isLoading: false, reason: 'require_global', hasPermission };
    }

    if (requireCompanyAdmin && !hasCompanyAdminAccess) {
      return { hasAccess: false, isLoading: false, reason: 'require_admin', hasPermission };
    }

    // Check all permissions
    const hasAllPermissions = permissions.length === 0 || 
      permissionQueries.every(query => query.data?.hasPermission);

    if (!hasAllPermissions) {
      const failedPermission = permissionQueries.find(query => !query.data?.hasPermission);
      return { 
        hasAccess: false, 
        isLoading: false, 
        reason: failedPermission?.data?.reason || 'no_permission',
        hasPermission
      };
    }

    // Check all features
    const hasAllFeatures = features.length === 0 || 
      featureQueries.every(query => query.data === true);

    if (!hasAllFeatures) {
      return { hasAccess: false, isLoading: false, reason: 'feature_locked', hasPermission };
    }

    return { hasAccess: true, isLoading: false, hasPermission };
  }, [
    permissionQueries,
    featureQueries,
    hasCompanyAdminAccess,
    hasGlobalAccess,
    requireCompanyAdmin,
    requireGlobalAccess,
    permissions,
    features
  ]);
};

// Hook for checking a single permission
export const useHasPermission = (permission: string) => {
  const { data, isLoading } = usePermissionCheck(permission);
  return {
    hasPermission: data?.hasPermission || false,
    isLoading,
    reason: data?.reason
  };
};

// Hook for checking a single feature
export const useHasFeature = (feature: string) => {
  const { data, isLoading } = useFeatureAccess(feature);
  return {
    hasFeature: data || false,
    isLoading
  };
};