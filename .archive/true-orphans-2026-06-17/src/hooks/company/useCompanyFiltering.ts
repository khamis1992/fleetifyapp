/**
 * useCompanyFiltering Hook
 * 
 * Handles data filtering based on company scope.
 * Replaces: filter logic from useUnifiedCompanyAccess
 */

import { useMemo } from 'react';
import { useCompanyAccess } from './useCompanyAccess';
import { useCompanyPermissions } from './useCompanyPermissions';
import { useBrowsingMode } from './useBrowsingMode';
import { getCompanyFilter, getCompanyScopeContext } from '@/lib/companyScope';
import { useAuth } from '@/contexts/AuthContext';

interface CompanyFilterResult<T> {
  filteredData: T[];
  filter: { company_id?: string };
  applyFilter: (data: T[]) => T[];
  getFilterForOwnCompany: () => { company_id?: string };
  getFilterForGlobalView: () => { company_id?: string };
}

/**
 * Hook لفلترة البيانات حسب نطاق الشركة
 */
export function useCompanyFiltering<T extends { company_id: string }>(
  data: T[] = []
): CompanyFilterResult<T> {
  const { user } = useAuth();
  const { companyId } = useCompanyAccess();
  const { isSystemLevel } = useCompanyPermissions();
  const { isBrowsingMode } = useBrowsingMode();

  const result = useMemo(() => {
    if (!user) {
      return {
        filteredData: [],
        filter: {},
        applyFilter: () => [],
        getFilterForOwnCompany: () => ({}),
        getFilterForGlobalView: () => ({})
      };
    }

    const context = getCompanyScopeContext(user);
    
    // Get default filter
    const filter = getCompanyFilter(context, false, false);

    // Apply filter to data
    const applyFilter = (dataToFilter: T[]): T[] => {
      if (!dataToFilter || dataToFilter.length === 0) return [];
      
      // If system level and browsing mode, show all
      if (isSystemLevel && isBrowsingMode) {
        return dataToFilter;
      }
      
      // If has company ID, filter by it
      if (companyId) {
        return dataToFilter.filter(item => item.company_id === companyId);
      }
      
      return dataToFilter;
    };

    const filteredData = applyFilter(data);

    return {
      filteredData,
      filter,
      applyFilter,
      getFilterForOwnCompany: () => getCompanyFilter(context, true, false),
      getFilterForGlobalView: () => getCompanyFilter(context, false, true)
    };
  }, [data, companyId, isSystemLevel, isBrowsingMode, user?.id]);

  return result;
}

/**
 * Hook for generating query keys with company context
 */
export function useCompanyQueryKey(baseKey: string[], additionalKeys: unknown[] = []): unknown[] {
  const { companyId } = useCompanyAccess();
  return useMemo(() => {
    const keys = [baseKey, companyId, ...additionalKeys].filter(Boolean);
    return keys;
  }, [baseKey, companyId, ...additionalKeys]);
}

/**
 * Hook to check if data can be accessed
 */
export function useCanAccessCompany() {
  const { isSystemLevel } = useCompanyPermissions();
  const { companyId } = useCompanyAccess();

  return useMemo(() => ({
    canAccess: (targetCompanyId?: string) => {
      if (!targetCompanyId) return false;
      if (isSystemLevel) return true;
      return companyId === targetCompanyId;
    },
    
    validate: (targetCompanyId: string) => {
      if (!targetCompanyId) {
        throw new Error('Company ID is required');
      }
      if (!isSystemLevel && companyId !== targetCompanyId) {
        throw new Error('Access denied: Cannot access data from different company');
      }
    }
  }), [isSystemLevel, companyId]);
}

