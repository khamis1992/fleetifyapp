import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { 
  getCompanyScopeContext, 
  getCompanyFilter, 
  hasGlobalAccess, 
  hasCompanyAdminAccess,
  hasFullCompanyControl,
  isBrowsingAsCompanyAdmin,
  canManageCompanyAsAdmin
} from '@/lib/companyScope';

/**
 * Unified hook for all company-related access control and filtering
 * Replaces scattered company_id logic across the application
 */
export const useUnifiedCompanyAccess = () => {
  const { user, session, loading } = useAuth();
  const { browsedCompany, isBrowsingMode } = useCompanyContext();
  
  // Always call useMemo with the same dependencies to ensure consistent hook order
  const result = useMemo(() => {
    // Default return object for non-authenticated states
    const defaultReturn = {
      context: { companyId: null, isSystemLevel: false, isCompanyScoped: false },
      user: null,
      companyId: null,
      isSystemLevel: false,
      isCompanyScoped: false,
      hasGlobalAccess: false,
      hasCompanyAdminAccess: false,
      hasFullCompanyControl: false,
      isBrowsingAsCompanyAdmin: false,
      canManageCompanyAsAdmin: false,
      filter: { company_id: undefined },
      canAccessCompany: () => false,
      canAccessMultipleCompanies: () => false,
      validateCompanyAccess: () => { throw new Error('Access denied: User not authenticated') },
      getFilterForOwnCompany: () => ({ company_id: undefined }),
      getFilterForGlobalView: () => ({ company_id: undefined }),
      getQueryKey: () => [],
      isBrowsingMode: false,
      browsedCompany: null,
      actualUserCompanyId: null,
      isAuthenticating: false,
      authError: 'User not authenticated'
    };

    // First check authentication state
    if (loading) {
      return {
        ...defaultReturn,
        isAuthenticating: true,
        authError: null,
        validateCompanyAccess: () => { throw new Error('Authentication required') }
      };
    }

    if (!user || !session) {
      return defaultReturn;
    }

    // Extract company_id safely - try multiple sources
    const userCompanyId = user?.company?.id || (user as any)?.company_id || null;

    const rawRoles = Array.isArray((user as any)?.roles) ? (user as any).roles : [];
    const rolesNormalized = Array.from(
      new Set(
        rawRoles.map((r: any) => String(r || '').trim().toLowerCase()).filter(Boolean)
      )
    ) as string[];

    // If in browsing mode, override context with browsed company
    let context = getCompanyScopeContext(user);
    
    // Store original user roles before modifying context
    const originalUserRoles = rolesNormalized;
    
    // Security check: Only super admins can be in browsing mode
    const canBrowse = rolesNormalized.includes('super_admin');
    const effectiveBrowsingMode = isBrowsingMode && canBrowse;
    
    // Special handling: super_admin browsing their own company should maintain system level access
    const isBrowsingOwnCompany = effectiveBrowsingMode && browsedCompany && browsedCompany.id === userCompanyId;
    
    if (effectiveBrowsingMode && browsedCompany && !isBrowsingOwnCompany) {
      context = {
        ...context,
        companyId: browsedCompany.id,
        isSystemLevel: false, // Act as if we're scoped to the browsed company
        isCompanyScoped: true
      };
    } else if (isBrowsingOwnCompany) {
      // Keep original context but update company ID to ensure consistency
      context = {
        ...context,
        companyId: browsedCompany.id
      };
    }
    
    const filter = getCompanyFilter(context, false, false); // Default: show own company only
    
    return {
      // Core context information
      context,
      user,
      
      // Company identification
      companyId: context.companyId,
      isSystemLevel: context.isSystemLevel,
      isCompanyScoped: context.isCompanyScoped,
      
      // Access control helpers
      hasGlobalAccess: hasGlobalAccess(context),
      hasCompanyAdminAccess: hasCompanyAdminAccess(context),
      hasFullCompanyControl: hasFullCompanyControl(context, isBrowsingMode, originalUserRoles),
      isBrowsingAsCompanyAdmin: isBrowsingAsCompanyAdmin(context, isBrowsingMode, originalUserRoles),
      canManageCompanyAsAdmin: canManageCompanyAsAdmin(context, isBrowsingMode, originalUserRoles),
      
      // Query filters
      filter,
      
      // Validation helpers
      canAccessCompany: (targetCompanyId?: string) => {
        if (!targetCompanyId) return false;
        if (context.isSystemLevel) return true;
        return context.companyId === targetCompanyId;
      },
      
      canAccessMultipleCompanies: () => context.isSystemLevel,
      
      // Security validation
      validateCompanyAccess: (targetCompanyId: string) => {
        if (!targetCompanyId) {
          throw new Error('Company ID is required');
        }
        if (!context.isSystemLevel && context.companyId !== targetCompanyId) {
          throw new Error('Access denied: Cannot access data from different company');
        }
      },
      
      // Filter helpers with global view control
      getFilterForOwnCompany: () => getCompanyFilter(context, true, false),
      getFilterForGlobalView: () => getCompanyFilter(context, false, true),
      
      // Query key generation for React Query
      getQueryKey: (baseKey: string[], additionalKeys: unknown[] = []) => {
        const keys = [baseKey, context.companyId, ...additionalKeys].filter(Boolean);
        return keys;
      },
      
      // Browse mode information
      isBrowsingMode: effectiveBrowsingMode,
      browsedCompany: effectiveBrowsingMode ? browsedCompany : null,
      actualUserCompanyId: user?.company?.id || null,
      
      // Authentication state
      isAuthenticating: false,
      authError: null
    };
  }, [user?.id, user?.company?.id, session?.access_token, loading, isBrowsingMode, browsedCompany?.id]);

  return result;
};

/**
 * Simplified hook for getting just the company filter
 */
export const useCompanyFilter = () => {
  const { filter } = useUnifiedCompanyAccess();
  return filter;
};

/**
 * Hook for checking if user has admin access
 */
export const useHasAdminAccess = () => {
  const { hasFullCompanyControl } = useUnifiedCompanyAccess();
  return hasFullCompanyControl;
};

/**
 * Hook for getting current company ID safely
 */
export const useCurrentCompanyId = () => {
  const { companyId } = useUnifiedCompanyAccess();
  return companyId;
};
