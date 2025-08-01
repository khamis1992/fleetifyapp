import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCompanyScopeContext, getCompanyFilter, hasGlobalAccess, hasCompanyAdminAccess } from '@/lib/companyScope';

/**
 * Unified hook for all company-related access control and filtering
 * Replaces scattered company_id logic across the application
 */
export const useUnifiedCompanyAccess = () => {
  const { user, loading } = useAuth();
  
  return useMemo(() => {
    // Add debug logging for company access
    console.log('🏢 [COMPANY_ACCESS] User data:', {
      user: !!user,
      loading,
      profile: user?.profile,
      company: user?.company,
      roles: user?.roles
    });

    // Check if we're still loading or user data is incomplete
    const isUserDataIncomplete = !user || loading || (!user.profile?.company_id && !user.company?.id);
    
    if (isUserDataIncomplete) {
      console.log('🏢 [COMPANY_ACCESS] User data incomplete, returning loading state');
      return {
        // Core context information
        context: {
          user: null,
          userRoles: [],
          companyId: undefined,
          isSystemLevel: false,
          isCompanyScoped: false
        },
        user: null,
        loading: true,
        
        // Company identification
        companyId: undefined,
        isSystemLevel: false,
        isCompanyScoped: false,
        
        // Access control helpers
        hasGlobalAccess: false,
        hasCompanyAdminAccess: false,
        
        // Query filters - safe fallback
        filter: { company_id: 'loading' },
        
        // Validation helpers
        canAccessCompany: () => false,
        canAccessMultipleCompanies: () => false,
        
        // Security validation
        validateCompanyAccess: () => {
          throw new Error('User data still loading, please wait');
        },
        
        // Query key generation for React Query
        getQueryKey: (baseKey: string[], additionalKeys: unknown[] = []) => {
          return [baseKey, 'loading', ...additionalKeys].filter(Boolean);
        }
      };
    }

    const context = getCompanyScopeContext(user);
    const filter = getCompanyFilter(context);
    
    console.log('🏢 [COMPANY_ACCESS] Context created:', {
      companyId: context.companyId,
      isSystemLevel: context.isSystemLevel,
      filter
    });
    
    return {
      // Core context information
      context,
      user,
      loading: false,
      
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
  }, [user, loading]);
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