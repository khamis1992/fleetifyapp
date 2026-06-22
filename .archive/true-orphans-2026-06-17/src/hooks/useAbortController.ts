/**
 * AbortController Hook
 * 
 * Provides automatic request cancellation for hooks
 * Prevents memory leaks and wasted API calls when components unmount
 * 
 * Features:
 * - Automatic cleanup on unmount
 * - Manual abort capability
 * - Multiple controller support
 * - Integration with React Query and Supabase
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing AbortController lifecycle
 * Automatically creates and cleans up AbortController
 * 
 * @returns {Object} controller - AbortController instance and utilities
 * 
 * @example
 * const { signal, abort } = useAbortController();
 * 
 * useEffect(() => {
 *   fetch('/api/data', { signal })
 *     .then(res => res.json())
 *     .catch(err => {
 *       if (err.name === 'AbortError') {
 *         console.log('Request cancelled');
 *       }
 *     });
 * }, [signal]);
 */
export const useAbortController = () => {
  const controllerRef = useRef<AbortController | null>(null);

  // Initialize controller
  if (!controllerRef.current) {
    controllerRef.current = new AbortController();
  }

  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      // Create new controller for future requests
      controllerRef.current = new AbortController();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
    };
  }, []);

  return {
    signal: controllerRef.current.signal,
    controller: controllerRef.current,
    abort,
  };
};

/**
 * Hook for managing multiple AbortControllers
 * Useful for components with multiple async operations
 * 
 * @returns {Object} controllers - Map of controllers by key
 * 
 * @example
 * const { getController, abortAll, abortController } = useMultipleAbortControllers();
 * 
 * const loadUsers = async () => {
 *   const controller = getController('users');
 *   await fetch('/api/users', { signal: controller.signal });
 * };
 * 
 * const loadPosts = async () => {
 *   const controller = getController('posts');
 *   await fetch('/api/posts', { signal: controller.signal });
 * };
 */
export const useMultipleAbortControllers = () => {
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  const getController = useCallback((key: string): AbortController => {
    if (!controllersRef.current.has(key)) {
      controllersRef.current.set(key, new AbortController());
    }
    return controllersRef.current.get(key)!;
  }, []);

  const abortController = useCallback((key: string) => {
    const controller = controllersRef.current.get(key);
    if (controller) {
      controller.abort();
      controllersRef.current.delete(key);
    }
  }, []);

  const abortAll = useCallback(() => {
    controllersRef.current.forEach(controller => controller.abort());
    controllersRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortAll();
    };
  }, [abortAll]);

  return {
    getController,
    abortController,
    abortAll,
  };
};

/**
 * Utility to check if error is an AbortError
 * 
 * @param error - Error to check
 * @returns {boolean} true if error is from request cancellation
 * 
 * @example
 * try {
 *   await fetch('/api/data', { signal });
 * } catch (error) {
 *   if (isAbortError(error)) {
 *     console.log('Request cancelled - this is expected');
 *     return;
 *   }
 *   // Handle actual errors
 * }
 */
export const isAbortError = (error: unknown): boolean => {
  return (
    error instanceof Error && 
    (error.name === 'AbortError' || error.message.includes('aborted'))
  );
};

/**
 * Wrapper for async functions with automatic abort handling
 * 
 * @param fn - Async function to wrap
 * @param onAbort - Optional callback when request is aborted
 * @returns Wrapped function that ignores AbortErrors
 * 
 * @example
 * const loadData = withAbortHandling(
 *   async (signal) => {
 *     const res = await fetch('/api/data', { signal });
 *     return res.json();
 *   },
 *   () => console.log('Request cancelled')
 * );
 */
export const withAbortHandling = <T>(
  fn: (signal: AbortSignal) => Promise<T>,
  onAbort?: () => void
) => {
  return async (signal: AbortSignal): Promise<T | null> => {
    try {
      return await fn(signal);
    } catch (error) {
      if (isAbortError(error)) {
        onAbort?.();
        return null;
      }
      throw error;
    }
  };
};

/**
 * Hook for timeout-based abort
 * Automatically aborts request after timeout
 * 
 * @param timeout - Timeout in milliseconds
 * @returns {Object} controller - AbortController with timeout
 * 
 * @example
 * const { signal } = useAbortTimeout(5000); // 5 second timeout
 * 
 * await fetch('/api/data', { signal })
 *   .catch(err => {
 *     if (isAbortError(err)) {
 *       console.log('Request timed out after 5 seconds');
 *     }
 *   });
 */
export const useAbortTimeout = (timeout: number) => {
  const controllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = new AbortController();
  }

  const startTimeout = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (controllerRef.current) {
        console.warn(`Request aborted after ${timeout}ms timeout`);
        controllerRef.current.abort();
      }
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    startTimeout();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [startTimeout]);

  return {
    signal: controllerRef.current.signal,
    controller: controllerRef.current,
    resetTimeout: startTimeout,
  };
};

/**
 * React Query integration helper
 * Extracts signal from React Query context
 * 
 * @example
 * const query = useQuery({
 *   queryKey: ['data'],
 *   queryFn: async ({ signal }) => {
 *     const { data } = await supabase
 *       .from('table')
 *       .select('*')
 *       .abortSignal(signal);
 *     return data;
 *   }
 * });
 */
export const reactQuerySignalHelper = {
  /**
   * Type guard for React Query context
   */
  hasSignal: (context: unknown): context is { signal: AbortSignal } => {
    return (
      typeof context === 'object' &&
      context !== null &&
      'signal' in context &&
      context.signal instanceof AbortSignal
    );
  },
};

/**
 * Supabase integration helper
 * Ensures all Supabase queries use AbortSignal
 * 
 * @example
 * import { createAbortableQuery } from '@/hooks/useAbortController';
 * 
 * const query = createAbortableQuery(
 *   (signal) => supabase.from('users').select('*').abortSignal(signal)
 * );
 */
export const createAbortableQuery = <T>(
  queryFn: (signal: AbortSignal) => Promise<T>
) => {
  return async (signal?: AbortSignal): Promise<T> => {
    if (!signal) {
      console.warn('No AbortSignal provided - query will not be cancellable');
    }
    return queryFn(signal || new AbortController().signal);
  };
};
