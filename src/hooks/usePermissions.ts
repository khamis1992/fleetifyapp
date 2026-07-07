import { useMemo } from 'react';
import {
  PERMISSION_ALIASES,
  getPermissionCandidates,
  usePermissionsCheck,
  usePermissionCheck,
} from './usePermissionCheck';
import { useFeaturesAccess, useFeatureAccess } from './useFeatureAccess';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { PERMISSIONS } from '@/types/permissions';

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
  const permissionsToCheck = useMemo(
    () => permissions.length > 0
      ? permissions
      : Array.from(new Set([...PERMISSIONS.map(permission => permission.id), ...Object.keys(PERMISSION_ALIASES)])),
    [permissions]
  );

  // Check permissions using batch hook (avoids calling hooks in loops)
  const { data: permissionResults, isLoading: permissionsLoading } = usePermissionsCheck(permissionsToCheck);

  // Check features using batch hook (avoids calling hooks in loops)
  const { data: featureResults, isLoading: featuresLoading } = useFeaturesAccess(features);

  return useMemo(() => {
    const isLoading = permissionsLoading || featuresLoading;

    // دالة hasPermission للتحقق من صلاحية معينة
    // FIXED: Now uses actual permission checking instead of always returning true
    const hasPermission = (permission: string): boolean => {
      if (!permissionResults) return false;
      const permissionCandidates = getPermissionCandidates(permission);
      const result = permissionResults.find(p => permissionCandidates.includes(p.permissionId));
      return result?.hasPermission ?? false;
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
      permissionResults?.every(result => result.hasPermission);

    if (!hasAllPermissions) {
      const failedPermission = permissionResults?.find(result => !result.hasPermission);
      return {
        hasAccess: false,
        isLoading: false,
        reason: failedPermission?.reason || 'no_permission',
        hasPermission
      };
    }

    // Check all features
    const hasAllFeatures = features.length === 0 ||
      featureResults?.every(result => result.hasAccess);

    if (!hasAllFeatures) {
      return { hasAccess: false, isLoading: false, reason: 'feature_locked', hasPermission };
    }

    return { hasAccess: true, isLoading: false, hasPermission };
  }, [
    permissionResults,
    featureResults,
    permissionsLoading,
    featuresLoading,
    hasCompanyAdminAccess,
    hasGlobalAccess,
    requireCompanyAdmin,
    requireGlobalAccess,
    permissions,
    permissionsToCheck,
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
