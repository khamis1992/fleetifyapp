# Performance Monitoring Migration Guide

This guide shows how to replace existing `useQuery` calls with performance-monitored alternatives to track cache effectiveness and query performance.

## Overview

The performance monitoring system has been integrated into the QueryClient configuration and specialized hooks are available for different types of queries:

- `useDashboardQuery` - For dashboard data (threshold: 800ms)
- `useUserDataQuery` - For user data (threshold: 600ms)  
- `useFinanceQuery` - For financial data (threshold: 1200ms)
- `useFleetQuery` - For fleet/vehicle data (threshold: 1500ms)
- `useCustomerQuery` - For customer data (threshold: 1000ms)
- `useContractQuery` - For contract data (threshold: 1000ms)
- `useMonitoredQuery` - Generic hook with custom thresholds

## Migration Steps

### 1. Replace Critical Query Calls

**Before:**
```typescript
const { data, isLoading, error } = useQuery(
  ['dashboard', 'summary'],
  () => fetchDashboardData(),
  {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  }
);
```

**After:**
```typescript
const { data, isLoading, error, performanceMetrics } = useDashboardQuery(
  ['dashboard', 'summary'],
  () => fetchDashboardData(),
  {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  }
);
```

### 2. Update User Data Queries

**Before:**
```typescript
const { data: userData, isLoading } = useQuery(
  ['user', 'profile'],
  () => fetchUserProfile()
);
```

**After:**
```typescript
const { data: userData, isLoading, performanceMetrics } = useUserDataQuery(
  ['user', 'profile'],
  () => fetchUserProfile()
);
```

### 3. Update Financial Queries

**Before:**
```typescript
const { data: transactions, isLoading } = useQuery(
  ['finance', 'transactions'],
  () => fetchTransactions()
);
```

**After:**
```typescript
const { data: transactions, isLoading, performanceMetrics } = useFinanceQuery(
  ['finance', 'transactions'],
  () => fetchTransactions()
);
```

### 4. Update Fleet Queries

**Before:**
```typescript
const { data: vehicles, isLoading } = useQuery(
  ['fleet', 'vehicles'],
  () => fetchVehicles()
);
```

**After:**
```typescript
const { data: vehicles, isLoading, performanceMetrics } = useFleetQuery(
  ['fleet', 'vehicles'],
  () => fetchVehicles()
);
```

### 5. Update Customer Queries

**Before:**
```typescript
const { data: customers, isLoading } = useQuery(
  ['customers', 'list'],
  () => fetchCustomers()
);
```

**After:**
```typescript
const { data: customers, isLoading, performanceMetrics } = useCustomerQuery(
  ['customers', 'list'],
  () => fetchCustomers()
);
```

## Performance Metrics Available

Each monitored query provides:

```typescript
interface QueryPerformanceMetrics {
  queryKey: string[];
  executionCount: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  isSlowQuery: boolean;
  lastExecutionTime: number;
}
```

### Using Performance Metrics

```typescript
const { data, isLoading, performanceMetrics } = useDashboardQuery(
  ['dashboard', 'summary'],
  fetchDashboardData
);

// Check if query is slow
if (performanceMetrics?.isSlowQuery) {
  console.warn('Dashboard query is slow:', performanceMetrics.averageTime);
}

// Check cache effectiveness
if (performanceMetrics?.cacheHitRate < 0.8) {
  console.warn('Low cache hit rate:', performanceMetrics.cacheHitRate);
}

// Log performance details
console.log('Query executed', performanceMetrics.executionCount, 'times');
console.log('Average execution time:', performanceMetrics.averageTime, 'ms');
console.log('Cache hit rate:', (performanceMetrics.cacheHitRate * 100).toFixed(1), '%');
```

## QueryClient Integration

The QueryClient now includes performance monitoring callbacks:

- **onSuccess**: Logs successful query completions
- **onError**: Logs query errors for analysis
- **onSettled**: Logs query completion events
- **onMutate**: Logs mutation start events
- **onSuccess** (mutations): Logs successful mutations
- **onError** (mutations): Logs mutation errors

## Benefits

1. **Cache Effectiveness Tracking**: Monitor cache hit rates to validate optimizations
2. **Performance Bottleneck Identification**: Automatically identify slow queries
3. **Detailed Logging**: Comprehensive performance metrics for debugging
4. **Real-time Monitoring**: Live performance data during development
5. **Historical Analysis**: Track performance trends over time

## Files to Update

### High Priority (Performance-Critical)
- `src/pages/Dashboard.tsx` - Use `useDashboardQuery`
- `src/contexts/AuthContext.tsx` - Use `useUserDataQuery` for user profile
- `src/pages/Finance.tsx` - Use `useFinanceQuery`
- `src/pages/Fleet.tsx` - Use `useFleetQuery`
- `src/pages/Customers.tsx` - Use `useCustomerQuery`

### Medium Priority
- `src/pages/Contracts.tsx` - Use `useContractQuery`
- Customer detail pages and components
- Fleet detail pages and components

### Low Priority
- Reports pages
- Settings pages
- Help pages

## Example Implementation

See `src/components/examples/MonitoredQueryExample.tsx` for a complete working example showing all the monitored query hooks in action.

## Performance Monitoring Dashboard

The performance data can be viewed in real-time using:

```typescript
import { getGlobalPerformanceMetrics, getPerformanceSummary } from '@/hooks/usePerformanceMonitor';

// Get all metrics
const allMetrics = getGlobalPerformanceMetrics();

// Get formatted summary
const summary = getPerformanceSummary();
console.log(summary);
```

This will show:
- Total queries executed
- Number of slow queries
- Average execution times
- Cache hit rates
- Individual query details

## Next Steps

1. Replace `useQuery` calls in critical pages with appropriate monitored hooks
2. Test performance monitoring in development
3. Monitor cache hit rates to validate optimizations
4. Use performance data to identify and fix bottlenecks
5. Gradually extend monitoring to less critical queries