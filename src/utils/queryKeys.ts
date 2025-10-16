/**
 * Query Key Factory Pattern
 * 
 * Centralized query key management for better cache control and type safety.
 * This pattern helps:
 * 1. Avoid key duplication across the app
 * 2. Make cache invalidation easier
 * 3. Provide better TypeScript autocomplete
 * 4. Maintain consistent key structure
 * 
 * Usage:
 * ```typescript
 * useQuery({
 *   queryKey: queryKeys.customers.list(filters),
 *   // ...
 * })
 * 
 * // Invalidate all customer queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
 * 
 * // Invalidate specific customer lists
 * queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() })
 * ```
 */

import type { CustomerFilters } from '@/types/customer';

export const queryKeys = {
  // Customer queries
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: CustomerFilters) => [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
    search: (term: string) => [...queryKeys.customers.all, 'search', term] as const,
  },

  // Contract queries
  contracts: {
    all: ['contracts'] as const,
    lists: () => [...queryKeys.contracts.all, 'list'] as const,
    list: (params?: { customerId?: string; vehicleId?: string; companyId?: string }) =>
      [...queryKeys.contracts.lists(), params] as const,
    active: (params?: { customerId?: string; vendorId?: string }) =>
      [...queryKeys.contracts.all, 'active', params] as const,
    details: () => [...queryKeys.contracts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contracts.details(), id] as const,
    expiring: (days: number) => [...queryKeys.contracts.all, 'expiring', days] as const,
  },

  // Vehicle queries
  vehicles: {
    all: ['vehicles'] as const,
    lists: () => [...queryKeys.vehicles.all, 'list'] as const,
    list: (status?: string) => [...queryKeys.vehicles.lists(), status] as const,
    available: () => [...queryKeys.vehicles.all, 'available'] as const,
    details: () => [...queryKeys.vehicles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vehicles.details(), id] as const,
    maintenance: (vehicleId?: string) => 
      [...queryKeys.vehicles.all, 'maintenance', vehicleId] as const,
  },

  // Payment queries
  payments: {
    all: ['payments'] as const,
    lists: () => [...queryKeys.payments.all, 'list'] as const,
    list: (params?: { customerId?: string; contractId?: string }) =>
      [...queryKeys.payments.lists(), params] as const,
    rental: () => [...queryKeys.payments.all, 'rental'] as const,
    rentalList: (customerId?: string) => 
      [...queryKeys.payments.rental(), customerId] as const,
    details: () => [...queryKeys.payments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.payments.details(), id] as const,
  },

  // Invoice queries
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (params?: { customerId?: string; contractId?: string; status?: string }) =>
      [...queryKeys.invoices.lists(), params] as const,
    details: () => [...queryKeys.invoices.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
    overdue: () => [...queryKeys.invoices.all, 'overdue'] as const,
  },

  // Finance queries
  finance: {
    all: ['finance'] as const,
    dashboard: () => [...queryKeys.finance.all, 'dashboard'] as const,
    overview: (period?: string) => [...queryKeys.finance.all, 'overview', period] as const,
    accounts: () => [...queryKeys.finance.all, 'accounts'] as const,
    accountList: (type?: string) => [...queryKeys.finance.accounts(), type] as const,
    ledger: (accountId: string, period?: string) =>
      [...queryKeys.finance.all, 'ledger', accountId, period] as const,
    journalEntries: (filters?: any) => 
      [...queryKeys.finance.all, 'journal-entries', filters] as const,
  },

  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    optimizedStats: (companyId: string) => 
      [...queryKeys.dashboard.all, 'optimized-stats', companyId] as const,
    charts: (period?: string) => [...queryKeys.dashboard.all, 'charts', period] as const,
  },

  // Employee queries
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (department?: string) => [...queryKeys.employees.lists(), department] as const,
    details: () => [...queryKeys.employees.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
    active: () => [...queryKeys.employees.all, 'active'] as const,
  },

  // Company queries
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: () => [...queryKeys.companies.lists()] as const,
    details: () => [...queryKeys.companies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.companies.details(), id] as const,
    current: () => [...queryKeys.companies.all, 'current'] as const,
  },

  // Report queries
  reports: {
    all: ['reports'] as const,
    financial: (period?: string) => [...queryKeys.reports.all, 'financial', period] as const,
    fleet: (period?: string) => [...queryKeys.reports.all, 'fleet', period] as const,
    customer: (customerId?: string) => 
      [...queryKeys.reports.all, 'customer', customerId] as const,
    custom: (reportId: string, params?: any) =>
      [...queryKeys.reports.all, 'custom', reportId, params] as const,
  },
} as const;

/**
 * Helper function to invalidate all queries for a specific entity
 * 
 * @example
 * ```typescript
 * // Invalidate all customer-related queries
 * invalidateEntity(queryClient, 'customers')
 * 
 * // Invalidate specific customer lists
 * invalidateEntity(queryClient, 'customers', 'lists')
 * ```
 */
export const invalidateEntity = (
  queryClient: any,
  entity: keyof typeof queryKeys,
  subKey?: string
) => {
  const baseKey = queryKeys[entity];
  const key = subKey && typeof baseKey === 'object' && subKey in baseKey
    ? (baseKey as any)[subKey]()
    : baseKey;
  
  return queryClient.invalidateQueries({ queryKey: key });
};

/**
 * Helper function to get all queries for a specific entity
 */
export const getEntityQueries = (
  queryClient: any,
  entity: keyof typeof queryKeys
) => {
  return queryClient.getQueryCache().findAll({
    queryKey: queryKeys[entity].all
  });
};
