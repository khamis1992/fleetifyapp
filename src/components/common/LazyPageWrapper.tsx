import React, { Suspense, ComponentType } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Lazy Page Wrapper - Provides consistent loading experience for lazy-loaded pages
 * Part of Phase 1 Performance Optimization
 */

interface LazyPageWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Default fallback with centered loading spinner
const DefaultFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-muted-foreground">جاري التحميل...</p>
    </div>
  </div>
);

// Skeleton fallback for specific page types
export const PageSkeletonFallback = () => (
  <div className="p-6 space-y-6 animate-pulse">
    <div className="h-24 bg-muted rounded-2xl" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 bg-muted rounded-lg" />
      ))}
    </div>
    <div className="h-96 bg-muted rounded-lg" />
  </div>
);

export const LazyPageWrapper: React.FC<LazyPageWrapperProps> = ({ 
  children, 
  fallback = <DefaultFallback /> 
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

/**
 * Helper function to create lazy-loaded page component with proper typing
 * Usage: const LazyFinance = lazyPage(() => import('@/pages/Finance'))
 */
export function lazyPage<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return React.lazy(importFunc);
}

/**
 * Helper to create lazy component with custom fallback
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  customFallback?: React.ReactNode
) {
  const LazyComponent = React.lazy(importFunc);
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={customFallback || <DefaultFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

export default LazyPageWrapper;
