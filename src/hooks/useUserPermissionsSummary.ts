import { useMemo } from 'react';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { usePermissionCheck } from './usePermissionCheck';
import { useFeatureAccess } from './useFeatureAccess';

// Define module permissions
const MODULE_PERMISSIONS = {
  fleet: 'fleet.read',
  finance: 'finance.read', 
  hr: 'hr.read',
  contracts: 'contracts.read',
  customers: 'customers.read',
  legal: 'legal.read',
  reports: 'reports.read'
} as const;

const ADMIN_PERMISSIONS = {
  approvals: 'admin.approvals.read',
  backup: 'admin.backup.read',
  audit: 'admin.audit.read',
  settings: 'admin.settings.read'
} as const;

export const useUserPermissionsSummary = () => {
  const { hasCompanyAdminAccess, hasGlobalAccess, user, context } = useUnifiedCompanyAccess();

  // Check module permissions
  const modulePermissionQueries = Object.entries(MODULE_PERMISSIONS).map(([module, permission]) => ({
    module,
    query: usePermissionCheck(permission)
  }));

  // Check admin permissions
  const adminPermissionQueries = Object.entries(ADMIN_PERMISSIONS).map(([feature, permission]) => ({
    feature,
    query: usePermissionCheck(permission)
  }));

  // Check feature access
  const featureQueries = [
    { feature: 'advanced_reports', query: useFeatureAccess('advanced_reports') },
    { feature: 'multi_company', query: useFeatureAccess('multi_company') },
    { feature: 'api_access', query: useFeatureAccess('api_access') }
  ];

  return useMemo(() => {
    const isLoading = modulePermissionQueries.some(q => q.query.isLoading) ||
                     adminPermissionQueries.some(q => q.query.isLoading) ||
                     featureQueries.some(q => q.query.isLoading);

    if (isLoading) {
      return { isLoading: true };
    }

    // Build permissions summary
    const modules = modulePermissionQueries.reduce((acc, { module, query }) => {
      acc[module] = {
        hasAccess: query.data?.hasPermission || false,
        reason: query.data?.reason
      };
      return acc;
    }, {} as Record<string, { hasAccess: boolean; reason?: string }>);

    const adminFeatures = adminPermissionQueries.reduce((acc, { feature, query }) => {
      acc[feature] = {
        hasAccess: query.data?.hasPermission || false,
        reason: query.data?.reason
      };
      return acc;
    }, {} as Record<string, { hasAccess: boolean; reason?: string }>);

    const features = featureQueries.reduce((acc, { feature, query }) => {
      acc[feature] = {
        hasAccess: query.data || false
      };
      return acc;
    }, {} as Record<string, { hasAccess: boolean }>);

    // Calculate user role summary
    const roles = {
      isSuperAdmin: hasGlobalAccess,
      isCompanyAdmin: hasCompanyAdminAccess,
      isEmployee: !hasCompanyAdminAccess && !hasGlobalAccess,
      userRoles: context.userRoles || []
    };

    // Calculate accessible sections
    const accessibleSections = {
      canAccessFleet: modules.fleet?.hasAccess || hasCompanyAdminAccess,
      canAccessFinance: modules.finance?.hasAccess || hasCompanyAdminAccess,
      canAccessHR: modules.hr?.hasAccess || hasCompanyAdminAccess,
      canAccessContracts: modules.contracts?.hasAccess || true, // Basic access for all users
      canAccessCustomers: modules.customers?.hasAccess || true, // Basic access for all users
      canAccessLegal: modules.legal?.hasAccess || hasCompanyAdminAccess,
      canAccessReports: modules.reports?.hasAccess || hasCompanyAdminAccess,
      canAccessAdmin: hasCompanyAdminAccess,
      canAccessSystemSettings: hasGlobalAccess
    };

    return {
      isLoading: false,
      user,
      roles,
      modules,
      adminFeatures,
      features,
      accessibleSections,
      companyId: context.companyId,
      hasAnyAccess: Object.values(accessibleSections).some(Boolean)
    };
  }, [
    modulePermissionQueries,
    adminPermissionQueries,
    featureQueries,
    hasCompanyAdminAccess,
    hasGlobalAccess,
    user,
    context
  ]);
};