# React Query as Primary Server State - Architecture Design

## Executive Summary

This document outlines the architecture for making **React Query the single source of truth and exclusive caching layer** for all server state in the FleetifyApp. The design eliminates redundant state management layers and establishes clear separation between server state (React Query) and client UI state (Zustand).

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Principles](#architecture-principles)
3. [State Separation Strategy](#state-separation-strategy)
4. [Query Key Factory Design](#query-key-factory-design)
5. [Server State Management](#server-state-management)
6. [Client UI State Management](#client-ui-state-management)
7. [Cache Invalidation Strategy](#cache-invalidation-strategy)
8. [Migration Plan](#migration-plan)
9. [Implementation Guidelines](#implementation-guidelines)
10. [Best Practices](#best-practices)

---

## Current State Analysis

### Existing State Management

| Layer | Purpose | Current Implementation | Issues |
|-------|---------|----------------------|--------|
| **Zustand Store** | Global app state | `src/stores/index.ts` with entity normalization | Redundant - duplicates React Query's server state management |
| **React Query** | Server state caching | `src/lib/queryClient.ts` with query keys | Inconsistent usage - some data in Zustand, some in React Query |
| **API Hooks** | Data fetching | `src/hooks/api/` with backend/Supabase fallback | Mixed patterns - no standardized query key usage |
| **Contexts** | Feature-specific state | AuthContext, CompanyContext, FinanceContext | Some contexts hold data that should be in React Query |

### Key Problems Identified

1. **Duplicate State Management**: Entity state (customers, vehicles, contracts, invoices) is managed in both Zustand and React Query
2. **Manual Synchronization**: `useEntitySync` utility manually syncs data, duplicating React Query's functionality
3. **Inconsistent Query Keys**: Query keys defined in multiple places without a centralized pattern
4. **Mixed Patterns**: Some components use Zustand, some use React Query, creating confusion
5. **Redundant Caching**: Both Zustand persistence and React Query cache store the same data

---

## Architecture Principles

### 1. Single Source of Truth for Server State

**Principle**: All server state MUST be managed exclusively by React Query. Zustand is ONLY for client-side UI state.

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐      ┌─────────────────────────┐
│   Server State Layer    │      │   Client UI State Layer   │
│   (React Query)        │      │   (Zustand)             │
├─────────────────────────┤      ├─────────────────────────┤
│ • Customers            │      │ • Theme                  │
│ • Vehicles             │      │ • Sidebar state          │
│ • Contracts            │      │ • Notifications          │
│ • Invoices             │      │ • Modal states           │
│ • Payments             │      │ • Form inputs            │
│ • Dashboard stats       │      │ • Filter states          │
│ • Financial data       │      │ • UI preferences         │
│ • All API responses    │      │ • Temporary selections   │
└─────────────────────────┘      └─────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐      ┌─────────────────────────┐
│   Query Cache          │      │   Zustand Store         │
│   (In-memory)         │      │   (Persisted)           │
└─────────────────────────┘      └─────────────────────────┘
```

### 2. Clear State Ownership

| State Type | Owner | Storage | Persistence |
|------------|-------|---------|-------------|
| **Server Data** | React Query | Query Cache | In-memory (configurable) |
| **Auth Session** | Supabase Auth | Browser/Supabase | Automatic |
| **User Profile** | React Query | Query Cache | Refetch on mount |
| **UI Preferences** | Zustand | localStorage | Persisted |
| **Form State** | React Hook Form | Component State | Ephemeral |
| **Modal/Drawer State** | Zustand | In-memory | Ephemeral |
| **Notifications** | Zustand | In-memory | Ephemeral |

### 3. No Redundant State Layers

**Principle**: Eliminate all manual state synchronization. Let React Query handle:
- Data fetching
- Caching
- Background refetching
- Stale data management
- Optimistic updates

---

## State Separation Strategy

### Server State (React Query)

Server state is **asynchronous**, **external**, and **shared**. Characteristics:

- Fetched from API (backend or Supabase)
- Can change without user action
- Needs caching and synchronization
- Has loading/error states
- Can become stale

**Managed by**: React Query hooks

### Client UI State (Zustand)

Client UI state is **synchronous**, **local**, and **user-specific**. Characteristics:

- Derived from user interactions
- Only exists in the browser
- Changes only when user acts
- No loading/error states
- Never becomes stale

**Managed by**: Zustand store

### Decision Tree

```
Is this data from an API?
├─ Yes → Use React Query
└─ No
    ├─ Is it a user preference? → Use Zustand (persisted)
    ├─ Is it UI state (modals, drawers)? → Use Zustand (ephemeral)
    ├─ Is it form input? → Use React Hook Form
    └─ Is it derived data? → Use useMemo/useCallback
```

---

## Query Key Factory Design

### Centralized Query Keys

Create a single source of truth for all query keys using a hierarchical factory pattern.

```typescript
// src/lib/query-keys.ts

/**
 * Centralized Query Key Factory
 * 
 * Design Principles:
 * 1. Hierarchical structure for easy invalidation
 * 2. Type-safe with TypeScript
 * 3. Consistent naming conventions
 * 4. Support for scoped queries (company, user, etc.)
 */

type QueryKey = readonly unknown[];

/**
 * Base query key factory
 * Provides common prefixes and utilities
 */
export const queryKeys = {
  // Root keys for full invalidation
  all: ['all'] as const,
  
  // Authentication
  auth: {
    all: ['auth'] as const,
    session: () => ['auth', 'session'] as const,
    user: (userId: string) => ['auth', 'user', userId] as const,
  },
  
  // Company
  company: {
    all: ['company'] as const,
    detail: (companyId: string) => ['company', companyId] as const,
    settings: (companyId: string) => ['company', companyId, 'settings'] as const,
    branding: (companyId: string) => ['company', companyId, 'branding'] as const,
    users: (companyId: string) => ['company', companyId, 'users'] as const,
  },
  
  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: (companyId: string) => ['dashboard', companyId, 'stats'] as const,
    financial: (companyId: string, filter?: string) => 
      ['dashboard', companyId, 'financial', filter] as const,
    activity: (companyId: string, limit: number) => 
      ['dashboard', companyId, 'activity', limit] as const,
    vehicles: (companyId: string) => ['dashboard', companyId, 'vehicles'] as const,
  },
  
  // Customers
  customers: {
    all: ['customers'] as const,
    lists: () => ['customers', 'list'] as const,
    list: (companyId: string, filters?: Record<string, unknown>) => 
      ['customers', companyId, 'list', filters] as const,
    detail: (customerId: string) => ['customers', 'detail', customerId] as const,
    search: (companyId: string, query: string) => 
      ['customers', companyId, 'search', query] as const,
    stats: (companyId: string) => ['customers', companyId, 'stats'] as const,
    active: (companyId: string) => ['customers', companyId, 'active'] as const,
    financial: (customerId: string) => ['customers', customerId, 'financial'] as const,
    vehicles: (customerId: string) => ['customers', customerId, 'vehicles'] as const,
    contracts: (customerId: string) => ['customers', customerId, 'contracts'] as const,
    invoices: (customerId: string) => ['customers', customerId, 'invoices'] as const,
  },
  
  // Vehicles
  vehicles: {
    all: ['vehicles'] as const,
    lists: () => ['vehicles', 'list'] as const,
    list: (companyId: string, filters?: Record<string, unknown>) => 
      ['vehicles', companyId, 'list', filters] as const,
    detail: (vehicleId: string) => ['vehicles', 'detail', vehicleId] as const,
    available: (companyId: string) => ['vehicles', companyId, 'available'] as const,
    byStatus: (companyId: string, status: string) => 
      ['vehicles', companyId, 'status', status] as const,
    location: (companyId: string) => ['vehicles', companyId, 'location'] as const,
    maintenance: (companyId: string) => ['vehicles', companyId, 'maintenance'] as const,
  },
  
  // Contracts
  contracts: {
    all: ['contracts'] as const,
    lists: () => ['contracts', 'list'] as const,
    list: (companyId: string, filters?: Record<string, unknown>) => 
      ['contracts', companyId, 'list', filters] as const,
    detail: (contractId: string) => ['contracts', 'detail', contractId] as const,
    byCustomer: (customerId: string) => ['contracts', 'customer', customerId] as const,
    byVehicle: (vehicleId: string) => ['contracts', 'vehicle', vehicleId] as const,
    stats: (companyId: string) => ['contracts', companyId, 'stats'] as const,
    active: (companyId: string) => ['contracts', companyId, 'active'] as const,
    expiring: (companyId: string, days: number) => 
      ['contracts', companyId, 'expiring', days] as const,
    templates: (companyId: string) => ['contracts', companyId, 'templates'] as const,
    documents: (contractId: string) => ['contracts', contractId, 'documents'] as const,
    amendments: (contractId: string) => ['contracts', contractId, 'amendments'] as const,
  },
  
  // Invoices
  invoices: {
    all: ['invoices'] as const,
    lists: () => ['invoices', 'list'] as const,
    list: (companyId: string, filters?: Record<string, unknown>) => 
      ['invoices', companyId, 'list', filters] as const,
    detail: (invoiceId: string) => ['invoices', 'detail', invoiceId] as const,
    pending: (companyId: string) => ['invoices', companyId, 'pending'] as const,
    overdue: (companyId: string) => ['invoices', companyId, 'overdue'] as const,
    byStatus: (companyId: string, status: string) => 
      ['invoices', companyId, 'status', status] as const,
    byContract: (contractId: string) => ['invoices', 'contract', contractId] as const,
    byCustomer: (customerId: string) => ['invoices', 'customer', customerId] as const,
  },
  
  // Payments
  payments: {
    all: ['payments'] as const,
    lists: () => ['payments', 'list'] as const,
    list: (companyId: string, filters?: Record<string, unknown>) => 
      ['payments', companyId, 'list', filters] as const,
    detail: (paymentId: string) => ['payments', 'detail', paymentId] as const,
    byContract: (contractId: string) => ['payments', 'contract', contractId] as const,
    unmatched: (companyId: string) => ['payments', companyId, 'unmatched'] as const,
    matches: (paymentId: string) => ['payment-matches', paymentId] as const,
    stats: (companyId: string) => ['payments', companyId, 'stats'] as const,
  },
  
  // Finance
  finance: {
    all: ['finance'] as const,
    overview: (companyId: string, period: string) => 
      ['finance', 'overview', companyId, period] as const,
    transactions: (companyId: string, filters?: Record<string, unknown>) => 
      ['finance', 'transactions', companyId, filters] as const,
    revenue: (companyId: string, period: string) => 
      ['finance', 'revenue', companyId, period] as const,
    expenses: (companyId: string, period: string) => 
      ['finance', 'expenses', companyId, period] as const,
    balance: (companyId: string) => ['finance', 'balance', companyId] as const,
    chartOfAccounts: (companyId: string) => ['finance', companyId, 'chart-of-accounts'] as const,
    budget: (companyId: string, period: string) => ['finance', companyId, 'budget', period] as const,
  },
  
  // Fleet
  fleet: {
    all: ['fleet'] as const,
    status: (companyId: string) => ['fleet', 'status', companyId] as const,
    utilization: (companyId: string, period: string) => 
      ['fleet', 'utilization', companyId, period] as const,
    maintenance: (companyId: string) => ['fleet', 'maintenance', companyId] as const,
    alerts: (companyId: string) => ['fleet', 'alerts', companyId] as const,
  },
  
  // Inventory
  inventory: {
    all: ['inventory'] as const,
    list: (companyId: string) => ['inventory', companyId] as const,
    byWarehouse: (companyId: string, warehouseId: string) => 
      ['inventory', 'warehouse', companyId, warehouseId] as const,
    lowStock: (companyId: string) => ['inventory', companyId, 'low-stock'] as const,
    movements: (companyId: string, itemId?: string) => 
      ['inventory', 'movements', companyId, itemId] as const,
  },
  
  // Approvals
  approvals: {
    all: ['approvals'] as const,
    pending: (userId: string) => ['approvals', 'pending', userId] as const,
    list: (companyId: string) => ['approvals', companyId] as const,
    history: (userId: string) => ['approvals', 'history', userId] as const,
    workflow: (workflowId: string) => ['approvals', 'workflow', workflowId] as const,
  },
  
  // Configuration
  config: {
    all: ['config'] as const,
    company: (companyId: string) => ['config', 'company', companyId] as const,
    users: (companyId: string) => ['config', 'users', companyId] as const,
    permissions: (userId: string) => ['config', 'permissions', userId] as const,
    settings: (companyId: string) => ['config', 'settings', companyId] as const,
    features: (companyId: string) => ['config', 'features', companyId] as const,
  },
  
  // Reports
  reports: {
    all: ['reports'] as const,
    list: (companyId: string) => ['reports', companyId] as const,
    detail: (reportId: string) => ['reports', 'detail', reportId] as const,
    generate: (type: string, params: Record<string, unknown>) => 
      ['reports', 'generate', type, params] as const,
  },
} as const;

/**
 * Query key utilities
 */
export const queryKeyUtils = {
  /**
   * Check if a query key matches a pattern
   */
  matches: (key: QueryKey, pattern: QueryKey): boolean => {
    return JSON.stringify(key).startsWith(JSON.stringify(pattern));
  },
  
  /**
   * Extract the entity type from a query key
   */
  getEntityType: (key: QueryKey): string | null => {
    const [entity] = key;
    return typeof entity === 'string' ? entity : null;
  },
  
  /**
   * Extract the ID from a query key
   */
  getId: (key: QueryKey): string | null => {
    const id = key[key.length - 1];
    return typeof id === 'string' ? id : null;
  },
  
  /**
   * Get all keys for a specific entity
   */
  getEntityKeys: (entityType: string, companyId: string): QueryKey[] => {
    switch (entityType) {
      case 'customers':
        return [
          queryKeys.customers.all,
          queryKeys.customers.list(companyId),
          queryKeys.customers.stats(companyId),
          queryKeys.customers.active(companyId),
        ];
      case 'contracts':
        return [
          queryKeys.contracts.all,
          queryKeys.contracts.list(companyId),
          queryKeys.contracts.stats(companyId),
          queryKeys.contracts.active(companyId),
        ];
      default:
        return [];
    }
  },
};

export type QueryKeys = typeof queryKeys;
```

### Query Key Usage Examples

```typescript
// List queries
const { data } = useQuery({
  queryKey: queryKeys.customers.list(companyId, { status: 'active' }),
  queryFn: () => fetchCustomers(companyId, { status: 'active' }),
});

// Detail queries
const { data } = useQuery({
  queryKey: queryKeys.customers.detail(customerId),
  queryFn: () => fetchCustomer(customerId),
});

// Invalidation
queryClient.invalidateQueries({ 
  queryKey: queryKeys.customers.all 
});

// Scoped invalidation (only this company)
queryClient.invalidateQueries({ 
  queryKey: queryKeys.customers.list(companyId) 
});

// Related data invalidation
queryClient.invalidateQueries({ 
  queryKey: queryKeys.customers.contracts(customerId) 
});
```

---

## Server State Management

### Query Hook Pattern

All server state queries follow a consistent pattern:

```typescript
// src/hooks/queries/useCustomers.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface Customer {
  id: string;
  first_name_ar: string;
  last_name_ar: string;
  full_name: string;
  phone: string;
  email?: string;
  company_id: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  search?: string;
}

export interface CustomersListResponse {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Fetch customers from Supabase
 */
async function fetchCustomers(
  companyId: string,
  filters: CustomerFilters = {}
): Promise<CustomersListResponse> {
  const { page = 1, limit = 20, status, search } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId);

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`first_name_ar.ilike.%${search}%,last_name_ar.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    customers: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Fetch a single customer
 */
async function fetchCustomer(customerId: string): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Query hook for customers list
 */
export function useCustomers(filters: CustomerFilters = {}) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: queryKeys.customers.list(companyId || '', filters),
    queryFn: () => fetchCustomers(companyId || '', filters),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Query hook for single customer
 */
export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(customerId),
    queryFn: () => fetchCustomer(customerId),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation hook for creating customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({ ...data, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return customer;
    },
    onSuccess: () => {
      // Invalidate all customer queries
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

/**
 * Mutation hook for updating customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      const { data: customer, error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return customer;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific customer
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.customers.detail(variables.id) 
      });
      // Invalidate customer lists
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.customers.lists() 
      });
    },
  });
}

/**
 * Mutation hook for deleting customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
```

### Optimistic Updates Pattern

```typescript
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      const { data: customer, error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return customer;
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.customers.detail(id) 
      });

      // Snapshot previous value
      const previousCustomer = queryClient.getQueryData<Customer>(
        queryKeys.customers.detail(id)
      );

      // Optimistically update
      queryClient.setQueryData<Customer>(
        queryKeys.customers.detail(id),
        (old) => ({ ...old, ...data })
      );

      return { previousCustomer };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousCustomer) {
        queryClient.setQueryData(
          queryKeys.customers.detail(variables.id),
          context.previousCustomer
        );
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.customers.detail(variables.id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.customers.lists() 
      });
    },
  });
}
```

---

## Client UI State Management

### Zustand Store Refactored

Remove all entity state from Zustand. Keep only UI state:

```typescript
// src/stores/uiStore.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;

  // Modals
  modals: Record<string, boolean>;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;

  // Drawer
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;

  // Global loading
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Global error
  globalError: string | null;
  setGlobalError: (error: string | null) => void;
  clearGlobalError: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        // Theme
        theme: 'system',
        setTheme: (theme) => {
          set({ theme });
          // Apply theme to document
          const root = window.document.documentElement;
          if (theme === 'dark') {
            root.classList.add('dark');
          } else if (theme === 'light') {
            root.classList.remove('dark');
          } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', prefersDark);
          }
        },

        // Sidebar
        sidebarOpen: true,
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),

        // Notifications
        notifications: [],
        addNotification: (notification) => set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: `notif-${Date.now()}`,
              timestamp: new Date().toISOString(),
              read: false,
            },
          ],
        })),
        markAsRead: (id) => set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
        clearNotifications: () => set({ notifications: [] }),

        // Modals
        modals: {},
        openModal: (modalId) => set((state) => ({
          modals: { ...state.modals, [modalId]: true },
        })),
        closeModal: (modalId) => set((state) => ({
          modals: { ...state.modals, [modalId]: false },
        })),
        toggleModal: (modalId) => set((state) => ({
          modals: { ...state.modals, [modalId]: !state.modals[modalId] },
        })),

        // Drawer
        drawerOpen: false,
        setDrawerOpen: (open) => set({ drawerOpen: open }),

        // Global loading
        globalLoading: false,
        setGlobalLoading: (loading) => set({ globalLoading: loading }),

        // Global error
        globalError: null,
        setGlobalError: (error) => set({ globalError: error }),
        clearGlobalError: () => set({ globalError: null }),
      }),
      {
        name: 'fleetify-ui-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    )
  )
);

// Selectors for better performance
export const useTheme = () => useUIStore((state) => state.theme);
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);
export const useNotifications = () => useUIStore((state) => state.notifications);
export const useModals = () => useUIStore((state) => state.modals);
export const useGlobalLoading = () => useUIStore((state) => state.globalLoading);
export const useGlobalError = () => useUIStore((state) => state.globalError);
```

---

## Cache Invalidation Strategy

### Invalidation Hierarchy

```
queryKeys.customers.all
├─ queryKeys.customers.lists()
│  └─ queryKeys.customers.list(companyId, filters)
├─ queryKeys.customers.detail(customerId)
├─ queryKeys.customers.stats(companyId)
└─ queryKeys.customers.active(companyId)
```

### Invalidation Rules

| Action | Invalidation Scope | Query Keys |
|--------|-------------------|-------------|
| Create customer | All customer queries | `queryKeys.customers.all` |
| Update customer | Specific + lists | `queryKeys.customers.detail(id)` + `queryKeys.customers.lists()` |
| Delete customer | All customer queries | `queryKeys.customers.all` |
| Create contract | All contract + dashboard | `queryKeys.contracts.all` + `queryKeys.dashboard.all` |
| Update contract | Specific + related | `queryKeys.contracts.detail(id)` + `queryKeys.customers.contracts(customerId)` |
| Delete contract | All contract + dashboard | `queryKeys.contracts.all` + `queryKeys.dashboard.all` |

### Centralized Invalidation Utilities

```typescript
// src/lib/query-invalidation.ts

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

export class QueryInvalidator {
  constructor(private queryClient: QueryClient) {}

  /**
   * Invalidate all queries for an entity type
   */
  invalidateEntity(entity: keyof typeof queryKeys) {
    this.queryClient.invalidateQueries({ 
      queryKey: [entity] 
    });
  }

  /**
   * Invalidate all customer queries
   */
  invalidateCustomers(companyId?: string) {
    if (companyId) {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.customers.list(companyId) 
      });
    } else {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.customers.all 
      });
    }
  }

  /**
   * Invalidate all contract queries
   */
  invalidateContracts(companyId?: string) {
    if (companyId) {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.contracts.list(companyId) 
      });
    } else {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.contracts.all 
      });
    }
  }

  /**
   * Invalidate all vehicle queries
   */
  invalidateVehicles(companyId?: string) {
    if (companyId) {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.vehicles.list(companyId) 
      });
    } else {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.vehicles.all 
      });
    }
  }

  /**
   * Invalidate all invoice queries
   */
  invalidateInvoices(companyId?: string) {
    if (companyId) {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.invoices.list(companyId) 
      });
    } else {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.invoices.all 
      });
    }
  }

  /**
   * Invalidate all payment queries
   */
  invalidatePayments(companyId?: string) {
    if (companyId) {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.payments.list(companyId) 
      });
    } else {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.payments.all 
      });
    }
  }

  /**
   * Invalidate dashboard queries
   */
  invalidateDashboard(companyId?: string) {
    if (companyId) {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.dashboard.stats(companyId) 
      });
    } else {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.dashboard.all 
      });
    }
  }

  /**
   * Invalidate financial queries
   */
  invalidateFinance(companyId?: string) {
    this.queryClient.invalidateQueries({ 
      queryKey: queryKeys.finance.all 
    });
  }

  /**
   * Invalidate all queries (use sparingly)
   */
  invalidateAll() {
    this.queryClient.invalidateQueries();
  }
}

// Export factory function
export function createQueryInvalidator(queryClient: QueryClient) {
  return new QueryInvalidator(queryClient);
}
```

---

## Migration Plan

### Phase 1: Foundation (Week 1)

**Goal**: Set up the infrastructure without breaking existing code.

1. Create centralized query key factory
   - File: `src/lib/query-keys.ts`
   - Define all query keys using hierarchical pattern
   - Add TypeScript types

2. Create query invalidation utilities
   - File: `src/lib/query-invalidation.ts`
   - Implement `QueryInvalidator` class
   - Add entity-specific invalidation methods

3. Consolidate query client configuration
   - Merge `src/lib/query-client.ts` and `src/lib/queryClient.ts`
   - Keep the enhanced version with performance monitoring
   - Remove duplicate files

4. Update App.tsx to use consolidated query client
   - Import from single location
   - Ensure QueryClientProvider wraps the app

### Phase 2: API Hook Migration (Week 2-3)

**Goal**: Migrate all API hooks to use the new query key factory.

1. Migrate `useDashboardApi.ts`
   - Replace inline query keys with `queryKeys.dashboard.*`
   - Update invalidation logic
   - Test thoroughly

2. Migrate `useContractsApi.ts`
   - Replace inline query keys with `queryKeys.contracts.*`
   - Update invalidation logic
   - Test thoroughly

3. Migrate `useCustomersApi.ts`
   - Replace inline query keys with `queryKeys.customers.*`
   - Update invalidation logic
   - Test thoroughly

4. Migrate `useVehiclesApi.ts`
   - Replace inline query keys with `queryKeys.vehicles.*`
   - Update invalidation logic
   - Test thoroughly

5. Migrate `useInvoicesApi.ts`
   - Replace inline query keys with `queryKeys.invoices.*`
   - Update invalidation logic
   - Test thoroughly

6. Migrate remaining API hooks
   - Follow the same pattern
   - Ensure consistency

### Phase 3: Zustand Store Refactoring (Week 4)

**Goal**: Remove all server state from Zustand.

1. Create new `uiStore.ts`
   - Move only UI state from `appStore.ts`
   - Remove entity state (customers, vehicles, contracts, invoices)
   - Remove `useEntitySync` utility

2. Update all imports
   - Replace `useAppStore` with `useUIStore` for UI state
   - Replace entity state usage with React Query hooks

3. Deprecate old `appStore.ts`
   - Mark as deprecated
   - Add migration guide comments

4. Delete old `appStore.ts` after verification
   - Ensure no components use it
   - Run tests

### Phase 4: Context Refactoring (Week 5)

**Goal**: Remove server state from Context providers.

1. Audit all Context providers
   - Identify which contexts hold server state
   - Plan migration to React Query

2. Refactor contexts
   - Remove server state from contexts
   - Replace with React Query hooks
   - Keep only UI state in contexts

3. Update component usage
   - Replace context usage with React Query hooks
   - Test all affected components

### Phase 5: Cleanup and Optimization (Week 6)

**Goal**: Final cleanup and performance optimization.

1. Remove unused code
   - Delete `useEntitySync` utility
   - Remove manual state synchronization code
   - Clean up imports

2. Performance optimization
   - Review cache settings
   - Optimize query configurations
   - Add selective refetching

3. Documentation
   - Update developer documentation
   - Add usage examples
   - Create troubleshooting guide

4. Testing
   - Run full test suite
   - Manual testing of critical paths
   - Performance testing

---

## Implementation Guidelines

### When to Use React Query

✅ **Use React Query for:**
- Data fetched from APIs (backend or Supabase)
- Data that can change without user action
- Data that needs caching
- Data that needs to be synchronized across components
- Data with loading/error states

### When to Use Zustand

✅ **Use Zustand for:**
- UI preferences (theme, sidebar state)
- Modal/drawer states
- Form selections (temporary)
- Notification queue
- Any client-side only state

### When to Use React Hook Form

✅ **Use React Hook Form for:**
- Form inputs
- Form validation
- Form submission handling

### When to Use React Context

✅ **Use React Context for:**
- Auth session (user identity, authentication status)
- Feature flags
- Theme provider (for next-themes)
- Any truly global, rarely changing data

### Query Configuration Guidelines

```typescript
// Default query configuration
{
  staleTime: 5 * 60 * 1000,  // 5 minutes
  gcTime: 10 * 60 * 1000,    // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
  retry: (failureCount, error) => {
    // Don't retry on 4xx errors
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }
    return failureCount < 2;
  },
}

// For real-time data (vehicles, fleet status)
{
  staleTime: 30 * 1000,       // 30 seconds
  gcTime: 2 * 60 * 1000,      // 2 minutes
  refetchInterval: 60 * 1000,  // 1 minute
}

// For rarely changing data (company settings)
{
  staleTime: 60 * 60 * 1000,  // 1 hour
  gcTime: 24 * 60 * 60 * 1000, // 24 hours
}

// For user-specific data (preferences)
{
  staleTime: 15 * 60 * 1000,  // 15 minutes
  gcTime: 30 * 60 * 1000,     // 30 minutes
}
```

---

## Best Practices

### 1. Always Use Query Keys Factory

❌ **Don't do this:**
```typescript
useQuery({
  queryKey: ['customers', companyId, filters],
  queryFn: () => fetchCustomers(companyId, filters),
});
```

✅ **Do this:**
```typescript
useQuery({
  queryKey: queryKeys.customers.list(companyId, filters),
  queryFn: () => fetchCustomers(companyId, filters),
});
```

### 2. Invalidate at the Right Level

❌ **Don't do this:**
```typescript
// Invalidates everything
queryClient.invalidateQueries();
```

✅ **Do this:**
```typescript
// Invalidates only what's needed
queryClient.invalidateQueries({ 
  queryKey: queryKeys.customers.list(companyId) 
});
```

### 3. Use Selectors for Derived Data

❌ **Don't do this:**
```typescript
const { data } = useCustomers();
const activeCustomers = data?.customers.filter(c => c.status === 'active');
```

✅ **Do this:**
```typescript
const { data } = useCustomers({ status: 'active' });
```

### 4. Handle Errors Gracefully

```typescript
const { data, error, isLoading } = useQuery({
  queryKey: queryKeys.customers.list(companyId),
  queryFn: fetchCustomers,
  retry: (failureCount, error) => {
    // Don't retry on validation errors
    if (error?.status === 400) return false;
    // Retry up to 2 times
    return failureCount < 2;
  },
  onError: (error) => {
    // Show user-friendly error
    toast.error('Failed to load customers');
  },
});
```

### 5. Use Optimistic Updates for Better UX

```typescript
useMutation({
  mutationFn: updateCustomer,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ 
      queryKey: queryKeys.customers.detail(newData.id) 
    });
    const previous = queryClient.getQueryData(
      queryKeys.customers.detail(newData.id)
    );
    queryClient.setQueryData(
      queryKeys.customers.detail(newData.id),
      (old) => ({ ...old, ...newData })
    );
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(
      queryKeys.customers.detail(newData.id),
      context.previous
    );
  },
  onSettled: () => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.customers.detail(newData.id) 
    });
  },
});
```

### 6. Prefetch Data for Better Performance

```typescript
// In a parent component or route loader
useEffect(() => {
  queryClient.prefetchQuery({
    queryKey: queryKeys.customers.list(companyId),
    queryFn: () => fetchCustomers(companyId),
  });
}, [companyId, queryClient]);
```

---

## Appendix: File Structure

```
src/
├── lib/
│   ├── query-keys.ts           # NEW: Centralized query key factory
│   ├── query-invalidation.ts   # NEW: Query invalidation utilities
│   ├── query-client.ts         # Consolidated query client
│   └── api/
│       └── client.ts           # API client (unchanged)
├── stores/
│   ├── uiStore.ts             # NEW: UI-only Zustand store
│   ├── appStore.ts            # DEPRECATED: To be removed
│   └── index.ts              # DEPRECATED: To be removed
├── hooks/
│   ├── queries/               # NEW: React Query hooks
│   │   ├── useCustomers.ts
│   │   ├── useContracts.ts
│   │   ├── useVehicles.ts
│   │   ├── useInvoices.ts
│   │   ├── usePayments.ts
│   │   ├── useDashboard.ts
│   │   └── useFinance.ts
│   └── api/                  # EXISTING: To be migrated
│       ├── useDashboardApi.ts
│       ├── useContractsApi.ts
│       ├── useCustomersApi.ts
│       └── ...
└── contexts/
    ├── AuthContext.ts         # Keep: Auth session only
    ├── CompanyContext.ts      # Refactor: Remove server state
    ├── FinanceContext.ts      # Refactor: Remove server state
    └── ...
```

---

## Summary

This architecture establishes React Query as the **single source of truth** for all server state, while Zustand manages only client UI state. The key benefits are:

1. **No Redundancy**: Eliminates duplicate state management
2. **Clear Separation**: Server state vs. UI state is well-defined
3. **Consistent Patterns**: Query key factory ensures consistency
4. **Better Performance**: Optimized caching and refetching
5. **Easier Maintenance**: Centralized query management
6. **Type Safety**: Full TypeScript support throughout

The migration plan provides a phased approach to implement this architecture without disrupting existing functionality.
