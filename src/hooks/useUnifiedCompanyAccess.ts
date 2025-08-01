import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCompanyScopeContext, getCompanyFilter, hasGlobalAccess, hasCompanyAdminAccess } from '@/lib/companyScope';

/**
 * Unified hook for all company-related access control and filtering
 * Replaces scattered company_id logic across the application
 */
export const useUnifiedCompanyAccess = () => {
  const { user } = useAuth();
  
  return useMemo(() => {
    const context = getCompanyScopeContext(user);
    const filter = getCompanyFilter(context);
    
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
      }
    };
  }, [user]);
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
  const { hasCompanyAdminAccess } = useUnifiedCompanyAccess();
  return hasCompanyAdminAccess;
};

/**
 * Hook for getting current company ID safely
 */
export const useCurrentCompanyId = () => {
  const { companyId } = useUnifiedCompanyAccess();
  return companyId;
};