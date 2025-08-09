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
  const { user } = useAuth();
  const { browsedCompany, isBrowsingMode } = useCompanyContext();
  
  return useMemo(() => {
    console.log('🔧 [UNIFIED_COMPANY_ACCESS] Computing access context:', {
      userId: user?.id,
      userCompanyId: user?.company?.id,
      userRoles: user?.roles,
      isBrowsingMode,
      browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null
    });

    // If in browsing mode, override context with browsed company
    let context = getCompanyScopeContext(user);
    
    console.log('🔧 [UNIFIED_COMPANY_ACCESS] Original context:', {
      companyId: context.companyId,
      isSystemLevel: context.isSystemLevel,
      isCompanyScoped: context.isCompanyScoped,
      userRoles: context.user?.roles
    });
    
    // Store original user roles before modifying context
    const originalUserRoles = user?.roles || [];
    
    if (isBrowsingMode && browsedCompany && user?.roles?.includes('super_admin')) {
      console.log('🔧 [UNIFIED_COMPANY_ACCESS] Overriding context for browse mode');
      context = {
        ...context,
        companyId: browsedCompany.id,
        isSystemLevel: false, // Act as if we're scoped to the browsed company
        isCompanyScoped: true
      };
      
      console.log('🔧 [UNIFIED_COMPANY_ACCESS] New context for browse mode:', {
        companyId: context.companyId,
        isSystemLevel: context.isSystemLevel,
        isCompanyScoped: context.isCompanyScoped
      });
    }
    
    const filter = getCompanyFilter(context);
    
    console.log('🔧 [UNIFIED_COMPANY_ACCESS] Final filter:', filter);
    
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
      
      // Query key generation for React Query
      getQueryKey: (baseKey: string[], additionalKeys: unknown[] = []) => {
        const keys = [baseKey, context.companyId, ...additionalKeys].filter(Boolean);
        return keys;
      },
      
      // Browse mode information
      isBrowsingMode,
      browsedCompany,
      actualUserCompanyId: user?.company?.id || null
    };
  }, [user, isBrowsingMode, browsedCompany]);
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