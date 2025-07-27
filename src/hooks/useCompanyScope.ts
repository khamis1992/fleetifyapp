import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCompanyScopeContext, type CompanyScopeContext } from '@/lib/companyScope';

/**
 * Hook to get the current user's company scope information
 */
export const useCompanyScope = (): CompanyScopeContext => {
  const { user } = useAuth();
  
  return useMemo(() => getCompanyScopeContext(user), [user]);
};

/**
 * Hook to check if the current user has global (system-level) access
 */
export const useHasGlobalAccess = (): boolean => {
  const context = useCompanyScope();
  return context.isSystemLevel;
};

/**
 * Hook to check if the current user has company admin access
 */
export const useHasCompanyAdminAccess = (): boolean => {
  const context = useCompanyScope();
  return context.isSystemLevel || context.isCompanyScoped;
};

/**
 * Hook to get the company filter for data queries
 */
export const useCompanyFilter = (): { company_id?: string } => {
  const context = useCompanyScope();
  
  if (context.isSystemLevel) {
    // Super admin can see all companies
    return {};
  }
  
  if (context.companyId) {
    // All other users are limited to their company
    return { company_id: context.companyId };
  }
  
  // Fallback: no access if no company association
  return { company_id: 'no-access' };
};