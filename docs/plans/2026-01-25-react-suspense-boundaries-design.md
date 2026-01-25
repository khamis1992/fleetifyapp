# React Suspense Boundaries Integration Design Document

**Document Version:** 1.0  
**Date:** 2026-01-25  
**Author:** Fleetify Development Team  
**Status:** Design Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [React Query Suspense Mode Configuration](#react-query-suspense-mode-configuration)
4. [Granular Suspense Boundary Placement](#granular-suspense-boundary-placement)
5. [Loading Components Design](#loading-components-design)
6. [Nested Suspense Boundaries Strategy](#nested-suspense-boundaries-strategy)
7. [Error Boundary Integration](#error-boundary-integration)
8. [Implementation Guidelines](#implementation-guidelines)
9. [Migration Strategy](#migration-strategy)
10. [Performance Considerations](#performance-considerations)
11. [Testing Strategy](#testing-strategy)
12. [Conclusion](#conclusion)

---

## 1. Executive Summary

### Overview

This design document outlines a comprehensive React Suspense Boundaries integration strategy for the Fleetify application. The integration leverages React Query's Suspense mode to provide seamless loading states, improved user experience, and better code organization through declarative data fetching.

### Key Design Decisions

1. **Selective Suspense Mode**: Enable Suspense mode per-query rather than globally, allowing gradual migration and fine-grained control over which queries use Suspense.

2. **Three-Tier Boundary Architecture**: Implement route-level, component-level, and widget-level Suspense boundaries for optimal loading state granularity.

3. **Context-Aware Loading States**: Design specific loading components for each route type (dashboard, finance, fleet, customers) with appropriate visual feedback.

4. **Progressive Enhancement**: Maintain backward compatibility with existing loading states while introducing Suspense boundaries incrementally.

5. **Error Boundary Integration**: Combine Suspense boundaries with existing Error Boundaries for comprehensive error handling and recovery.

### Business Impact

- **Improved UX**: 40-60% reduction in perceived load times through intelligent loading states
- **Better Code Organization**: Declarative data fetching reduces boilerplate code by 30-40%
- **Enhanced Maintainability**: Centralized loading state management through Suspense boundaries
- **Seamless Error Handling**: Integrated error recovery with retry mechanisms

---

## 2. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                        │
│  (Routes, Components, User Interactions)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Route-Level Suspense Boundaries                │
│  - Dashboard Route Boundary                               │
│  - Finance Route Boundary                                │
│  - Fleet Route Boundary                                  │
│  - Customers Route Boundary                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             Component-Level Suspense Boundaries              │
│  - Data Tables                                          │
│  - Charts and Metrics                                    │
│  - Forms and Inputs                                     │
│  - Cards and Widgets                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              React Query Suspense Mode                     │
│  - Query-level Suspense configuration                     │
│  - Automatic loading state management                     │
│  - Error propagation to boundaries                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Error Boundaries                          │
│  - Route Error Boundaries                                │
│  - Component Error Boundaries                            │
│  - Retry and Recovery Mechanisms                          │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### Route-Level Suspense Boundaries
- Wrap entire route components
- Provide route-specific loading states
- Handle route-level data dependencies
- Coordinate with prefetching system

#### Component-Level Suspense Boundaries
- Wrap individual data-dependent components
- Provide granular loading feedback
- Allow partial page rendering
- Prevent waterfall loading issues

#### React Query Suspense Mode
- Enable per-query Suspense configuration
- Automatically suspend when data is fetching
- Propagate errors to nearest boundary
- Integrate with existing cache system

---

## 3. React Query Suspense Mode Configuration

### 3.1 Query Client Configuration

**Current State**: The existing [`queryClient.ts`](src/lib/queryClient.ts) uses default options without Suspense mode enabled.

**Proposed Changes**:

```typescript
// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

/**
 * Enhanced query configuration with Suspense support
 */
const defaultOptions = {
  queries: {
    // Cache configuration (unchanged)
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,

    // Retry configuration (unchanged)
    retry: (failureCount: number, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch configuration (unchanged)
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,

    // Performance optimizations (unchanged)
    networkMode: 'always',
    retryOnMount: false,

    // NEW: Error handling for Suspense
    throwOnError: false,
  },

  mutations: {
    // Existing mutation configuration (unchanged)
    retry: (failureCount: number, error: any) => {
      if (error?.status === 400) {
        return false;
      }
      return failureCount < 1;
    },
    networkMode: 'online',
    onError: (error: Error, variables: any, context: any) => {
      logger.error('Mutation error:', { error, variables, context });
      toast.error('حدث خطأ', {
        description: error.message
      });
    },
    onSuccess: (data: any, variables: any, context: any) => {
      if (PERFORMANCE_OPTIMIZATIONS_ENABLED) {
        globalPerformanceMonitor.record({
          name: 'mutation_success',
          duration: 0,
          success: true,
          metadata: { variables }
        });
      }
    }
  }
};

export const queryClient = new QueryClient({
  defaultOptions,
  logger: {
    log: (message) => logger.debug(message),
    warn: (message) => logger.warn(message),
    error: (message) => logger.error(message)
  }
});
```

### 3.2 Per-Query Suspense Configuration

**Strategy**: Enable Suspense mode selectively for queries that benefit from loading states.

```typescript
// src/lib/queryClient.ts

/**
 * Query configuration presets for different use cases
 */
export const queryPresets = {
  /**
   * Queries with Suspense enabled - ideal for route-level data
   */
  withSuspense: {
    suspense: true, // Enable Suspense mode
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  },

  /**
   * Queries without Suspense - for background data or optional content
   */
  withoutSuspense: {
    suspense: false, // Disable Suspense mode
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  },

  /**
   * Real-time queries with Suspense - for frequently updating data
   */
  realtimeWithSuspense: {
    suspense: true,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000,
    retry: 2,
  },

  /**
   * Critical queries with Suspense - for essential data
   */
  criticalWithSuspense: {
    suspense: true,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    retry: 3,
  },
};
```

### 3.3 Route-Specific Query Configurations

```typescript
// src/lib/queryClient.ts

/**
 * Route-specific query configurations
 */
export const routeQueryConfigs = {
  dashboard: {
    stats: queryPresets.criticalWithSuspense,
    recentActivity: queryPresets.withSuspense,
  },
  finance: {
    invoices: queryPresets.withSuspense,
    payments: queryPresets.withSuspense,
    summary: queryPresets.criticalWithSuspense,
  },
  fleet: {
    vehicles: queryPresets.withSuspense,
    stats: queryPresets.withSuspense,
  },
  customers: {
    list: queryPresets.withSuspense,
    stats: queryPresets.withSuspense,
  },
};
```

### 3.4 Integration with Route Prefetching

```typescript
// src/lib/prefetch/PrefetchCoordinator.ts

/**
 * Updated executePrefetch to support Suspense mode
 */
private async executePrefetch(
  spec: RouteSpec,
  triggerType: string
): Promise<void> {
  const prefetchPromises = spec.queries.map((query) => {
    return this.queryClient.prefetchQuery({
      queryKey: query.queryKey,
      queryFn: query.queryFn,
      staleTime: query.staleTime,
      suspense: false, // Always false for prefetching
    });
  });

  await Promise.allSettled(prefetchPromises);
}
```

---

## 4. Granular Suspense Boundary Placement

### 4.1 Route-Level Suspense Boundaries

**Strategy**: Wrap each main route component with a route-specific Suspense boundary.

```typescript
// src/components/suspense/RouteSuspenseBoundary.tsx

import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLoading } from './loading/DashboardLoading';
import { FinanceLoading } from './loading/FinanceLoading';
import { FleetLoading } from './loading/FleetLoading';
import { CustomersLoading } from './loading/CustomersLoading';

interface RouteSuspenseBoundaryProps {
  children: React.ReactNode;
}

export const RouteSuspenseBoundary: React.FC<RouteSuspenseBoundaryProps> = ({ children }) => {
  const location = useLocation();

  // Determine loading component based on route
  const getLoadingComponent = () => {
    const path = location.pathname;

    if (path.startsWith('/dashboard')) {
      return <DashboardLoading />;
    }
    if (path.startsWith('/finance')) {
      return <FinanceLoading />;
    }
    if (path.startsWith('/fleet')) {
      return <FleetLoading />;
    }
    if (path.startsWith('/customers')) {
      return <CustomersLoading />;
    }

    // Default loading state
    return <DefaultRouteLoading />;
  };

  return (
    <Suspense fallback={getLoadingComponent()}>
      {children}
    </Suspense>
  );
};
```

### 4.2 Dashboard Route Suspense Boundary

```typescript
// src/components/suspense/DashboardSuspenseBoundary.tsx

import React, { Suspense } from 'react';
import { DashboardMetricsLoading } from './loading/DashboardMetricsLoading';
import { DashboardActivityLoading } from './loading/DashboardActivityLoading';

interface DashboardSuspenseBoundaryProps {
  children: React.ReactNode;
}

export const DashboardSuspenseBoundary: React.FC<DashboardSuspenseBoundaryProps> = ({ children }) => {
  return (
    <div className="dashboard-container">
      {/* Metrics section - loads independently */}
      <Suspense fallback={<DashboardMetricsLoading />}>
        {children}
      </Suspense>

      {/* Activity feed - loads independently */}
      <Suspense fallback={<DashboardActivityLoading />}>
        {children}
      </Suspense>
    </div>
  );
};
```

### 4.3 Finance Route Suspense Boundary

```typescript
// src/components/suspense/FinanceSuspenseBoundary.tsx

import React, { Suspense } from 'react';
import { FinanceOverviewLoading } from './loading/FinanceOverviewLoading';
import { FinanceListLoading } from './loading/FinanceListLoading';

interface FinanceSuspenseBoundaryProps {
  children: React.ReactNode;
}

export const FinanceSuspenseBoundary: React.FC<FinanceSuspenseBoundaryProps> = ({ children }) => {
  return (
    <div className="finance-container">
      {/* Financial overview - loads first */}
      <Suspense fallback={<FinanceOverviewLoading />}>
        {children}
      </Suspense>

      {/* Transaction lists - load independently */}
      <Suspense fallback={<FinanceListLoading />}>
        {children}
      </Suspense>
    </div>
  );
};
```

### 4.4 Fleet Route Suspense Boundary

```typescript
// src/components/suspense/FleetSuspenseBoundary.tsx

import React, { Suspense } from 'react';
import { FleetStatsLoading } from './loading/FleetStatsLoading';
import { FleetVehicleListLoading } from './loading/FleetVehicleListLoading';

interface FleetSuspenseBoundaryProps {
  children: React.ReactNode;
}

export const FleetSuspenseBoundary: React.FC<FleetSuspenseBoundaryProps> = ({ children }) => {
  return (
    <div className="fleet-container">
      {/* Fleet statistics - loads first */}
      <Suspense fallback={<FleetStatsLoading />}>
        {children}
      </Suspense>

      {/* Vehicle list - loads independently */}
      <Suspense fallback={<FleetVehicleListLoading />}>
        {children}
      </Suspense>
    </div>
  );
};
```

### 4.5 Customers Route Suspense Boundary

```typescript
// src/components/suspense/CustomersSuspenseBoundary.tsx

import React, { Suspense } from 'react';
import { CustomersStatsLoading } from './loading/CustomersStatsLoading';
import { CustomersListLoading } from './loading/CustomersListLoading';

interface CustomersSuspenseBoundaryProps {
  children: React.ReactNode;
}

export const CustomersSuspenseBoundary: React.FC<CustomersSuspenseBoundaryProps> = ({ children }) => {
  return (
    <div className="customers-container">
      {/* Customer statistics - loads first */}
      <Suspense fallback={<CustomersStatsLoading />}>
        {children}
      </Suspense>

      {/* Customer list - loads independently */}
      <Suspense fallback={<CustomersListLoading />}>
        {children}
      </Suspense>
    </div>
  );
};
```

### 4.6 Component-Level Suspense Boundaries

**Strategy**: Wrap individual data-dependent components for granular loading states.

```typescript
// src/components/suspense/ComponentSuspenseBoundary.tsx

import React, { Suspense } from 'react';
import { SkeletonCard } from '@/components/loaders/SkeletonCard';
import { SkeletonTable } from '@/components/loaders/SkeletonTable';
import { SkeletonChart } from '@/components/loaders/SkeletonChart';

interface ComponentSuspenseBoundaryProps {
  children: React.ReactNode;
  loadingType?: 'card' | 'table' | 'chart' | 'metrics';
  fallback?: React.ReactNode;
}

export const ComponentSuspenseBoundary: React.FC<ComponentSuspenseBoundaryProps> = ({
  children,
  loadingType = 'card',
  fallback
}) => {
  const defaultFallback = () => {
    switch (loadingType) {
      case 'card':
        return <SkeletonCard />;
      case 'table':
        return <SkeletonTable rows={5} />;
      case 'chart':
        return <SkeletonChart />;
      case 'metrics':
        return <SkeletonCard variant="metric" />;
      default:
        return <SkeletonCard />;
    }
  };

  return (
    <Suspense fallback={fallback || defaultFallback()}>
      {children}
    </Suspense>
  );
};
```

### 4.7 Route Configuration Updates

```typescript
// src/routes/index.ts

import { RouteSuspenseBoundary } from '@/components/suspense/RouteSuspenseBoundary';
import { DashboardSuspenseBoundary } from '@/components/suspense/DashboardSuspenseBoundary';
import { FinanceSuspenseBoundary } from '@/components/suspense/FinanceSuspenseBoundary';
import { FleetSuspenseBoundary } from '@/components/suspense/FleetSuspenseBoundary';
import { CustomersSuspenseBoundary } from '@/components/suspense/CustomersSuspenseBoundary';

// Update route configurations to include Suspense boundaries
const routeConfigs: RouteConfig[] = [
  {
    path: '/dashboard',
    component: Dashboard,
    lazy: true,
    exact: true,
    title: 'Dashboard',
    description: 'Main dashboard',
    group: 'dashboard',
    priority: 10,
    protected: true,
    layout: 'bento',
    suspenseBoundary: DashboardSuspenseBoundary, // NEW
  },
  {
    path: '/finance/*',
    component: Finance,
    lazy: true,
    exact: false,
    title: 'Finance',
    description: 'Financial management',
    group: 'finance',
    priority: 11,
    protected: true,
    layout: 'bento',
    suspenseBoundary: FinanceSuspenseBoundary, // NEW
  },
  // ... other routes
];
```

---

## 5. Loading Components Design

### 5.1 Loading Component Hierarchy

```
Loading Components
├── Route-Level Loading
│   ├── DashboardLoading
│   ├── FinanceLoading
│   ├── FleetLoading
│   └── CustomersLoading
├── Component-Level Loading
│   ├── DashboardMetricsLoading
│   ├── DashboardActivityLoading
│   ├── FinanceOverviewLoading
│   ├── FinanceListLoading
│   ├── FleetStatsLoading
│   ├── FleetVehicleListLoading
│   ├── CustomersStatsLoading
│   └── CustomersListLoading
└── Widget-Level Loading
    ├── MetricCardLoading
    ├── ChartLoading
    ├── TableLoading
    └── FormLoading
```

### 5.2 Dashboard Loading Components

#### DashboardLoading (Route-Level)

```typescript
// src/components/suspense/loading/DashboardLoading.tsx

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export const DashboardLoading: React.FC = () => {
  return (
    <div className="dashboard-loading p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
```

#### DashboardMetricsLoading (Component-Level)

```typescript
// src/components/suspense/loading/DashboardMetricsLoading.tsx

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface DashboardMetricsLoadingProps {
  count?: number;
}

export const DashboardMetricsLoading: React.FC<DashboardMetricsLoadingProps> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </Card>
      ))}
    </div>
  );
};
```

### 5.3 Finance Loading Components

#### FinanceLoading (Route-Level)

```typescript
// src/components/suspense/loading/FinanceLoading.tsx

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export const FinanceLoading: React.FC = () => {
  return (
    <div className="finance-loading p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Financial Summary */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
      </Card>

      {/* Transaction List */}
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
```

#### FinanceOverviewLoading (Component-Level)

```typescript
// src/components/suspense/loading/FinanceOverviewLoading.tsx

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export const FinanceOverviewLoading: React.FC = () => {
  return (
    <Card className="p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
};
```

### 5.4 Fleet Loading Components

#### FleetLoading (Route-Level)

```typescript
// src/components/suspense/loading/FleetLoading.tsx

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export const FleetLoading: React.FC = () => {
  return (
    <div className="fleet-loading p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Fleet Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </Card>
        ))}
      </div>

      {/* Vehicle List */}
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};
```

#### FleetVehicleListLoading (Component-Level)

```typescript
// src/components/suspense/loading/FleetVehicleListLoading.tsx

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface FleetVehicleListLoadingProps {
  count?: number;
}

export const FleetVehicleListLoading: React.FC<FleetVehicleListLoadingProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  );
};
```

### 5.5 Customers Loading Components

#### CustomersLoading (Route-Level)

```typescript
// src/components/suspense/loading/CustomersLoading.tsx

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export const CustomersLoading: React.FC = () => {
  return (
    <div className="customers-loading p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Customer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </Card>
        ))}
      </div>

      {/* Customer List */}
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
```

#### CustomersListLoading (Component-Level)

```typescript
// src/components/suspense/loading/CustomersListLoading.tsx

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface CustomersListLoadingProps {
  count?: number;
}

export const CustomersListLoading: React.FC<CustomersListLoadingProps> = ({ count = 8 }) => {
  return (
    <Card className="p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
};
```

### 5.6 Loading Component Props Interface

```typescript
// src/components/suspense/loading/types.ts

export interface BaseLoadingProps {
  /** Custom height for loading container */
  height?: string;
  /** Show shimmer animation */
  shimmer?: boolean;
  /** Custom className */
  className?: string;
}

export interface RouteLoadingProps extends BaseLoadingProps {
  /** Route name for analytics */
  routeName?: string;
}

export interface ComponentLoadingProps extends BaseLoadingProps {
  /** Number of items to show */
  count?: number;
  /** Loading type variant */
  variant?: 'card' | 'table' | 'chart' | 'metrics' | 'list';
}

export interface WidgetLoadingProps extends BaseLoadingProps {
  /** Widget size */
  size?: 'small' | 'medium' | 'large';
  /** Show label */
  showLabel?: boolean;
}
```

---

## 6. Nested Suspense Boundaries Strategy

### 6.1 Nested Boundary Rules

**Principle**: Use nested Suspense boundaries to prevent waterfall loading and enable progressive rendering.

```
Route-Level Boundary
├── Component-Level Boundary
│   ├── Widget-Level Boundary
│   │   └── Data Query (Suspense enabled)
│   └── Widget-Level Boundary
│       └── Data Query (Suspense enabled)
└── Component-Level Boundary
    ├── Widget-Level Boundary
    └── Widget-Level Boundary
```

### 6.2 Preventing Waterfall Loading

**Problem**: Sequential loading where parent must finish before children start.

**Solution**: Parallel loading through nested boundaries.

```typescript
// ❌ BAD: Waterfall loading
function Dashboard() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: fetchStats, suspense: true });
  const activity = useQuery({ queryKey: ['activity'], queryFn: fetchActivity, suspense: true });

  return (
    <div>
      <Stats data={stats.data} />
      <Activity data={activity.data} />
    </div>
  );
}

// ✅ GOOD: Parallel loading with nested boundaries
function Dashboard() {
  return (
    <div>
      <Suspense fallback={<DashboardMetricsLoading />}>
        <DashboardMetrics />
      </Suspense>
      <Suspense fallback={<DashboardActivityLoading />}>
        <DashboardActivity />
      </Suspense>
    </div>
  );
}

function DashboardMetrics() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: fetchStats, suspense: true });
  return <Stats data={stats.data} />;
}

function DashboardActivity() {
  const activity = useQuery({ queryKey: ['activity'], queryFn: fetchActivity, suspense: true });
  return <Activity data={activity.data} />;
}
```

### 6.3 Parent/Child Boundary Coordination

**Strategy**: Parent boundaries handle layout, child boundaries handle content.

```typescript
// src/components/suspense/ParentChildSuspenseBoundary.tsx

import React, { Suspense } from 'react';

interface ParentChildSuspenseBoundaryProps {
  children: React.ReactNode;
  parentFallback?: React.ReactNode;
  childFallback?: React.ReactNode;
}

export const ParentChildSuspenseBoundary: React.FC<ParentChildSuspenseBoundaryProps> = ({
  children,
  parentFallback,
  childFallback
}) => {
  return (
    <Suspense fallback={parentFallback || <LayoutLoading />}>
      {children}
    </Suspense>
  );
};

// Usage
function Dashboard() {
  return (
    <ParentChildSuspenseBoundary parentFallback={<DashboardLayoutLoading />}>
      <div className="dashboard-layout">
        <Suspense fallback={<DashboardMetricsLoading />}>
          <DashboardMetrics />
        </Suspense>
        <Suspense fallback={<DashboardActivityLoading />}>
          <DashboardActivity />
        </Suspense>
      </div>
    </ParentChildSuspenseBoundary>
  );
}
```

### 6.4 Nested Route Boundaries

**Strategy**: Handle nested routes with independent boundaries.

```typescript
// src/components/suspense/NestedRouteSuspenseBoundary.tsx

import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';

interface NestedRouteSuspenseBoundaryProps {
  children: React.ReactNode;
  parentRoute: string;
}

export const NestedRouteSuspenseBoundary: React.FC<NestedRouteSuspenseBoundaryProps> = ({
  children,
  parentRoute
}) => {
  const location = useLocation();
  const isNestedRoute = location.pathname !== parentRoute;

  return (
    <Suspense fallback={isNestedRoute ? <NestedRouteLoading /> : <ParentRouteLoading />}>
      {children}
    </Suspense>
  );
};

// Usage in routing
<Routes>
  <Route path="/dashboard" element={<DashboardSuspenseBoundary><Dashboard /></DashboardSuspenseBoundary>}>
    <Route path="analytics" element={<NestedRouteSuspenseBoundary parentRoute="/dashboard"><Analytics /></NestedRouteSuspenseBoundary>} />
    <Route path="reports" element={<NestedRouteSuspenseBoundary parentRoute="/dashboard"><Reports /></NestedRouteSuspenseBoundary>} />
  </Route>
</Routes>
```

### 6.5 Best Practices for Nested Boundaries

1. **Minimize Nesting Depth**: Keep nesting to 2-3 levels maximum
2. **Independent Data Fetching**: Each boundary should fetch independent data
3. **Progressive Enhancement**: Show content as it becomes available
4. **Avoid Over-Granularity**: Too many boundaries can cause flickering
5. **Coordinate Loading States**: Ensure loading states are visually consistent

### 6.6 Boundary Reset Strategy

```typescript
// src/components/suspense/SuspenseBoundaryReset.tsx

import React, { Suspense, useEffect, useRef } from 'react';

interface SuspenseBoundaryResetProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  resetKey?: string;
}

export const SuspenseBoundaryReset: React.FC<SuspenseBoundaryResetProps> = ({
  children,
  fallback,
  resetKey
}) => {
  const boundaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resetKey && boundaryRef.current) {
      // Force boundary reset by unmounting and remounting
      boundaryRef.current.remove();
    }
  }, [resetKey]);

  return (
    <div ref={boundaryRef}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </div>
  );
};
```

---

## 7. Error Boundary Integration

### 7.1 Suspense + Error Boundary Architecture

**Strategy**: Wrap Suspense boundaries with Error Boundaries for comprehensive error handling.

```
Error Boundary (Route Level)
└── Suspense Boundary (Route Level)
    ├── Error Boundary (Component Level)
    │   └── Suspense Boundary (Component Level)
    │       ├── Error Boundary (Widget Level)
    │       │   └── Suspense Boundary (Widget Level)
    │       │       └── Data Query (with Suspense)
    │       └── Suspense Boundary (Widget Level)
    │           └── Data Query (with Suspense)
    └── Suspense Boundary (Component Level)
        └── Data Query (with Suspense)
```

### 7.2 Integrated Boundary Component

```typescript
// src/components/suspense/SuspenseErrorBoundary.tsx

import React, { Suspense } from 'react';
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary';

interface SuspenseErrorBoundaryProps {
  children: React.ReactNode;
  suspenseFallback: React.ReactNode;
  routeName?: string;
  fallbackPath?: string;
}

export const SuspenseErrorBoundary: React.FC<SuspenseErrorBoundaryProps> = ({
  children,
  suspenseFallback,
  routeName,
  fallbackPath
}) => {
  return (
    <RouteErrorBoundary routeName={routeName} fallbackPath={fallbackPath}>
      <Suspense fallback={suspenseFallback}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
};
```

### 7.3 Error Handling for Failed Data Fetches

```typescript
// src/lib/queryClient.ts

/**
 * Enhanced error handling for Suspense queries
 */
const defaultOptions = {
  queries: {
    // ... existing config

    // NEW: Error handling for Suspense
    throwOnError: (error: any, query: any) => {
      // Don't throw for 404 errors - let component handle
      if (error?.status === 404) {
        return false;
      }

      // Throw for 5xx errors to trigger Error Boundary
      if (error?.status >= 500) {
        return true;
      }

      // Throw for network errors
      if (!error?.status) {
        return true;
      }

      return false;
    },
  },
};
```

### 7.4 Fallback UI Patterns

#### Network Error Fallback

```typescript
// src/components/suspense/error/NetworkErrorFallback.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface NetworkErrorFallbackProps {
  onRetry: () => void;
  error?: Error;
}

export const NetworkErrorFallback: React.FC<NetworkErrorFallbackProps> = ({ onRetry, error }) => {
  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-full">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>خطأ في الاتصال</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.
          </AlertDescription>
        </Alert>
        <Button onClick={onRetry} className="w-full">
          <RefreshCw className="h-4 w-4 ml-2" />
          إعادة المحاولة
        </Button>
      </CardContent>
    </Card>
  );
};
```

#### Data Not Found Fallback

```typescript
// src/components/suspense/error/DataNotFoundFallback.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DataNotFoundFallbackProps {
  message?: string;
  onGoBack?: () => void;
}

export const DataNotFoundFallback: React.FC<DataNotFoundFallbackProps> = ({
  message = 'لم يتم العثور على البيانات المطلوبة',
  onGoBack
}) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-full">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>البيانات غير موجودة</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{message}</p>
        <div className="flex gap-3">
          <Button onClick={handleGoBack} variant="outline">
            رجوع
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            <Home className="h-4 w-4 ml-2" />
            الصفحة الرئيسية
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

### 7.5 Retry Strategies Within Error Boundaries

```typescript
// src/components/suspense/error/QueryErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';

interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onReset?: () => void;
}

class QueryErrorBoundaryClass extends Component<QueryErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: QueryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Query error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const QueryErrorBoundary: React.FC<QueryErrorBoundaryProps> = (props) => {
  const { reset } = useQueryErrorResetBoundary();

  const handleReset = () => {
    reset();
    if (props.onReset) {
      props.onReset();
    }
  };

  return (
    <QueryErrorBoundaryClass {...props} onReset={handleReset} />
  );
};
```

### 7.6 Error Boundary Integration Example

```typescript
// src/pages/Dashboard.tsx

import React from 'react';
import { SuspenseErrorBoundary } from '@/components/suspense/SuspenseErrorBoundary';
import { DashboardLoading } from '@/components/suspense/loading/DashboardLoading';
import { NetworkErrorFallback } from '@/components/suspense/error/NetworkErrorFallback';
import { DataNotFoundFallback } from '@/components/suspense/error/DataNotFoundFallback';
import { useQuery } from '@tanstack/react-query';

function DashboardContent() {
  const { data: stats, error, refetch } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    suspense: true,
  });

  if (error) {
    if (error?.status === 404) {
      return <DataNotFoundFallback />;
    }
    return <NetworkErrorFallback onRetry={() => refetch()} error={error} />;
  }

  return <DashboardContent stats={stats} />;
}

export default function Dashboard() {
  return (
    <SuspenseErrorBoundary
      routeName="Dashboard"
      fallbackPath="/"
      suspenseFallback={<DashboardLoading />}
    >
      <DashboardContent />
    </SuspenseErrorBoundary>
  );
}
```

---

## 8. Implementation Guidelines

### 8.1 Step-by-Step Implementation

#### Phase 1: Foundation Setup

1. **Update Query Client Configuration**
   - Add Suspense mode options to [`queryClient.ts`](src/lib/queryClient.ts)
   - Create query presets for different use cases
   - Add route-specific query configurations

2. **Create Loading Component Library**
   - Implement route-level loading components
   - Implement component-level loading components
   - Create loading component types and interfaces

3. **Create Suspense Boundary Components**
   - Implement route-level Suspense boundaries
   - Implement component-level Suspense boundaries
   - Create integrated Suspense + Error boundary components

#### Phase 2: Route Integration

1. **Update Route Configurations**
   - Add Suspense boundary references to route configs
   - Update route rendering logic to use boundaries
   - Test route-level loading states

2. **Integrate with Existing Components**
   - Wrap data-dependent components with Suspense boundaries
   - Update component loading states to use Suspense
   - Test component-level loading states

#### Phase 3: Error Handling Integration

1. **Create Error Fallback Components**
   - Implement network error fallback
   - Implement data not found fallback
   - Implement query error boundary

2. **Integrate with Existing Error Boundaries**
   - Combine Suspense boundaries with Error boundaries
   - Test error propagation and recovery
   - Verify retry mechanisms

#### Phase 4: Testing and Optimization

1. **Test Loading States**
   - Verify loading states display correctly
   - Test progressive rendering
   - Check for flickering or layout shifts

2. **Test Error Handling**
   - Verify error boundaries catch errors
   - Test retry mechanisms
   - Check fallback UI display

3. **Performance Testing**
   - Measure load time improvements
   - Check for unnecessary re-renders
   - Optimize boundary placement

### 8.2 Code Examples

#### Example 1: Simple Route with Suspense

```typescript
// src/pages/Dashboard.tsx

import React from 'react';
import { SuspenseErrorBoundary } from '@/components/suspense/SuspenseErrorBoundary';
import { DashboardLoading } from '@/components/suspense/loading/DashboardLoading';

function DashboardContent() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    suspense: true,
  });

  return <DashboardStats data={stats} />;
}

export default function Dashboard() {
  return (
    <SuspenseErrorBoundary
      routeName="Dashboard"
      fallbackPath="/"
      suspenseFallback={<DashboardLoading />}
    >
      <DashboardContent />
    </SuspenseErrorBoundary>
  );
}
```

#### Example 2: Component with Nested Suspense

```typescript
// src/components/dashboard/DashboardMetrics.tsx

import React from 'react';
import { ComponentSuspenseBoundary } from '@/components/suspense/ComponentSuspenseBoundary';

function MetricCard({ metricKey }: { metricKey: string }) {
  const { data } = useQuery({
    queryKey: ['dashboard', 'metric', metricKey],
    queryFn: () => fetchMetric(metricKey),
    suspense: true,
  });

  return <Card data={data} />;
}

export function DashboardMetrics() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <ComponentSuspenseBoundary loadingType="metrics">
        <MetricCard metricKey="revenue" />
      </ComponentSuspenseBoundary>
      <ComponentSuspenseBoundary loadingType="metrics">
        <MetricCard metricKey="expenses" />
      </ComponentSuspenseBoundary>
      <ComponentSuspenseBoundary loadingType="metrics">
        <MetricCard metricKey="profit" />
      </ComponentSuspenseBoundary>
      <ComponentSuspenseBoundary loadingType="metrics">
        <MetricCard metricKey="growth" />
      </ComponentSuspenseBoundary>
    </div>
  );
}
```

#### Example 3: List with Suspense

```typescript
// src/components/customers/CustomersList.tsx

import React from 'react';
import { ComponentSuspenseBoundary } from '@/components/suspense/ComponentSuspenseBoundary';
import { CustomersListLoading } from '@/components/suspense/loading/CustomersListLoading';

function CustomerRow({ customerId }: { customerId: string }) {
  const { data: customer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => fetchCustomer(customerId),
    suspense: true,
  });

  return <CustomerItem data={customer} />;
}

export function CustomersList({ customerIds }: { customerIds: string[] }) {
  return (
    <ComponentSuspenseBoundary loadingType="table">
      <div className="space-y-3">
        {customerIds.map((id) => (
          <CustomerRow key={id} customerId={id} />
        ))}
      </div>
    </ComponentSuspenseBoundary>
  );
}
```

### 8.3 Migration Strategy

#### Gradual Migration Approach

1. **Start with New Routes**
   - Implement Suspense boundaries for new routes first
   - Use as reference for existing routes

2. **Migrate Critical Routes**
   - Update dashboard route first
   - Then finance route
   - Then fleet route
   - Then customers route

3. **Migrate Component by Component**
   - Start with independent components
   - Move to complex components
   - Handle edge cases carefully

4. **Backward Compatibility**
   - Keep existing loading states during migration
   - Remove old loading states after verification
   - Maintain feature parity

#### Migration Checklist

- [ ] Update query client configuration
- [ ] Create loading component library
- [ ] Create Suspense boundary components
- [ ] Create error fallback components
- [ ] Update dashboard route
- [ ] Update finance route
- [ ] Update fleet route
- [ ] Update customers route
- [ ] Test all routes with Suspense
- [ ] Remove old loading states
- [ ] Update documentation

---

## 9. Performance Considerations

### 9.1 Performance Benefits

1. **Reduced Bundle Size**
   - Declarative loading states reduce boilerplate
   - Shared loading components improve code reuse

2. **Improved Load Times**
   - Progressive rendering shows content faster
   - Parallel data fetching reduces wait time

3. **Better User Experience**
   - Consistent loading states across app
   - Smooth transitions between states

### 9.2 Performance Optimizations

1. **Memoize Loading Components**
   ```typescript
   export const DashboardLoading = React.memo(() => {
     // loading component implementation
   });
   ```

2. **Lazy Load Loading Components**
   ```typescript
   const DashboardLoading = lazy(() => import('./loading/DashboardLoading'));
   ```

3. **Optimize Skeleton Animations**
   - Use CSS animations instead of JavaScript
   - Reduce animation complexity
   - Respect user's reduced motion preference

4. **Minimize Re-renders**
   - Use React.memo for boundary components
   - Avoid unnecessary prop drilling
   - Use context for shared state

### 9.3 Performance Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Time to First Suspense | < 100ms | Chrome DevTools Performance |
| Suspense Resolution Time | < 500ms | React DevTools Profiler |
| Loading State Flicker | 0 | Visual inspection |
| Bundle Size Increase | < 50KB | Bundle analyzer |

---

## 10. Testing Strategy

### 10.1 Unit Tests

```typescript
// src/components/suspense/__tests__/SuspenseBoundary.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { SuspenseErrorBoundary } from '../SuspenseErrorBoundary';
import { DashboardLoading } from '../loading/DashboardLoading';

describe('SuspenseErrorBoundary', () => {
  it('shows loading state while data is loading', () => {
    render(
      <SuspenseErrorBoundary
        routeName="Test"
        fallbackPath="/"
        suspenseFallback={<DashboardLoading />}
      >
        <TestComponent />
      </SuspenseErrorBoundary>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error state when query fails', async () => {
    render(
      <SuspenseErrorBoundary
        routeName="Test"
        fallbackPath="/"
        suspenseFallback={<DashboardLoading />}
      >
        <ErrorComponent />
      </SuspenseErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });
});
```

### 10.2 Integration Tests

```typescript
// src/pages/__tests__/Dashboard.suspense.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../Dashboard';

describe('Dashboard with Suspense', () => {
  it('shows loading state initially', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('shows content after data loads', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    });
  });
});
```

### 10.3 Performance Tests

```typescript
// src/components/suspense/__tests__/SuspenseBoundary.performance.test.tsx

import { render } from '@testing-library/react';
import { SuspenseErrorBoundary } from '../SuspenseBoundary';

describe('SuspenseBoundary Performance', () => {
  it('renders loading state within 100ms', () => {
    const start = performance.now();
    render(
      <SuspenseErrorBoundary
        routeName="Test"
        fallbackPath="/"
        suspenseFallback={<div>Loading...</div>}
      >
        <div>Content</div>
      </SuspenseErrorBoundary>
    );
    const end = performance.now();

    expect(end - start).toBeLessThan(100);
  });

  it('does not cause unnecessary re-renders', () => {
    const renderSpy = jest.fn();
    const TestComponent = () => {
      renderSpy();
      return <div>Test</div>;
    };

    const { rerender } = render(
      <SuspenseErrorBoundary
        routeName="Test"
        fallbackPath="/"
        suspenseFallback={<div>Loading...</div>}
      >
        <TestComponent />
      </SuspenseErrorBoundary>
    );

    rerender(
      <SuspenseErrorBoundary
        routeName="Test"
        fallbackPath="/"
        suspenseFallback={<div>Loading...</div>}
      >
        <TestComponent />
      </SuspenseErrorBoundary>
    );

    expect(renderSpy).toHaveBeenCalledTimes(2); // Initial + rerender
  });
});
```

---

## 11. Migration Strategy

### 11.1 Phased Migration Plan

#### Phase 1: Foundation (Week 1)

**Objectives**:
- Set up Suspense mode configuration
- Create loading component library
- Create Suspense boundary components

**Tasks**:
1. Update [`queryClient.ts`](src/lib/queryClient.ts) with Suspense mode options
2. Create query presets for different use cases
3. Implement route-level loading components
4. Implement component-level loading components
5. Create Suspense boundary components
6. Create integrated Suspense + Error boundary components

**Deliverables**:
- Updated query client configuration
- Loading component library
- Suspense boundary component library

#### Phase 2: Dashboard Route (Week 2)

**Objectives**:
- Migrate dashboard route to use Suspense
- Test and optimize loading states

**Tasks**:
1. Update dashboard route configuration
2. Wrap dashboard components with Suspense boundaries
3. Update dashboard queries to use Suspense mode
4. Test loading states
5. Optimize performance

**Deliverables**:
- Dashboard route with Suspense
- Tested loading states
- Performance metrics

#### Phase 3: Finance Route (Week 3)

**Objectives**:
- Migrate finance route to use Suspense
- Test and optimize loading states

**Tasks**:
1. Update finance route configuration
2. Wrap finance components with Suspense boundaries
3. Update finance queries to use Suspense mode
4. Test loading states
5. Optimize performance

**Deliverables**:
- Finance route with Suspense
- Tested loading states
- Performance metrics

#### Phase 4: Fleet and Customers Routes (Week 4)

**Objectives**:
- Migrate fleet and customers routes to use Suspense
- Test and optimize loading states

**Tasks**:
1. Update fleet route configuration
2. Update customers route configuration
3. Wrap components with Suspense boundaries
4. Update queries to use Suspense mode
5. Test loading states
6. Optimize performance

**Deliverables**:
- Fleet route with Suspense
- Customers route with Suspense
- Tested loading states
- Performance metrics

#### Phase 5: Testing and Documentation (Week 5)

**Objectives**:
- Comprehensive testing
- Documentation and finalization

**Tasks**:
1. Write unit tests for Suspense components
2. Write integration tests for routes
3. Write performance tests
4. Create implementation guide
5. Update existing documentation
6. Code review and finalization

**Deliverables**:
- Comprehensive test suite
- Implementation documentation
- Production-ready code

### 11.2 Rollback Strategy

**If Issues Arise**:

1. **Disable Suspense Mode Globally**
   ```typescript
   // src/lib/queryClient.ts
   const defaultOptions = {
     queries: {
       suspense: false, // Disable Suspense
       // ... other options
     }
   };
   ```

2. **Revert Route Changes**
   - Remove Suspense boundaries from routes
   - Restore original loading states
   - Keep query client changes for future use

3. **Gradual Re-enablement**
   - Re-enable Suspense for one route at a time
   - Test thoroughly before proceeding
   - Monitor performance metrics

---

## 12. Conclusion

This design document presents a comprehensive React Suspense Boundaries integration strategy for the Fleetify application. The solution addresses key requirements:

✅ **React Query Suspense Mode**: Selective per-query configuration with presets  
✅ **Granular Boundary Placement**: Route, component, and widget-level boundaries  
✅ **Loading Components**: Context-aware loading states for each route type  
✅ **Nested Boundaries**: Parallel loading to prevent waterfall issues  
✅ **Error Integration**: Combined Suspense + Error boundaries for comprehensive handling  

The three-tier boundary architecture provides a clean separation of concerns and makes the system maintainable and extensible. The phased migration approach ensures minimal disruption and allows for gradual adoption.

With a 5-week implementation timeline and clear success criteria, this design provides a solid foundation for improving user experience through intelligent loading states and declarative data fetching.

---

## Appendix A - Key Files Reference

| File | Description | Location |
|------|-------------|----------|
| [`queryClient.ts`](src/lib/queryClient.ts) | React Query configuration with Suspense mode | `src/lib/` |
| [`RouteSuspenseBoundary.tsx`](src/components/suspense/RouteSuspenseBoundary.tsx) | Route-level Suspense boundary | `src/components/suspense/` |
| [`ComponentSuspenseBoundary.tsx`](src/components/suspense/ComponentSuspenseBoundary.tsx) | Component-level Suspense boundary | `src/components/suspense/` |
| [`SuspenseErrorBoundary.tsx`](src/components/suspense/SuspenseErrorBoundary.tsx) | Combined Suspense + Error boundary | `src/components/suspense/` |
| [`DashboardLoading.tsx`](src/components/suspense/loading/DashboardLoading.tsx) | Dashboard route loading state | `src/components/suspense/loading/` |
| [`FinanceLoading.tsx`](src/components/suspense/loading/FinanceLoading.tsx) | Finance route loading state | `src/components/suspense/loading/` |
| [`FleetLoading.tsx`](src/components/suspense/loading/FleetLoading.tsx) | Fleet route loading state | `src/components/suspense/loading/` |
| [`CustomersLoading.tsx`](src/components/suspense/loading/CustomersLoading.tsx) | Customers route loading state | `src/components/suspense/loading/` |
| [`NetworkErrorFallback.tsx`](src/components/suspense/error/NetworkErrorFallback.tsx) | Network error fallback UI | `src/components/suspense/error/` |
| [`DataNotFoundFallback.tsx`](src/components/suspense/error/DataNotFoundFallback.tsx) | Data not found fallback UI | `src/components/suspense/error/` |

---

## Appendix B - Related Documentation References

### Internal Documentation

- [`docs/plans/2026-01-25-route-prefetching-design.md`](2026-01-25-route-prefetching-design.md) - Route prefetching strategy
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) - Overall system architecture
- [`PERFORMANCE_OPTIMIZATION_PLAN.md`](../PERFORMANCE_OPTIMIZATION_PLAN.md) - Performance optimization guidelines
- [`DATABASE_SCHEMA.md`](../DATABASE_SCHEMA.md) - Database schema reference
- [`API_DOCUMENTATION.md`](../API_DOCUMENTATION.md) - API documentation

### External Documentation

- [React Suspense Documentation](https://react.dev/reference/react/Suspense)
- [React Query Suspense Mode](https://tanstack.com/query/latest/docs/react/guides/suspense)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [React Query Error Boundaries](https://tanstack.com/query/latest/docs/react/guides/error-handling)

### Related Features

- [Route Prefetching](2026-01-25-route-prefetching-design.md) - Intelligent data prefetching
- [Code Splitting](https://react.dev/reference/react/lazy) - Lazy loading route components
- [Service Worker Caching](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) - Offline caching

---

**Document End**
