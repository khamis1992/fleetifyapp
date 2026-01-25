/**
 * Migration Utilities
 * 
 * Helper functions to transition from Zustand to React Query.
 * These utilities maintain compatibility during the migration period.
 */

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { useAppStore } from './index';

/**
 * Hydrate Zustand store from React Query cache
 * 
 * This ensures components still using Zustand get correct data
 * from React Query cache during the transition period.
 * 
 * @deprecated This is a temporary utility for migration. Will be removed after Phase 3.
 * 
 * @param entityType - The entity type to hydrate ('customers' | 'vehicles' | 'contracts' | 'invoices')
 */
export function hydrateZustandFromQueryCache(entityType: 'customers' | 'vehicles' | 'contracts' | 'invoices') {
  const queryClient = useQueryClient();
  const setEntities = useAppStore((state) => state.setEntities);
  
  // Get data from React Query cache
  let cacheKey: readonly unknown[] | undefined;
  
  switch (entityType) {
    case 'customers':
      cacheKey = queryKeys.customers.all();
      break;
    case 'vehicles':
      cacheKey = queryKeys.vehicles.all();
      break;
    case 'contracts':
      cacheKey = queryKeys.contracts.all();
      break;
    case 'invoices':
      cacheKey = queryKeys.invoices.all();
      break;
  }
  
  if (!cacheKey) {
    console.warn(`[Migration] No cache key found for entity type: ${entityType}`);
    return;
  }
  
  const cachedData = queryClient.getQueryData(cacheKey);
  
  if (cachedData && Array.isArray(cachedData)) {
    // Update Zustand store with cached data
    setEntities(entityType, cachedData);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Migration] Hydrated ${entityType} from React Query cache:`, cachedData.length, 'items');
    }
  }
}

/**
 * Invalidate React Query when Zustand state changes
 * 
 * This syncs state changes from components still using Zustand
 * to React Query cache during the transition period.
 * 
 * @deprecated This is a temporary utility for migration. Will be removed after Phase 3.
 * 
 * @param entityType - The entity type to sync ('customers' | 'vehicles' | 'contracts' | 'invoices')
 * @param data - The data to sync to React Query cache
 */
export function syncZustandToQueryCache(entityType: 'customers' | 'vehicles' | 'contracts' | 'invoices', data: any[]) {
  const queryClient = useQueryClient();
  
  // Update React Query cache with Zustand state
  let cacheKey: readonly unknown[] | undefined;
  
  switch (entityType) {
    case 'customers':
      cacheKey = queryKeys.customers.all();
      break;
    case 'vehicles':
      cacheKey = queryKeys.vehicles.all();
      break;
    case 'contracts':
      cacheKey = queryKeys.contracts.all();
      break;
    case 'invoices':
      cacheKey = queryKeys.invoices.all();
      break;
  }
  
  if (!cacheKey) {
    console.warn(`[Migration] No cache key found for entity type: ${entityType}`);
    return;
  }
  
  // Update React Query cache
  queryClient.setQueryData(cacheKey, data);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Migration] Synced ${entityType} to React Query cache:`, data.length, 'items');
  }
}

/**
 * Get migration status for an entity type
 * 
 * Returns whether an entity type has been fully migrated to React Query.
 * This can be used to conditionally use Zustand or React Query.
 * 
 * @deprecated This is a temporary utility for migration. Will be removed after Phase 3.
 * 
 * @param entityType - The entity type to check
 * @returns Whether the entity type is migrated
 */
export function isEntityMigrated(entityType: 'customers' | 'vehicles' | 'contracts' | 'invoices'): boolean {
  // This function can be updated as migration progresses
  // Initially, all entities return false
  // As components are migrated, update this to return true
  
  const migratedEntities = new Set<string>();
  
  return migratedEntities.has(entityType);
}

/**
 * Log migration warning
 * 
 * Helper to log consistent deprecation warnings during migration.
 * 
 * @param componentName - The component name
 * @param entityType - The entity type being accessed
 * @param alternative - The alternative hook to use
 */
export function logMigrationWarning(componentName: string, entityType: string, alternative: string) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `⚠️ [Migration] ${componentName} is using Zustand for ${entityType}. ` +
      `This is deprecated. Use ${alternative} instead. ` +
      `This will be removed in a future version.`
    );
  }
}
