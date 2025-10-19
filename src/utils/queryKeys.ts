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
    notes: (customerId: string) => [...queryKeys.customers.all, 'notes', customerId] as const,
    financialSummary: (customerId: string) => [...queryKeys.customers.all, 'financial-summary', customerId] as const,
    diagnostics: (userId?: string) => [...queryKeys.customers.all, 'diagnostics', userId] as const,
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
    available: (companyId?: string) => [...queryKeys.vehicles.all, 'available', companyId] as const,
    availableForContracts: (companyId?: string) => [...queryKeys.vehicles.all, 'available-for-contracts', companyId] as const,
    paginated: () => [...queryKeys.vehicles.all, 'paginated'] as const,
    pricing: (vehicleId: string) => [...queryKeys.vehicles.all, 'pricing', vehicleId] as const,
    insurance: (vehicleId: string) => [...queryKeys.vehicles.all, 'insurance', vehicleId] as const,
    maintenance: (vehicleId?: string) => [...queryKeys.vehicles.all, 'maintenance', vehicleId] as const,
    odometerReadings: (vehicleId: string) => [...queryKeys.vehicles.all, 'odometer', vehicleId] as const,
    inspections: (vehicleId: string) => [...queryKeys.vehicles.all, 'inspections', vehicleId] as const,
    activityLog: (vehicleId: string) => [...queryKeys.vehicles.all, 'activity-log', vehicleId] as const,
    fleetAnalytics: (companyId?: string) => ['fleet-analytics', companyId] as const,
    fleetStatus: () => ['fleet-status'] as const,
  },

  // COMPANIES
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: () => [...queryKeys.companies.lists()] as const,
  },

  // EMPLOYEES / HR
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (filters?: StatusFilters & CompanyFilters) => [...queryKeys.employees.lists(), filters] as const,
    details: () => [...queryKeys.employees.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
    attendance: (employeeId: string) => [...queryKeys.employees.all, 'attendance', employeeId] as const,
  },

  // CHART OF ACCOUNTS
  chartOfAccounts: {
    all: ['chart-of-accounts'] as const,
    lists: () => [...queryKeys.chartOfAccounts.all, 'list'] as const,
    list: (filters?: CompanyFilters) => [...queryKeys.chartOfAccounts.lists(), filters] as const,
    details: () => [...queryKeys.chartOfAccounts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.chartOfAccounts.details(), id] as const,
    byType: (accountType: string) => [...queryKeys.chartOfAccounts.all, 'by-type', accountType] as const,
  },

  // JOURNAL ENTRIES
  journalEntries: {
    all: ['journal-entries'] as const,
    lists: () => [...queryKeys.journalEntries.all, 'list'] as const,
    list: (filters?: DateRangeFilters & CompanyFilters) => [...queryKeys.journalEntries.lists(), filters] as const,
    details: () => [...queryKeys.journalEntries.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.journalEntries.details(), id] as const,
  },

  // VENDORS
  vendors: {
    all: ['vendors'] as const,
    lists: () => [...queryKeys.vendors.all, 'list'] as const,
    list: (filters?: StatusFilters & CompanyFilters) => [...queryKeys.vendors.lists(), filters] as const,
    details: () => [...queryKeys.vendors.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vendors.details(), id] as const,
  },

  // PROPERTIES (Real Estate Module)
  properties: {
    all: ['properties'] as const,
    lists: () => [...queryKeys.properties.all, 'list'] as const,
    list: (filters?: StatusFilters & CompanyFilters) => [...queryKeys.properties.lists(), filters] as const,
    details: () => [...queryKeys.properties.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.properties.details(), id] as const,
    reports: (propertyId: string) => [...queryKeys.properties.all, 'reports', propertyId] as const,
    maintenance: (propertyId: string) => [...queryKeys.properties.all, 'maintenance', propertyId] as const,
  },

  // LEGAL CASES
  legalCases: {
    all: ['legal-cases'] as const,
    lists: () => [...queryKeys.legalCases.all, 'list'] as const,
    list: (filters?: StatusFilters & CompanyFilters) => [...queryKeys.legalCases.lists(), filters] as const,
    details: () => [...queryKeys.legalCases.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.legalCases.details(), id] as const,
  },

  // BRANCHES
  branches: {
    all: ['branches'] as const,
    lists: () => [...queryKeys.branches.all, 'list'] as const,
    list: (filters?: CompanyFilters) => [...queryKeys.branches.lists(), filters] as const,
    details: () => [...queryKeys.branches.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.branches.details(), id] as const,
  },

  // APPROVAL WORKFLOWS
  approvalWorkflows: {
    all: ['approval-workflows'] as const,
    lists: () => [...queryKeys.approvalWorkflows.all, 'list'] as const,
    list: (filters?: StatusFilters & CompanyFilters) => [...queryKeys.approvalWorkflows.lists(), filters] as const,
    details: () => [...queryKeys.approvalWorkflows.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.approvalWorkflows.details(), id] as const,
    requests: (workflowId: string) => [...queryKeys.approvalWorkflows.all, 'requests', workflowId] as const,
  },

  // REPORTS & ANALYTICS
  reports: {
    all: ['reports'] as const,
    financial: (filters?: DateRangeFilters & CompanyFilters) => [...queryKeys.reports.all, 'financial', filters] as const,
    fleet: (filters?: DateRangeFilters & CompanyFilters) => [...queryKeys.reports.all, 'fleet', filters] as const,
    dashboard: (companyId?: string) => [...queryKeys.reports.all, 'dashboard', companyId] as const,
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
