/**
 * Error Boundary Utilities
 * 
 * Provides utilities for working with error boundaries
 * and handling errors in functional components
 */

import { useEffect } from 'react';

/**
 * Hook to throw errors in functional components
 * Works with Error Boundaries
 */
export const useErrorHandler = () => {
  const handleError = (error: Error) => {
    // This will be caught by the nearest Error Boundary
    throw error;
  };

  return handleError;
};

/**
 * Hook to handle async errors
 * Automatically catches and forwards to Error Boundary
 */
export const useAsyncError = () => {
  const handleError = useErrorHandler();

  const catchError = async <T,>(
    promise: Promise<T>,
    errorMessage?: string
  ): Promise<T | null> => {
    try {
      return await promise;
    } catch (error) {
      const err = error instanceof Error 
        ? error 
        : new Error(errorMessage || 'An unexpected error occurred');
      
      handleError(err);
      return null;
    }
  };

  return catchError;
};

/**
 * Hook to add global error listeners
 */
export const useGlobalErrorHandler = () => {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('🔴 Global error:', event.error);
      
      // Log to error tracking service
      if (import.meta.env.PROD) {
        // TODO: Send to error tracking service
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('🔴 Unhandled promise rejection:', event.reason);
      
      // Log to error tracking service
      if (import.meta.env.PROD) {
        // TODO: Send to error tracking service
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
};

/**
 * Error recovery utilities
 */
export const ErrorRecovery = {
  /**
   * Clear all cached data and reload
   */
  hardReset: () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  },

  /**
   * Clear specific cache keys
   */
  clearCache: (keys: string[]) => {
    keys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  },

  /**
   * Check if error is recoverable
   */
  isRecoverable: (error: Error): boolean => {
    const message = error.message.toLowerCase();
    
    // Network errors are usually recoverable
    if (message.includes('network') || message.includes('fetch')) {
      return true;
    }

    // Chunk load errors are recoverable with reload
    if (message.includes('chunk') || message.includes('dynamically imported')) {
      return true;
    }

    // Permission errors need navigation, not retry
    if (message.includes('permission') || message.includes('unauthorized')) {
      return false;
    }

    // Most other errors might be recoverable
    return true;
  },

  /**
   * Get error severity level
   */
  getSeverity: (error: Error): 'low' | 'medium' | 'high' | 'critical' => {
    const message = error.message.toLowerCase();

    // Critical errors that break the app
    if (message.includes('syntax') || message.includes('reference')) {
      return 'critical';
    }

    // High severity - functionality broken
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'high';
    }

    // Medium severity - temporary issues
    if (message.includes('network') || message.includes('timeout')) {
      return 'medium';
    }

    // Low severity - recoverable
    return 'low';
  }
};

/**
 * Error logging utility
 */
export const logError = (
  error: Error,
  context?: {
    component?: string;
    action?: string;
    metadata?: Record<string, unknown>;
  }
) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    severity: ErrorRecovery.getSeverity(error),
    recoverable: ErrorRecovery.isRecoverable(error),
    ...context,
  };

  // Console log in development
  if (import.meta.env.DEV) {
    console.error('📊 Error Log:', errorLog);
  }

  // Send to tracking service in production
  if (import.meta.env.PROD) {
    // TODO: Integrate with error tracking service
    // Example: Sentry.captureException(error, { extra: errorLog });
  }

  // Store locally for debugging
  try {
    const errors = JSON.parse(localStorage.getItem('error_logs') || '[]');
    errors.push(errorLog);
    localStorage.setItem('error_logs', JSON.stringify(errors.slice(-20)));
  } catch (e) {
    console.warn('Failed to store error log');
  }
};
