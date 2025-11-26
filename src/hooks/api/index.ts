/**
 * API Hooks Index
 * Central export for all backend API hooks with Redis caching
 * Each hook automatically falls back to Supabase if backend unavailable
 */

// Dashboard API hooks
export * from './useDashboardApi';

// Contracts API hooks
export * from './useContractsApi';

// Vehicles API hooks
export * from './useVehiclesApi';

// Customers API hooks
export * from './useCustomersApi';

// Invoices API hooks
export * from './useInvoicesApi';

// Employees API hooks
export * from './useEmployeesApi';

// Violations API hooks
export * from './useViolationsApi';
