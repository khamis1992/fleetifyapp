/**
 * Base Service Class
 * 
 * Provides common service layer functionality for all domain services.
 * Implements standard CRUD operations with error handling and validation.
 * 
 * @template T - The entity type this service handles
 */

import { ErrorHandler } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';
import type { BaseRepository } from './BaseRepository';
import { createOptimizedQueryFn, createOptimizedMutationFn } from '@/lib/queryClient';
import { getCacheByType } from './ApiCache';
import { globalPerformanceMonitor } from './PerformanceMonitor';
import { globalBatchProcessor } from './BatchProcessor';
import { globalQueryOptimizer } from './QueryOptimizer';

export interface ServiceOptions {
  enableLogging?: boolean;
  enableCaching?: boolean;
  cacheTimeMs?: number;
  enablePerformanceMonitoring?: boolean;
  enableQueryOptimization?: boolean;
  cacheType?: 'user' | 'fleet' | 'financial' | 'customer' | 'contract' | 'config';
  enableBatchProcessing?: boolean;
  defaultBatchSize?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string[]>;
}

/**
 * Abstract base class for all services
 */
export abstract class BaseService<T extends { id?: string }> {
  protected repository: BaseRepository<T>;
  protected serviceName: string;
  protected options: ServiceOptions;

  constructor(
    repository: BaseRepository<T>,
    serviceName: string,
    options: ServiceOptions = {}
  ) {
    this.repository = repository;
    this.serviceName = serviceName;
    this.options = {
      enableLogging: true,
      enableCaching: false,
      cacheTimeMs: 5 * 60 * 1000, // 5 minutes
      enablePerformanceMonitoring: true,
      enableQueryOptimization: false,
      cacheType: 'config',
      enableBatchProcessing: false,
      defaultBatchSize: 100,
      ...options
    };

    // Initialize performance monitoring if enabled
    if (this.options.enablePerformanceMonitoring) {
      globalPerformanceMonitor.addAlertRule({
        name: `${this.serviceName}_slow_operations`,
        condition: (stats) => stats.p95ResponseTime > 5000, // 5 seconds
        threshold: 5000,
        enabled: true,
        cooldownMs: 60000 // 1 minute
      });
    }
  }

  /**
   * Create a new entity
   */
  async create(data: Omit<T, 'id'>): Promise<T> {
    try {
      this.log('create', 'Starting create operation');

      // Validate before creating
      const validation = await this.validate(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
      }

      // Apply business rules before creation
      const processedData = await this.beforeCreate(data);

      // Create via repository
      const entity = await this.repository.create(processedData);

      // Apply business rules after creation
      await this.afterCreate(entity);

      this.log('create', 'Entity created successfully', { id: entity.id });
      return entity;
    } catch (error) {
      this.handleError('create', error);
      throw error;
    }
  }

  /**
   * Update an existing entity
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      this.log('update', 'Starting update operation', { id });

      // Check if entity exists
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new Error(`${this.serviceName} with id ${id} not found`);
      }

      // Validate update data
      const validation = await this.validate(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
      }

      // Apply business rules before update
      const processedData = await this.beforeUpdate(existing, data);

      // Update via repository
      const updated = await this.repository.update(id, processedData);

      // Apply business rules after update
      await this.afterUpdate(existing, updated);

      this.log('update', 'Entity updated successfully', { id });
      return updated;
    } catch (error) {
      this.handleError('update', error);
      throw error;
    }
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<void> {
    try {
      this.log('delete', 'Starting delete operation', { id });

      // Check if entity exists
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw new Error(`${this.serviceName} with id ${id} not found`);
      }

      // Apply business rules before deletion
      await this.beforeDelete(existing);

      // Delete via repository
      await this.repository.delete(id);

      // Apply business rules after deletion
      await this.afterDelete(existing);

      this.log('delete', 'Entity deleted successfully', { id });
    } catch (error) {
      this.handleError('delete', error);
      throw error;
    }
  }

  /**
   * Get entity by ID
   */
  async getById(id: string): Promise<T | null> {
    try {
      this.log('getById', 'Fetching entity', { id });
      const entity = await this.repository.findById(id);
      
      if (!entity) {
        this.log('getById', 'Entity not found', { id });
      }

      return entity;
    } catch (error) {
      this.handleError('getById', error);
      throw error;
    }
  }

  /**
   * Get all entities
   */
  async getAll(): Promise<T[]> {
    try {
      this.log('getAll', 'Fetching all entities');
      const entities = await this.repository.findAll();
      this.log('getAll', 'Entities fetched successfully', { count: entities.length });
      return entities;
    } catch (error) {
      this.handleError('getAll', error);
      throw error;
    }
  }

  /**
   * Get entities with pagination
   */
  async getPaginated(page: number, limit: number): Promise<{ data: T[]; total: number; page: number; totalPages: number }> {
    try {
      this.log('getPaginated', 'Fetching paginated entities', { page, limit });
      const result = await this.repository.findPaginated(page, limit);
      this.log('getPaginated', 'Paginated entities fetched', { total: result.total, page });
      return result;
    } catch (error) {
      this.handleError('getPaginated', error);
      throw error;
    }
  }

  // ============ Lifecycle Hooks ============
  // Override these in child classes for custom behavior

  /**
   * Hook: Before entity creation
   * Override to add custom logic before creating an entity
   */
  protected async beforeCreate(data: Omit<T, 'id'>): Promise<Omit<T, 'id'>> {
    return data;
  }

  /**
   * Hook: After entity creation
   * Override to add custom logic after creating an entity
   */
  protected async afterCreate(entity: T): Promise<void> {
    // Override in child classes
  }

  /**
   * Hook: Before entity update
   * Override to add custom logic before updating an entity
   */
  protected async beforeUpdate(existing: T, data: Partial<T>): Promise<Partial<T>> {
    return data;
  }

  /**
   * Hook: After entity update
   * Override to add custom logic after updating an entity
   */
  protected async afterUpdate(existing: T, updated: T): Promise<void> {
    // Override in child classes
  }

  /**
   * Hook: Before entity deletion
   * Override to add custom logic before deleting an entity
   */
  protected async beforeDelete(entity: T): Promise<void> {
    // Override in child classes
  }

  /**
   * Hook: After entity deletion
   * Override to add custom logic after deleting an entity
   */
  protected async afterDelete(entity: T): Promise<void> {
    // Override in child classes
  }

  // ============ Validation ============

  /**
   * Validate entity data
   * Override in child classes for custom validation
   */
  protected async validate(data: Partial<T>): Promise<ValidationResult> {
    // Default: no validation errors
    return { isValid: true };
  }

  // ============ Helper Methods ============

  /**
   * Log service operations
   */
  protected log(operation: string, message: string, metadata?: Record<string, any>): void {
    if (this.options.enableLogging) {
      logger.info(`[${this.serviceName}] ${operation}: ${message}`, metadata);
    }
  }

  /**
   * Handle errors consistently
   */
  protected handleError(operation: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    ErrorHandler.log(errorMessage, {
      component: this.serviceName,
      action: operation,
      timestamp: new Date().toISOString()
    });

    logger.error(`[${this.serviceName}] ${operation} failed:`, errorMessage);
  }

  /**
   * Execute operation with retry logic
   */
  protected async withRetry<R>(
    operation: () => Promise<R>,
    maxRetries: number = 3
  ): Promise<R> {
    return ErrorHandler.retry(operation, {
      maxAttempts: maxRetries,
      delayMs: 1000,
      backoffMultiplier: 2
    });
  }

  // ============ Performance Optimization Methods ============

  /**
   * Execute optimized query with caching and monitoring
   */
  protected async executeOptimizedQuery<R>(
    queryKey: string,
    queryFn: () => Promise<R>,
    options?: {
      cacheKey?: string;
      skipCache?: boolean;
      customTtl?: number;
    }
  ): Promise<R> {
    if (!this.options.enableCaching) {
      return this.executeWithMonitoring(queryKey, queryFn);
    }

    const cache = getCacheByType(this.options.cacheType!);
    const cacheKeyStr = options?.cacheKey || `${this.serviceName}_${queryKey}`;

    // Check cache first
    if (!options?.skipCache) {
      const cached = cache?.get<R>(cacheKeyStr);
      if (cached) {
        this.log('executeOptimizedQuery', 'Cache hit', { queryKey, cacheKeyStr });
        return cached;
      }
    }

    // Execute with monitoring
    const result = await this.executeWithMonitoring(queryKey, queryFn);

    // Cache the result
    if (cache && !options?.skipCache) {
      cache.set(cacheKeyStr, result, options?.customTtl);
    }

    return result;
  }

  /**
   * Execute batch operation with performance monitoring
   */
  protected async executeBatchOperation<T, R>(
    items: T[],
    operation: (items: T[], batchIndex: number) => Promise<R[]>,
    options?: {
      batchSize?: number;
      maxConcurrency?: number;
      onProgress?: (progress: any) => void;
    }
  ): Promise<{ results: R[]; errors: any[] }> {
    if (!this.options.enableBatchProcessing || items.length < this.options.defaultBatchSize!) {
      // Execute sequentially for small batches
      const results: R[] = [];
      const errors: any[] = [];

      for (const item of items) {
        try {
          const result = await this.executeWithMonitoring(
            `${this.serviceName}_batch_item`,
            () => operation([item], 0)
          );
          results.push(...result);
        } catch (error) {
          errors.push({ item, error });
        }
      }

      return { results, errors };
    }

    // Use batch processor for large operations
    const batchSize = options?.batchSize || this.options.defaultBatchSize!;

    const result = await globalBatchProcessor.process(
      items,
      operation,
      {
        batchSize,
        maxConcurrency: options?.maxConcurrency || 5,
        onProgress: options?.onProgress,
        enableProgressTracking: true
      }
    );

    return {
      results: result.results,
      errors: result.errors.map(e => ({ item: e.item, error: e.error }))
    };
  }

  /**
   * Execute database operation with query optimization
   */
  protected async executeOptimizedDatabaseQuery<R>(
    query: string,
    params?: any[],
    queryFn?: () => Promise<R>
  ): Promise<R> {
    if (!this.options.enableQueryOptimization || !queryFn) {
      return queryFn ? queryFn() : this.executeWithMonitoring(query, () => Promise.resolve({} as R));
    }

    try {
      // Analyze and optimize the query
      const optimizationResult = await globalQueryOptimizer.optimizeQuery(query, params);

      // Log optimization recommendations
      if (optimizationResult.recommendations.length > 0) {
        this.log('executeOptimizedDatabaseQuery', 'Query optimization recommendations', {
          originalQuery: query,
          recommendations: optimizationResult.recommendations,
          improvementEstimate: optimizationResult.improvementEstimate
        });
      }

      // Execute the optimized query
      return await this.executeWithMonitoring(
        `optimized_${query.substring(0, 50)}`,
        queryFn
      );

    } catch (error) {
      this.log('executeOptimizedDatabaseQuery', 'Query optimization failed, executing original', {
        query: query.substring(0, 100),
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to original query
      return queryFn();
    }
  }

  /**
   * Execute operation with performance monitoring
   */
  protected async executeWithMonitoring<R>(
    operationName: string,
    operation: () => Promise<R>
  ): Promise<R> {
    if (!this.options.enablePerformanceMonitoring) {
      return operation();
    }

    const endTimer = globalPerformanceMonitor.startTimer(`${this.serviceName}_${operationName}`, {
      serviceName: this.serviceName
    });

    try {
      const result = await operation();
      const metric = endTimer({ success: true });
      globalPerformanceMonitor.record(metric);

      return result;

    } catch (error) {
      const metric = endTimer({
        success: false,
        statusCode: (error as any)?.status
      });
      globalPerformanceMonitor.record(metric);

      throw error;
    }
  }

  /**
   * Invalidate cache entries for this service
   */
  protected invalidateCache(pattern?: RegExp): number {
    if (!this.options.enableCaching) {
      return 0;
    }

    const cache = getCacheByType(this.options.cacheType!);

    if (pattern) {
      return cache?.clearPattern(pattern) || 0;
    } else {
      cache?.clear();
      return 1;
    }
  }

  /**
   * Get performance metrics for this service
   */
  getServicePerformanceMetrics() {
    if (!this.options.enablePerformanceMonitoring) {
      return null;
    }

    const stats = globalPerformanceMonitor.getStats();
    const serviceMetrics = stats.recentErrors.filter(
      (metric: any) => metric.name?.includes(this.serviceName)
    );

    return {
      serviceName: this.serviceName,
      totalRequests: serviceMetrics.length,
      errorCount: serviceMetrics.filter((m: any) => !m.success).length,
      averageResponseTime: serviceMetrics.reduce((sum: number, m: any) => sum + m.duration, 0) / serviceMetrics.length,
      cacheStats: this.options.enableCaching ? getCacheByType(this.options.cacheType!)?.getStats() : null
    };
  }

  /**
   * Preload cache with common data
   */
  protected async preloadCache(
    keys: string[],
    dataLoader: (key: string) => Promise<any>
  ): Promise<void> {
    if (!this.options.enableCaching) {
      return;
    }

    const cache = getCacheByType(this.options.cacheType!);
    await cache?.preload(keys, dataLoader, this.options.cacheTimeMs);
  }
}

