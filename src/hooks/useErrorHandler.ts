import { useState, useCallback, useRef } from 'react';
import { ErrorHandler, getErrorMessage, retryWithBackoff } from '@/lib/errorHandler';
import type { ErrorMessage, ErrorContext, RetryConfig } from '@/lib/errorHandler';

interface UseErrorHandlerOptions {
  onError?: (error: Error | string, context?: Partial<ErrorContext>) => void;
  defaultRetryConfig?: Partial<RetryConfig>;
  context?: Partial<ErrorContext>;
}

interface UseErrorHandlerReturn {
  error: Error | null;
  errorMessage: ErrorMessage | null;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
  
  // Actions
  clearError: () => void;
  retry: () => Promise<void>;
  handleError: (error: Error | string, errorContext?: Partial<ErrorContext>) => void;
  executeWithErrorHandling: <T,>(fn: () => Promise<T>) => Promise<T | null>;
}

/**
 * Custom hook for improved error handling with automatic retries
 * 
 * @example
 * const {
 *   error,
 *   errorMessage,
 *   isRetrying,
 *   retryCount,
 *   handleError,
 *   executeWithErrorHandling
 * } = useErrorHandler({
 *   context: { component: 'MyComponent', action: 'loadData' }
 * });
 *
 * const loadData = async () => {
 *   const data = await executeWithErrorHandling(async () => {
 *     const response = await fetch('/api/data');
 *     if (!response.ok) throw new Error('Failed to load');
 *     return response.json();
 *   });
 * };
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    onError,
    defaultRetryConfig = { maxAttempts: 3, delayMs: 1000 },
    context
  } = options;

  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries, setMaxRetries] = useState(0);
  
  const asyncFunctionRef = useRef<() => Promise<any>>(null);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setMaxRetries(0);
  }, []);

  const handleError = useCallback((err: Error | string, errorContext?: Partial<ErrorContext>) => {
    const actualError = typeof err === 'string' ? new Error(err) : err;
    setError(actualError);
    
    // Call custom error handler if provided
    if (onError) {
      onError(actualError, errorContext || context);
    }

    // Log error
    ErrorHandler.log(actualError, errorContext || context);
  }, [onError, context]);

  const retry = useCallback(async () => {
    if (!asyncFunctionRef.current || isRetrying) return;

    const errorMsg = error ? getErrorMessage(error) : null;
    if (!errorMsg?.retryable) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await retryWithBackoff(
        asyncFunctionRef.current,
        defaultRetryConfig
      );
      // Success - clear error
      clearError();
    } catch (err) {
      // Still failed
      handleError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsRetrying(false);
    }
  }, [error, isRetrying, defaultRetryConfig, clearError, handleError]);

  const executeWithErrorHandling = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        setIsLoading(true);
        clearError();
        
        // Store function for retry
        asyncFunctionRef.current = fn;
        
        const result = await retryWithBackoff(fn, defaultRetryConfig);
        setIsLoading(false);
        return result;
      } catch (err) {
        const actualError = err instanceof Error ? err : new Error(String(err));
        const errorMsg = getErrorMessage(actualError);
        
        handleError(actualError);
        setMaxRetries(errorMsg.maxRetries);
        setIsLoading(false);
        
        return null;
      }
    },
    [defaultRetryConfig, clearError, handleError]
  );

  const errorMessage = error ? getErrorMessage(error) : null;

  return {
    error,
    errorMessage,
    isLoading,
    isRetrying,
    retryCount,
    maxRetries,
    clearError,
    retry,
    handleError,
    executeWithErrorHandling
  };
}

export default useErrorHandler;
