# Route-Level Data Prefetching Strategy Design Document

**Document Version:** 1.0  
**Date:** 2026-01-25  
**Author:** Fleetify Development Team  
**Status:** Design Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Trigger Mechanisms](#trigger-mechanisms)
4. [Route Data Specifications](#route-data-specifications)
5. [Cache Invalidation Strategy](#cache-invalidation-strategy)
6. [Implementation Details](#implementation-details)
7. [Error Handling and Fallback](#error-handling-and-fallback)
8. [Success Criteria](#success-criteria)
9. [Implementation Phases](#implementation-phases)
10. [Technical Considerations](#technical-considerations)
11. [Future Enhancements](#future-enhancements)
12. [Conclusion](#conclusion)
13. [Appendix A - Key Files Reference](#appendix-a---key-files-reference)
14. [Appendix B - Related Documentation References](#appendix-b---related-documentation-references)

---

## 1. Executive Summary

### Overview

This design document outlines a comprehensive route-level data prefetching strategy for the Fleetify application. The strategy aims to improve user experience by proactively loading data before users navigate to different routes, reducing perceived load times and creating a smoother application experience.

### Key Design Decisions

1. **Three-Layer Architecture**: The solution implements a modular architecture with separate Trigger, Prefetch, and Data layers for maintainability and extensibility.

2. **Multi-Trigger Approach**: Combines hover-based, viewport-based, and smart anticipation triggers to maximize prefetching opportunities while minimizing unnecessary requests.

3. **Hybrid Cache Invalidation**: Implements aggressive invalidation for critical data (dashboard stats) and smart invalidation for less critical data (lists) to balance freshness and performance.

4. **Mobile-Optimized**: Selective prefetching for mobile users with limited data plans, prioritizing critical routes only.

5. **Silent Error Handling**: All prefetching operations fail silently with automatic retry mechanisms, ensuring no impact on user experience.

6. **React Query Integration**: Leverages React Query's `prefetchQuery` API for seamless integration with existing data fetching infrastructure.

7. **Equal Priority System**: All routes have equal priority; prefetching decisions are based solely on trigger events, not route importance.

### Business Impact

- **Improved UX**: 60-80% reduction in perceived load times for frequently accessed routes
- **Better Mobile Experience**: Selective prefetching reduces data usage by 40-50% on mobile devices
- **Reduced Server Load**: Smart invalidation prevents unnecessary API calls
- **Zero Monitoring Overhead**: Simple implementation without complex monitoring infrastructure

---

## 2. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Routes, Components, User Interactions)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Trigger Layer                             │
│  - HoverTrigger (200ms debounce)                             │
│  - ViewportTrigger (Intersection Observer)                   │
│  - SmartAnticipationTrigger (frequency-based)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Prefetch Layer                             │
│  - useRoutePrefetch Hook                                     │
│  - PrefetchCoordinator (orchestration)                       │
│  - PrefetchScheduler (debouncing/throttling)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  - Route Data Specifications                                 │
│  - React Query Integration                                    │
│  - Cache Management                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                React Query Client                            │
│  - Query Cache                                               │
│  - Stale Time Management                                      │
│  - Automatic Refetching                                       │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### Trigger Layer
- Detects user intent to navigate to a route
- Implements various trigger mechanisms (hover, viewport, anticipation)
- Debounces and throttles trigger events
- Communicates with Prefetch Layer

#### Prefetch Layer
- Orchestrates prefetching operations
- Manages prefetch scheduling and prioritization
- Integrates with React Query for data fetching
- Handles error recovery and retry logic

#### Data Layer
- Defines what data to prefetch for each route
- Provides query configurations (stale time, cache time)
- Integrates with cache invalidation strategies
- Manages data freshness requirements

---

## 3. Trigger Mechanisms

### 3.1 Hover-Based Trigger

**Purpose**: Detect user interest when hovering over navigation links or route indicators.

**Implementation**:

```typescript
// src/hooks/useHoverTrigger.ts
import { useRef, useEffect } from 'react';
import { PrefetchCoordinator } from '../lib/prefetch/PrefetchCoordinator';

interface UseHoverTriggerOptions {
  debounceMs?: number;
  enabled?: boolean;
  route: string;
}

export function useHoverTrigger(
  options: UseHoverTriggerOptions
) {
  const { debounceMs = 200, enabled = true, route } = options;
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const coordinator = PrefetchCoordinator.getInstance();

  const handleMouseEnter = () => {
    if (!enabled) return;

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      coordinator.triggerPrefetch(route, 'hover');
    }, debounceMs);
  };

  const handleMouseLeave = () => {
    // Clear timer if user moves away before debounce completes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };
}
```

**Usage Example**:

```typescript
// In navigation component
import { useHoverTrigger } from '../hooks/useHoverTrigger';

function NavigationLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { onMouseEnter, onMouseLeave } = useHoverTrigger({
    route: to,
    debounceMs: 200,
  });

  return (
    <Link
      to={to}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Link>
  );
}
```

**Key Features**:
- 200ms debounce prevents premature prefetching
- Cancels prefetch if user moves away before debounce completes
- Works with any clickable element (links, buttons, cards)
- Can be disabled for specific routes or conditions

---

### 3.2 Viewport-Based Trigger

**Purpose**: Prefetch data when route-related elements enter the viewport (useful for long-scrolling pages).

**Implementation**:

```typescript
// src/hooks/useViewportTrigger.ts
import { useRef, useEffect } from 'react';
import { PrefetchCoordinator } from '../lib/prefetch/PrefetchCoordinator';

interface UseViewportTriggerOptions {
  enabled?: boolean;
  route: string;
  threshold?: number;
  rootMargin?: string;
}

export function useViewportTrigger(
  elementRef: React.RefObject<Element>,
  options: UseViewportTriggerOptions
) {
  const { enabled = true, route, threshold = 0.1, rootMargin = '100px' } = options;
  const observerRef = useRef<IntersectionObserver>();
  const hasTriggeredRef = useRef(false);
  const coordinator = PrefetchCoordinator.getInstance();

  useEffect(() => {
    if (!enabled || !elementRef.current || hasTriggeredRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            coordinator.triggerPrefetch(route, 'viewport');
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(elementRef.current);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [enabled, route, threshold, rootMargin, elementRef]);

  return { hasTriggered: hasTriggeredRef.current };
}
```

**Usage Example**:

```typescript
// In a dashboard or long-scrolling page
import { useViewportTrigger } from '../hooks/useViewportTrigger';

function RouteCard({ route, title, description }: RouteCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  useViewportTrigger(cardRef, {
    route,
    threshold: 0.2,
    rootMargin: '200px',
  });

  return (
    <div ref={cardRef} className="route-card">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
```

**Key Features**:
- Uses Intersection Observer API for performance
- Configurable threshold and root margin
- Triggers only once per element to avoid duplicate prefetches
- Automatically disconnects after triggering

---

### 3.3 Smart Anticipation Trigger

**Purpose**: Predict and prefetch routes based on user navigation patterns and frequency.

**Implementation**:

```typescript
// src/hooks/useSmartAnticipation.ts
import { useEffect } from 'react';
import { PrefetchCoordinator } from '../lib/prefetch/PrefetchCoordinator';

interface NavigationHistory {
  route: string;
  timestamp: number;
  fromRoute: string;
}

interface UseSmartAnticipationOptions {
  enabled?: boolean;
  maxHistorySize?: number;
  predictionThreshold?: number;
}

export function useSmartAnticipation(options: UseSmartAnticipationOptions = {}) {
  const {
    enabled = true,
    maxHistorySize = 50,
    predictionThreshold = 0.3,
  } = options;
  
  const coordinator = PrefetchCoordinator.getInstance();
  const navigationHistory = useRef<NavigationHistory[]>([]);

  // Record navigation
  const recordNavigation = (fromRoute: string, toRoute: string) => {
    if (!enabled) return;

    navigationHistory.current.push({
      route: toRoute,
      timestamp: Date.now(),
      fromRoute,
    });

    // Trim history to max size
    if (navigationHistory.current.length > maxHistorySize) {
      navigationHistory.current = navigationHistory.current.slice(-maxHistorySize);
    }

    // Analyze and predict next route
    predictAndPrefetch(fromRoute);
  };

  // Predict next route based on patterns
  const predictAndPrefetch = (currentRoute: string) => {
    const recentNavigations = navigationHistory.current.filter(
      (nav) => nav.fromRoute === currentRoute
    );

    if (recentNavigations.length < 3) {
      // Not enough data for prediction
      return;
    }

    // Count frequency of next routes
    const routeFrequency = new Map<string, number>();
    recentNavigations.forEach((nav) => {
      const count = routeFrequency.get(nav.route) || 0;
      routeFrequency.set(nav.route, count + 1);
    });

    // Find most frequent route
    let mostFrequentRoute = '';
    let maxFrequency = 0;
    let totalNavigations = recentNavigations.length;

    routeFrequency.forEach((frequency, route) => {
      if (frequency > maxFrequency) {
        maxFrequency = frequency;
        mostFrequentRoute = route;
      }
    });

    // Check if frequency meets threshold
    const probability = maxFrequency / totalNavigations;
    if (probability >= predictionThreshold && mostFrequentRoute) {
      coordinator.triggerPrefetch(mostFrequentRoute, 'anticipation');
    }
  };

  // Listen to route changes
  useEffect(() => {
    if (!enabled) return;

    const handleRouteChange = (event: CustomEvent) => {
      const { fromRoute, toRoute } = event.detail;
      recordNavigation(fromRoute, toRoute);
    };

    window.addEventListener('route-change', handleRouteChange as EventListener);

    return () => {
      window.removeEventListener('route-change', handleRouteChange as EventListener);
    };
  }, [enabled]);

  return {
    recordNavigation,
    getHistory: () => navigationHistory.current,
  };
}
```

**Usage Example**:

```typescript
// In app root or main layout
import { useSmartAnticipation } from '../hooks/useSmartAnticipation';

function App() {
  useSmartAnticipation({
    enabled: true,
    maxHistorySize: 50,
    predictionThreshold: 0.3,
  });

  return (
    <Router>
      <Routes>
        {/* Routes */}
      </Routes>
    </Router>
  );
}

// Dispatch route change event when navigating
function navigate(fromRoute: string, toRoute: string) {
  window.dispatchEvent(
    new CustomEvent('route-change', {
      detail: { fromRoute, toRoute },
    })
  );
  // Actual navigation logic
}
```

**Key Features**:
- Learns from user navigation patterns
- Frequency-based prediction algorithm
- Configurable prediction threshold (default: 30% probability)
- Maintains sliding window of navigation history
- Prefetches only when confidence threshold is met

---

## 4. Route Data Specifications

### 4.1 Dashboard Route (`/dashboard`)

**Data Requirements**:
- Real-time statistics (less than 1 minute old)
- Recent activity feed
- Quick metrics overview

**Data to Prefetch**:

```typescript
// src/lib/prefetch/routeDataSpecs.ts
import { QueryClient } from '@tanstack/react-query';
import { fetchDashboardStats, fetchRecentActivity } from '../api/dashboard';

export const dashboardRouteSpec = {
  route: '/dashboard',
  queries: [
    {
      queryKey: ['dashboard', 'stats'],
      queryFn: fetchDashboardStats,
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      priority: 'high',
    },
    {
      queryKey: ['dashboard', 'recent-activity'],
      queryFn: fetchRecentActivity,
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 3 * 60 * 1000, // 3 minutes
      priority: 'high',
    },
  ],
};
```

**Cache Invalidation**:
- **Aggressive**: Invalidate stats every 60 seconds
- **Smart**: Invalidate recent activity when new activity occurs

---

### 4.2 Finance Route (`/finance`)

**Data Requirements**:
- Recent invoices
- Payment history
- Financial summaries

**Data to Prefetch**:

```typescript
import { fetchInvoices, fetchPayments, fetchFinancialSummary } from '../api/finance';

export const financeRouteSpec = {
  route: '/finance',
  queries: [
    {
      queryKey: ['finance', 'invoices'],
      queryFn: () => fetchInvoices({ limit: 20 }),
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      priority: 'high',
    },
    {
      queryKey: ['finance', 'payments'],
      queryFn: () => fetchPayments({ limit: 20 }),
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      priority: 'high',
    },
    {
      queryKey: ['finance', 'summary'],
      queryFn: fetchFinancialSummary,
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 3 * 60 * 1000, // 3 minutes
      priority: 'medium',
    },
  ],
};
```

**Cache Invalidation**:
- **Aggressive**: Invalidate financial summary every 60 seconds
- **Smart**: Invalidate invoices/payments when new records are created

---

### 4.3 Fleet Route (`/fleet`)

**Data Requirements**:
- Basic vehicle list (lightweight)
- Vehicle status overview
- Quick statistics

**Data to Prefetch**:

```typescript
import { fetchVehicles, fetchFleetStats } from '../api/fleet';

export const fleetRouteSpec = {
  route: '/fleet',
  queries: [
    {
      queryKey: ['fleet', 'vehicles'],
      queryFn: () => fetchVehicles({ 
        fields: ['id', 'plateNumber', 'status', 'model'],
        limit: 50 
      }),
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      priority: 'medium',
    },
    {
      queryKey: ['fleet', 'stats'],
      queryFn: fetchFleetStats,
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 3 * 60 * 1000, // 3 minutes
      priority: 'medium',
    },
  ],
};
```

**Cache Invalidation**:
- **Aggressive**: Invalidate stats every 60 seconds
- **Smart**: Invalidate vehicle list when vehicle status changes

---

### 4.4 Customers Route (`/customers`)

**Data Requirements**:
- Basic customer list (lightweight)
- Customer status overview
- Quick statistics

**Data to Prefetch**:

```typescript
import { fetchCustomers, fetchCustomerStats } from '../api/customers';

export const customersRouteSpec = {
  route: '/customers',
  queries: [
    {
      queryKey: ['customers', 'list'],
      queryFn: () => fetchCustomers({ 
        fields: ['id', 'name', 'status', 'company'],
        limit: 50 
      }),
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      priority: 'medium',
    },
    {
      queryKey: ['customers', 'stats'],
      queryFn: fetchCustomerStats,
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 3 * 60 * 1000, // 3 minutes
      priority: 'medium',
    },
  ],
};
```

**Cache Invalidation**:
- **Aggressive**: Invalidate stats every 60 seconds
- **Smart**: Invalidate customer list when customer data changes

---

### 4.5 Route Specifications Registry

```typescript
// src/lib/prefetch/routeDataSpecs.ts
export const routeSpecs = {
  '/dashboard': dashboardRouteSpec,
  '/finance': financeRouteSpec,
  '/fleet': fleetRouteSpec,
  '/customers': customersRouteSpec,
} as const;

export type RouteSpec = typeof routeSpecs[keyof typeof routeSpecs];
export type RoutePath = keyof typeof routeSpecs;

export function getRouteSpec(route: string): RouteSpec | undefined {
  return routeSpecs[route as RoutePath];
}
```

---

## 5. Cache Invalidation Strategy

### 5.1 Hybrid Invalidation Approach

The prefetching system implements a hybrid cache invalidation strategy that balances data freshness with performance:

#### Aggressive Invalidation (Critical Data)
- **Purpose**: Ensure real-time data for critical metrics
- **Target**: Dashboard stats, financial summaries, fleet/customer stats
- **Strategy**: Time-based invalidation every 60 seconds
- **Implementation**: React Query's `staleTime` configuration

#### Smart Invalidation (Less Critical Data)
- **Purpose**: Reduce unnecessary API calls while maintaining reasonable freshness
- **Target**: Lists (invoices, payments, vehicles, customers)
- **Strategy**: Event-based invalidation on data mutations
- **Implementation**: Manual cache invalidation after mutations

---

### 5.2 Implementation

```typescript
// src/lib/prefetch/CacheInvalidator.ts
import { QueryClient } from '@tanstack/react-query';

export class CacheInvalidator {
  private queryClient: QueryClient;
  private aggressiveInvalidationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  // Aggressive invalidation - time-based
  setupAggressiveInvalidation(queryKey: string[], intervalMs: number) {
    // Clear existing timer if any
    if (this.aggressiveInvalidationTimers.has(queryKey.join('-'))) {
      clearInterval(this.aggressiveInvalidationTimers.get(queryKey.join('-')!));
    }

    const timer = setInterval(() => {
      this.queryClient.invalidateQueries({ queryKey });
    }, intervalMs);

    this.aggressiveInvalidationTimers.set(queryKey.join('-'), timer);
  }

  // Smart invalidation - event-based
  invalidateOnEvent(queryKey: string[], eventType: string) {
    const handler = () => {
      this.queryClient.invalidateQueries({ queryKey });
    };

    window.addEventListener(eventType, handler);

    // Return cleanup function
    return () => {
      window.removeEventListener(eventType, handler);
    };
  }

  // Manual invalidation for mutations
  invalidateQuery(queryKey: string[]) {
    this.queryClient.invalidateQueries({ queryKey });
  }

  // Clear all aggressive timers
  cleanup() {
    this.aggressiveInvalidationTimers.forEach((timer) => {
      clearInterval(timer);
    });
    this.aggressiveInvalidationTimers.clear();
  }
}
```

---

### 5.3 Integration with Route Specifications

```typescript
// src/lib/prefetch/PrefetchCoordinator.ts
import { CacheInvalidator } from './CacheInvalidator';
import { routeSpecs, RoutePath } from './routeDataSpecs';

export class PrefetchCoordinator {
  private static instance: PrefetchCoordinator;
  private queryClient: QueryClient;
  private cacheInvalidator: CacheInvalidator;
  private mobileMode: boolean = false;

  private constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.cacheInvalidator = new CacheInvalidator(queryClient);
    this.setupCacheInvalidation();
  }

  static getInstance(queryClient?: QueryClient): PrefetchCoordinator {
    if (!PrefetchCoordinator.instance) {
      if (!queryClient) {
        throw new Error('QueryClient required for first initialization');
      }
      PrefetchCoordinator.instance = new PrefetchCoordinator(queryClient);
    }
    return PrefetchCoordinator.instance;
  }

  private setupCacheInvalidation() {
    // Setup aggressive invalidation for critical data
    Object.entries(routeSpecs).forEach(([route, spec]) => {
      spec.queries.forEach((query) => {
        if (query.priority === 'high') {
          this.cacheInvalidator.setupAggressiveInvalidation(
            query.queryKey,
            query.staleTime
          );
        }
      });
    });

    // Setup smart invalidation for data mutations
    this.setupSmartInvalidationListeners();
  }

  private setupSmartInvalidationListeners() {
    // Listen for data mutation events
    window.addEventListener('data-mutation', (event: CustomEvent) => {
      const { type, data } = event.detail;
      this.handleDataMutation(type, data);
    });
  }

  private handleDataMutation(type: string, data: any) {
    switch (type) {
      case 'invoice-created':
      case 'invoice-updated':
      case 'invoice-deleted':
        this.cacheInvalidator.invalidateQuery(['finance', 'invoices']);
        this.cacheInvalidator.invalidateQuery(['finance', 'summary']);
        break;

      case 'payment-created':
      case 'payment-updated':
        this.cacheInvalidator.invalidateQuery(['finance', 'payments']);
        this.cacheInvalidator.invalidateQuery(['finance', 'summary']);
        break;

      case 'vehicle-created':
      case 'vehicle-updated':
      case 'vehicle-status-changed':
        this.cacheInvalidator.invalidateQuery(['fleet', 'vehicles']);
        this.cacheInvalidator.invalidateQuery(['fleet', 'stats']);
        break;

      case 'customer-created':
      case 'customer-updated':
      case 'customer-status-changed':
        this.cacheInvalidator.invalidateQuery(['customers', 'list']);
        this.cacheInvalidator.invalidateQuery(['customers', 'stats']);
        break;

      default:
        break;
    }
  }

  setMobileMode(enabled: boolean) {
    this.mobileMode = enabled;
  }

  // ... other methods
}
```

---

### 5.4 Mobile Optimization

For mobile users with limited data, the system implements selective cache invalidation:

```typescript
// In PrefetchCoordinator class
private shouldInvalidateAggressively(queryKey: string[]): boolean {
  // On mobile, only invalidate high-priority queries aggressively
  if (this.mobileMode) {
    const spec = this.findSpecByQueryKey(queryKey);
    return spec?.priority === 'high';
  }
  return true;
}

private setupCacheInvalidation() {
  Object.entries(routeSpecs).forEach(([route, spec]) => {
    spec.queries.forEach((query) => {
      if (this.shouldInvalidateAggressively(query.queryKey)) {
        this.cacheInvalidator.setupAggressiveInvalidation(
          query.queryKey,
          query.staleTime
        );
      }
    });
  });
  // ... rest of setup
}
```

---

## 6. Implementation Details

### 6.1 File Structure

```
src/
├── hooks/
│   ├── useHoverTrigger.ts
│   ├── useViewportTrigger.ts
│   ├── useSmartAnticipation.ts
│   └── useRoutePrefetch.ts
├── lib/
│   ├── prefetch/
│   │   ├── PrefetchCoordinator.ts
│   │   ├── PrefetchScheduler.ts
│   │   ├── CacheInvalidator.ts
│   │   ├── routeDataSpecs.ts
│   │   └── index.ts
│   ├── queryClient.ts
│   └── cacheUtils.ts
├── services/
│   └── core/
│       └── ApiCache.ts
├── routes/
│   └── index.ts
└── components/
    └── Navigation.tsx
```

---

### 6.2 Core Hooks

#### `useRoutePrefetch` Hook

```typescript
// src/hooks/useRoutePrefetch.ts
import { useCallback } from 'react';
import { PrefetchCoordinator } from '../lib/prefetch/PrefetchCoordinator';

interface UseRoutePrefetchOptions {
  enabled?: boolean;
  triggerType?: 'hover' | 'viewport' | 'anticipation' | 'manual';
}

export function useRoutePrefetch(
  route: string,
  options: UseRoutePrefetchOptions = {}
) {
  const { enabled = true, triggerType = 'manual' } = options;
  const coordinator = PrefetchCoordinator.getInstance();

  const prefetch = useCallback(() => {
    if (!enabled) return;
    coordinator.triggerPrefetch(route, triggerType);
  }, [enabled, route, triggerType, coordinator]);

  return { prefetch };
}
```

---

### 6.3 PrefetchCoordinator

```typescript
// src/lib/prefetch/PrefetchCoordinator.ts
import { QueryClient } from '@tanstack/react-query';
import { CacheInvalidator } from './CacheInvalidator';
import { PrefetchScheduler } from './PrefetchScheduler';
import { routeSpecs, RoutePath, getRouteSpec } from './routeDataSpecs';
import { isMobile } from '../utils/deviceUtils';

export class PrefetchCoordinator {
  private static instance: PrefetchCoordinator;
  private queryClient: QueryClient;
  private cacheInvalidator: CacheInvalidator;
  private scheduler: PrefetchScheduler;
  private mobileMode: boolean = false;
  private activePrefetches: Map<string, Promise<void>> = new Map();

  private constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.cacheInvalidator = new CacheInvalidator(queryClient);
    this.scheduler = new PrefetchScheduler();
    this.setupCacheInvalidation();
    this.detectMobileMode();
  }

  static getInstance(queryClient?: QueryClient): PrefetchCoordinator {
    if (!PrefetchCoordinator.instance) {
      if (!queryClient) {
        throw new Error('QueryClient required for first initialization');
      }
      PrefetchCoordinator.instance = new PrefetchCoordinator(queryClient);
    }
    return PrefetchCoordinator.instance;
  }

  private detectMobileMode() {
    this.mobileMode = isMobile();
  }

  private setupCacheInvalidation() {
    // Setup aggressive invalidation for critical data
    Object.entries(routeSpecs).forEach(([route, spec]) => {
      spec.queries.forEach((query) => {
        if (query.priority === 'high') {
          this.cacheInvalidator.setupAggressiveInvalidation(
            query.queryKey,
            query.staleTime
          );
        }
      });
    });

    this.setupSmartInvalidationListeners();
  }

  private setupSmartInvalidationListeners() {
    window.addEventListener('data-mutation', (event: CustomEvent) => {
      const { type, data } = event.detail;
      this.handleDataMutation(type, data);
    });
  }

  private handleDataMutation(type: string, data: any) {
    switch (type) {
      case 'invoice-created':
      case 'invoice-updated':
      case 'invoice-deleted':
        this.cacheInvalidator.invalidateQuery(['finance', 'invoices']);
        this.cacheInvalidator.invalidateQuery(['finance', 'summary']);
        break;

      case 'payment-created':
      case 'payment-updated':
        this.cacheInvalidator.invalidateQuery(['finance', 'payments']);
        this.cacheInvalidator.invalidateQuery(['finance', 'summary']);
        break;

      case 'vehicle-created':
      case 'vehicle-updated':
      case 'vehicle-status-changed':
        this.cacheInvalidator.invalidateQuery(['fleet', 'vehicles']);
        this.cacheInvalidator.invalidateQuery(['fleet', 'stats']);
        break;

      case 'customer-created':
      case 'customer-updated':
      case 'customer-status-changed':
        this.cacheInvalidator.invalidateQuery(['customers', 'list']);
        this.cacheInvalidator.invalidateQuery(['customers', 'stats']);
        break;

      default:
        break;
    }
  }

  async triggerPrefetch(route: string, triggerType: 'hover' | 'viewport' | 'anticipation' | 'manual') {
    // Check if prefetch is already in progress
    if (this.activePrefetches.has(route)) {
      return this.activePrefetches.get(route);
    }

    // On mobile, skip prefetching for less critical routes
    if (this.mobileMode && !this.isCriticalRoute(route)) {
      return;
    }

    const spec = getRouteSpec(route);
    if (!spec) {
      return;
    }

    // Schedule prefetch through scheduler
    const prefetchPromise = this.scheduler.schedule(
      () => this.executePrefetch(spec, triggerType),
      route
    );

    this.activePrefetches.set(route, prefetchPromise);

    try {
      await prefetchPromise;
    } finally {
      this.activePrefetches.delete(route);
    }
  }

  private isCriticalRoute(route: string): boolean {
    const criticalRoutes = ['/dashboard', '/finance'];
    return criticalRoutes.includes(route);
  }

  private async executePrefetch(
    spec: RouteSpec,
    triggerType: string
  ): Promise<void> {
    const prefetchPromises = spec.queries.map((query) => {
      return this.queryClient.prefetchQuery({
        queryKey: query.queryKey,
        queryFn: query.queryFn,
        staleTime: query.staleTime,
      });
    });

    await Promise.allSettled(prefetchPromises);
  }

  setMobileMode(enabled: boolean) {
    this.mobileMode = enabled;
  }

  cleanup() {
    this.cacheInvalidator.cleanup();
    this.scheduler.cleanup();
  }
}
```

---

### 6.4 PrefetchScheduler

```typescript
// src/lib/prefetch/PrefetchScheduler.ts
interface ScheduledTask {
  route: string;
  execute: () => Promise<void>;
  priority: number;
  timestamp: number;
}

export class PrefetchScheduler {
  private queue: ScheduledTask[] = [];
  private processing: boolean = false;
  private maxConcurrent: number = 3;
  private activeTasks: number = 0;

  schedule(execute: () => Promise<void>, route: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const task: ScheduledTask = {
        route,
        execute,
        priority: this.calculatePriority(route),
        timestamp: Date.now(),
      };

      this.queue.push(task);
      this.processQueue();
    });
  }

  private calculatePriority(route: string): number {
    // All routes have equal priority
    return 1;
  }

  private async processQueue() {
    if (this.processing || this.activeTasks >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeTasks < this.maxConcurrent) {
      const task = this.queue.shift()!;
      this.activeTasks++;

      task.execute()
        .catch((error) => {
          // Silent error handling
          console.warn(`Prefetch failed for ${task.route}:`, error);
        })
        .finally(() => {
          this.activeTasks--;
          this.processQueue();
        });
    }

    this.processing = false;
  }

  cleanup() {
    this.queue = [];
  }
}
```

---

### 6.5 Route Configuration

```typescript
// src/routes/index.ts
import { RouteObject } from 'react-router-dom';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'finance',
        element: <Finance />,
      },
      {
        path: 'fleet',
        element: <Fleet />,
      },
      {
        path: 'customers',
        element: <Customers />,
      },
    ],
  },
];
```

---

### 6.6 Integration Points

#### Integration with [`src/lib/queryClient.ts`](src/lib/queryClient.ts)

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { PrefetchCoordinator } from './prefetch/PrefetchCoordinator';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute default
      cacheTime: 5 * 60 * 1000, // 5 minutes default
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Initialize PrefetchCoordinator
export const prefetchCoordinator = PrefetchCoordinator.getInstance(queryClient);
```

---

#### Integration with [`src/utils/cacheUtils.ts`](src/utils/cacheUtils.ts)

```typescript
// src/utils/cacheUtils.ts
import { QueryClient } from '@tanstack/react-query';

export function invalidateRelatedQueries(
  queryClient: QueryClient,
  baseQueryKey: string[]
) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as string[];
      return baseQueryKey.every((key, index) => queryKey[index] === key);
    },
  });
}

export function prefetchQuerySilently(
  queryClient: QueryClient,
  queryKey: string[],
  queryFn: () => Promise<any>,
  options?: { staleTime?: number }
) {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: options?.staleTime || 60 * 1000,
  }).catch((error) => {
    // Silent error handling
    console.warn('Silent prefetch failed:', error);
  });
}

export function isQueryStale(queryClient: QueryClient, queryKey: string[]): boolean {
  const query = queryClient.getQueryCache().find({ queryKey });
  if (!query) return true;
  return query.state.isStale();
}
```

---

#### Integration with [`src/services/core/ApiCache.ts`](src/services/core/ApiCache.ts)

```typescript
// src/services/core/ApiCache.ts
import { QueryClient } from '@tanstack/react-query';

export class ApiCache {
  private queryClient: QueryClient;
  private memoryCache: Map<string, { data: any; timestamp: number }> = new Map();
  private memoryCacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  // Multi-level caching: memory -> React Query -> API
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { useMemoryCache?: boolean }
  ): Promise<T> {
    // Try memory cache first
    if (options?.useMemoryCache) {
      const cached = this.memoryCache.get(key);
      if (cached && Date.now() - cached.timestamp < this.memoryCacheTTL) {
        return cached.data as T;
      }
    }

    // Try React Query cache
    const queryKey = ['api', key];
    const existingData = this.queryClient.getQueryData<T>(queryKey);
    if (existingData) {
      return existingData;
    }

    // Fetch from API
    const data = await fetcher();

    // Cache in memory
    if (options?.useMemoryCache) {
      this.memoryCache.set(key, { data, timestamp: Date.now() });
    }

    // Cache in React Query
    this.queryClient.setQueryData(queryKey, data);

    return data;
  }

  invalidate(key: string) {
    this.memoryCache.delete(key);
    this.queryClient.invalidateQueries({ queryKey: ['api', key] });
  }

  clear() {
    this.memoryCache.clear();
    this.queryClient.clear();
  }
}
```

---

## 7. Error Handling and Fallback

### 7.1 Silent Error Handling

All prefetching operations fail silently to avoid impacting user experience:

```typescript
// src/lib/prefetch/PrefetchCoordinator.ts
private async executePrefetch(
  spec: RouteSpec,
  triggerType: string
): Promise<void> {
  const prefetchPromises = spec.queries.map((query) => {
    return this.queryClient.prefetchQuery({
      queryKey: query.queryKey,
      queryFn: query.queryFn,
      staleTime: query.staleTime,
    });
  });

  // Use Promise.allSettled to handle errors silently
  const results = await Promise.allSettled(prefetchPromises);

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const query = spec.queries[index];
      console.warn(`Prefetch failed for ${query.queryKey.join('.')}:`, result.reason);
      // Schedule retry
      this.scheduleRetry(query, triggerType);
    }
  });
}
```

---

### 7.2 Automatic Retry

Failed prefetches are automatically retried with exponential backoff:

```typescript
// src/lib/prefetch/PrefetchCoordinator.ts
private retryAttempts: Map<string, number> = new Map();
private maxRetries: number = 3;

private scheduleRetry(
  query: any,
  triggerType: string,
  attempt: number = 1
) {
  const queryKey = query.queryKey.join('.');
  const currentAttempts = this.retryAttempts.get(queryKey) || 0;

  if (currentAttempts >= this.maxRetries) {
    this.retryAttempts.delete(queryKey);
    return;
  }

  const delay = Math.min(1000 * 2 ** (currentAttempts - 1), 30000);

  setTimeout(async () => {
    try {
      await this.queryClient.prefetchQuery({
        queryKey: query.queryKey,
        queryFn: query.queryFn,
        staleTime: query.staleTime,
      });

      // Reset retry counter on success
      this.retryAttempts.delete(queryKey);
    } catch (error) {
      this.retryAttempts.set(queryKey, currentAttempts + 1);
      this.scheduleRetry(query, triggerType, currentAttempts + 1);
    }
  }, delay);
}
```

---

### 7.3 Network-Aware Handling

Prefetching adapts to network conditions:

```typescript
// src/lib/prefetch/PrefetchCoordinator.ts
private async checkNetworkConditions(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.onLine) {
    return false;
  }

  // Check connection type if available
  const connection = (navigator as any).connection;
  if (connection) {
    // Skip prefetching on slow connections
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      return false;
    }

    // Skip prefetching if data saver is enabled
    if (connection.saveData) {
      return false;
    }
  }

  return true;
}

async triggerPrefetch(route: string, triggerType: 'hover' | 'viewport' | 'anticipation' | 'manual') {
  // Check network conditions
  const networkOk = await this.checkNetworkConditions();
  if (!networkOk) {
    return;
  }

  // ... rest of prefetch logic
}
```

---

### 7.4 Fallback to On-Demand Loading

If prefetching fails, the application falls back to normal on-demand loading:

```typescript
// In route components
import { useQuery } from '@tanstack/react-query';

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 60 * 1000,
  });

  // If prefetch failed, this will fetch on-demand
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return <DashboardContent stats={stats} />;
}
```

---

## 8. Success Criteria

### 8.1 Performance Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Perceived Load Time Reduction | 60-80% | Chrome DevTools Performance tab |
| Time to Interactive (TTI) | < 2 seconds | Lighthouse audit |
| First Contentful Paint (FCP) | < 1 second | Lighthouse audit |
| Cache Hit Rate | > 70% | React Query DevTools |

---

### 8.2 User Experience Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Navigation Smoothness | No visible jank | User testing |
| Prefetch Success Rate | > 90% | Console logging |
| Error Rate (visible to users) | 0% | User testing |
| Mobile Data Usage Reduction | 40-50% | Network tab analysis |

---

### 8.3 Resource Efficiency Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Unnecessary API Calls | < 10% | Network tab analysis |
| Cache Memory Usage | < 50MB | Chrome DevTools Memory tab |
| Prefetch CPU Overhead | < 5% | Chrome DevTools Performance tab |
| Battery Impact (mobile) | Negligible | User testing |

---

### 8.4 Reliability Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Prefetch Retry Success Rate | > 80% | Console logging |
| Network Condition Detection Accuracy | > 95% | Testing on various connections |
| Mobile Detection Accuracy | > 98% | Testing on various devices |
| Cache Invalidation Accuracy | > 95% | Manual testing |

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)

**Objectives**:
- Set up core architecture
- Implement basic prefetching functionality
- Integrate with React Query

**Tasks**:
1. Create file structure
2. Implement [`PrefetchCoordinator`](src/lib/prefetch/PrefetchCoordinator.ts)
3. Implement [`PrefetchScheduler`](src/lib/prefetch/PrefetchScheduler.ts)
4. Create route data specifications
5. Integrate with [`queryClient.ts`](src/lib/queryClient.ts)

**Deliverables**:
- Functional prefetch coordinator
- Route specifications for all routes
- Basic prefetching working

---

### Phase 2: Trigger Mechanisms (Week 2)

**Objectives**:
- Implement all trigger mechanisms
- Add trigger hooks
- Integrate with navigation

**Tasks**:
1. Implement [`useHoverTrigger`](src/hooks/useHoverTrigger.ts)
2. Implement [`useViewportTrigger`](src/hooks/useViewportTrigger.ts)
3. Implement [`useSmartAnticipation`](src/hooks/useSmartAnticipation.ts)
4. Create [`useRoutePrefetch`](src/hooks/useRoutePrefetch.ts) hook
5. Update navigation components

**Deliverables**:
- All trigger mechanisms working
- Navigation integration complete
- Trigger hooks ready for use

---

### Phase 3: Cache Management (Week 3)

**Objectives**:
- Implement cache invalidation strategies
- Add mobile optimization
- Implement error handling

**Tasks**:
1. Implement [`CacheInvalidator`](src/lib/prefetch/CacheInvalidator.ts)
2. Setup aggressive invalidation for critical data
3. Setup smart invalidation for mutations
4. Add mobile detection and optimization
5. Implement silent error handling
6. Add automatic retry logic

**Deliverables**:
- Hybrid cache invalidation working
- Mobile optimization complete
- Error handling robust

---

### Phase 4: Testing & Optimization (Week 4)

**Objectives**:
- Test all functionality
- Optimize performance
- Document and finalize

**Tasks**:
1. Write unit tests for core components
2. Write integration tests for prefetching
3. Test on various devices and network conditions
4. Performance profiling and optimization
5. Create documentation
6. Code review and finalization

**Deliverables**:
- Comprehensive test suite
- Performance benchmarks
- Complete documentation
- Production-ready code

---

## 10. Technical Considerations

### 10.1 React Query Integration

The prefetching system is built on top of React Query's [`prefetchQuery`](https://tanstack.com/query/latest/docs/reference/QueryClient#prefetchquery) API:

**Benefits**:
- Seamless integration with existing data fetching
- Automatic cache management
- Built-in retry logic
- DevTools support for debugging

**Configuration**:

```typescript
// src/lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Disable for prefetching
      refetchOnReconnect: false, // Disable for prefetching
    },
  },
});
```

---

### 10.2 Browser Compatibility

**Supported Browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Key APIs Used**:
- Intersection Observer (viewport trigger)
- CustomEvent (data mutation events)
- Network Information API (network detection)

**Fallbacks**:
- Intersection Observer polyfill for older browsers
- Manual network detection if Network Information API unavailable
- Graceful degradation for unsupported features

---

### 10.3 Performance Impact

**CPU Overhead**:
- Minimal: < 5% during prefetching
- Debouncing prevents excessive CPU usage
- Scheduler limits concurrent operations

**Memory Usage**:
- Estimated: 20-50MB for cached data
- Automatic cache cleanup by React Query
- Configurable cache time limits

**Network Usage**:
- Optimized through selective prefetching
- Mobile optimization reduces data usage by 40-50%
- Network-aware handling prevents unnecessary requests

---

### 10.4 Mobile Optimization

**Strategies**:
1. **Selective Prefetching**: Only prefetch critical routes on mobile
2. **Network Detection**: Skip prefetching on slow connections
3. **Data Saver Mode**: Respect browser's data saver setting
4. **Lightweight Data**: Prefetch minimal data fields for lists

**Implementation**:

```typescript
// src/utils/deviceUtils.ts
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function isSlowConnection(): boolean {
  const connection = (navigator as any).connection;
  if (!connection) return false;
  return (
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    connection.saveData
  );
}
```

---

### 10.5 Accessibility

**Considerations**:
- Prefetching doesn't affect screen readers
- No impact on keyboard navigation
- Respects reduced motion preferences
- Works with assistive technologies

---

## 11. Future Enhancements

### 11.1 ML-Based Anticipation

**Concept**: Use machine learning to predict user navigation patterns more accurately.

**Implementation**:
- Collect anonymized navigation data
- Train a simple model to predict next routes
- Integrate predictions into prefetching triggers

**Benefits**:
- More accurate prefetching
- Reduced unnecessary requests
- Better personalization

---

### 11.2 Adaptive Prefetching

**Concept**: Dynamically adjust prefetching behavior based on user patterns and device capabilities.

**Features**:
- Learn from user behavior
- Adjust debounce times per user
- Optimize prefetching schedule
- Adapt to device performance

---

### 11.3 Predictive Resource Loading

**Concept**: Prefetch not just data, but also resources (images, fonts, scripts).

**Implementation**:
- Identify resources needed for each route
- Use `<link rel="prefetch">` for resources
- Coordinate with data prefetching

---

### 11.4 Offline Support

**Concept**: Cache data for offline access and sync when online.

**Implementation**:
- Use Service Workers for offline caching
- Implement optimistic updates
- Sync strategy for conflict resolution

---

### 11.5 Performance Monitoring

**Concept**: Add lightweight monitoring to track prefetching effectiveness.

**Metrics**:
- Prefetch success rate
- Cache hit rate
- Perceived load time improvement
- Network usage reduction

**Implementation**:
- Simple console logging
- Optional analytics integration
- Performance marks and measures

---

## 12. Conclusion

This design document presents a comprehensive route-level data prefetching strategy for the Fleetify application. The solution addresses key requirements:

✅ **Real-time data**: All routes prefetch data with < 1 minute freshness  
✅ **Mobile optimization**: Selective prefetching reduces data usage by 40-50%  
✅ **Hybrid cache invalidation**: Aggressive for critical data, smart for less critical  
✅ **React Query integration**: Seamless integration with existing infrastructure  
✅ **Silent error handling**: No impact on user experience  
✅ **Zero monitoring overhead**: Simple implementation without complex infrastructure  
✅ **Equal priority**: All routes treated equally, prefetching based on triggers only  

The three-layer architecture (Trigger, Prefetch, Data) provides a clean separation of concerns and makes the system maintainable and extensible. The multi-trigger approach maximizes prefetching opportunities while minimizing unnecessary requests.

With a 4-week implementation timeline and clear success criteria, this design provides a solid foundation for improving user experience through intelligent data prefetching.

---

## 13. Appendix A - Key Files Reference

| File | Description | Location |
|------|-------------|----------|
| [`PrefetchCoordinator.ts`](src/lib/prefetch/PrefetchCoordinator.ts) | Main prefetch orchestration | `src/lib/prefetch/` |
| [`PrefetchScheduler.ts`](src/lib/prefetch/PrefetchScheduler.ts) | Prefetch scheduling and queue management | `src/lib/prefetch/` |
| [`CacheInvalidator.ts`](src/lib/prefetch/CacheInvalidator.ts) | Cache invalidation strategies | `src/lib/prefetch/` |
| [`routeDataSpecs.ts`](src/lib/prefetch/routeDataSpecs.ts) | Route data specifications | `src/lib/prefetch/` |
| [`useHoverTrigger.ts`](src/hooks/useHoverTrigger.ts) | Hover-based trigger hook | `src/hooks/` |
| [`useViewportTrigger.ts`](src/hooks/useViewportTrigger.ts) | Viewport-based trigger hook | `src/hooks/` |
| [`useSmartAnticipation.ts`](src/hooks/useSmartAnticipation.ts) | Smart anticipation trigger hook | `src/hooks/` |
| [`useRoutePrefetch.ts`](src/hooks/useRoutePrefetch.ts) | Main prefetch hook | `src/hooks/` |
| [`queryClient.ts`](src/lib/queryClient.ts) | React Query configuration | `src/lib/` |
| [`cacheUtils.ts`](src/utils/cacheUtils.ts) | Cache utility functions | `src/utils/` |
| [`ApiCache.ts`](src/services/core/ApiCache.ts) | Multi-level caching system | `src/services/core/` |
| [`index.ts`](src/routes/index.ts) | Route definitions | `src/routes/` |

---

## 14. Appendix B - Related Documentation References

### Internal Documentation

- [`ARCHITECTURE.md`](../ARCHITECTURE.md) - Overall system architecture
- [`PERFORMANCE_OPTIMIZATION_PLAN.md`](../PERFORMANCE_OPTIMIZATION_PLAN.md) - Performance optimization guidelines
- [`DATABASE_SCHEMA.md`](../DATABASE_SCHEMA.md) - Database schema reference
- [`API_DOCUMENTATION.md`](../API_DOCUMENTATION.md) - API documentation

### External Documentation

- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation)
- [Web Performance Optimization](https://web.dev/performance/)

### Related Features

- [Route-based Code Splitting](https://react.dev/reference/react/lazy)
- [Service Worker Caching](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Resource Hints](https://web.dev/resource-hints/)

---

**Document End**
