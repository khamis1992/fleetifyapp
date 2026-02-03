/**
 * Request Deduplication Utility
 * Prevents duplicate API requests and shares results
 */

import { QueryClient } from '@tanstack/react-query';

// Types for deduplication
interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  subscribers: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>;
}

interface RequestConfig {
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  ttl?: number; // Time to live in milliseconds
  key?: string; // Custom deduplication key
}

// Deduplication cache
class RequestDeduplication {
  private cache = new Map<string, any>();
  private pendingRequests = new Map<string, PendingRequest>();
  private queryClient?: QueryClient;
  private defaultTTL = 5000; // 5 seconds default TTL

  constructor(queryClient?: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Generate a unique key for a request
   */
  private generateKey(config: RequestConfig): string {
    // Use custom key if provided
    if (config.key) {
      return config.key;
    }

    // Generate key from request parameters
    const keyParts = [
      config.method.toUpperCase(),
      config.url,
      config.body ? JSON.stringify(config.body) : '',
      // Sort headers for consistent key generation
      config.headers
        ? JSON.stringify(
            Object.keys(config.headers)
              .sort()
              .reduce((acc, key) => ({ ...acc, [key]: config.headers![key] }), {})
          )
        : '',
    ];

    return btoa(keyParts.join('|'));
  }

  /**
   * Check if request should be deduplicated
   */
  private shouldDeduplicate(config: RequestConfig): boolean {
    // Don't deduplicate non-idempotent methods
    if (!['GET', 'HEAD', 'OPTIONS'].includes(config.method.toUpperCase())) {
      return false;
    }

    // Don't deduplicate if no-cache header is present
    if (config.headers?.['cache-control']?.includes('no-cache')) {
      return false;
    }

    return true;
  }

  /**
   * Execute request with deduplication
   */
  async execute<T>(
    config: RequestConfig,
    executor: () => Promise<T>
  ): Promise<T> {
    // Check if request should be deduplicated
    if (!this.shouldDeduplicate(config)) {
      return executor();
    }

    const key = this.generateKey(config);
    const ttl = config.ttl || this.defaultTTL;

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    // Check for pending request
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // Subscribe to pending request
      return new Promise<T>((resolve, reject) => {
        pending.subscribers.push({ resolve, reject });
      });
    }

    // Create new pending request
    const promise = executor();
    const pendingRequest: PendingRequest = {
      promise,
      timestamp: Date.now(),
      subscribers: [],
    };

    this.pendingRequests.set(key, pendingRequest);

    try {
      const data = await promise;

      // Cache successful response
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });

      // Resolve all subscribers
      pendingRequest.subscribers.forEach(({ resolve }) => resolve(data));

      // Clean up pending request
      this.pendingRequests.delete(key);

      // Cache in React Query if available
      if (this.queryClient && config.method === 'GET') {
        this.queryClient.setQueryData([config.url], data, {
          staleTime: ttl,
        });
      }

      return data;
    } catch (error) {
      // Reject all subscribers
      pendingRequest.subscribers.forEach(({ reject }) => reject(error));

      // Clean up pending request
      this.pendingRequests.delete(key);

      throw error;
    }
  }

  /**
   * Invalidate cache for a specific request or pattern
   */
  invalidate(keyOrPattern: string | RegExp): void {
    if (typeof keyOrPattern === 'string') {
      this.cache.delete(keyOrPattern);
      this.pendingRequests.delete(keyOrPattern);
    } else {
      // Pattern matching
      for (const [key] of this.cache.entries()) {
        if (keyOrPattern.test(key)) {
          this.cache.delete(key);
        }
      }
      for (const [key] of this.pendingRequests.entries()) {
        if (keyOrPattern.test(key)) {
          this.pendingRequests.delete(key);
        }
      }
    }
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();

    // Clear React Query cache if available
    if (this.queryClient) {
      this.queryClient.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys()),
      pendingKeys: Array.from(this.pendingRequests.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Clean expired cache entries
    for (const [key, value] of this.cache.entries()) {
      const age = now - value.timestamp;
      if (age > this.defaultTTL * 10) { // Clear if older than 10x TTL
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    // Clean stale pending requests (older than 30 seconds)
    for (const [key, request] of this.pendingRequests.entries()) {
      const age = now - request.timestamp;
      if (age > 30000) {
        // Reject subscribers with timeout error
        const timeoutError = new Error('Request timeout');
        request.subscribers.forEach(({ reject }) => reject(timeoutError));
        this.pendingRequests.delete(key);
      }
    }
  }
}

// Global deduplication instance
export const requestDeduplication = new RequestDeduplication();

/**
 * Hook for deduplicated fetch requests
 */
export function useDeduplicatedFetch() {
  return {
    fetch: async <T>(config: RequestConfig): Promise<T> => {
      return requestDeduplication.execute(config, async () => {
        const response = await fetch(config.url, {
          method: config.method,
          headers: {
            'Content-Type': 'application/json',
            ...config.headers,
          },
          body: config.body ? JSON.stringify(config.body) : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
      });
    }),

    invalidate: (keyOrPattern: string | RegExp) => {
      requestDeduplication.invalidate(keyOrPattern);
    },

    clear: () => {
      requestDeduplication.clear();
    },
  };
}

/**
 * Higher-order function for deduplicated API calls
 */
export function withDeduplication<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  getKey?: (...args: T) => string
) {
  return (...args: T): Promise<R> => {
    const key = getKey ? getKey(...args) : fn.name || JSON.stringify(args);

    return requestDeduplication.execute(
      { url: key, method: 'GET' },
      () => fn(...args)
    );
  };
}

/**
 * Deduplication for React Query
 */
export function createDeduplicatedQuery<T>(
  key: string[],
  queryFn: () => Promise<T>,
  options?: {
    ttl?: number;
    staleTime?: number;
  }
) {
  return {
    queryKey: key,
    queryFn: async () => {
      return requestDeduplication.execute(
        { url: key.join('/'), method: 'GET' },
        queryFn
      );
    },
    staleTime: options?.staleTime || 5000,
  };
}

/**
 * Batch request deduplication
 */
export class BatchDeduplication {
  private batch = new Map<string, {
    requests: Array<() => Promise<any>>;
    resolve: (results: any[]) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(
    private batchDelay = 50, // milliseconds
    private batchTimeout = 5000 // milliseconds
  ) {}

  async execute<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Check if batch already exists
      if (this.batch.has(key)) {
        const batch = this.batch.get(key)!;
        batch.requests.push(requestFn);
        batch.requests.push(() => requestFn().then(resolve).catch(reject));
      } else {
        // Create new batch
        const requests = [requestFn];
        const batch = {
          requests,
          resolve: () => {},
          reject: () => {},
          timeout: setTimeout(() => {
            this.processBatch(key);
          }, this.batchDelay),
        };

        this.batch.set(key, batch);

        // Set timeout to process batch even if delay not met
        setTimeout(() => {
          this.processBatch(key);
        }, this.batchTimeout);

        batch.requests.push(() => requestFn().then(resolve).catch(reject));
      }
    });
  }

  private async processBatch(key: string) {
    const batch = this.batch.get(key);
    if (!batch) return;

    // Clear timeout
    clearTimeout(batch.timeout);
    this.batch.delete(key);

    try {
      // Execute all requests in parallel
      const results = await Promise.allSettled(
        batch.requests.map(req => req())
      );

      // Extract successful results
      const successfulResults = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      // Check if any requests failed
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.error('Some batch requests failed:', failures);
      }

      batch.resolve(successfulResults);
    } catch (error) {
      batch.reject(error as Error);
    }
  }

  clear(): void {
    // Clear all pending batches
    for (const [key, batch] of this.batch.entries()) {
      clearTimeout(batch.timeout);
      batch.reject(new Error('Batch cleared'));
    }
    this.batch.clear();
  }
}

// Export a global batch deduplication instance
export const batchDeduplication = new BatchDeduplication();