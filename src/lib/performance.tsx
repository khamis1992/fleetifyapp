/**
 * Performance Utilities
 * 
 * Collection of utilities to improve app performance
 */

import React from 'react';

/**
 * Debounce function - delays execution until after wait time has elapsed
 * Useful for: search inputs, resize handlers, scroll handlers
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - ensures function is called at most once per specified time period
 * Useful for: scroll handlers, mouse move handlers, resize handlers
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoize function - caches function results
 * Useful for: expensive calculations, API calls with same params
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Lazy load component - delays component loading until needed
 * Useful for: large components, route-based code splitting
 */
export function lazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ReactNode = null
): React.FC<React.ComponentProps<T>> {
  const LazyComponent = React.lazy(importFunc);
  
  return function LazyLoadWrapper(props: React.ComponentProps<T>) {
    return (
      <React.Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}

/**
 * Batch updates - groups multiple state updates into single render
 * Useful for: multiple setState calls, bulk data updates
 */
export function batchUpdates<T extends () => void>(callback: T): void {
  // React 18+ automatically batches updates
  // This is a compatibility wrapper for older versions
  if (typeof React !== 'undefined' && 'startTransition' in React) {
    (React as any).startTransition(callback);
  } else {
    callback();
  }
}

/**
 * Intersection Observer hook for lazy loading images/components
 */
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  });
}

/**
 * Request Animation Frame wrapper for smooth animations
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  callback: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;

  return (...args: Parameters<T>) => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      callback(...args);
      rafId = null;
    });
  };
}

/**
 * Measure performance of a function
 */
export async function measurePerformance<T>(
  name: string,
  func: () => T | Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await func();
    const end = performance.now();
    const duration = end - start;
    
    if (import.meta.env.DEV) {
      console.log(`⚡ [Performance] ${name}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const end = performance.now();
    const duration = end - start;
    
    if (import.meta.env.DEV) {
      console.error(`❌ [Performance] ${name} failed after ${duration.toFixed(2)}ms`, error);
    }
    
    throw error;
  }
}
