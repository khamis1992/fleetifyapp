/**
 * Component Performance Optimization Utilities
 * React.memo wrappers and performance helpers
 */

import React, { memo, useMemo, useCallback } from 'react';

/**
 * Shallow comparison for React.memo
 */
export function shallowEqual(objA: any, objB: any): boolean {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(objB, key) || !Object.is(objA[key], objB[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Optimized memo wrapper with custom comparison
 */
export function optimizedMemo<T extends React.ComponentType<any>>(
  Component: T,
  propsAreEqual?: (prevProps: any, nextProps: any) => boolean
): T {
  return memo(Component, propsAreEqual || shallowEqual) as T;
}

/**
 * Hook to create stable callback references
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = React.useRef(callback);
  
  React.useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(((...args) => callbackRef.current(...args)) as T, []);
}

/**
 * Hook to create memoized value with dependencies
 */
export function useMemoizedValue<T>(factory: () => T, deps: React.DependencyList): T {
  return useMemo(factory, deps);
}

/**
 * Debounce hook for performance optimization
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook for performance optimization
 */
export function useThrottle<T>(value: T, limit: number = 300): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = React.useRef(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, options]);

  return isIntersecting;
}

/**
 * Lazy component loader with retry logic
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  retries: number = 3,
  delay: number = 1000
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await importFunc();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  });
}

/**
 * Preload component for faster navigation
 */
export function preloadComponent(importFunc: () => Promise<any>) {
  const promise = importFunc();
  return {
    preload: () => promise,
    Component: React.lazy(() => promise),
  };
}

/**
 * Image lazy loading component
 */
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholder?: string;
  threshold?: number;
}

export const LazyImage: React.FC<LazyImageProps> = optimizedMemo(({ 
  src, 
  placeholder = '', 
  threshold = 0.1,
  ...props 
}) => {
  const imageRef = React.useRef<HTMLImageElement>(null);
  const isVisible = useIntersectionObserver(imageRef, { threshold });
  const [imageSrc, setImageSrc] = React.useState(placeholder);

  React.useEffect(() => {
    if (isVisible && src !== imageSrc) {
      setImageSrc(src);
    }
  }, [isVisible, src, imageSrc]);

  return <img ref={imageRef} src={imageSrc} {...props} />;
});

LazyImage.displayName = 'LazyImage';

/**
 * Virtualized list hook for large datasets
 */
export function useVirtualList<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number
) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.ceil((scrollTop + containerHeight) / itemHeight);
    return { start, end };
  }, [scrollTop, containerHeight, itemHeight]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll,
    visibleRange,
  };
}

/**
 * Render optimization hook - skip renders when data hasn't changed
 */
export function useRenderOptimization<T>(data: T): T {
  const memoizedData = React.useRef<T>(data);

  if (!shallowEqual(memoizedData.current, data)) {
    memoizedData.current = data;
  }

  return memoizedData.current;
}

/**
 * Prevent unnecessary re-renders with deep comparison
 */
export function useDeepMemo<T>(value: T): T {
  const ref = React.useRef<T>(value);
  const signalRef = React.useRef<number>(0);

  if (!deepEqual(ref.current, value)) {
    ref.current = value;
    signalRef.current += 1;
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ref.current, [signalRef.current]);
}

function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * Performance monitoring wrapper component
 */
interface PerformanceMonitorProps {
  id: string;
  children: React.ReactNode;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ id, children }) => {
  React.useEffect(() => {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      if (import.meta.env.DEV && duration > 16) { // 16ms threshold (60fps)
        console.warn(`[Performance] ${id} took ${duration.toFixed(2)}ms`);
      }
    };
  }, [id]);

  return <>{children}</>;
};

/**
 * Batch update hook for multiple state updates
 */
export function useBatchUpdate() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  const pendingUpdates = React.useRef<(() => void)[]>([]);
  const isScheduled = React.useRef(false);

  const scheduleUpdate = useCallback(() => {
    if (!isScheduled.current) {
      isScheduled.current = true;
      requestAnimationFrame(() => {
        pendingUpdates.current.forEach(fn => fn());
        pendingUpdates.current = [];
        isScheduled.current = false;
        forceUpdate();
      });
    }
  }, []);

  const batchUpdate = useCallback((updateFn: () => void) => {
    pendingUpdates.current.push(updateFn);
    scheduleUpdate();
  }, [scheduleUpdate]);

  return batchUpdate;
}
