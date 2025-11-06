/**
 * Company Hooks Index
 * 
 * Replaces the monolithic useUnifiedCompanyAccess with specialized hooks.
 * Import from here for better tree-shaking and performance.
 */

// Core company access
export {
  useCompanyAccess,
  useCurrentCompanyId,
  useCompanyFilter
} from './useCompanyAccess';

// Permission management
export {
  useCompanyPermissions,
  useHasAdminAccess,
  useHasGlobalAccess,
  useIsSystemLevel,
  useUserRoles
} from './useCompanyPermissions';

// Data filtering
export {
  useCompanyFiltering,
  useCompanyQueryKey,
  useCanAccessCompany
} from './useCompanyFiltering';

// Browsing mode
export {
  useBrowsingMode,
  useEffectiveCompanyId
} from './useBrowsingMode';

/**
 * Usage Examples:
 * 
 * // Before (monolithic):
 * const {
 *   companyId,
 *   hasGlobalAccess,
 *   filter,
 *   isBrowsingMode,
 *   filteredData
 * } = useUnifiedCompanyAccess();
 * 
 * // After (specialized):
 * import {
 *   useCompanyAccess,
 *   useCompanyPermissions,
 *   useCompanyFiltering,
 *   useBrowsingMode
 * } from '@/hooks/company';
 * 
 * const { companyId } = useCompanyAccess();
 * const { hasGlobalAccess } = useCompanyPermissions();
 * const { filter } = useCompanyFiltering(data);
 * const { isBrowsingMode } = useBrowsingMode();
 * 
 * Benefits:
 * - Better performance (only subscribe to what you need)
 * - Better tree-shaking
 * - Easier to test
 * - More maintainable
 * - React Query caching for company data
 */

/**
 * Legacy compatibility wrapper
 * Use this for gradual migration from useUnifiedCompanyAccess
 */
export function useUnifiedCompanyAccessLegacy() {
  const { company, companyId, companyName, currency, isLoading, isAuthenticated } = useCompanyAccess();
  const {
    hasGlobalAccess,
    hasCompanyAdminAccess,
    hasFullCompanyControl,
    isBrowsingAsCompanyAdmin,
    canManageCompanyAsAdmin,
    isSystemLevel,
    isCompanyScoped,
    userRoles,
    canAccessCompany,
    canAccessMultipleCompanies,
    validateCompanyAccess
  } = useCompanyPermissions();
  const { filter, getFilterForOwnCompany, getFilterForGlobalView } = useCompanyFiltering([]);
  const { 
    isBrowsingMode, 
    browsedCompany, 
    actualUserCompanyId 
  } = useBrowsingMode();

  return {
    // Company info
    company,
    companyId,
    companyName,
    currency,
    
    // Permissions
    hasGlobalAccess,
    hasCompanyAdminAccess,
    hasFullCompanyControl,
    isBrowsingAsCompanyAdmin,
    canManageCompanyAsAdmin,
    isSystemLevel,
    isCompanyScoped,
    userRoles,
    
    // Filters
    filter,
    getFilterForOwnCompany,
    getFilterForGlobalView,
    
    // Access control
    canAccessCompany,
    canAccessMultipleCompanies,
    validateCompanyAccess,
    
    // Browsing
    isBrowsingMode,
    browsedCompany,
    actualUserCompanyId,
    
    // State
    isLoading,
    isAuthenticated
  };
}

