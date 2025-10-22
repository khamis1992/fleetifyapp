/**
 * Query Timeout Utility
 * Adds timeout functionality to React Query queries to prevent infinite hanging
 */

/**
 * Creates a timeout promise that rejects after specified milliseconds
 */
export const createTimeoutPromise = (ms: number, message?: string): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(message || `Query timeout after ${ms}ms`));
    }, ms);
  });
};

/**
 * Wraps a query function with timeout functionality
 * @param queryFn - The original query function
 * @param timeoutMs - Timeout in milliseconds (default: 30000ms / 30 seconds)
 * @returns A wrapped query function with timeout
 *
 * @example
 * ```typescript
 * const { data } = useQuery({
 *   queryKey: ['customers'],
 *   queryFn: withTimeout(async () => {
 *     const response = await supabase.from('customers').select('*');
 *     return response.data;
 *   }, 15000) // 15 second timeout
 * });
 * ```
 */
export const withTimeout = <T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 30000
): (() => Promise<T>) => {
  return async () => {
    const timeoutPromise = createTimeoutPromise(timeoutMs);

    try {
      const result = await Promise.race([
        queryFn(),
        timeoutPromise
      ]);
      return result;
    } catch (error: any) {
      // Check if it's a timeout error
      if (error?.message?.includes('Query timeout')) {
        console.error('🚨 Query timeout:', error.message);

        // Log timeout for debugging
        if (import.meta.env.DEV) {
          console.warn('Consider optimizing this query or increasing the timeout');
        }
      }
      throw error;
    }
  };
};

/**
 * Wraps a query function with timeout and AbortSignal support
 * Provides both timeout and cancellation capabilities
 *
 * @example
 * ```typescript
 * const { data } = useQuery({
 *   queryKey: ['customers'],
 *   queryFn: ({ signal }) => withTimeoutAndSignal(
 *     async (signal) => {
 *       const response = await supabase
 *         .from('customers')
 *         .select('*')
 *         .abortSignal(signal);
 *       return response.data;
 *     },
 *     signal,
 *     15000
 *   )
 * });
 * ```
 */
export const withTimeoutAndSignal = <T>(
  queryFn: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal,
  timeoutMs: number = 30000
): Promise<T> => {
  return new Promise<T>(async (resolve, reject) => {
    // Create timeout
    const timeoutId = setTimeout(() => {
      reject(new Error(`Query timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    // Listen for abort signal
    const abortHandler = () => {
      clearTimeout(timeoutId);
      reject(new Error('Query cancelled'));
    };

    signal.addEventListener('abort', abortHandler);

    try {
      const result = await queryFn(signal);
      clearTimeout(timeoutId);
      signal.removeEventListener('abort', abortHandler);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      signal.removeEventListener('abort', abortHandler);
      reject(error);
    }
  });
};

/**
 * Default timeout configurations for different query types
 */
export const QUERY_TIMEOUTS = {
  /** Fast queries (e.g., counts, simple lookups) - 10 seconds */
  FAST: 10000,

  /** Standard queries (e.g., list fetches) - 20 seconds */
  STANDARD: 20000,

  /** Slow queries (e.g., complex aggregations, reports) - 30 seconds */
  SLOW: 30000,

  /** Very slow queries (e.g., exports, large data processing) - 60 seconds */
  VERY_SLOW: 60000,

  /** Real-time subscriptions setup - 10 seconds */
  REALTIME: 10000,
} as const;

/**
 * Monitors query duration and logs slow queries
 */
export const monitorQueryDuration = async <T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  slowThreshold: number = 3000
): Promise<T> => {
  const startTime = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;

    if (duration > slowThreshold) {
      console.warn(
        `⚠️ Slow query detected (${duration.toFixed(0)}ms):`,
        queryKey.join(' > ')
      );
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(
      `❌ Query failed after ${duration.toFixed(0)}ms:`,
      queryKey.join(' > '),
      error
    );
    throw error;
  }
};
