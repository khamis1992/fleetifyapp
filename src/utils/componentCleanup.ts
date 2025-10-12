/**
 * Component Cleanup Utilities
 * Phase 1: Performance Optimization - Memory Management
 * 
 * This file provides utilities for proper component cleanup to prevent memory leaks
 */

import { useEffect, useRef, DependencyList } from 'react';

/**
 * useCleanupEffect - Enhanced useEffect with automatic cleanup tracking
 * 
 * Usage:
 * useCleanupEffect(() => {
 *   const subscription = subscribe();
 *   return () => subscription.unsubscribe();
 * }, [dependencies]);
 */
export function useCleanupEffect(
  effect: () => void | (() => void),
  deps?: DependencyList
) {
  useEffect(() => {
    const cleanup = effect();
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, deps);
}

/**
 * useInterval - Cleanup-safe interval hook
 * Automatically clears interval on unmount
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * useTimeout - Cleanup-safe timeout hook
 * Automatically clears timeout on unmount
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}

/**
 * useEventListener - Cleanup-safe event listener hook
 * Automatically removes listener on unmount
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | HTMLElement | null = window
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element) return;

    const eventListener = (event: Event) => 
      savedHandler.current(event as WindowEventMap[K]);

    element.addEventListener(eventName, eventListener);

    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
}

/**
 * useAbortController - Cleanup-safe AbortController for fetch requests
 * Automatically aborts pending requests on unmount
 */
export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortControllerRef.current = new AbortController();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return abortControllerRef.current;
}

/**
 * useWebSocket - Cleanup-safe WebSocket hook
 * Automatically closes connection on unmount
 */
export function useWebSocket(url: string | null) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!url) return;

    wsRef.current = new WebSocket(url);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  return wsRef.current;
}

/**
 * Component Cleanup Checklist
 * 
 * ✅ Always cleanup:
 * 1. Event listeners
 * 2. Intervals and timeouts
 * 3. WebSocket connections
 * 4. Subscriptions (e.g., Supabase realtime)
 * 5. Fetch requests (using AbortController)
 * 6. Animation frames
 * 7. Observers (IntersectionObserver, MutationObserver)
 * 
 * ❌ Don't cleanup:
 * 1. State updates (React handles this)
 * 2. Query client data (React Query handles this)
 * 3. Regular function calls
 * 
 * Example patterns:
 * 
 * // ✅ Good: Cleanup event listener
 * useEffect(() => {
 *   const handler = () => console.log('resize');
 *   window.addEventListener('resize', handler);
 *   return () => window.removeEventListener('resize', handler);
 * }, []);
 * 
 * // ✅ Good: Cleanup interval
 * useEffect(() => {
 *   const id = setInterval(() => refresh(), 5000);
 *   return () => clearInterval(id);
 * }, []);
 * 
 * // ✅ Good: Cleanup subscription
 * useEffect(() => {
 *   const subscription = supabase
 *     .channel('changes')
 *     .on('postgres_changes', handler)
 *     .subscribe();
 *   return () => subscription.unsubscribe();
 * }, []);
 * 
 * // ❌ Bad: No cleanup
 * useEffect(() => {
 *   setInterval(() => refresh(), 5000); // Memory leak!
 * }, []);
 */

export default {
  useCleanupEffect,
  useInterval,
  useTimeout,
  useEventListener,
  useAbortController,
  useWebSocket,
};
