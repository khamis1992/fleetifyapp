import React, { Suspense, lazy, ComponentType } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Heavy Component Wrapper - Performance Optimization
 * Provides lazy loading wrappers for heavy components like charts, analytics, etc.
 * Part of Phase 1 Performance Optimization
 */

interface HeavyComponentWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string;
}

// Default fallback for heavy components
const HeavyComponentFallback: React.FC<{ minHeight?: string }> = ({ minHeight = '400px' }) => (
  <div 
    className="flex items-center justify-center bg-muted/10 rounded-lg border border-dashed"
    style={{ minHeight }}
  >
    <div className="text-center space-y-3">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-muted-foreground">جاري تحميل المكون...</p>
    </div>
  </div>
);

// Chart component fallback
export const ChartFallback: React.FC = () => (
  <div className="flex items-center justify-center bg-muted/5 rounded-lg border" style={{ minHeight: '300px' }}>
    <div className="text-center space-y-2">
      <LoadingSpinner />
      <p className="text-xs text-muted-foreground">جاري تحميل الرسم البياني...</p>
    </div>
  </div>
);

// Dashboard fallback
export const DashboardFallback: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-24 bg-muted rounded-2xl" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 bg-muted rounded-lg" />
      ))}
    </div>
    <div className="h-96 bg-muted rounded-lg" />
  </div>
);

// Analytics fallback
export const AnalyticsFallback: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-12 bg-muted rounded-lg w-1/3" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-48 bg-muted rounded-lg" />
      ))}
    </div>
  </div>
);

// Wrapper component
export const HeavyComponentWrapper: React.FC<HeavyComponentWrapperProps> = ({ 
  children, 
  fallback,
  minHeight 
}) => {
  return (
    <Suspense fallback={fallback || <HeavyComponentFallback minHeight={minHeight} />}>
      {children}
    </Suspense>
  );
};

/**
 * Factory function to create lazy-loaded heavy components
 * Usage:
 * const HeavyChart = createHeavyComponent(
 *   () => import('./HeavyChart'),
 *   <ChartFallback />
 * );
 */
export function createHeavyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T } | T>,
  customFallback?: React.ReactNode
) {
  const LazyComponent = lazy(async () => {
    const module = await importFunc();
    // Handle both default and named exports
    return 'default' in module ? module : { default: module as T };
  });
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={customFallback || <HeavyComponentFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Specific wrapper for chart components
 */
export function createLazyChart<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T } | T>
) {
  return createHeavyComponent(importFunc, <ChartFallback />);
}

/**
 * Specific wrapper for dashboard components
 */
export function createLazyDashboard<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T } | T>
) {
  return createHeavyComponent(importFunc, <DashboardFallback />);
}

/**
 * Specific wrapper for analytics components
 */
export function createLazyAnalytics<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T } | T>
) {
  return createHeavyComponent(importFunc, <AnalyticsFallback />);
}

export default HeavyComponentWrapper;
