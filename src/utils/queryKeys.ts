/**
 * Centralized Query Key Factory
 *
 * This file provides a consistent, type-safe way to generate query keys for React Query.
 * Using a factory pattern ensures cache invalidation is predictable and prevents typos.
 *
 * Usage:
 * ```typescript
 * const { data } = useQuery({
 *   queryKey: queryKeys.customers.list({ status: 'active' }),
 *   queryFn: fetchCustomers
 * });
 *
 * // Invalidate specific query
 * queryClient.invalidateQueries({ queryKey: queryKeys.customers.list({ status: 'active' }) });
 *
 * // Invalidate all customer queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
 * ```
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */

// Base filter types for common use cases
export interface PaginationFilters {
  page?: number;
  pageSize?: number;
}

export interface DateRangeFilters {
  startDate?: string;
  endDate?: string;
}

export interface StatusFilters {
  status?: string;
}

export interface CompanyFilters {
  companyId?: string;
}

// Specific filter types for each entity
export interface CustomerFilters extends PaginationFilters, StatusFilters, CompanyFilters {
  search?: string;
  isBlacklisted?: boolean;
}

export interface ContractFilters extends PaginationFilters, StatusFilters, CompanyFilters, DateRangeFilters {
  customerId?: string;
  vehicleId?: string;
}

export interface InvoiceFilters extends PaginationFilters, StatusFilters, CompanyFilters, DateRangeFilters {
  customerId?: string;
  isPaid?: boolean;
}

export interface PaymentFilters extends PaginationFilters, StatusFilters, CompanyFilters, DateRangeFilters {
  customerId?: string;
  invoiceId?: string;
  paymentMethod?: string;
}

export interface VehicleFilters extends PaginationFilters, StatusFilters, CompanyFilters {
  make?: string;
  model?: string;
  year?: number;
  groupId?: string;
}

/**
 * Query Keys Factory
 * Organized hierarchically: entity → operation → specific query
 */
export const queryKeys = {
  // CUSTOMERS
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: CustomerFilters) => [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },

  // CONTRACTS
  contracts: {
    all: ['contracts'] as const,
    lists: () => [...queryKeys.contracts.all, 'list'] as const,
    list: (filters?: ContractFilters) => [...queryKeys.contracts.lists(), filters] as const,
    details: () => [...queryKeys.contracts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contracts.details(), id] as const,
  },

  // INVOICES
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (filters?: InvoiceFilters) => [...queryKeys.invoices.lists(), filters] as const,
    details: () => [...queryKeys.invoices.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
  },

  // PAYMENTS
  payments: {
    all: ['payments'] as const,
    lists: () => [...queryKeys.payments.all, 'list'] as const,
    list: (filters?: PaymentFilters) => [...queryKeys.payments.lists(), filters] as const,
    details: () => [...queryKeys.payments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.payments.details(), id] as const,
  },

  // VEHICLES
  vehicles: {
    all: ['vehicles'] as const,
    lists: () => [...queryKeys.vehicles.all, 'list'] as const,
    list: (filters?: VehicleFilters) => [...queryKeys.vehicles.lists(), filters] as const,
    details: () => [...queryKeys.vehicles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vehicles.details(), id] as const,
  },

  // COMPANIES
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: () => [...queryKeys.companies.lists()] as const,
  },
};

/**
 * Helper function to invalidate all queries for an entity
 */
export const invalidateEntity = (
  queryClient: any,
  entity: keyof typeof queryKeys
): Promise<void> => {
  return queryClient.invalidateQueries({ queryKey: queryKeys[entity].all });
};
