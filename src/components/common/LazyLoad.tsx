/**
 * LazyLoad Component
 * Optimized lazy loading with intersection observer and skeleton fallback
 * Supports prefetching, error boundaries, and custom loading states
 */

import React, { Suspense, useState, useEffect, useRef, ComponentType } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface LazyLoadProps {
  /** Lazy loaded component */
  children: React.ReactNode;
  /** Custom fallback component */
  fallback?: React.ReactNode;
  /** Minimum height for the skeleton */
  minHeight?: number | string;
  /** Delay before showing skeleton (prevents flash) */
  delay?: number;
  /** Enable viewport-based loading */
  viewportLoading?: boolean;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Custom error fallback */
  errorFallback?: React.ReactNode;
  /** On error callback */
  onError?: (error: Error) => void;
  /** Custom class name */
  className?: string;
}

// Default skeleton fallback
const DefaultSkeleton: React.FC<{ minHeight?: number | string }> = ({ minHeight = 200 }) => (
  <div 
    className="w-full animate-pulse" 
    style={{ minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight }}
  >
    <Skeleton className="w-full h-full rounded-lg" />
  </div>
);

// Error fallback component
const ErrorFallback: React.FC<{
  error: Error;
  resetErrorBoundary: () => void;
}> = ({ error, resetErrorBoundary }) => (
  <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg border border-red-200">
    <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
    <h3 className="text-lg font-semibold text-red-800 mb-2">حدث خطأ في تحميل المكون</h3>
    <p className="text-sm text-red-600 mb-4 text-center max-w-md">
      {error.message || 'خطأ غير معروف'}
    </p>
    <Button
      variant="outline"
      onClick={resetErrorBoundary}
      className="gap-2"
    >
      <RefreshCw className="h-4 w-4" />
      إعادة المحاولة
    </Button>
  </div>
);

// Delayed loading indicator (prevents flash for fast loads)
const DelayedFallback: React.FC<{
  delay: number;
  fallback: React.ReactNode;
}> = ({ delay, fallback }) => {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowFallback(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!showFallback) return null;
  return <>{fallback}</>;
};

// Viewport-aware lazy loader
const ViewportLazyLoad: React.FC<{
  children: React.ReactNode;
  fallback: React.ReactNode;
  rootMargin: string;
  className?: string;
}> = ({ children, fallback, rootMargin, className }) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {isInView ? children : fallback}
    </div>
  );
};

// Main component
export const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  fallback,
  minHeight = 200,
  delay = 200,
  viewportLoading = false,
  rootMargin = '100px',
  errorFallback,
  onError,
  className,
}) => {
  const defaultFallback = fallback || <DefaultSkeleton minHeight={minHeight} />;
  const delayedFallback = delay > 0 
    ? <DelayedFallback delay={delay} fallback={defaultFallback} />
    : defaultFallback;

  const content = (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => 
        errorFallback || <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
      }
      onError={onError}
    >
      <Suspense fallback={delayedFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );

  if (viewportLoading) {
    return (
      <ViewportLazyLoad
        fallback={delayedFallback}
        rootMargin={rootMargin}
        className={className}
      >
        {content}
      </ViewportLazyLoad>
    );
  }

  return <div className={className}>{content}</div>;
};

// HOC for lazy loading components
export function withLazyLoad<P extends object>(
  Component: ComponentType<P>,
  options?: Omit<LazyLoadProps, 'children'>
) {
  const LazyComponent = React.lazy(() => Promise.resolve({ default: Component }));

  return function LazyLoadedComponent(props: P) {
    return (
      <LazyLoad {...options}>
        <LazyComponent {...props} />
      </LazyLoad>
    );
  };
}

// Preload utility for route prefetching
export function preloadComponent(
  importFn: () => Promise<{ default: ComponentType<any> }>
) {
  return importFn();
}

export default LazyLoad;

