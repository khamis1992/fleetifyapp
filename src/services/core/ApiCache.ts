/**
 * Intelligent API Cache System
 *
 * Multi-level caching with smart invalidation strategies
 * Supports TTL, cache versioning, and LRU eviction
 * Optimized for FleetifyApp performance requirements
 */

import { logger } from '@/lib/logger';

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  version?: string; // Cache version for invalidation
  enableMetrics?: boolean; // Enable performance metrics
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  hits: number;
  lastAccessed: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  size: number;
  hitRate: number;
  averageAccessTime: number;
}

/**
 * Intelligent API Cache with multi-level support
 */
export class ApiCache {
  private cache = new Map<string, CacheEntry>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    size: 0,
    hitRate: 0,
    averageAccessTime: 0
  };

  private config: Required<CacheConfig>;
  private cleanupTimer?: NodeJS.Timeout;
  private accessTimes: number[] = [];

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl || 5 * 60 * 1000, // 5 minutes default
      maxSize: config.maxSize || 1000, // 1000 entries default
      version: config.version || '1.0.0',
      enableMetrics: config.enableMetrics ?? true,
      ...config
    };

    // Start cleanup timer
    this.startCleanupTimer();

    logger.info('ApiCache initialized', {
      config: this.config,
      enabled: true
    });
  }

  /**
   * Get data from cache
   */
  get<T = any>(key: string): T | null {
    const startTime = performance.now();

    const entry = this.cache.get(key);

    if (!entry) {
      this.recordMiss();
      this.recordAccessTime(performance.now() - startTime);
      return null;
    }

    const now = Date.now();

    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.recordMiss();
      this.recordEviction('expired');
      this.recordAccessTime(performance.now() - startTime);
      return null;
    }

    // Check version mismatch
    if (entry.version !== this.config.version) {
      this.cache.delete(key);
      this.recordMiss();
      this.recordEviction('version_mismatch');
      this.recordAccessTime(performance.now() - startTime);
      return null;
    }

    // Update access metrics
    entry.hits++;
    entry.lastAccessed = now;

    this.recordHit();
    this.recordAccessTime(performance.now() - startTime);

    logger.debug('Cache hit', {
      key,
      hits: entry.hits,
      age: now - entry.timestamp
    });

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T = any>(key: string, data: T, customTtl?: number): void {
    const now = Date.now();
    const ttl = customTtl || this.config.ttl;

    // Check if we need to evict for space
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      version: this.config.version,
      hits: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.recordSet();

    logger.debug('Cache set', {
      key,
      ttl,
      size: this.cache.size,
      maxSize: this.config.maxSize
    });
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.metrics.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Clear cache by pattern
   */
  clearPattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.metrics.size = this.cache.size;

    logger.info('Cache pattern cleared', { pattern: pattern.source, count });
    return count;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.metrics.size = 0;

    logger.info('Cache cleared', { previousSize: size });
  }

  /**
   * Invalidate cache by version
   */
  invalidateVersion(): void {
    this.config.version = this.generateVersion();
    this.clear();

    logger.info('Cache version invalidated', { newVersion: this.config.version });
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;
    this.metrics.size = this.cache.size;

    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      version: this.config.version,
      metrics: this.getMetrics(),
      entries: {
        total: entries.length,
        expired: entries.filter(e => now - e.timestamp > e.ttl).length,
        averageHits: entries.length > 0
          ? entries.reduce((sum, e) => sum + e.hits, 0) / entries.length
          : 0,
        averageAge: entries.length > 0
          ? entries.reduce((sum, e) => sum + (now - e.timestamp), 0) / entries.length
          : 0
      },
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Preload cache with data
   */
  async preload<T>(
    keys: string[],
    dataLoader: (key: string) => Promise<T>,
    ttl?: number
  ): Promise<void> {
    logger.info('Starting cache preload', { count: keys.length });

    const promises = keys.map(async (key) => {
      try {
        const data = await dataLoader(key);
        this.set(key, data, ttl);
      } catch (error) {
        logger.warn('Failed to preload cache key', { key, error });
      }
    });

    await Promise.allSettled(promises);

    logger.info('Cache preload completed', {
      loaded: this.cache.size,
      requested: keys.length
    });
  }

  /**
   * Create cache key from parameters
   */
  static createKey(...parts: (string | number | boolean | null | undefined)[]): string {
    return parts
      .map(part => {
        if (part === null || part === undefined) return 'null';
        if (typeof part === 'object') return JSON.stringify(part);
        return String(part);
      })
      .join(':');
  }

  /**
   * Destroy cache instance
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();

    logger.info('ApiCache destroyed');
  }

  // ============ Private Methods ============

  private startCleanupTimer(): void {
    // Run cleanup every minute
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    let evictions = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        evictions++;
      }
    }

    if (evictions > 0) {
      this.metrics.evictions += evictions;
      this.metrics.size = this.cache.size;

      logger.debug('Cache cleanup completed', {
        evictions,
        remaining: this.cache.size
      });
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.recordEviction('lru');

      logger.debug('LRU eviction', { key: oldestKey });
    }
  }

  private generateVersion(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private estimateMemoryUsage(): number {
    // Rough estimation in bytes
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(entry.data).length * 2;
      size += 64; // Metadata overhead
    }
    return size;
  }

  private recordHit(): void {
    if (this.config.enableMetrics) {
      this.metrics.hits++;
    }
  }

  private recordMiss(): void {
    if (this.config.enableMetrics) {
      this.metrics.misses++;
    }
  }

  private recordSet(): void {
    if (this.config.enableMetrics) {
      this.metrics.sets++;
      this.metrics.size = this.cache.size;
    }
  }

  private recordEviction(reason: string): void {
    if (this.config.enableMetrics) {
      this.metrics.evictions++;
      this.metrics.size = this.cache.size;
    }
  }

  private recordAccessTime(time: number): void {
    if (this.config.enableMetrics) {
      this.accessTimes.push(time);

      // Keep only last 100 access times for average calculation
      if (this.accessTimes.length > 100) {
        this.accessTimes.shift();
      }

      this.metrics.averageAccessTime =
        this.accessTimes.reduce((sum, t) => sum + t, 0) / this.accessTimes.length;
    }
  }
}

// Global cache instances for different data types
export const apiCaches = {
  // User session cache (15 minutes)
  user: new ApiCache({
    ttl: 15 * 60 * 1000,
    maxSize: 100,
    version: '1.0.0'
  }),

  // Fleet data cache (5 minutes)
  fleet: new ApiCache({
    ttl: 5 * 60 * 1000,
    maxSize: 500,
    version: '1.0.0'
  }),

  // Financial data cache (2 minutes)
  financial: new ApiCache({
    ttl: 2 * 60 * 1000,
    maxSize: 200,
    version: '1.0.0'
  }),

  // Customer data cache (10 minutes)
  customer: new ApiCache({
    ttl: 10 * 60 * 1000,
    maxSize: 300,
    version: '1.0.0'
  }),

  // Contract data cache (7 minutes)
  contract: new ApiCache({
    ttl: 7 * 60 * 1000,
    maxSize: 400,
    version: '1.0.0'
  }),

  // System configuration cache (30 minutes)
  config: new ApiCache({
    ttl: 30 * 60 * 1000,
    maxSize: 50,
    version: '1.0.0'
  })
};

/**
 * Get cache by data type
 */
export function getCacheByType(type: keyof typeof apiCaches): ApiCache {
  return apiCaches[type];
}

/**
 * Invalidate all caches (use with caution)
 */
export function invalidateAllCaches(): void {
  Object.values(apiCaches).forEach(cache => {
    cache.invalidateVersion();
  });

  logger.info('All caches invalidated');
}

export default ApiCache;