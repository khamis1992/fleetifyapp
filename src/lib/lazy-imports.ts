/**
 * Lazy Import Utilities
 * Centralized code splitting with prefetch support
 */

import { lazy, ComponentType } from 'react';

// Type for lazy component
type LazyComponent<T = {}> = React.LazyExoticComponent<ComponentType<T>>;

// Retry wrapper for lazy imports
function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  interval = 1000
): LazyComponent {
  return lazy(async () => {
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    throw new Error('Failed to load component after retries');
  });
}

// Prefetch utility - triggers import without rendering
export function prefetch(importFn: () => Promise<any>) {
  // Start loading in idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => importFn());
  } else {
    setTimeout(() => importFn(), 200);
  }
}

// === Dashboard & Core Pages ===
export const LazyDashboard = lazyWithRetry(() => import('@/pages/Dashboard'));
export const LazyBentoDashboard = lazyWithRetry(() => import('@/components/dashboard/bento/BentoDashboard'));

// === Fleet Pages ===
export const LazyFleet = lazyWithRetry(() => import('@/pages/Fleet'));
export const LazyFleetPageNew = lazyWithRetry(() => import('@/pages/fleet/FleetPageNew'));
export const LazyVehicleDetails = lazyWithRetry(() => import('@/components/fleet/VehicleDetailsPageNew'));
export const LazyMaintenance = lazyWithRetry(() => import('@/pages/fleet/Maintenance'));
export const LazyTrafficViolations = lazyWithRetry(() => import('@/pages/fleet/TrafficViolationsRedesigned'));

// === Customer Pages ===
export const LazyCustomers = lazyWithRetry(() => import('@/pages/customers/CustomersPageNew'));
export const LazyCustomerDetails = lazyWithRetry(() => import('@/components/customers/CustomerDetailsPageNew'));
export const LazyCustomerCRM = lazyWithRetry(() => import('@/pages/customers/CustomerCRMNew'));

// === Contract Pages ===
export const LazyContracts = lazyWithRetry(() => import('@/pages/Contracts'));
export const LazyContractDetails = lazyWithRetry(() => import('@/components/contracts/ContractDetailsPage'));

// === Finance Pages ===
export const LazyFinance = lazyWithRetry(() => import('@/pages/Finance'));
export const LazyFinanceHub = lazyWithRetry(() => import('@/pages/finance/FinanceHub'));
export const LazyInvoices = lazyWithRetry(() => import('@/pages/finance/Invoices'));
export const LazyPayments = lazyWithRetry(() => import('@/pages/finance/Payments'));
export const LazyChartOfAccounts = lazyWithRetry(() => import('@/pages/finance/ChartOfAccounts'));
export const LazyTreasury = lazyWithRetry(() => import('@/pages/finance/Treasury'));

// === HR Pages ===
export const LazyEmployees = lazyWithRetry(() => import('@/pages/hr/Employees'));
export const LazyAttendance = lazyWithRetry(() => import('@/pages/hr/Attendance'));
export const LazyPayroll = lazyWithRetry(() => import('@/pages/hr/Payroll'));

// === Admin Pages ===
export const LazySuperAdminDashboard = lazyWithRetry(() => import('@/pages/super-admin/Dashboard'));
export const LazySuperAdminCompanies = lazyWithRetry(() => import('@/pages/super-admin/Companies'));
export const LazySuperAdminUsers = lazyWithRetry(() => import('@/pages/super-admin/Users'));

// === Settings Pages ===
export const LazySettings = lazyWithRetry(() => import('@/pages/Settings'));
export const LazyProfile = lazyWithRetry(() => import('@/pages/Profile'));

// === Reports ===
export const LazyReports = lazyWithRetry(() => import('@/pages/Reports'));
export const LazyReportsHub = lazyWithRetry(() => import('@/pages/reports/ReportsHub'));

// === Prefetch Groups ===

// Prefetch dashboard-related components
export function prefetchDashboardComponents() {
  prefetch(() => import('@/components/dashboard/bento/BentoDashboard'));
  prefetch(() => import('@/pages/Dashboard'));
}

// Prefetch fleet-related components
export function prefetchFleetComponents() {
  prefetch(() => import('@/pages/fleet/FleetPageNew'));
  prefetch(() => import('@/components/fleet/VehicleDetailsPageNew'));
}

// Prefetch customer-related components
export function prefetchCustomerComponents() {
  prefetch(() => import('@/pages/customers/CustomersPageNew'));
  prefetch(() => import('@/components/customers/CustomerDetailsPageNew'));
}

// Prefetch finance-related components
export function prefetchFinanceComponents() {
  prefetch(() => import('@/pages/finance/FinanceHub'));
  prefetch(() => import('@/pages/finance/Invoices'));
  prefetch(() => import('@/pages/finance/Payments'));
}

// Prefetch contract-related components
export function prefetchContractComponents() {
  prefetch(() => import('@/pages/Contracts'));
  prefetch(() => import('@/components/contracts/ContractDetailsPage'));
}

// === Route-based prefetching ===
const prefetchMap: Record<string, () => void> = {
  '/dashboard': prefetchDashboardComponents,
  '/fleet': prefetchFleetComponents,
  '/customers': prefetchCustomerComponents,
  '/finance': prefetchFinanceComponents,
  '/contracts': prefetchContractComponents,
};

// Prefetch based on current route
export function prefetchRelatedRoutes(currentPath: string) {
  // Find matching prefetch function
  for (const [route, prefetchFn] of Object.entries(prefetchMap)) {
    if (currentPath.startsWith(route)) {
      prefetchFn();
      break;
    }
  }
}

// Prefetch on link hover
export function createHoverPrefetch(route: string) {
  return () => {
    const prefetchFn = prefetchMap[route];
    if (prefetchFn) {
      prefetchFn();
    }
  };
}

export default {
  prefetch,
  prefetchDashboardComponents,
  prefetchFleetComponents,
  prefetchCustomerComponents,
  prefetchFinanceComponents,
  prefetchContractComponents,
  prefetchRelatedRoutes,
  createHoverPrefetch,
};

