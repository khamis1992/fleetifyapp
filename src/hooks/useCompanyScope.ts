import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCompanyScopeContext, type CompanyScopeContext } from '@/lib/companyScope';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

/**
 * @deprecated Use useUnifiedCompanyAccess instead for better performance and security
 * Hook to get the current user's company scope information
 */
export const useCompanyScope = (): CompanyScopeContext => {
  const { user } = useAuth();
  
  return useMemo(() => getCompanyScopeContext(user), [user]);
};

/**
 * @deprecated Use useUnifiedCompanyAccess instead
 * Hook to check if the current user has global (system-level) access
 */
export const useHasGlobalAccess = (): boolean => {
  const { hasGlobalAccess } = useUnifiedCompanyAccess();
  return hasGlobalAccess;
};

/**
 * @deprecated Use useUnifiedCompanyAccess instead
 * Hook to check if the current user has company admin access
 */
export const useHasCompanyAdminAccess = (): boolean => {
  const { hasCompanyAdminAccess } = useUnifiedCompanyAccess();
  return hasCompanyAdminAccess;
};

/**
 * @deprecated Use useUnifiedCompanyAccess instead
 * Hook to get the company filter for data queries
 */
export const useCompanyFilter = (): { company_id?: string } => {
  const { filter } = useUnifiedCompanyAccess();
  return filter;
};