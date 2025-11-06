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

export interface ServiceOptions {
  enableLogging?: boolean;
  enableCaching?: boolean;
  cacheTimeMs?: number;
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
      ...options
    };
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
}

