# Zustand Usage Restriction and React Query Migration Plan

## Executive Summary

This document defines the scope for Zustand stores, identifies which state should remain in Zustand versus migrate to React Query, and provides a detailed migration path for server state currently managed in Zustand stores.

## Current State Analysis

### Existing Zustand Stores

The codebase currently has **two** Zustand stores:

1. **[`src/stores/index.ts`](../src/stores/index.ts)** - Main centralized store with:
   - Auth state (user, isAuthenticated, isLoading)
   - Company state
   - UI state (theme, sidebarOpen, notifications)
   - **Server state** (customers, vehicles, contracts, invoices) - using normalized entity pattern

2. **[`src/stores/appStore.ts`](../src/stores/appStore.ts)** - Secondary app store with:
   - User state
   - Company state
   - Notifications
   - UI state (sidebarOpen, globalLoading, globalError)

### React Query Usage

React Query (`@tanstack/react-query`) is **already extensively used** across the codebase:
- Query client configured in [`src/lib/queryClient.ts`](../src/lib/queryClient.ts) and [`src/lib/query-client.ts`](../src/lib/query-client.ts)
- Custom hooks using React Query: [`useCustomers`](../src/hooks/useCustomers.ts), [`useVehicles`](../src/hooks/useVehicles.ts), [`useContracts`](../src/hooks/useContracts.ts), [`useInvoices`](../src/hooks/finance/useInvoices.ts)
- Query keys factory pattern established for cache management

### Problem Statement

**Duplicate state management**: The same data (customers, vehicles, contracts, invoices) is being managed in both:
1. Zustand stores (via normalized entity pattern)
2. React Query (via custom hooks)

This leads to:
- State synchronization issues
- Increased complexity
- Potential data inconsistencies
- Unnecessary re-renders

---

## 1. Zustand Scope Definition

### State Types Classification

| State Type | Should Be In | Rationale |
|------------|--------------|-----------|
| **Client UI State** | Zustand | Local, transient, user interactions |
| **Server State** | React Query | Async, cached, needs synchronization |
| **Global App State** | Zustand | Cross-component, non-async |
| **Form State** | Component State | Local to form, short-lived |

### State That Must Remain in Zustand

#### 1.1 UI State
```typescript
interface UIState {
  // Theme preferences
  theme: 'light' | 'dark' | 'system';
  
  // Layout state
  sidebarOpen: boolean;
  
  // Browsing mode (for multi-company access)
  browsingMode: boolean;
  browsedCompanyId?: string;
}
```

**Rationale**: These are pure client-side UI preferences that:
- Don't need synchronization with server
- Change frequently during user interaction
- Should persist across sessions (via localStorage)
- Don't require caching or deduplication

#### 1.2 Global Loading State
```typescript
interface GlobalLoadingState {
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
}
```

**Rationale**: Application-level loading state that:
- Spans multiple components
- Is not tied to specific data fetching
- Provides user feedback during app initialization

#### 1.3 Notifications
```typescript
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  autoClose?: boolean;
}

interface NotificationsState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}
```

**Rationale**: Toast notifications are:
- Ephemeral client-side messages
- Not persisted to server
- Managed entirely in the UI layer

#### 1.4 Feature Flags
```typescript
interface FeatureFlagsState {
  featureFlags: Record<string, boolean>;
  setFeatureFlag: (key: string, value: boolean) => void;
}
```

**Rationale**: Feature flags that:
- Control UI visibility
- Are loaded once at app startup
- Don't change frequently during user session

#### 1.5 Auth/User State (Debated)
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User | null) => void;
  resetAuth: () => void;
}
```

**Note**: Auth state could also be managed via React Query, but keeping it in Zustand is acceptable because:
- It's a singleton global state
- Changes infrequently
- Many components need immediate access
- Already well-established pattern in the codebase

### State That MUST Migrate to React Query

#### Server State (Currently in Zustand)
```typescript
// ❌ REMOVE from Zustand - These are server state
customers: NormalizedState<any>;
vehicles: NormalizedState<any>;
contracts: NormalizedState<any>;
invoices: NormalizedState<any>;
```

**Rationale**: These are server state because they:
- Come from API/database
- Need caching and deduplication
- Require background refetching
- Have stale/fresh semantics
- Need optimistic updates
- Are shared across multiple components

---

## 2. Migration Path for Server State

### 2.1 Phase 1: Preparation (No Breaking Changes)

**Goal**: Set up React Query hooks without removing Zustand functionality

#### Actions:
1. **Create React Query hooks** for all entities (if not already existing):
   - [`useCustomers`](../src/hooks/useCustomers.ts) - ✅ Already exists
   - [`useVehicles`](../src/hooks/useVehicles.ts) - ✅ Already exists
   - [`useContracts`](../src/hooks/useContracts.ts) - ✅ Already exists
   - [`useInvoices`](../src/hooks/finance/useInvoices.ts) - ✅ Already exists

2. **Create migration utilities** in [`src/stores/migration-utils.ts`](../src/stores/migration-utils.ts):
```typescript
/**
 * Migration utilities to help transition from Zustand to React Query
 */

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';

/**
 * Hydrate Zustand store from React Query cache
 * Use this during transition period to maintain compatibility
 */
export function hydrateZustandFromQueryCache(entityType: 'customers' | 'vehicles' | 'contracts' | 'invoices') {
  const queryClient = useQueryClient();
  
  // Get data from React Query cache
  const cacheKey = queryKeys[entityType].all();
  const cachedData = queryClient.getQueryData(cacheKey);
  
  if (cachedData) {
    // Update Zustand store with cached data
    // This ensures components still using Zustand get correct data
  }
}

/**
 * Invalidate React Query when Zustand state changes
 * Use this during transition period to sync state
 */
export function syncZustandToQueryCache(entityType: string, data: any[]) {
  const queryClient = useQueryClient();
  
  // Update React Query cache with Zustand state
  const cacheKey = queryKeys[entityType].all();
  queryClient.setQueryData(cacheKey, data);
}
```

3. **Add deprecation warnings** to Zustand entity selectors:
```typescript
// In src/stores/index.ts
export const useCustomers = createEntitySelector('customers');

// Add deprecation warning
export const useCustomers = () => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️ useCustomers from Zustand is deprecated. ' +
      'Use useCustomers hook from @/hooks/useCustomers.ts instead. ' +
      'This will be removed in a future version.'
    );
  }
  return createEntitySelector('customers')();
};
```

### 2.2 Phase 2: Component Migration (Gradual Rollout)

**Goal**: Migrate components from Zustand to React Query one at a time

#### Migration Strategy:

1. **Identify components using Zustand entity selectors**:
   ```bash
   # Search for usages
   grep -r "useCustomers\|useVehicles\|useContracts\|useInvoices" src/ --include="*.tsx" --include="*.ts"
   ```

2. **Prioritize components by usage**:
   - **High priority**: Frequently accessed, performance-critical
   - **Medium priority**: Moderately used
   - **Low priority**: Rarely used, simple components

3. **Migration pattern for each component**:

   **Before (Zustand)**:
   ```typescript
   import { useCustomers } from '@/stores';
   
   function CustomerList() {
     const { entities, ids, isLoading } = useCustomers();
     const customers = ids.map(id => entities[id]);
     
     if (isLoading) return <Spinner />;
     return <CustomerGrid customers={customers} />;
   }
   ```

   **After (React Query)**:
   ```typescript
   import { useCustomers } from '@/hooks/useCustomers';
   
   function CustomerList() {
     const { data: customers, isLoading } = useCustomers();
     
     if (isLoading) return <Spinner />;
     return <CustomerGrid customers={customers || []} />;
   }
   ```

4. **Test each migrated component**:
   - Verify data loads correctly
   - Check loading states
   - Test error handling
   - Ensure optimistic updates work

### 2.3 Phase 3: Cleanup

**Goal**: Remove deprecated Zustand code

#### Actions:
1. **Remove normalized entity state** from [`src/stores/index.ts`](../src/stores/index.ts):
   ```typescript
   // ❌ Remove these
   customers: NormalizedState<any>;
   vehicles: NormalizedState<any>;
   contracts: NormalizedState<any>;
   invoices: NormalizedState<any>;
   
   // ❌ Remove these actions
   setEntity, removeEntity, setEntityLoading, setEntityError, setEntities
   ```

2. **Remove entity selectors**:
   ```typescript
   // ❌ Remove these
   export const useCustomers = createEntitySelector('customers');
   export const useVehicles = createEntitySelector('vehicles');
   export const useContracts = createEntitySelector('contracts');
   export const useInvoices = createEntitySelector('invoices');
   ```

3. **Remove migration utilities**:
   - Delete [`src/stores/migration-utils.ts`](../src/stores/migration-utils.ts)

4. **Update documentation**:
   - Update architecture docs
   - Update onboarding guides
   - Remove deprecated examples

---

## 3. Refactoring `src/stores/index.ts`

### 3.1 Current Structure (To Be Removed)

```typescript
// ❌ REMOVE - Normalized entity pattern
export interface NormalizedState<T> {
  entities: Record<string, T>;
  ids: string[];
  loading: Record<string, boolean>;
  error: Record<string, Error | null>;
}

// ❌ REMOVE - Entity state
customers: NormalizedState<any>;
vehicles: NormalizedState<any>;
contracts: NormalizedState<any>;
invoices: NormalizedState<any>;

// ❌ REMOVE - Entity actions
setEntity: <T>(entityType: ..., id: string, data: T) => void;
removeEntity: (entityType: ..., id: string) => void;
setEntityLoading: (entityType: ..., id: string, loading: boolean) => void;
setEntityError: (entityType: ..., id: string, error: Error | null) => void;
setEntities: <T>(entityType: ..., entities: T[]) => void;
resetEntities: () => void;

// ❌ REMOVE - Entity selectors
export const useCustomers = createEntitySelector('customers');
export const useVehicles = createEntitySelector('vehicles');
export const useContracts = createEntitySelector('contracts');
export const useInvoices = createEntitySelector('invoices');
```

### 3.2 New Minimal Structure

```typescript
/**
 * Minimal Zustand Store - Client State Only
 * 
 * This store manages ONLY client-side UI state.
 * All server state is managed by React Query.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export type Theme = 'light' | 'dark' | 'system';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  autoClose?: boolean;
}

export interface FeatureFlags {
  [key: string]: boolean;
}

// Store interface
export interface UIStore {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Global loading
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  
  // Feature flags
  featureFlags: FeatureFlags;
  setFeatureFlag: (key: string, value: boolean) => void;
  setFeatureFlags: (flags: FeatureFlags) => void;
  
  // Browsing mode (for multi-company access)
  browsingMode: boolean;
  setBrowsingMode: (enabled: boolean) => void;
  browsedCompanyId: string | null;
  setBrowsedCompanyId: (companyId: string | null) => void;
}

// Create store
export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        theme: 'system',
        sidebarOpen: true,
        notifications: [],
        globalLoading: false,
        featureFlags: {},
        browsingMode: false,
        browsedCompanyId: null,
        
        // Theme actions
        setTheme: (theme) => {
          set({ theme });
          // Apply theme to document
          const root = window.document.documentElement;
          if (theme === 'dark') {
            root.classList.add('dark');
          } else if (theme === 'light') {
            root.classList.remove('dark');
          } else {
            // system theme
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', prefersDark);
          }
        },
        
        // Sidebar actions
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        
        // Notification actions
        addNotification: (notification) => {
          const id = Date.now().toString();
          const newNotification: Notification = {
            ...notification,
            id,
            timestamp: new Date(),
            read: false,
            autoClose: notification.type === 'success',
          };
          
          set((state) => ({
            notifications: [newNotification, ...state.notifications],
          }));
          
          // Auto close after 5 seconds
          if (newNotification.autoClose) {
            setTimeout(() => {
              useUIStore.getState().markNotificationRead(id);
              setTimeout(() => {
                set((state) => ({
                  notifications: state.notifications.filter(n => n.id !== id),
                }));
              }, 1000);
            }, 5000);
          }
        },
        
        markNotificationRead: (id) => {
          set((state) => ({
            notifications: state.notifications.map(n =>
              n.id === id ? { ...n, read: true } : n
            ),
          }));
        },
        
        clearNotifications: () => set({ notifications: [] }),
        
        // Global loading actions
        setGlobalLoading: (loading) => set({ globalLoading: loading }),
        
        // Feature flags actions
        setFeatureFlag: (key, value) => set((state) => ({
          featureFlags: { ...state.featureFlags, [key]: value },
        })),
        
        setFeatureFlags: (flags) => set({ featureFlags: flags }),
        
        // Browsing mode actions
        setBrowsingMode: (enabled) => set({ browsingMode: enabled, browsedCompanyId: null }),
        setBrowsedCompanyId: (companyId) => set({ browsedCompanyId: companyId }),
      }),
      {
        name: 'fleetify-ui-store',
        version: 2,
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          featureFlags: state.featureFlags,
          // Don't persist notifications or globalLoading
        }),
      }
    ),
    { name: 'ui-store' }
  )
);

// Selectors for efficient state access
export const useTheme = () => useUIStore((state) => state.theme);
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);
export const useNotifications = () => useUIStore((state) => state.notifications);
export const useUnreadNotifications = () => useUIStore((state) => 
  state.notifications.filter(n => !n.read)
);
export const useGlobalLoading = () => useUIStore((state) => state.globalLoading);
export const useFeatureFlags = () => useUIStore((state) => state.featureFlags);
export const useBrowsingMode = () => useUIStore((state) => ({
  browsingMode: state.browsingMode,
  browsedCompanyId: state.browsedCompanyId,
}));
```

---

## 4. New Minimal Zustand Store Structure

### 4.1 Store Organization

After migration, the Zustand store structure will be:

```
src/stores/
├── index.ts          # Main UI store (minimal)
├── authStore.ts      # Auth state (optional - could be React Query)
└── types.ts          # Shared types
```

### 4.2 Store Responsibilities

| Store | Purpose | State |
|--------|---------|--------|
| **UI Store** | Client-side UI state | theme, sidebarOpen, notifications, globalLoading, featureFlags, browsingMode |
| **Auth Store** (optional) | Authentication state | user, isAuthenticated, isLoading |

### 4.3 What's NOT in Zustand Anymore

```typescript
// ❌ REMOVED - These are now managed by React Query
- customers (entities, ids, loading, error)
- vehicles (entities, ids, loading, error)
- contracts (entities, ids, loading, error)
- invoices (entities, ids, loading, error)
- Normalized entity pattern
- Entity CRUD actions (setEntity, removeEntity, etc.)
```

---

## 5. Migration Checklist

### Phase 1: Preparation
- [ ] Create migration utilities in `src/stores/migration-utils.ts`
- [ ] Add deprecation warnings to Zustand entity selectors
- [ ] Document migration process for team
- [ ] Create test plan for migrated components

### Phase 2: Component Migration
- [ ] Identify all components using Zustand entity selectors
- [ ] Prioritize components by usage/complexity
- [ ] Migrate high-priority components
- [ ] Test each migrated component
- [ ] Migrate medium-priority components
- [ ] Test each migrated component
- [ ] Migrate low-priority components
- [ ] Test each migrated component

### Phase 3: Cleanup
- [ ] Remove normalized entity state from `src/stores/index.ts`
- [ ] Remove entity actions from `src/stores/index.ts`
- [ ] Remove entity selectors from `src/stores/index.ts`
- [ ] Remove `NormalizedState` type
- [ ] Remove migration utilities
- [ ] Update architecture documentation
- [ ] Update onboarding guides
- [ ] Remove deprecated examples from codebase

---

## 6. Benefits of This Migration

### 6.1 Performance Improvements
- **Reduced re-renders**: React Query's fine-grained subscriptions
- **Better caching**: Built-in stale/fresh data management
- **Request deduplication**: Automatic duplicate request prevention
- **Optimistic updates**: Built-in support for optimistic UI

### 6.2 Code Quality
- **Single source of truth**: No more state synchronization issues
- **Type safety**: Better TypeScript integration with React Query
- **Separation of concerns**: Client vs server state clearly separated
- **Reduced complexity**: Less boilerplate code

### 6.3 Developer Experience
- **Standard patterns**: React Query is industry standard
- **Better debugging**: React Query DevTools
- **Easier testing**: Mocking server state is simpler
- **Clearer architecture**: State management responsibilities are clear

---

## 7. Risks and Mitigation

### Risk 1: Breaking Changes During Migration
**Mitigation**: Use gradual migration with compatibility layer (migration utilities)

### Risk 2: Performance Regression
**Mitigation**: Benchmark before/after, use React Query's built-in optimizations

### Risk 3: Lost Optimistic Updates
**Mitigation**: Implement optimistic updates in React Query mutations

### Risk 4: Cache Invalidation Issues
**Mitigation**: Use established query key patterns and invalidation utilities

---

## 8. Timeline Estimate

| Phase | Duration | Description |
|-------|----------|-------------|
| Phase 1: Preparation | 1-2 days | Set up migration utilities, add warnings |
| Phase 2: Component Migration | 1-2 weeks | Migrate all components gradually |
| Phase 3: Cleanup | 1-2 days | Remove deprecated code |

**Total**: 2-3 weeks

---

## 9. Success Criteria

- [ ] All server state (customers, vehicles, contracts, invoices) managed by React Query
- [ ] Zustand store contains only UI state (theme, sidebar, notifications, etc.)
- [ ] No state synchronization issues
- [ ] Performance is maintained or improved
- [ ] All tests pass
- [ ] Documentation updated

---

## Appendix A: Query Key Patterns

### Existing Query Keys (from [`src/lib/queryClient.ts`](../src/lib/queryClient.ts))

```typescript
export const queryKeys = {
  contracts: {
    all: (companyId?: string) => ['contracts', companyId] as const,
    detail: (id: string) => ['contract', id] as const,
    byCustomer: (customerId: string) => ['contracts', 'customer', customerId] as const,
    stats: (companyId: string) => ['contract-stats', companyId] as const,
    active: (companyId: string) => ['contracts', 'active', companyId] as const,
    expiring: (companyId: string, days: number) => ['contracts', 'expiring', companyId, days] as const,
  },
  customers: {
    all: (companyId?: string) => ['customers', companyId] as const,
    detail: (id: string) => ['customer', id] as const,
    search: (query: string, companyId?: string) => ['customers', 'search', query, companyId] as const,
    active: (companyId: string) => ['customers', 'active', companyId] as const,
  },
  vehicles: {
    all: (companyId?: string) => ['vehicles', companyId] as const,
    detail: (id: string) => ['vehicle', id] as const,
    available: (companyId: string) => ['vehicles', 'available', companyId] as const,
    byStatus: (companyId: string, status: string) => ['vehicles', 'status', companyId, status] as const,
    location: (companyId: string) => ['vehicles', 'location', companyId] as const,
  },
  invoices: {
    all: (companyId?: string) => ['invoices', companyId] as const,
    detail: (id: string) => ['invoice', id] as const,
    pending: (companyId: string) => ['invoices', 'pending', companyId] as const,
    overdue: (companyId: string) => ['invoices', 'overdue', companyId] as const,
    byStatus: (companyId: string, status: string) => ['invoices', 'status', companyId, status] as const,
  },
};
```

---

## Appendix B: Example Migration

### Before (Zustand)

```typescript
// src/pages/customers/CustomersPage.tsx
import { useCustomers } from '@/stores';

function CustomersPage() {
  const { entities, ids, isLoading } = useCustomers();
  const customers = ids.map(id => entities[id]);
  
  if (isLoading) return <Spinner />;
  
  return (
    <div>
      {customers.map(customer => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
}
```

### After (React Query)

```typescript
// src/pages/customers/CustomersPage.tsx
import { useCustomers } from '@/hooks/useCustomers';

function CustomersPage() {
  const { data: customers, isLoading } = useCustomers();
  
  if (isLoading) return <Spinner />;
  
  return (
    <div>
      {customers?.map(customer => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
}
```

---

## Appendix C: References

- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [React Query vs Zustand](https://tkdodo.eu/blog/react-query-vs-zustand)
- [State Management Best Practices](https://kentcdodds.com/blog/application-state-management-for-react)
